const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {openStore,source,normalize} = require('./src/data');
const {context,shell,lookup,detail,row,h} = require('./src/views');
const {coverageView,compareView} = require('./src/workspace');
const {renderPdf} = require('./src/reports');
const hashPassword = promisify(crypto.scrypt);
const css = fs.readFileSync(path.join(__dirname,'public/style.css'),'utf8');
const modes = ['khasra','khata','name'];
const fingerprint = value => crypto.createHash('sha256').update(value).digest('hex');
const now = () => Date.now();

async function formBody(req) {
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return null;
  let bytes = 0; const chunks = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) return null; chunks.push(chunk); }
  return new URLSearchParams(Buffer.concat(chunks).toString());
}
function account(c, msg='', k='') {
  const {t,link}=c;
  const form=(signup)=>`<form method="post" action="${link(signup?'/register':'/login')}"><h2>${signup?t('Create account','खाता बनाएँ'):t('Sign in','लॉग इन')}</h2>
  <input type="hidden" name="k" value="${h(k)}"><label>${t('Username','उपयोगकर्ता नाम')}<input name="username" autocomplete="username" pattern="[A-Za-z0-9_]{3,40}" title="3–40 · A–Z, 0–9, _" required></label>
  <label>${t('Password','पासवर्ड')}<input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" ${signup?'minlength="12"':''} maxlength="128" required></label>
  ${signup?`<p>${t('Use at least 12 characters.','कम से कम 12 अक्षर रखें।')}</p><label><input class="agreement" type="checkbox" name="agree" value="yes" required> ${t('I accept the','मैं सहमत हूँ —')} <a href="${link('/terms')}">${t('terms and privacy notice','शर्तें और गोपनीयता')}</a></label>`:''}
  <button>${signup?t('Create account','खाता बनाएँ'):t('Sign in','लॉग इन')}</button></form>`;
  return shell(c,t('Your account','आपका खाता'),`<h1>${t('Your workspace','आपका कार्यक्षेत्र')}</h1><p class="intro">${t('Save parcels and keep your last 20 searches on this device’s server.','इस डिवाइस के सर्वर पर खसरे और अपनी पिछली 20 खोजें सहेजें।')}</p>${msg?`<p role="alert" class="notice">${h(msg)}</p>`:''}<div class="account-grid">${form(false)}${form(true)}</div>`,'account');
}

