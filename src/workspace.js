const {h,shell,place}=require('./views');
const {source}=require('./data');
const {comparison,coverage}=require('./insights');

function coverageView(c,store) {
  const {t,link}=c;
  const totals=coverage(store.list());
  const count=(label,value,help)=>`<article class="panel pad coverage-card"><small>${label}</small><strong>${value}</strong><p>${help}</p></article>`;
  const sourceLink=s=>`<a href="${h(s.url)}" target="_blank" rel="noreferrer">${h(t(...s.name))}</a>`;
  const rows=totals.classifications.map(i=>`<tr><th scope="row">${h(i.kind)}</th><td>${i.count}</td><td>${i.area} ha</td></tr>`).join('');
  return shell(c,t('Evidence coverage','साक्ष्य कवरेज'),`
    <div class="crumb">${place(c)}</div><h1>${t('Evidence coverage','साक्ष्य कवरेज')}</h1>
    <p class="intro">${t('Understand which records are available before making a land decision.','भूमि संबंधी निर्णय से पहले उपलब्ध अभिलेखों को समझें।')}</p>
    <div class="coverage-grid">${count(t('Indexed khasras','सूचीबद्ध खसरे'),totals.count,t('One historical holding','एक ऐतिहासिक खाता'))}
    ${count(t('Recorded area','दर्ज क्षेत्र'),totals.area+' ha',t('Sum of archived entries','अभिलेखों का कुल क्षेत्र'))}
    ${count(t('Linked cadastral sheets','जुड़े खसरा नक्शे'),totals.linked+' / '+totals.count,t('Historical sheet evidence','ऐतिहासिक नक्शा साक्ष्य'))}
    ${count(t('Verified GPS boundaries','सत्यापित GPS सीमाएँ'),totals.preciseBoundaries,t('Official geometry pending','आधिकारिक सीमा डेटा लंबित'))}</div>
    <section class="panel pad"><h2>${t('Archive timeline','अभिलेख समयरेखा')}</h2>
    <p><b>2018</b> — ${t('Jamabandi base year','जमाबंदी आधार वर्ष')}</p>
    <p><b>${source.sources.jamabandi.issued}</b> — ${sourceLink(source.sources.jamabandi)}</p>
    <p><b>${source.sources.sheets.issued}</b> — ${sourceLink(source.sources.sheets)}</p>
    <p>${totals.agreement} ${t('parcels agree on comparable fields;','खसरों के उपलब्ध क्षेत्र मेल खाते हैं;')} ${totals.differences} ${t('have differences in comparable fields.','के उपलब्ध क्षेत्रों में अंतर है।')}</p>
    <p class="note">${t('Current ownership, mutation and litigation status remain unverified for every parcel. These are archived copies.','सभी खसरों की वर्तमान स्वामित्व, नामांतरण और मुकदमे की स्थिति अप्रमाणित है। ये ऐतिहासिक प्रतियां हैं।')}</p></section>
    <section class="panel pad"><h2>${t('Land classifications','भूमि वर्गीकरण')}</h2>
    <div class="compare"><table><thead><tr><th>${t('Classification','वर्ग')}</th><th>${t('Parcels','खसरे')}</th><th>${t('Area','क्षेत्र')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
    <section class="panel pad"><h2>${t('Records with two sources','दो स्रोत वाले अभिलेख')}</h2>
    ${Object.keys(source.sheets).map(k=>`<p><a href="${link('/plot',{k})}">${h(k)}</a> · ${h(source.sheets[k].area)} ha</p>`).join('')}
    <a class="button" href="${link('/compare',{a:'1811/5299',b:'2252',c:'2253'})}">${t('Compare the three mapped parcels','तीनों नक्शों वाले खसरों की तुलना करें')}</a></section>`, 'coverage');
}

