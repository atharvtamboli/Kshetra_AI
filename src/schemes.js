const scheme = require('./layout-index');
const { normalize } = require('./data');
const { shell, h } = require('./views');

const root = '/schemes/layout';
const records = new Map(scheme.plots.map(plot => [plot.id, plot]));
const modes = new Set(['plot', 'patta']);

// A layout lot and a revenue khasra have separate identifiers and evidence.
function matchPlot(input, mode = 'plot') {
  const q = normalize(input);
  if (!q || !modes.has(mode)) return null;
  if (mode === 'patta') return scheme.plots.find(p => p.pattaReading === q) || null;
  const names=scheme.name.map(normalize);
  const term=names.reduce((v,n)=>v.startsWith(n+' ')?v.slice(n.length).trim():v,q);
  const id = term.match(/^(?:(?:block|ब्लॉक|ब्लाक)\s*)?([a-z]|सी)?\s*(?:(?:plot|प्लॉट|प्लाट)\s*)?(\d+)$/u);
  if(!id)return null;
  const hits=scheme.plots.filter(p=>p.id.split('-').at(-1)===id[2] && (!id[1]||p.id.split('-')[0].toLowerCase()===(id[1]==='सी'?'c':id[1])));
  return hits.length===1?hits[0]:null;
}

function crumb(c) {
  return [scheme.district, scheme.village, scheme.name].map(v => h(c.t(...v))).join(' / ');
}

function searchForm(c, mode, q) {
  const {t} = c;
  return `<form class="search scheme-search" action="${root}" role="search">
    ${c.hi ? '<input type="hidden" name="lang" value="hi">' : ''}
    <label>${t('Search by','खोज का आधार')}<select name="by">
    <option value="plot">${t('Block and plot','ब्लॉक और प्लॉट')}</option>
    <option value="patta" ${mode==='patta'?'selected':''}>${t('Tentative patta number','पट्टा संख्या का संभावित पाठ')}</option></select></label>
    <label class="grow">${t('Number on your sheet','प्रति पर लिखी संख्या')}<input name="q" maxlength="80" value="${h(q)}" placeholder="B-12" required></label>
    <button>${t('Find plot','प्लॉट खोजें')}</button></form>`;
}

function index(c, mode, q, plan=null) {
  const {t,link} = c;
  const hit = q && matchPlot(q,mode);
  const items = q ? (hit ? [hit] : []) : scheme.plots;
  const cards = items.map(p => `<a class="scheme-card" href="${link(root+'/'+p.id)}">
    <small>${crumb(c)} · ${t('Layout plot','लेआउट प्लॉट')}</small><strong>${p.id}</strong>
    <span>${t('Open marked plot','चिह्नित प्लॉट खोलें')} →</span></a>`).join('');
  return shell(c,t('Residential layout lookup','आवासीय प्लॉट खोज'),`<section class="lookup-head"><div class="crumb">${crumb(c)}</div>
    <h1>${t('Find your layout plot','अपना लेआउट प्लॉट खोजें')}</h1>
    <p class="intro">${t('Search the layout index by block and plot number. Add reviewed records locally to enable lookup.','ब्लॉक और प्लॉट से खोजें। समीक्षा किए हुए अभिलेख स्थानीय रूप से जोड़ें।')}</p>
    ${searchForm(c,mode,q)}</section>
    <p>${scheme.plots.length} ${t('indexed plots · scheme total unknown','सूचीबद्ध प्लॉट · योजना की कुल संख्या अज्ञात')}</p>${plan?`<figure>${require('./approved-plan').drawPlan(c,plan,hit?.id)}</figure>`:''}<section class="scheme-list"><h2>${q?t('Search results','खोज परिणाम'):t('Indexed plot sheets','उपलब्ध प्लॉट प्रतियाँ')}</h2>
    ${q && mode==='patta' && hit?`<p class="notice">${t('Possible match from handwriting. Check the original patta.','हस्तलिखित संख्या से संभावित मिलान। मूल पट्टा जाँचें।')}</p>`:''}
    ${cards?`<div class="scheme-cards">${cards}</div>`:`<div class="panel pad"><b>${t('No matching sheet in this index','इस सूची में मिलती हुई प्रति नहीं है')}</b><p>${t('Other plots may exist outside this local index.','इस स्थानीय सूची के बाहर अन्य प्लॉट हो सकते हैं।')}</p><a href="${link(root)}">${t('Show indexed sheets','दोनों प्रतियाँ देखें')}</a></div>`}
    </section><div class="trace-toolbar"><a class="outline" href="${link(root+'/compare')}">${t('Compare plots','दोनों प्लॉट की तुलना करें')}</a>
    <a class="button" href="${link(root+'/trace')}">${t('Index plots on your own plan','अपने प्लान पर प्लॉट दर्ज करें')}</a></div>`,'schemes');
}

