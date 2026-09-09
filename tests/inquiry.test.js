import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInquiry} from '../lib/inquiry.js';
const env={RESEND_API_KEY:'fake-test-key',CONTACT_FROM:'Hubalk <form@example.com>',CONTACT_TO:'team@example.com',ALLOWED_ORIGINS:'https://hubalk.pl',PRIVACY_NOTICE:'Test notice'};
const fields={intent:'sell',need:'Arbuzy z Węgier, stałe dostawy',markets:'Węgry → Polska',name:'Anna',phone:'+48 123 456 789',email:'anna@example.org',requestId:'12345678-1234-4123-8123-123456789012'};
const request=(data=fields,origin='https://hubalk.pl')=>new Request('https://hubalk.pl/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
test('configuration never exposes keys and missing configuration disables sending',async()=>{
 const config=await (await handleInquiry(new Request('https://hubalk.pl/api/inquiry'),env)).json();
 assert.deepEqual(config,{ready:true,privacyNotice:'Test notice'});
 assert.equal((await handleInquiry(request(),{})).status,503);
});
test('valid inquiry maps fields and fixed recipient; duplicate retries use same provider key',async()=>{
 const calls=[];
 const mock=async(url,init)=>{calls.push({url,...init});return Response.json({id:'email-id'});};
 for(let i=0;i<2;i++) assert.deepEqual(await (await handleInquiry(request({...fields,to:'attacker@example.org'}),env,mock)).json(),{ok:true});
 const mail=JSON.parse(calls[0].body);
 assert.deepEqual(mail.to,['team@example.com']);assert.equal(mail.reply_to,'anna@example.org');assert.ok(mail.text.includes(fields.need));assert.ok(mail.text.includes(fields.phone));assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);assert.equal(calls[0].body,calls[1].body);
});
test('invalid phone, fields, honeypot, origin and overlong bodies never send mail',async()=>{
 const noSend=()=>{throw Error('Unexpected provider call');};
 for(const data of [{...fields,phone:'abc'},{...fields,need:'x'},{...fields,email:'a\nb@example.com'},{...fields,website:'spam'},{...fields,name:{}},null]) assert.equal((await handleInquiry(request(data),env,noSend)).status,400);
 assert.equal((await handleInquiry(request(fields,'https://evil.example'),env,noSend)).status,403);
 assert.equal((await handleInquiry(request({...fields,need:'x'.repeat(25000)}),env,noSend)).status,413);
});
test('provider rejection, malformed receipt and network failure never report success',async()=>{
 for(const mock of [async()=>Response.json({error:'no'},{status:500}),async()=>Response.json({}),async()=>{throw Error('network');}]) {
 const result=await handleInquiry(request(),env,mock);assert.equal(result.status,502);assert.equal((await result.json()).ok,undefined);
 }
});
test('each language uses its own privacy notice and reaches the team with a language label',async()=>{
 for (const [locale,label] of Object.entries({hu:'węgierski',sh:'serbsko-chorwacki',en:'angielski'})) {
  const configEnv={...env,['PRIVACY_NOTICE_'+locale.toUpperCase()]:'Notice '+locale};
  const get=()=>new Request('https://hubalk.pl/api/inquiry?lang='+locale);
  assert.equal((await (await handleInquiry(get(),env)).json()).ready,false);
  assert.deepEqual(await (await handleInquiry(get(),configEnv)).json(),{ready:true,privacyNotice:'Notice '+locale});
  assert.equal((await handleInquiry(request({...fields,locale}),env)).status,503);
  let mail;
  const send=async(_url,init)=>{mail=JSON.parse(init.body);return Response.json({id:'mail'});};
  assert.equal((await handleInquiry(request({...fields,locale}),configEnv,send)).status,200);
  assert.ok(mail.text.includes('Język formularza:\n'+label));
 }
 assert.equal((await handleInquiry(request({...fields,locale:'xx'}),env)).status,400);
});
