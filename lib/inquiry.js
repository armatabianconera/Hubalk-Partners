const intents = {sell: 'Sprzedaż', buy: 'Zakup', other: 'Nowy rynek / inny temat'};
const limits = {name:100, company:160, phone:30, email:254, need:3000, markets:200, details:2000, callback:200, website:200, requestId:36, intent:10};
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const locales = {pl: 'polski', hu: 'węgierski', sh: 'serbsko-chorwacki', en: 'angielski'};
const notice = (env, locale) => locale === 'pl' ? env.PRIVACY_NOTICE : env['PRIVACY_NOTICE_' + locale.toUpperCase()];
const ready = (env, locale='pl') => Boolean(notice(env, locale)?.trim()) && ['RESEND_API_KEY','CONTACT_FROM','CONTACT_TO','ALLOWED_ORIGINS'].every(key => typeof env[key] === 'string' && env[key].trim());
export async function handleInquiry(request, env, send = fetch) {
  if (request.method === 'GET') {
    const locale = new URL(request.url).searchParams.get('lang') || 'pl';
    const available = Object.hasOwn(locales, locale) && ready(env, locale);
    return json({ready:Boolean(available), privacyNotice:available ? notice(env, locale) : ''});
  }
  if (request.method !== 'POST') return new Response(null, {status:405,headers:{Allow:'GET, POST'}});
  if (!['RESEND_API_KEY','CONTACT_FROM','CONTACT_TO','ALLOWED_ORIGINS'].every(key => env[key]?.trim())) return json({error:'Formularz nie jest jeszcze aktywny. Spróbuj ponownie później.'},503);
  const origins = env.ALLOWED_ORIGINS.split(',').map(s=>s.trim());
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
  const lines=[['Język formularza',locales[locale]],['Cel współpracy',intents[fields.intent]],['Imię',fields.name],['Firma',fields.company],['Telefon',fields.phone],['E-mail',fields.email],['Produkt / potrzeba',fields.need],['Kierunek handlu',fields.markets],['Ilość, termin, warunki',fields.details],['Preferowany kontakt',fields.callback]];
  const mail={from:env.CONTACT_FROM,to:[env.CONTACT_TO],subject:`Hubalk Partners — nowe zapytanie: ${intents[fields.intent]}`,text:'NOWE ZAPYTANIE — Hubalk Partners\n\n'+lines.map(([key,value])=>`${key}:\n${value || 'Nie podano'}`).join('\n\n')+'\n\nKlient poprosił o kontakt w sprawie tego zapytania.\nIdentyfikator: '+fields.requestId};
  if(fields.email) mail.reply_to=fields.email;
  try {
    const result=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`hubalk/${fields.requestId}`},body:JSON.stringify(mail),signal:AbortSignal.timeout(12000)});
    const receipt=await result.json();
    if (!result.ok || !receipt.id) return json({error:'Nie udało się potwierdzić wysłania. Spróbuj ponownie za chwilę.'},502);
    return json({ok:true});
  } catch {return json({error:'Nie udało się potwierdzić wysłania. Spróbuj ponownie za chwilę.'},502);}
}