function plotMap(c,p) {
  const {t} = c;
  const xs=p.outline.map(v=>v[0]), ys=p.outline.map(v=>v[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  const points=p.outline.map(([x,y])=>[x-cx,y-cy].join(',')).join(' ');
  return `<svg class="scheme-map" role="img" aria-label="${t('Approximate trace of the mark on sheet','प्रति के चिह्न का अनुमानित रेखांकन')} ${h(p.source)}" viewBox="-85 -45 170 90">
    <rect x="-85" y="-45" width="170" height="90" fill="#183e38"/>
    <g transform="rotate(${p.rotation})"><polygon points="${points}" fill="#336456" stroke="#e6ce8a" stroke-width="1.4" stroke-linejoin="round"/></g>
    <text text-anchor="middle" y="2.8" fill="#fffbea" font-family="sans-serif" font-size="8">${p.id}</text></svg>`;
}

function evidenceRows(c,p) {
  const {t} = c;
  const read=t('Transcribed','प्रतिलिखित'), review=t('Needs review','समीक्षा आवश्यक'), missing=t('Awaiting evidence','साक्ष्य लंबित');
  const row=(label,value,locator,status)=>[t(...label),value,p.source+' · '+t('sheet 1','प्रति 1')+' · '+locator,status];
  return [
    row(['Scheme / village','योजना / गाँव'],crumb(c),'Scheme heading',read),
    row(['Block / plot','ब्लॉक / प्लॉट'],p.id,'BLOCK NO. / P. NO.',read),
    row(['Patta number','पट्टा संख्या'],p.pattaReading+(p.correctedPatta?t(' (overwritten)',' (संशोधित)'):''),'PATTA NO.',review),
    row(['Sheet area','प्रति क्षेत्रफल'],p.areaReadingSqFt+' '+t('sq ft','वर्ग फुट'),'PLOT AREA',review),
    ...[['Dimensions','आयाम'],['Frontage','अग्रभाग'],['Adjoining road','लगती सड़क'],['Neighbouring plots','पड़ोसी प्लॉट']].map(label=>row(label,t('Reading unresolved','पाठ अस्पष्ट'),p.id,review)),
    ...[['Deed reference','विलेख संदर्भ'],['Parent khasra','मूल खसरा'],['Current holder','वर्तमान धारक'],['Conversion approval','रूपांतरण स्वीकृति'],['Ground location','भू-स्थिति'],['Source issue date','प्रति जारी होने की तिथि']].map(label=>[t(...label),t('Unverified','असत्यापित'),t('No supporting document indexed','समर्थक दस्तावेज़ उपलब्ध नहीं'),missing])
  ];
}

function compare(c) {
  const {t,link} = c;
  const cols=scheme.plots.map(p=>evidenceRows(c,p));
  return shell(c,t('Compare layout plots','लेआउट प्लॉट तुलना'),`<div class="crumb">${crumb(c)}</div><h1>${t('Compare indexed sheets','दोनों प्रतियों की तुलना')}</h1>
    <p class="intro">${t('Each column comes from a separate marked copy. Handwritten numbers need confirmation against the original patta.','हर स्तंभ एक अलग चिह्नित प्रति से है। हस्तलिखित संख्याओं का मिलान मूल पट्टे से करें।')}</p>
    <div class="panel pad compare"><table><thead><tr><th>${t('Sheet detail','प्रति विवरण')}</th>${scheme.plots.map(p=>`<th scope="col"><a href="${link(root+'/'+p.id)}">${p.id}</a><br><small>${h(p.source)}</small></th>`).join('')}</tr></thead><tbody>
    ${(cols[0]||[]).map(([label],i)=>`<tr><th scope="row">${label}</th>${cols.map(rows=>`<td>${h(rows[i][1])}<br><small>${h(rows[i][2])} · ${h(rows[i][3])}</small></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p>${t('Indexed','सूचीबद्ध')} ${h(scheme.indexedOn??t("Unavailable","अनुपलब्ध"))} · ${t('Official retrieval dates may be unavailable.','दोनों प्रतियों की आधिकारिक प्राप्ति उपलब्ध नहीं है।')}</p>
    <a href="${link(root)}">${t('Back to layout lookup','लेआउट खोज पर लौटें')}</a>`,'schemes');
}

function lens(c,p) {
  const {t} = c;
  return `<details class="private-lens" data-outline="${h(JSON.stringify(p.outline))}" data-size="${p.photoSize.join(',')}" data-rotation="${p.rotation}">
    <summary>${t('Inspect your original photograph','अपनी मूल फ़ोटो से मिलान करें')}</summary>
    <p>${t('Choose the matching original file on this device. The viewer shows the area around the mark. Your file stays in this tab.','इसी उपकरण पर संबंधित मूल फ़ोटो चुनें। चिह्न के आसपास का हिस्सा दिखेगा। फ़ाइल इसी टैब में रहती है।')}</p>
    <label>${t('Sheet photograph','प्रति की फ़ोटो')} (${p.photoSize.join(' × ')} px)<input type="file" accept="image/jpeg,image/png"></label>
    <p role="status" aria-live="polite"></p><div class="lens-controls" hidden>
    <label>${t('Magnification','आवर्धन')} <input type="range" min="1" max="3" value="1" step="0.25"></label>
    <label><input type="checkbox" checked> ${t('Overlay traced outline','रेखांकित सीमा दिखाएँ')}</label>
    <canvas width="800" height="400" aria-label="${t('Local crop of your photograph','आपकी फ़ोटो का स्थानीय अंश')}"></canvas></div>
    <noscript>${t('Enable JavaScript to inspect a local photograph.','स्थानीय फ़ोटो देखने के लिए जावास्क्रिप्ट चालू करें।')}</noscript></details>
    <script src="/scheme-lens.js" defer></script>`;
}

function detail(c,p,print=false,claims=[],plan=null,zoom=1) {
  const {t,link}=c;
  const base=root+'/'+p.id;
  const title=t('Layout plot','लेआउट प्लॉट')+' '+p.id;
  const checks=[
    t('Obtain the issued patta and match the block, plot, area and corrected entries.','जारी पट्टा लेकर ब्लॉक, प्लॉट, क्षेत्रफल और संशोधित प्रविष्टियाँ मिलाएँ।'),
    t('Request the sanctioned layout and revision date, parent khasra schedule and applicable conversion order from the issuing authority.','जारीकर्ता प्राधिकरण से स्वीकृत लेआउट, संशोधन तिथि, मूल खसरों की सूची और लागू रूपांतरण आदेश माँगें।'),
    t('Use the confirmed parent khasra to obtain the current jamabandi and mutation orders. Match any registered deed to this specific plot.','पुष्ट मूल खसरे से वर्तमान जमाबंदी और नामांतरण आदेश लें। पंजीकृत विलेख का इसी प्लॉट से मिलान करें।')
  ];
  const body=`<div class="crumb">${crumb(c)}</div><div class="title-line"><div><div class="eyebrow">${t('Residential layout sheet','आवासीय लेआउट प्रति')}</div><h1>${title}</h1></div>
    ${print?'':`<div class="actions"><a class="outline" href="${link(root+'/compare')}">${t('Compare sheets','प्रतियों की तुलना')}</a>
    <a class="button" href="${link(base+'/report.pdf')}">${t('Download field report','फ़ील्ड रिपोर्ट डाउनलोड करें')}</a></div>`}</div>
    <p>${print?t('Field questions: confirm patta, parent khasra and layout approval.','स्थल पर जाँचें: पट्टा, मूल खसरा और लेआउट स्वीकृति।'):`<a href="${link(base+'/history')}">${t('Sheet history and watches','प्रति इतिहास और निगरानी')}</a> · <a href="${link(root+'/ground',{plot:p.id})}">${t('Ground location','भू-स्थिति')}</a>`}</p><div class="columns scheme-detail"><article class="panel pad"><h2>${t('Marked plot on the sheet','प्रति पर चिह्नित प्लॉट')}</h2>
    <figure>${plan?.manifest.outlines[p.id]?require('./approved-plan').drawPlan(c,plan,p.id,print,zoom):plotMap(c,p)}${plan&&!print?`<a class="outline" href="${link(base,{zoom:zoom===4?1:4})}">${zoom===4?t('Full drawing','पूरा प्लान'):t('Zoom to plot','प्लॉट पर ज़ूम')}</a>`:''}<figcaption>${plan?t('Reviewed layout in drawing coordinates. Ground alignment awaits survey evidence.','समीक्षित लेआउट चित्र के निर्देशांकों में है। भू-स्थिति का सर्वेक्षण लंबित है।'):t('Hand-traced from the red mark on this copy. Position and shape are approximate. Ground coordinates, adjoining lot boundaries and measured area are unavailable.','इस प्रति के लाल चिह्न से हाथ से रेखांकन किया गया है। आकार और स्थिति अनुमानित हैं। भू-निर्देशांक, पड़ोसी प्लॉट की सीमाएँ और मापा क्षेत्रफल उपलब्ध नहीं हैं।')}</figcaption></figure>
    ${print?'':lens(c,p)+`<p><a href="${link(root+'/trace',{from:p.id})}">${t('Open the full plan on this device and index nearby plots','इस उपकरण पर पूरा प्लान खोलें और आसपास के प्लॉट दर्ज करें')} →</a></p>`}</article><article class="panel pad"><h2>${t('What the sheet says','प्रति में क्या लिखा है')}</h2><dl>
    ${evidenceRows(c,p).map(([k,v,ref,status])=>`<div><dt>${k}</dt><dd>${h(v)}<br><small>${h(ref)} · ${h(status)}</small></dd></div>`).join('')}</dl>
    <p class="note">${t('High confidence in the block and plot label. Patta and area are provisional handwritten readings.','ब्लॉक और प्लॉट का पाठ स्पष्ट है। पट्टा और क्षेत्रफल हस्तलेख से लिए गए संभावित पाठ हैं।')}</p>
    <div class="source"><b>${h(p.source)} · ${t('User-supplied plan photograph','उपयोगकर्ता द्वारा दी गई प्लान की फ़ोटो')}</b><p>${t('Indexed','सूचीबद्ध')} ${h(scheme.indexedOn??t("Unavailable","अनुपलब्ध"))} · ${t('Official fetch time unavailable','आधिकारिक प्राप्ति समय उपलब्ध नहीं')}</p></div></article></div>
    ${require('./layout-evidence').evidenceTable(c,claims)}
    <article class="panel pad scheme-check"><h2>${t('What to verify next','आगे क्या जाँचें')}</h2><ol>${checks.map(v=>`<li>${v}</li>`).join('')}</ol>
    <p>${t('Current ownership, conversion approval, litigation and mortgages remain unchecked.','वर्तमान स्वामित्व, रूपांतरण स्वीकृति, मुकदमे और बंधक की जाँच बाकी है।')}</p>
    <a href="https://lsg.urban.rajasthan.gov.in/content/raj/udh/udh-department/en/udh-online-services.html" rel="noreferrer">${t('Rajasthan UDH services','राजस्थान नगरीय विकास सेवाएँ')}</a> ·
    <a href="https://apnakhata.rajasthan.gov.in/" rel="noreferrer">${t('Apna Khata','अपना खाता')}</a></article>
    ${print?`<p>${t('Report generated','रिपोर्ट तैयार')} ${new Date().toISOString()}</p>`:`<a href="${link(root)}">${t('Back to layout lookup','लेआउट खोज पर लौटें')}</a>`}`;
  return shell(c,title,body,'schemes');
}

module.exports={scheme,root,records,modes,index,compare,detail,matchPlot};
