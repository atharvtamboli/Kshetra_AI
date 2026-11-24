const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os'), path=require('node:path');
const {once}=require('node:events');
const {openStore,source}=require('../src/data');
const {createApp}=require('../server');

test('archived control totals and both editions of the three mapped plots',()=>{
  const store=openStore(':memory:');
  try{
    assert.equal(store.list().length,98);
    assert.equal(store.list().reduce((n,p)=>n+Math.round(Number(p.area)*10000),0),9103300);
    for(const [k,s] of Object.entries(source.sheets))assert.equal(store.plot(k).area,s.area);
    assert.equal(store.search('khasra','१८११ / ५२९९')[0].khasra,'1811/5299');
    assert.equal(store.search('khasra','1811').length,0);
    for(const name of ['वन विभाग','van vibhaag','Forest Departmnt','राजस्थान सरकार'])assert.equal(store.search('name',name).length,98);
    assert.equal(store.search('name','unrelated person').length,0);
    for(const khata of ['९०५','850'])assert.equal(store.search('khata',khata).length,98);
  }finally{store.db.close();}
});

test('account isolation, saved parcels, history, restart and request errors',async()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'kshetra-test-'));
  const file=path.join(dir,'db.sqlite');
  let app,base;
  async function start(){app=createApp(file);app.listen(0,'127.0.0.1');await once(app,'listening');base='http://127.0.0.1:'+app.address().port;}
  async function stop(){if(!app?.listening)return;await new Promise(r=>app.close(r));}
  const get=(route,cookie='')=>fetch(base+route,{headers:{cookie},redirect:'manual'});
  const post=(route,fields,cookie='')=>fetch(base+route,{method:'POST',body:new URLSearchParams(fields),headers:{origin:base,cookie},redirect:'manual'});
  async function signup(username){const res=await post('/register',{username,password:'a test password only',agree:'yes'});assert.equal(res.status,303);return res.headers.get('set-cookie').split(';')[0];}
  try{
    await start();
    // Browser form POSTs need a same-origin Origin header. A no-referrer
    // policy on the form document turns it into "null" in Chromium.
    assert.equal((await get('/account')).headers.get('referrer-policy'),'same-origin');
    const alice=await signup('alice'),bob=await signup('bob');
    assert.equal((await post('/save',{k:'2252',action:'add'},alice)).status,303);
    assert.match(await (await get('/saved',alice)).text(),/class="plot-row"/);
    assert.doesNotMatch(await (await get('/saved',bob)).text(),/class="plot-row"/);
    assert.equal((await get('/plot?k=99999')).status,404);
    assert.equal((await get('/?by=invalid&q=905')).status,400);
    const partial=await (await get('/?by=khasra&q=1811')).text();
    assert.match(partial,/No match in this archive/);
    const record=await (await get('/plot?k=2252&lang=hi')).text();
    const approximate=await get('/plot?k=2252');
    const fallback=await approximate.text();
    assert.match(fallback,/Village-level location/);
    assert.match(fallback,/24\.573150, 73\.653100/);
    assert.match(fallback,/position and boundary of this individual khasra are unverified/);
    assert.doesNotMatch(fallback,/<iframe/);
    assert.doesNotMatch(approximate.headers.get('content-security-policy'),/frame-src/);
    const mapped=await get('/plot?k=2252&map=1');
    const mappedHtml=await mapped.text();
    assert.match(mappedHtml,/<iframe class="village-map"/);
    assert.match(mappedHtml,/www\.openstreetmap\.org\/export\/embed\.html/);
    assert.match(mapped.headers.get('content-security-policy'),/frame-src https:\/\/www\.openstreetmap\.org/);
    const report=await get('/report?k=2252&map=1');
    const reportHtml=await report.text();
    assert.match(reportHtml,/Village-level location/);
    assert.doesNotMatch(reportHtml,/<iframe/);
    assert.match(record,/भूमि धारक/);assert.match(record,/9\.8600/);assert.match(record,/#page=2/);
    await get('/?by=khasra&q=2252',alice);
    assert.match(await (await get('/history',alice)).text(),/class="history-row"/);
    assert.doesNotMatch(await (await get('/history',bob)).text(),/class="history-row"/);
    await stop();await start();
    assert.match(await (await get('/saved',alice)).text(),/2252/);
    assert.equal((await fetch(base+'/save',{method:'POST',headers:{origin:'http://elsewhere.invalid',cookie:alice},body:new URLSearchParams({k:'2252',action:'remove'})})).status,403);
    await post('/save',{k:'2252',action:'remove'},alice);
    assert.doesNotMatch(await (await get('/saved',alice)).text(),/class="plot-row"/);
    await post('/clear-history',{},alice);
    assert.doesNotMatch(await (await get('/history',alice)).text(),/class="history-row"/);
    await post('/logout',{},alice);
    assert.equal((await get('/saved',alice)).status,303);
    assert.equal((await post('/login',{username:'alice',password:'bad'})).status,401);
    assert.equal((await post('/login',{username:'alice',password:'a test password only'})).status,303);
  }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});