function createApp(filename=process.env.DATABASE_PATH || path.join(__dirname,'var','kshetra.sqlite')) {
  const store=openStore(filename), {db}=store, limits=new Map();
  function limited(key, max, interval){
    const time=now(); let item=limits.get(key);
    if (!item || item.end<=time) {item={count:0,end:time+interval};limits.set(key,item);}
    return ++item.count > max;
  }
  const cleanup=setInterval(()=>{for(const [k,v] of limits) if(v.end<=now()) limits.delete(k);
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
    db.prepare('DELETE FROM access_log WHERE at<?').run(now()-30*86400000);
  },60000).unref();
  const app=http.createServer({headersTimeout:15000,requestTimeout:30000,keepAliveTimeout:5000,maxHeaderSize:16384},async(req,res)=>{
    const send=(code,body,type='text/html; charset=utf-8',extra={})=>{
      res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
        'Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
        'Content-Security-Policy':"default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",...extra});res.end(body);
    };
    const redirect=(location,extra={})=>{res.writeHead(303,{Location:location,'Cache-Control':'no-store',...extra});res.end();};
    try {
      const host=req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return send(400,'Invalid host','text/plain');
      const url=new URL(req.url,'http://'+host), sp=url.searchParams, route=url.pathname;
      if (url.origin!=='http://'+host || url.search.length>1000) return send(400,'Invalid URL','text/plain');
      if (req.method==='POST' && req.headers.origin!==url.origin) return send(403,'Invalid origin','text/plain');
      const ip=req.socket.remoteAddress||'local';
      if (limited('all:'+ip,360,60000)) return send(429,'Too many requests','text/plain',{'Retry-After':'60'});
      const token=(req.headers.cookie || '').match(/(?:^|;\s*)ks_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const user=token?db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(fingerprint(token),now()):null;
      const c=context(url,user), {t,link}=c;
      const to=(route,params)=>link(route,params).replaceAll('&amp;','&');
      const error=(code,message)=>send(code,shell(c,t('Lookup status','खोज की स्थिति'),`<div class="panel pad narrow"><h2>${h(message)}</h2><a href="${link('/')}">${t('Back to lookup','खोज पर लौटें')}</a></div>`));
      if (req.method==='GET') {
        if (route==='/healthz') { db.prepare('SELECT 1 FROM plots LIMIT 1').get(); return send(200,JSON.stringify({status:'ok',coverage:'historical'}),'application/json'); }
        if (route==='/style.css') return send(200,css,'text/css; charset=utf-8');
        if (route==='/favicon.ico') return send(204,'');
        if (route==='/index.html') return redirect(to('/'));
        if (route==='/dashboard.html') return redirect(to('/saved'));
        if (route==='/coverage') return send(200,coverageView(c,store));
        if (route==='/compare') {
          const selected=['a','b','c'].map(k=>normalize(sp.get(k)||''));
          const populated=selected.filter(Boolean);
          if (populated.some(k=>!store.plot(k))||new Set(populated).size!==populated.length)
            return error(400,t('Choose distinct khasras from this archive','इस अभिलेख से अलग-अलग खसरे चुनें'));
          return send(200,compareView(c,store,selected,sp.get('print')==='1'));
        }
        if (route==='/') {
          const mode=sp.get('by')||'khasra', q=sp.get('q')?.trim()||'';
          if (!['all','sheets'].includes(sp.get('filter')||'all')||!modes.includes(mode)||q.length>80||(sp.has('page')&&!/^[1-9]\d{0,3}$/.test(sp.get('page'))))
            return error(400,t('Invalid search','अमान्य खोज'));
          if (q && !sp.has('page') && user) {
            db.exec('BEGIN');
            try {
              db.prepare('DELETE FROM searches WHERE user_id=? AND mode=? AND term=?').run(user.id,mode,q);
              db.prepare('INSERT INTO searches(user_id,mode,term) VALUES(?,?,?)').run(user.id,mode,q);
              db.prepare('DELETE FROM searches WHERE user_id=? AND id NOT IN (SELECT id FROM searches WHERE user_id=? ORDER BY id DESC LIMIT 20)').run(user.id,user.id);
              db.exec('COMMIT');
            } catch(e){db.exec('ROLLBACK');throw e;}
          }
          return send(200,lookup(c,store,sp));
        }
        if (route==='/plot'||route==='/report.pdf'||route==='/report') {
          const p=store.plot(normalize(sp.get('k')||''));
          if (!p) return error(404,t('Khasra outside this archive','यह खसरा संग्रह में नहीं मिला'));
          store.audit(user,p.khasra);
          const saved=user && db.prepare('SELECT 1 FROM saves WHERE user_id=? AND village=? AND khasra=?').get(user.id,source.scope,p.khasra);
          const html=detail(c,p,saved,route!=='/plot');
          if(route!=='/report.pdf') return send(200,html,'text/html; charset=utf-8',
            route==='/plot'&&c.showMap?{'Content-Security-Policy':"default-src 'none'; style-src 'self'; img-src 'self'; frame-src https://www.openstreetmap.org; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}:{});
          if (limited('pdf:'+ip,12,60000)) return error(429,t('Report limit reached. Retry in one minute.','एक मिनट बाद पुनः प्रयास करें।'));
          try {const pdf=await renderPdf(html,css);return send(200,pdf,'application/pdf',{'Content-Disposition':'attachment; filename="Kshetra-'+p.khasra.replaceAll('/','-')+'-'+(c.hi?'hi':'en')+'.pdf"'});}
          catch {return send(503,shell(c,t('PDF unavailable','पीडीएफ अनुपलब्ध'),`<article class="panel pad"><h2>${t('PDF renderer unavailable or busy','पीडीएफ सेवा अनुपलब्ध या व्यस्त है')}</h2><p>${t('Open the print view and choose Save as PDF in your browser.','प्रिंट दृश्य खोलें और ब्राउज़र में PDF सहेजें चुनें।')}</p><a href="${link('/report',{k:p.khasra})}">${t('Open print view','प्रिंट दृश्य खोलें')}</a></article>`));}
        }
        if (route==='/account') return send(200,account(c,'',sp.get('k')||''));
        if (route==='/saved'||route==='/history'){
          if(!user)return redirect(to('/account'));
          const saved=route==='/saved', title=saved?t('Saved parcels','सहेजे गए खसरे'):t('Search history','खोज इतिहास');
          const content=saved?db.prepare('SELECT p.* FROM saves s JOIN plots p USING(village,khasra) WHERE s.user_id=? ORDER BY CAST(p.khasra AS INTEGER)').all(user.id).map(p=>row(c,p)).join(''):
            db.prepare('SELECT mode,term FROM searches WHERE user_id=? ORDER BY id DESC').all(user.id).map(r=>`<a class="history-row" href="${link('/',{by:r.mode,q:r.term})}">${h(r.term)} ↗</a>`).join('');
          const clear=!saved&&content?`<form method="post" action="${link('/clear-history')}"><button class="outline">${t('Clear history','इतिहास मिटाएँ')}</button></form>`:'';
          return send(200,shell(c,title,`<h1>${title}</h1><div class="panel pad">${content||t('No entries yet.','अभी कोई प्रविष्टि नहीं है।')}${clear}</div>`,saved?'saved':'history'));
        }
        if(route==='/terms')return send(200,shell(c,t('Terms & privacy','शर्तें और गोपनीयता'),`<article class="panel pad narrow"><h1>${t('Terms & privacy','शर्तें और गोपनीयता')}</h1><p>${t('This local research pilot displays historical public-institution entries. Confirm present ownership and boundaries with the revenue office. The linked copies are informational.','यह स्थानीय शोध पायलट सार्वजनिक संस्थाओं की ऐतिहासिक प्रविष्टियाँ दिखाता है। वर्तमान स्वामित्व और सीमाएँ राजस्व कार्यालय से सत्यापित करें। लिंक की गई प्रतियाँ जानकारी के लिए हैं।')}</p><p>${t('Accounts store a username and salted password hash. Signed-in searches retain the last 20 queries, and saved parcels belong to your account. Parcel access logs retain a parcel key, time and account ID where present for up to 30 days while the service runs. Sessions expire after seven days.','खाते में उपयोगकर्ता नाम और पासवर्ड का सुरक्षित हैश रखा जाता है। लॉग इन खाते की पिछली 20 खोजें और सहेजे खसरे निजी रहते हैं। चालू सेवा में खसरा एक्सेस लॉग, समय और उपलब्ध खाता आईडी 30 दिन तक रखे जाते हैं। सत्र सात दिन में समाप्त होता है।')}</p><p>${t('You can remove saved parcels and clear your search history. Official links open government websites. Commercial redistribution and public deployment are outside this pilot.','आप सहेजे खसरे हटा सकते हैं और खोज इतिहास मिटा सकते हैं। आधिकारिक लिंक सरकारी वेबसाइट खोलते हैं। यह पायलट स्थानीय शोध के लिए है।')}</p></article>`));
        return error(404,t('Page unavailable','पृष्ठ उपलब्ध नहीं'));
      }
      if(req.method!=='POST')return error(405,t('Method unavailable','विधि उपलब्ध नहीं'));
      const form=await formBody(req); if(!form)return error(400,t('Invalid form','अमान्य फ़ॉर्म'));
      if(route==='/register'||route==='/login'){
        if(limited('auth:'+ip,18,600000))return error(429,t('Please retry in ten minutes','दस मिनट बाद प्रयास करें'));
        const username=(form.get('username')||'').toLowerCase(),password=form.get('password')||'',k=form.get('k')||'';
        if(!/^[a-z0-9_]{3,40}$/.test(username)||!password.length||password.length>128) return send(400,account(c,t('Check username and password.','नाम और पासवर्ड जाँचें।'),k));
        let u=db.prepare('SELECT * FROM users WHERE username=?').get(username);
        if(route==='/register'){
          if(password.length<12||form.get('agree')!=='yes')return send(400,account(c,t('Use 12 characters and accept the terms.','12 अक्षर रखें और शर्तें स्वीकारें।'),k));
          const salt=crypto.randomBytes(16).toString('hex'),digest=(await hashPassword(password,salt,64)).toString('hex');
          const created=db.prepare('INSERT OR IGNORE INTO users(username,salt,digest) VALUES(?,?,?)').run(username,salt,digest);
          if(!created.changes)return send(409,account(c,t('Choose another username.','दूसरा नाम चुनें।'),k));
          u={id:created.lastInsertRowid};
        } else {
          const digest=await hashPassword(password,u?.salt||'kshetra-local-unused-salt',64);
          if(!u||!crypto.timingSafeEqual(Buffer.from(u.digest,'hex'),digest))return send(401,account(c,t('Sign-in details did not match.','लॉग इन विवरण नहीं मिले।'),k));
        }
        if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(fingerprint(token));
        const fresh=crypto.randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(fingerprint(fresh),u.id,now()+7*86400000);
        return redirect(store.plot(k)?to('/plot',{k}):to('/'),{'Set-Cookie':'ks_session='+fresh+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'});
      }
      if(!user)return redirect(to('/account'));
      if(route==='/save'){
        const p=store.plot(form.get('k')||''); if(!p||!['add','remove'].includes(form.get('action')))return error(400,t('Invalid parcel','अमान्य खसरा'));
        const sql=form.get('action')==='add'?'INSERT OR IGNORE INTO saves VALUES(?,?,?)':'DELETE FROM saves WHERE user_id=? AND village=? AND khasra=?';
        db.prepare(sql).run(user.id,source.scope,p.khasra);return redirect(to('/plot',{k:p.khasra}));
      }
      if(route==='/clear-history'){db.prepare('DELETE FROM searches WHERE user_id=?').run(user.id);return redirect(to('/history'));}
      if(route==='/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(fingerprint(token));return redirect(to('/'),{'Set-Cookie':'ks_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
      return error(404,t('Page unavailable','पृष्ठ उपलब्ध नहीं'));
    } catch(e) {console.error('Request failed:',e.code || e.name);if(!res.headersSent)send(500,'Service unavailable','text/plain');else res.end();}
  });
  app.on('close',()=>{clearInterval(cleanup);db.close();});
  return app;
}
if(require.main===module){
  const port=Number(process.env.PORT||3000);
  const server=createApp();
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close());
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port in use. Stop the other server or choose PORT in .env.':e.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>{
    const url='http://127.0.0.1:'+server.address().port;
    console.log('KshetraAI at '+url);
    if(process.argv.includes('--open') && process.platform==='win32')
      require('node:child_process').execFile('explorer.exe',[url],{windowsHide:true},()=>{});
  });
}
module.exports={createApp};


