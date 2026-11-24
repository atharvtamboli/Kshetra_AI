// Run explicitly on a machine with Chrome/Edge installed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openStore}=require('../src/data');
const {context,detail}=require('../src/views');
const {renderPdf}=require('../src/reports');

(async()=>{
  const store=openStore(':memory:');
  try {
    const css=fs.readFileSync(require('node:path').join(__dirname,'../public/style.css'),'utf8');
    for(const language of ['en','hi']){
      const c=context(new URL('http://localhost/report?k=2252&lang='+language),null);
      const html=detail(c,store.plot('2252'),false,true);
      assert.match(html,/9\.8600/);
      assert.doesNotMatch(html,/<iframe/);
      const pdf=await renderPdf(html,css);
      assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
      assert.ok(pdf.length>10000,'Expected a rendered parcel report with content');
    }
    console.log('PASS: English and Hindi browser-rendered parcel PDFs');
  } finally {
    store.db.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

