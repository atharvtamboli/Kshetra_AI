process.env.LAYOUT_INDEX_FILE=require('node:path').join(__dirname,'fixtures/layout.json');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createApp}=require('../server');
const {matchPlot}=require('../src/schemes');
const {syncLayout}=require('../src/layout-history');
const {DatabaseSync}=require('node:sqlite');
const {drawPlan}=require('../src/approved-plan');
const {context}=require('../src/views');
const {validateGround}=require('../src/ground');

test('ground geometry requires an independently referenced interior point per plot',()=>{
  const survey={crs:'EPSG:4326',originalCrs:'test',source:'test plan',checkSource:'test field book',sourceDate:'2020-01-01',reportedRmseM:1,
    rings:{'B-11':[[0,0],[1,0],[1,1],[0,1],[0,0]],'B-12':[[1,0],[2,0],[2,1],[1,1],[1,0]]},
    checks:[{id:'B-11',point:[0.5,0.5]},{id:'B-12',point:[1.5,0.5]}]};
  assert.equal(validateGround(survey),survey);
  survey.checks[1].point=[0.5,0.5];
  assert.throws(()=>validateGround(survey),/check failed/);
});

test('a reviewed drawing targets distinct plot records, zooms and embeds its image for printing',()=>{
  const c=context(new URL('http://localhost'),null);
  const plan={width:200,height:100,bytes:Buffer.from('test image'),manifest:{source:'Test drawing',revisionDate:'2020-01-01',outlines:{'B-11':[[10,10],[20,10],[20,20]],'B-12':[[80,20],[90,20],[90,30]]}}};
  const overview=drawPlan(c,plan,'B-12');
  assert.match(overview,/viewBox="0 0 200 100"/);
  for(const id of ['B-11','B-12'])assert.ok(overview.includes('href="/schemes/layout/'+id+'"'));
  assert.doesNotMatch(drawPlan(c,plan,'B-11',false,4),/viewBox="0 0 200 100"/);
  assert.match(drawPlan(c,plan,'B-12',true),/data:image\/png;base64/);
});

test('layout versions preserve both readings, ignore repeat loads and isolate plots',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const data=structuredClone(require('./fixtures/layout.json'));
    syncLayout(db,data);syncLayout(db,data);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM layout_versions').get().n,2);
    data.plots[0].areaReadingSqFt='test revision';
    syncLayout(db,data);
    const versions=db.prepare('SELECT values_json FROM layout_versions WHERE plot=? ORDER BY id').all('B-11');
    assert.equal(versions.length,2);
    assert.notEqual(JSON.parse(versions[0].values_json).areaReadingSqFt,JSON.parse(versions[1].values_json).areaReadingSqFt);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM layout_versions WHERE plot=?').get('B-12').n,1);
  }finally{db.close();}
});

test('layout search keeps block, plot and provisional patta numbers distinct',()=>{
  for(const q of ['Example B 12','ब्लॉक B प्लॉट १२','b-12','12']) assert.equal(matchPlot(q).id,'B-12');
  assert.equal(matchPlot('B ११').id,'B-11');
  assert.equal(matchPlot('९००२','patta').id,'B-12');
  for(const q of ['D-12','B-13','9002','1811/5299','20/1']) assert.equal(matchPlot(q),null);
});

test('private scheme evidence, report and lookup remain scoped to the layout',async()=>{
  const app=createApp(':memory:');app.listen(0,'127.0.0.1');await once(app,'listening');
  const base='http://127.0.0.1:'+app.address().port;
  const get=route=>fetch(base+route,{redirect:'manual'});
  try {
    const root='/schemes/layout';
    assert.match(await (await get('/')).text(),/Have a residential plot sheet/);
    assert.equal((await get('/?q=B-12')).headers.get('location'),root+'?q=B-12');
    assert.equal((await get('/?q=12')).status,200);
    assert.match(await (await get('/?q=12')).text(),/Residential layout match/);
    assert.match(await (await get(root+'/B-12/history')).text(),/TEST-B12/);
    assert.match(await (await get(root+'?by=patta&q=9002')).text(),/Possible match from handwriting/);
    assert.match(await (await get(root+'?q=D-12')).text(),/No matching sheet/);
    assert.equal((await get(root+'?by=owner')).status,400);
    assert.equal((await get(root+'/B-13')).status,404);
    const plot=await get(root+'/B-12');
    assert.match(plot.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.match(await plot.text(),/TEST-B12/);
    const print=await (await get(root+'/B-11/report')).text();
    assert.match(print,/Report generated/);assert.match(print,/TEST-B11/);assert.match(print,/Unverified/);
    assert.doesNotMatch(print,/<script|type="file"|TEST-B12/);
    const comparison=await (await get(root+'/compare')).text();
    for(const label of ['TEST-B11','TEST-B12','9002','9001'])assert.ok(comparison.includes(label));
    const editor=await get(root+'/trace?from=B-12');
    assert.match(editor.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.match(await editor.text(),/B-12/);
    assert.match(await (await get(root+'/B-12?lang=hi')).text(),/लेआउट प्लॉट/);
  } finally {await new Promise(resolve=>app.close(resolve));}
});
