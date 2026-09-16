const intents = {sell: 'Sprzedaż', buy: 'Zakup', other: 'Nowy rynek / inny temat'};
const limits = {name:100, company:160, phone:30, email:254, need:3000, markets:200, details:2000, callback:200, website:200, requestId:36, intent:10};
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const locales = {pl: 'polski', hu: 'węgierski', sh: 'serbsko-chorwacki', en: 'angielski'};
const notice = (env, locale) => locale === 'pl' ? env.PRIVACY_NOTICE : env['PRIVACY_NOTICE_' + locale.toUpperCase()];
const required = ['ALLOWED_ORIGINS','CRM_INQUIRY_SECRET','CRM_SIWC_BYPASS_TOKEN'];
const configured = (env, keys) => keys.every(key => typeof env[key] === 'string' && env[key].trim());
const ready = (env, locale='pl') => Boolean(notice(env, locale)?.trim()) && configured(env, required);
const mailReady = env => configured(env, ['RESEND_API_KEY','CONTACT_FROM','CONTACT_TO']);

async function responseJson(response) {
  try { return await response.json(); } catch { return null; }
}

export async function handleInquiry(request, env, send = fetch) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const locale = url.searchParams.get('lang') || 'pl';
    const available = Object.hasOwn(locales, locale) && ready(env, locale);
    if (url.searchParams.get('diagnostics') === 'configuration') {
      const checks = Object.fromEntries([
        ...required,
        locale === 'pl' ? 'PRIVACY_NOTICE' : 'PRIVACY_NOTICE_' + locale.toUpperCase()
      ].map(key => [key, Boolean(env[key]?.trim())]));
      return json({ready:Boolean(available), checks});
    }
    return json({ready:Boolean(available), privacyNotice:available ? notice(env, locale) : ''});
  }
  if (request.method !== 'POST') return new Response(null, {status:405,headers:{Allow:'GET, POST'}});
  if (!configured(env, required)) return json({error:'Formularz nie jest jeszcze aktywny. Spróbuj ponownie później.'},503);
  const origins = env.ALLOWED_ORIGINS.split(',').map(s=>s.trim()).filter(Boolean);
  if (!origins.includes(request.headers.get('Origin'))) return json({error:'Odśwież stronę i spróbuj ponownie.'},403);
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json({error:'Nieprawidłowy format zapytania.'},415);
  // Bound actual streamed bytes, not only a caller-controlled Content-Length.
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    let size=0; const chunks=[];
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      size += value.byteLength;
      if (size > 24000) { await reader.cancel(); return json({error:'Zapytanie jest zbyt długie.'},413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset=0;
    for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
    data=JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({error:'Nieprawidłowa treść zapytania.'},400); }
  if (!data || Array.isArray(data) || typeof data !== 'object') return json({error:'Nieprawidłowe dane.'},400);
  const locale = data.locale ?? 'pl';
  if (typeof locale !== 'string' || !Object.hasOwn(locales, locale)) return json({error:'Nieprawidłowy język.'},400);
  if (!ready(env, locale)) return json({error:'Formularz nie jest jeszcze aktywny.'},503);
  const fields={};
  for (const [key,max] of Object.entries(limits)) {
    const value=data[key] ?? '';
    if(typeof value!=='string' || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return json({error:'Sprawdź długość i treść pól formularza.'},400);
    fields[key]=value.trim();
  }
  if(fields.website) return json({error:'Nie udało się przyjąć zapytania.'},400);
  if(!Object.hasOwn(intents,fields.intent) || !fields.name || fields.need.length<10 || !fields.markets || !/^[+\d\s().-]+$/.test(fields.phone) || fields.phone.replace(/\D/g,'').length<7 || fields.phone.replace(/\D/g,'').length>15 || (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(fields.requestId)) return json({error:'Uzupełnij wymagane pola i sprawdź telefon oraz e-mail.'},400);

  // CRM is the source of truth. Retries reuse external_id and cannot duplicate the inquiry.
  const inbound = {
    external_id:`hubalk-form:${fields.requestId}`,
    language:locale,
    company_name:fields.company || `Kontakt — ${fields.name}`,
    email:fields.email,
    phone:fields.phone,
    answers:{
      'cel współpracy':intents[fields.intent],
      'produkt, branża i potrzeba':fields.need,
      'skąd → dokąd':fields.markets,
      'ilość, termin i warunki':fields.details,
      'imię':fields.name,
      'preferowana pora kontaktu':fields.callback
    }
  };
  let saved;
  try {
    const result=await send(env.CRM_INBOUND_URL?.trim() || 'https://app.hubalk.pl/api/crm/inbound',{
      method:'POST',
      headers:{Authorization:`Bearer ${env.CRM_SIWC_BYPASS_TOKEN}`,'X-Inquiry-Secret':env.CRM_INQUIRY_SECRET,'Content-Type':'application/json'},
      body:JSON.stringify(inbound),
      signal:AbortSignal.timeout(12000)
    });
    saved=await responseJson(result);
    if (!result.ok || !saved?.id) return json({error:'Nie udało się bezpiecznie zapisać zapytania. Spróbuj ponownie za chwilę.'},502);
  } catch {
    return json({error:'Nie udało się bezpiecznie zapisać zapytania. Spróbuj ponownie za chwilę.'},502);
  }

  // E-mail is optional and cannot erase or hide an inquiry already persisted in CRM.
  if (!mailReady(env)) return json({ok:true,inquiryId:saved.id,repeated:Boolean(saved.repeated)});
  const lines=[['Język formularza',locales[locale]],['Cel współpracy',intents[fields.intent]],['Imię',fields.name],['Firma',fields.company],['Telefon',fields.phone],['E-mail',fields.email],['Produkt / potrzeba',fields.need],['Kierunek handlu',fields.markets],['Ilość, termin, warunki',fields.details],['Preferowany kontakt',fields.callback]];
  const mail={from:env.CONTACT_FROM,to:[env.CONTACT_TO],subject:`Hubalk Partners — nowe zapytanie: ${intents[fields.intent]}`,text:'NOWE ZAPYTANIE — Hubalk Partners\n\n'+lines.map(([key,value])=>`${key}:\n${value || 'Nie podano'}`).join('\n\n')+'\n\nZapytanie zostało zapisane w CRM.\nIdentyfikator formularza: '+fields.requestId+'\nIdentyfikator CRM: '+saved.id};
  if(fields.email) mail.reply_to=fields.email;
  try {
    const result=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`hubalk/${fields.requestId}`},body:JSON.stringify(mail),signal:AbortSignal.timeout(12000)});
    const receipt=await responseJson(result);
    if (!result.ok || !receipt?.id) return json({ok:true,inquiryId:saved.id,repeated:Boolean(saved.repeated),notification:'failed'});
    return json({ok:true,inquiryId:saved.id,repeated:Boolean(saved.repeated),notification:'sent'});
  } catch {
    return json({ok:true,inquiryId:saved.id,repeated:Boolean(saved.repeated),notification:'failed'});
  }
}
