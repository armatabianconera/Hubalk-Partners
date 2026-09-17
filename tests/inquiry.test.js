import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInquiry} from '../lib/inquiry.js';

const crmEnv={ALLOWED_ORIGINS:'https://hubalk.pl',PRIVACY_NOTICE:'Test notice',CRM_INBOUND_URL:'https://app.hubalk.pl/api/crm/inbound',CRM_INQUIRY_SECRET:'crm-secret',CRM_SIWC_BYPASS_TOKEN:'sites-bypass'};
const env={...crmEnv,RESEND_API_KEY:'fake-test-key',CONTACT_FROM:'Hubalk <form@example.com>',CONTACT_TO:'team@example.com'};
const fields={intent:'sell',need:'Arbuzy z Węgier, stałe dostawy',markets:'Węgry → Polska',name:'Anna',phone:'+48 123 456 789',email:'anna@example.org',requestId:'12345678-1234-4123-8123-123456789012'};
const request=(data=fields,origin='https://hubalk.pl')=>new Request('https://hubalk.pl/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
const successfulProvider=(calls=[])=>async(url,init)=>{
  calls.push({url,...init});
  return url.includes('/api/crm/inbound') ? Response.json({id:'inquiry-1',repeated:false},{status:201}) : Response.json({id:'email-1'});
};

test('configuration never exposes keys and CRM configuration enables the form without e-mail',async()=>{
  const config=await (await handleInquiry(new Request('https://hubalk.pl/api/inquiry'),crmEnv)).json();
  assert.deepEqual(config,{ready:true,privacyNotice:'Test notice'});
  assert.equal((await handleInquiry(request(),{})).status,503);
  const calls=[];
  assert.deepEqual(await (await handleInquiry(request(),crmEnv,successfulProvider(calls))).json(),{ok:true,inquiryId:'inquiry-1',repeated:false});
  assert.equal(calls.length,1);
});

test('valid inquiry saves CRM first and maps a fixed notification recipient',async()=>{
  const calls=[];
  const result=await (await handleInquiry(request({...fields,to:'attacker@example.org'}),env,successfulProvider(calls))).json();
  assert.deepEqual(result,{ok:true,inquiryId:'inquiry-1',repeated:false,notification:'sent'});
  assert.equal(calls.length,2);
  const crm=JSON.parse(calls[0].body);
  assert.equal(calls[0].url,env.CRM_INBOUND_URL);
  assert.equal(calls[0].headers['OAI-Sites-Authorization'],'Bearer sites-bypass');
  assert.equal(calls[0].headers['X-Inquiry-Secret'],'crm-secret');
  assert.equal(crm.external_id,'hubalk-form:'+fields.requestId);
  assert.equal(crm.company_name,'Kontakt — Anna');
  assert.equal(crm.answers['produkt, branża i potrzeba'],fields.need);
  const mail=JSON.parse(calls[1].body);
  assert.deepEqual(mail.to,['team@example.com']);
  assert.equal(mail.reply_to,'anna@example.org');
  assert.ok(mail.text.includes(fields.phone));
});

test('duplicate retries use the same CRM id and mail idempotency key',async()=>{
  const calls=[];
  const mock=successfulProvider(calls);
  for(let i=0;i<2;i++) assert.equal((await handleInquiry(request(),env,mock)).status,200);
  const crmCalls=calls.filter(call=>call.url.includes('/api/crm/inbound'));
  const mailCalls=calls.filter(call=>call.url.includes('resend.com'));
  assert.equal(crmCalls[0].body,crmCalls[1].body);
  assert.equal(mailCalls[0].headers['Idempotency-Key'],mailCalls[1].headers['Idempotency-Key']);
  assert.equal(mailCalls[0].body,mailCalls[1].body);
});

test('invalid phone, fields, honeypot, origin and overlong bodies never call a provider',async()=>{
  const noSend=()=>{throw Error('Unexpected provider call');};
  for(const data of [{...fields,phone:'abc'},{...fields,need:'x'},{...fields,email:'a\nb@example.com'},{...fields,website:'spam'},{...fields,name:{}},null]) assert.equal((await handleInquiry(request(data),env,noSend)).status,400);
  assert.equal((await handleInquiry(request(fields,'https://evil.example'),env,noSend)).status,403);
  assert.equal((await handleInquiry(request({...fields,need:'x'.repeat(25000)}),env,noSend)).status,413);
});

test('CRM rejection, malformed receipt and network failure never report success',async()=>{
  for(const mock of [async()=>Response.json({error:'no'},{status:500}),async()=>Response.json({}),async()=>{throw Error('network');}]) {
    const result=await handleInquiry(request(),env,mock);
    assert.equal(result.status,502);
    assert.equal((await result.json()).ok,undefined);
  }
});

test('mail failure still reports a successfully persisted CRM inquiry',async()=>{
  for(const mailResult of [()=>Response.json({error:'no'},{status:500}),()=>Response.json({}),()=>{throw Error('network');}]) {
    let calls=0;
    const mock=async()=>++calls===1 ? Response.json({id:'inquiry-1'},{status:201}) : mailResult();
    assert.deepEqual(await (await handleInquiry(request(),env,mock)).json(),{ok:true,inquiryId:'inquiry-1',repeated:false,notification:'failed'});
  }
});

test('each language uses its own privacy notice and is saved with a language label',async()=>{
  for (const [locale,label] of Object.entries({hu:'węgierski',sh:'serbsko-chorwacki',en:'angielski'})) {
    const configEnv={...env,['PRIVACY_NOTICE_'+locale.toUpperCase()]:'Notice '+locale};
    const get=()=>new Request('https://hubalk.pl/api/inquiry?lang='+locale);
    assert.equal((await (await handleInquiry(get(),env)).json()).ready,false);
    assert.deepEqual(await (await handleInquiry(get(),configEnv)).json(),{ready:true,privacyNotice:'Notice '+locale});
    assert.equal((await handleInquiry(request({...fields,locale}),env)).status,503);
    const calls=[];
    assert.equal((await handleInquiry(request({...fields,locale}),configEnv,successfulProvider(calls))).status,200);
    assert.equal(JSON.parse(calls[0].body).language,locale);
    assert.ok(JSON.parse(calls[1].body).text.includes('Język formularza:\n'+label));
  }
  assert.equal((await handleInquiry(request({...fields,locale:'xx'}),env)).status,400);
});
