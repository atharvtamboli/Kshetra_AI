const fs=require('node:fs');
const path=require('node:path');
const {h}=require('./views');
const fields={
  plotSchedule:['Plot schedule','प्लॉट अनुसूची'],parentKhasra:['Parent khasra','मूल खसरा'],
  conversionOrder:['Conversion order','रूपांतरण आदेश'],revision:['Layout revision','लेआउट संशोधन'],
  deed:['Deed reference','विलेख संदर्भ'],dimension:['Dimensions','आयाम'],frontage:['Frontage','अग्रभाग'],
  road:['Adjoining road','लगती सड़क'],neighbours:['Neighbouring plots','पड़ोसी प्लॉट'],
  area:['Recorded area and unit','दर्ज क्षेत्रफल व इकाई'],lineage:['Split or merger reference','विभाजन या विलय संदर्भ']
};
function loadEvidence(directory=path.join(__dirname,'../var/layout-evidence')){
  if(!fs.existsSync(directory))return [];
  return fs.readdirSync(directory).filter(n=>n.endsWith('.json')).sort().map(n=>{
    const row=JSON.parse(fs.readFileSync(path.join(directory,n),'utf8'));
    const url=new URL(row.url);
    const validText=k=>typeof row[k]==='string'&&row[k].trim()&&row[k].length<=250;
    if(!require('./schemes').records.has(row.plot)||!Object.hasOwn(fields,row.field)||
      !['value','locator','document','date'].every(validText)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||
      url.protocol!=='https:'||!url.hostname.endsWith('.gov.in')||url.username||url.password)
      throw Error('Invalid layout evidence file: '+n);
    return Object.fromEntries(['plot','field','value','locator','document','date','url'].map(k=>[k,row[k]]));
  });
}
function evidenceTable(c,claims) {
  if(!claims?.length)return '';
  const {t}=c;
  return `<section class="panel pad compare"><h2>${t('Referenced documents','संदर्भ दस्तावेज़')}</h2><table><tbody>${claims.map(r=>`<tr><th>${t(...fields[r.field])}</th><td>${h(r.value)}</td><td><a href="${h(r.url)}" rel="noreferrer">${h(r.document)} · ${h(r.locator)}</a> · ${h(r.date)}</td></tr>`).join('')}</tbody></table></section>`;
}
module.exports={loadEvidence,evidenceTable};
