const {source} = require('./data');
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const terms = { 'रास्ता':['Road / path','रास्ता'], 'मगरि':['Magri','मगरि'], 'पहाड़':['Hill','पहाड़'] };
function context(reqUrl, user) {
  const hi = reqUrl.searchParams.get('lang') === 'hi';
  const t = (en, hindi) => hi ? hindi : en;
  function link(route, params = {}) {
    const u = new URL(route, 'http://local');
    for (const [k,v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, v);
    if (hi) u.searchParams.set('lang','hi');
    return h(u.pathname + u.search);
  }
  const toggle = new URL(reqUrl);
  toggle.searchParams.set('lang',hi ? 'en':'hi');
  return {hi,t,link,user,toggle:h(toggle.pathname+toggle.search)};
}
function shell(c,title,body,section='search') {
  const {t,link,user}=c;
  const nav=(route,label,id)=>`<a ${section===id?'aria-current="page"':''} href="${link(route)}">${label}</a>`;
  return `<!doctype html><html lang="${c.hi?'hi':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h(title)} · KshetraAI</title><link rel="stylesheet" href="/style.css"></head><body>
  <a class="skip" href="#content">${t('Skip to content','मुख्य सामग्री पर जाएँ')}</a><header><div class="bar"><a class="brand" href="${link('/')}"><b class="brand-icon" aria-hidden="true">▧</b>Kshetra<span>AI</span></a>
  <nav>${nav('/',t('Lookup','खोज'),'search')}${nav('/saved',t('Saved','सहेजे गए'),'saved')}${nav('/history',t('History','इतिहास'),'history')}</nav>
  <div class="actions"><a lang="${c.hi?'en':'hi'}" href="${c.toggle}">${t('हिन्दी','English')}</a>${user?`<form method="post" action="${link('/logout')}"><button class="quiet">${t('Sign out','लॉग आउट')}</button></form>`:`<a class="outline" href="${link('/account')}">${t('Sign in','लॉग इन')}</a>`}</div></div></header>
  <main id="content" tabindex="-1">${body}</main><footer><b>KshetraAI</b><span>${t('Udaipur land records','उदयपुर भू-अभिलेख')}</span><a href="${link('/terms')}">${t('Terms & privacy','शर्तें और गोपनीयता')}</a></footer></body></html>`;
}
function place(c) {const {t}=c;return [t(...source.district),t(...source.tehsil),t(...source.village)].map(h).join(' <i> / </i> ');}
function row(c,p){
  const {t,link}=c;
  return `<a class="plot-row" href="${link('/plot',{k:p.khasra})}"><span><small>${t('Khasra','खसरा')}</small><strong>${h(p.khasra)}</strong></span><span>${h(t(...terms[p.kind]))}</span><span class="number">${p.area} ha</span><span aria-hidden="true">↗</span></a>`;
}
function lookup(c,store,sp){
  const {t,link}=c, mode=sp.get('by') || 'khasra', term=sp.get('q')?.trim() || '';
  const filter=sp.get('filter') || 'all';
  const matches=term?store.search(mode,term):store.list();
  const items=filter==='sheets'?matches.filter(p=>Object.hasOwn(source.sheets,p.khasra)):matches;
  const page=Math.max(1,Math.min(Math.ceil(items.length/10), Number(sp.get('page'))||1));
  const opt=(v,label)=>`<option value="${v}" ${v===mode?'selected':''}>${label}</option>`;
  const selected=term?t('Search results','खोज परिणाम'):t('Parcel index','खसरा सूची');
  const pageLink=(num,txt)=>`<a class="outline" href="${link('/',{by:mode,q:term,page:num,filter})}">${txt}</a>`;
  return shell(c,t('Parcel lookup','खसरा खोज'),`
  <section class="lookup-head"><div class="crumb">${place(c)}</div><h1>${t('Land record lookup','भू-अभिलेख खोज')}</h1>
  <p class="intro">${t('Search the archived revenue records for Sisarma, Girwa tehsil.','गिर्वा तहसील के सीसारमा गाँव के अभिलेख खोजें।')}</p>
  <form class="search" action="/" role="search"><input type="hidden" name="filter" value="${h(filter)}">${c.hi?'<input type="hidden" name="lang" value="hi">':''}<label>${t('Search by','खोज का प्रकार')}<select name="by">${opt('khasra',t('Khasra number','खसरा संख्या'))}${opt('khata',t('Khata number','खाता संख्या'))}${opt('name',t('Recorded name','दर्ज नाम'))}</select></label>
  <label class="grow">${t('Number or recorded name','संख्या या दर्ज नाम')}<input name="q" value="${h(term)}" maxlength="80" placeholder="${t('e.g. 1811/5299','जैसे १८११/५२९९')}" required></label><button>${t('Search records','अभिलेख खोजें')} &nbsp;→</button></form></section>
  <div class="filterbar" aria-label="${t('Filter parcels','खसरे छाँटें')}">${[['all',t('All parcels','सभी खसरे')],['sheets',t('With map sheet','नक्शे वाले')]].map(([key,label])=>`<a href="${link('/',{by:mode,q:term,filter:key})}" ${filter===key?'aria-current="true"':''}>${label}</a>`).join('')}</div>
  <div class="columns"><section class="panel"><div class="panel-head"><h2>${selected}</h2><span>${items.length} ${t('parcels','खसरे')}</span></div>
  ${term?`<p class="feedback">${h(term)} · ${mode==='name'?t('Name candidates in this holding','इस खाते में संभावित नाम'):mode==='khata'&&require('./data').normalize(term)===source.holding.oldKhata?t('Previous khata number','पुरानी खाता संख्या'):t('Exact number','सटीक संख्या')} <a href="${link('/')}">${t('Reset','हटाएँ')}</a></p>`:''}
  ${items.length?items.slice((page-1)*10,page*10).map(p=>row(c,p)).join(''):`<div class="empty"><h3>${filter==='sheets'&&matches.length?t('No linked map sheet','संबद्ध नक्शा उपलब्ध नहीं'):t('No match in this archive','इस संग्रह में कोई मिलान नहीं')}</h3><p>${filter==='sheets'&&matches.length?t('Choose All parcels to see the matching record.','मिलान देखने के लिए सभी खसरे चुनें।'):t('Coverage is limited to khata 905. Other village records may exist.','संग्रह खाता 905 तक सीमित है। गाँव में अन्य अभिलेख हो सकते हैं।')}</p></div>`}
  ${items.length>10?`<div class="pager">${page>1?pageLink(page-1,t('Previous','पिछला')):'<span></span>'}<span>${page} / ${Math.ceil(items.length/10)}</span>${page*10<items.length?pageLink(page+1,t('Next','अगला')):'<span></span>'}</div>`:''}</section>
  <aside><section class="panel aside"><div class="eyebrow">${t('Coverage','उपलब्धता')}</div><h2>${t('Sisarma archive','सीसारमा संग्रह')}</h2><dl>${pair(t('Jamabandi base year','जमाबंदी आधार वर्ष'),'2018')}${pair(t('Khata','खाता'),'905')}${pair(t('Indexed khasras','उपलब्ध खसरे'),store.list().length)}${pair(t('Linked map sheets','संबद्ध नक्शे'),Object.keys(source.sheets).length)}</dl>
  <p class="note">${t('Historical copies. Current ownership and subsequent changes require a fresh revenue record.','ऐतिहासिक प्रतियाँ। वर्तमान स्वामित्व और बाद के बदलावों के लिए नई राजस्व प्रति आवश्यक है।')}</p>
  ${evidence(c,source.sources.jamabandi,t('Sisarma, khata 905','सीसारमा, खाता 905'))}</section>
  <section class="panel aside"><h3>${t('Parcels with a map sheet','नक्शे वाले खसरे')}</h3>${Object.keys(source.sheets).map(k=>`<a class="sheet-link" href="${link('/plot',{k})}">${k}<span>↗</span></a>`).join('')}</section></aside></div>`);
}
function pair(key,value){return `<div><dt>${h(key)}</dt><dd>${h(value)}</dd></div>`;}
function official(url,label) {return `<a class="external" rel="noreferrer" href="${h(url)}" target="_blank">${h(label)} ↗</a>`;}
function evidence(c,s,locator,url=s.url){
  const {t}=c;
  return `<div class="source"><b>${official(url,t(...s.name))}</b><p>${h(locator)} · ${h(t(...s.issuer))}</p><small>${t('Copy issued','प्रति जारी')} ${s.issued} · ${t('Retrieved','प्राप्ति')} ${s.fetchedAt.replace('T',' ').slice(0,19)} UTC</small></div>`;
}
function fieldGuide(c,p,sheet){
  const {t}=c, holding=source.holding, sources=source.sources;
  const explanation=t('In this archived holding the Rajasthan Government is recorded as landholder. The Forest Department, Udaipur Range is recorded as cultivator. Its full share applies to khata 905. Present ownership needs a fresh record.',
    'इस पुराने खाते में राज्य सरकार भूमि धारक है। वन विभाग रेंज उदयपुर काश्तकार के रूप में दर्ज है। उसका पूरा हिस्सा खाता 905 में है। आज का स्वामित्व जानने के लिए नई जमाबंदी देखें।');
  const checks=[
    [t('Who is recorded today?','आज किसका नाम दर्ज है?'),official('https://apnakhata.rajasthan.gov.in/',t('Get the latest jamabandi for this village and khasra.','इस गाँव और खसरे की नई जमाबंदी लें।'))],
    [t('Has the holding changed?','क्या खाते में बदलाव हुआ है?'),official('https://apnakhata.rajasthan.gov.in/TrackMutationAvantan.aspx',t('Track a known mutation application with its token. Ask for the order and updated entry.','टोकन से नामांतरण आवेदन देखें। आदेश और नई प्रविष्टि माँगें।'))],
    [t('Where is the boundary?','जमीन की सीमा कहाँ है?'),t('Ask the tehsil office for official demarcation against the full khasra number.','तहसील में पूरे खसरा नंबर से सीमाज्ञान माँगें।')],
    [t('Any dispute or conversion?','कोई विवाद या भूमि रूपांतरण?'),t('Ask for parcel-linked case orders and any issued 90A order. These checks are outstanding.','खसरे से जुड़े न्यायालय के आदेश और जारी 90ए आदेश माँगें। ये जाँचें बाकी हैं।')]];
  const sheetUrl=sheet?sources.sheets.url+'#page='+sheet.page:null;
  const reference=(s,label,url)=>official(url,label)+' · '+s.issued+'<br><small>'+t('Retrieved','प्राप्ति')+' '+h(s.fetchedAt)+'</small>';
  const guide=`<article id="guide" class="panel pad field-guide"><h2>${t('Field checklist','मौके पर जाँच की सूची')}</h2><p>${explanation}</p><p>${reference(sources.jamabandi,t('Jamabandi · khata 905','जमाबंदी · खाता 905'),sources.jamabandi.url)}</p>${sheet?`<p>${reference(sources.sheets,t('Map sheet','खसरा नक्शा')+' '+sheet.page,sheetUrl)} · ${h(sheet.area)} ha</p>`:''}<ul>${checks.map(([q,action])=>`<li><b>${q}</b> ${action}</li>`).join('')}</ul></article>`;
  if(!sheet)return guide;
  const rows=[[t('Khasra','खसरा'),p.khasra,sheet.khasra],[t('Khata','खाता'),holding.khata,sheet.khata],
    [t('Area (ha)','क्षेत्रफल (हे.)'),p.area,sheet.area],[t('Cultivator','काश्तकार'),holding.cultivator[1],sheet.cultivator],
    [t('Landholder','भूमि धारक'),holding.landholder[1],null]];
  return guide+`<article id="comparison" class="panel pad"><h2>${t('Compare the copies','प्रतियों का मिलान')}</h2><div class="compare"><table><thead><tr><th>${t('Field','विवरण')}</th><th>${official(sources.jamabandi.url,t('Jamabandi','जमाबंदी'))}<br>${sources.jamabandi.issued}</th><th>${official(sheetUrl,t('Map sheet','नक्शा'))}<br>${sources.sheets.issued}</th><th>${t('Result','मिलान')}</th></tr></thead><tbody>${rows.map(([label,left,right])=>`<tr><th scope="row">${label}</th><td>${h(left)}</td><td>${h(right??'—')}</td><td>${right==null?t('Missing','उपलब्ध नहीं'):left===right?t('Agrees','समान'):t('Differs','अलग')}</td></tr>`).join('')}</tbody></table></div><p class="note">${t('Both area values are printed in the records. No boundary measurement was available.','दोनों क्षेत्रफल दस्तावेजों में दर्ज हैं। सीमा की माप उपलब्ध नहीं है।')}</p></article>`;
}
function detail(c,p,saved,print=false){
  const {t,link}=c, hold=source.holding, s=source.sources, sheet=source.sheets[p.khasra];
  const sheetUrl=sheet?s.sheets.url+'#page='+sheet.page:null;
  const summary=t('Historical record','ऐतिहासिक अभिलेख');
  const body=`<div class="crumb">${place(c)}</div><div class="title-line"><div><div class="eyebrow">${summary}</div><h1>${t('Khasra','खसरा')} ${h(p.khasra)}</h1></div>
  ${print?'':`<div class="actions">${c.user?`<form method="post" action="${link('/save')}"><input type="hidden" name="k" value="${h(p.khasra)}"><input type="hidden" name="action" value="${saved?'remove':'add'}"><button class="outline">${saved?t('Remove saved plot','सहेजा खसरा हटाएँ'):t('Save plot','खसरा सहेजें')}</button></form>`:`<a class="outline" href="${link('/account',{k:p.khasra})}">${t('Sign in to save','सहेजने के लिए लॉग इन')}</a>`}<a class="button" href="${link('/report.pdf',{k:p.khasra})}">${t('Download PDF','पीडीएफ डाउनलोड')} ↓</a></div>`}</div>
  <div class="summary"><div><small>${t('Recorded area','दर्ज क्षेत्रफल')}</small><strong>${p.area} <em>ha</em></strong></div><div><small>${t('Khata','खाता')}</small><strong>${hold.khata}</strong></div><div><small>${t('Jamabandi base year','जमाबंदी आधार वर्ष')}</small><strong>${hold.year}</strong></div></div>
  ${print?fieldGuide(c,p,sheet):`<nav class="record-links" aria-label="${t('Record sections','अभिलेख के भाग')}"><a href="#interests">${t('Recorded interests','दर्ज अधिकार')}</a><a href="#guide">${t('Field checklist','जाँच सूची')}</a>${sheet?`<a href="#comparison">${t('Compare copies','प्रतियों का मिलान')}</a>`:''}<a href="#map-sheet">${t('Map evidence','नक्शे का स्रोत')}</a></nav>`}
  <div class="columns"><section><article id="interests" class="panel pad"><h2>${t('Recorded interests','दर्ज अधिकार')}</h2>
  <dl>${pair(t('Landholder','भूमि धारक'),t(...hold.landholder))}${pair(t('Recorded cultivator (kashtkar)','दर्ज काश्तकार'),t(...hold.cultivator))}${pair(t('Cultivator’s share','काश्तकार का हिस्सा'),t(...hold.share))}${pair(t('Revenue classification','भूमि वर्गीकरण'),p.kind)}${pair(t('Previous khata','पुराना खाता'),hold.oldKhata)}${pair(t('Record period (Samvat)','अभिलेख अवधि (संवत)'),hold.samvat)}${pair(t('Possession / tenancy remarks','कब्ज़ा / किरायेदारी टिप्पणी'),t('Unverified','सत्यापित नहीं'))}</dl>
  ${print?'':`<p><a class="outline" href="${link('/',{by:'khata',q:hold.khata})}">${t('Explore khata','खाते के खसरे देखें')} ${h(hold.khata)} →</a></p>`}
  ${evidence(c,s.jamabandi,t('Sisarma · khata 905 · khasra ','सीसारमा · खाता 905 · खसरा ')+p.khasra)}</article>
  <article class="panel pad"><h2>${t('Record history','अभिलेख इतिहास')}</h2><p><b>13 Mar 2020</b> · ${t('Jamabandi copy issued for the 2018 base record.','2018 आधार वर्ष की जमाबंदी प्रति जारी।')}</p>
  ${sheet?`<p><b>12 Apr 2022</b> · ${t('Map extract also lists this khasra, area, cultivator and khata.','नक्शा प्रति में भी यही खसरा, क्षेत्रफल, काश्तकार और खाता दर्ज है।')}</p>`:''}
  <p class="muted">${t('Mutation orders, sales, inheritance, partition and loan history have not been checked.','नामांतरण आदेश, बिक्री, उत्तराधिकार, विभाजन और ऋण इतिहास की जाँच उपलब्ध नहीं है।')}</p></article></section>
  <aside><article class="panel aside flag"><div class="eyebrow">${t('Source-backed flag','स्रोत-आधारित संकेत')}</div><h2>${t('Government holding','राजकीय भूमि')}</h2><p>${t('The archived jamabandi names the state government as landholder.','पुरानी जमाबंदी में राज्य सरकार भूमि धारक के रूप में दर्ज है।')}</p><b>${t('High confidence in the archived entry','पुरानी प्रविष्टि पर उच्च विश्वास')}</b><p class="muted">${t('Source: 2018 jamabandi, copy issued 2020. Current status, litigation and 90A conversion are unchecked.','स्रोत: 2018 जमाबंदी, प्रति 2020। वर्तमान स्थिति, मुकदमे और 90ए रूपांतरण की जाँच नहीं हुई।')}</p></article>
  <article id="map-sheet" class="panel aside"><h2>${t('Cadastral map','खसरा नक्शा')}</h2>${sheet?`${evidence(c,s.sheets,t('Map sheet, page ','नक्शा, पृष्ठ ')+sheet.page+' · 1:'+sheet.scale,sheetUrl)}`:`<p>${t('No map sheet linked for this khasra.','इस खसरे का नक्शा उपलब्ध नहीं है।')}</p>`}<p class="note">${t('Georeferenced boundaries and computed area are unavailable. Official demarcation requires a survey.','भू-संदर्भित सीमाएँ और गणना किया क्षेत्रफल उपलब्ध नहीं हैं। आधिकारिक सीमांकन के लिए सर्वेक्षण आवश्यक है।')}</p></article></aside></div>
  ${print?'':fieldGuide(c,p,sheet)}
  ${print?`<p>${t('Report generated','रिपोर्ट तैयार')} ${new Date().toISOString()} · ${t('Informational historical extract.','सूचना हेतु ऐतिहासिक प्रति।')}</p>`:''}`;
  return shell(c,t('Khasra','खसरा')+' '+p.khasra,body);
}
module.exports = {h,context,shell,lookup,detail,row,place};

