const {shell,h}=require('./views');

function tracing(c,reference) {
  const {t,link}=c;
  return shell(c,t('Trace a layout sheet','लेआउट प्रति का रेखांकन'),`<div class="crumb">${t('Layout / Private workspace','लेआउट / निजी कार्यक्षेत्र')}</div>
    <h1>${t('Index plots on your plan','अपने प्लान पर प्लॉट दर्ज करें')}</h1>
    <p class="intro">${t('Open a plan photo, zoom in and mark each visible plot. Download your index to continue later with the same image. The photograph stays on this device.','प्लान की फ़ोटो खोलें, ज़ूम करें और हर दिखने वाला प्लॉट चिह्नित करें। बाद में उसी फ़ोटो पर काम जारी रखने के लिए सूची डाउनलोड करें। फ़ोटो इसी उपकरण पर रहती है।')}</p>
    <section id="trace-workspace" class="panel pad" data-indexed="${h(JSON.stringify([...require('./schemes').records.keys()]))}" data-reference="${h(JSON.stringify(reference?{id:reference.id,size:reference.photoSize,points:reference.outline}:null))}">
    <label>${t('Open a plan photo','प्लान की फ़ोटो खोलें')} <input id="trace-file" type="file" accept="image/jpeg,image/png"></label>
    <p id="trace-status" role="status" aria-live="polite"></p>
    <div id="trace-tools" hidden><button type="button" id="trace-reference" class="outline" hidden>${t('Review the supplied outline','प्रति का रेखांकन जाँचें')} ${h(reference?.id)}</button><div class="trace-toolbar">
      <label>${t('Map action','नक्शे पर कार्य')} <select id="trace-mode"><option value="draw">${t('Trace corners','कोने चिह्नित करें')}</option><option value="inspect">${t('Inspect saved plots','सहेजे प्लॉट देखें')}</option></select></label>
      <label>${t('Block and plot','ब्लॉक और प्लॉट')} <input id="trace-id" maxlength="40" placeholder="C-19"></label>
      <label>${t('Zoom','ज़ूम')} <select id="trace-zoom"><option>100%</option><option>200%</option><option>400%</option><option>800%</option></select></label>
    </div><p id="trace-help">${t('Click the corners in order, then save the plot. Keyboard: focus the map, use arrows to move the crosshair, Shift for larger steps and Enter to place a corner.','कोनों पर क्रम से क्लिक करें और प्लॉट सहेजें। कीबोर्ड से नक्शे पर फ़ोकस करें, तीर से निशान खिसकाएँ, बड़े कदम के लिए Shift और कोना जोड़ने के लिए Enter दबाएँ।')}</p>
    <div class="trace-viewport"><svg id="trace-map" tabindex="0" role="group" aria-describedby="trace-help" aria-label="${t('Private plan editor','निजी प्लान संपादक')}" width="100%">
      <image id="trace-image"/><g id="trace-shapes"></g><g id="trace-draft"></g>
    </svg></div>
    <div class="trace-toolbar"><button type="button" id="trace-save">${t('Save plot to index','प्लॉट सूची में सहेजें')}</button>
    <button type="button" class="outline" id="trace-undo">${t('Undo corner','पिछला कोना हटाएँ')}</button>
    <button type="button" class="outline" id="trace-reset">${t('Discard outline','रेखांकन रद्द करें')}</button></div>
    <h2>${t('Your plot index','आपकी प्लॉट सूची')} (<span id="trace-count">0</span>)</h2>
    <p>${t('The count includes your saved outlines only. Positions use image pixels. Ground area, approval and the total scheme count are unknown.','गिनती में केवल आपके सहेजे रेखांकन हैं। स्थान फ़ोटो के पिक्सेल में हैं। भू-क्षेत्रफल, स्वीकृति और योजना की कुल संख्या अज्ञात हैं।')}</p>
    <label>${t('Find an indexed plot on this photo','इस फ़ोटो पर दर्ज प्लॉट खोजें')} <input id="trace-find" maxlength="80" placeholder="B-12"></label><button type="button" id="trace-locate">${t('Highlight plot','प्लॉट चिह्नित करें')}</button><p id="trace-selection" aria-live="polite"></p><ul id="trace-list"></ul><div class="trace-toolbar"><button type="button" id="trace-export">${t('Download index','सूची डाउनलोड करें')}</button>
    <label>${t('Restore index for this photo','इसी फ़ोटो की सूची खोलें')} <input id="trace-import" type="file" accept=".json,application/json"></label></div>
    </div><noscript>${t('Enable JavaScript for the local plan editor.','स्थानीय संपादक के लिए जावास्क्रिप्ट चालू करें।')}</noscript></section>
    <p><a href="${link('/schemes/layout')}">${t('Back to indexed sheets','उपलब्ध प्रतियों पर लौटें')}</a></p><script src="/scheme-trace.js" defer></script>`,'schemes');
}
module.exports={tracing};