function compareView(c,store,selected,print=false) {
  const {t,link}=c;
  const all=store.list();
  const labels=[t('First khasra','पहला खसरा'),t('Second khasra','दूसरा खसरा'),t('Third khasra (optional)','तीसरा खसरा (वैकल्पिक)')];
  const picker=(key,index)=>`<label>${labels[index]}<select name="${key}"><option value="">${t('Choose parcel','खसरा चुनें')}</option>${all.map(p=>`<option value="${h(p.khasra)}" ${p.khasra===selected[index]?'selected':''}>${h(p.khasra)} · ${p.area} ha</option>`).join('')}</select></label>`;
  const plots=selected.filter(Boolean).map(k=>store.plot(k));
  const status=parcel=>{
    const v=comparison(parcel).status;
    return v==='unavailable'?t('Second copy unavailable','दूसरी प्रति अनुपलब्ध'):v==='differs'?t('Difference found','अंतर मिला'):t('Comparable fields agree','उपलब्ध क्षेत्र मेल खाते हैं');
  };
  const fields=[
    [t('Recorded area','दर्ज क्षेत्र'),p=>p.area+' ha'],
    [t('Khata / previous','खाता / पूर्व खाता'),()=>source.holding.khata+' / '+source.holding.oldKhata],
    [t('Landholder','भूमि धारक'),()=>t(...source.holding.landholder)],
    [t('Classification','वर्ग'),p=>p.kind],
    [t('Historical comparison','ऐतिहासिक तुलना'),status],
    [t('Cadastral sheet','खसरा नक्शा'),p=>source.sheets[p.khasra]?`<a href="${h(source.sources.sheets.url+'#page='+source.sheets[p.khasra].page)}" rel="noreferrer" target="_blank">${t('Open sheet','नक्शा खोलें')} ${source.sheets[p.khasra].page}</a>`:t('Unavailable','अनुपलब्ध')],
    [t('Map precision','नक्शा सटीकता'),()=>t('Village reference only','केवल ग्राम संदर्भ')],
    [t('Current title / litigation','वर्तमान स्वामित्व / मुकदमा'),()=>t('Unverified','अप्रमाणित')],
  ];
  const table=plots.length?`<div class="compare"><table class="parcel-compare"><thead><tr><th scope="col">${t('Field','क्षेत्र')}</th>${plots.map(p=>`<th scope="col"><a href="${link('/plot',{k:p.khasra})}">${h(p.khasra)}</a></th>`).join('')}</tr></thead><tbody>${fields.map(([label,value],i)=>`<tr><th scope="row">${label}</th>${plots.map(p=>`<td>${i===5?value(p):h(value(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p>${t('Choose up to three parcels to compare.','तुलना के लिए तीन खसरे तक चुनें।')}</p>`;
  return shell(c,t('Parcel comparison','खसरा तुलना'),`<div class="crumb">${place(c)}</div><h1>${t('Parcel comparison','खसरा तुलना')}</h1>
    <p class="intro">${t('Compare recorded area, ownership evidence, source coverage and unresolved checks.','दर्ज क्षेत्र, स्वामित्व साक्ष्य, स्रोत तथा शेष जांचों की तुलना करें।')}</p>
    ${print?'':`<form action="/compare" class="panel pad comparison-form">${c.hi?'<input type="hidden" name="lang" value="hi">':''}${['a','b','c'].map(picker).join('')}<button>${t('Compare parcels','खसरों की तुलना करें')}</button></form>`}
    <section class="panel pad"><h2>${t('Side-by-side evidence','साक्ष्य तुलना')}</h2>${table}
    <p class="note">${t('Matching historical entries do not establish current title or a shared boundary. Verify official records and demarcation.','ऐतिहासिक प्रविष्टियों का मेल वर्तमान स्वामित्व या साझा सीमा प्रमाणित नहीं करता। आधिकारिक अभिलेख और सीमांकन जांचें।')}</p>
    ${!print&&plots.length?`<a class="outline" href="${link('/compare',{a:selected[0],b:selected[1],c:selected[2],print:'1'})}">${t('Open printable comparison','मुद्रण योग्य तुलना खोलें')}</a>`:''}</section>`, 'compare');
}

module.exports={coverageView,compareView};
