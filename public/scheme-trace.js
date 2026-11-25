'use strict';
// Image coordinates are never converted to geographic coordinates.
const byId = id => document.getElementById('trace-'+id);
const hi = document.documentElement.lang==='hi';
const tr = (en,hindi) => hi?hindi:en;
const svg = byId('map'), image = byId('image');
const ns='http://www.w3.org/2000/svg';
const format='kshetra-image-index-v1';
const reference=JSON.parse(byId('workspace').dataset.reference);
const slug = value => typeof value==='string' ? value.normalize('NFKC').trim().toUpperCase() : '';
const validId = id => /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} /-]{0,39}$/u.test(id);
const say = text => { byId('status').textContent=text; };
let sheet, url, draft=[], lots=new Map(), cursor=[0,0], dirty=false, generation=0;
let selectedId=null;

function selectLot(id,scroll=false) {
  selectedId=lots.has(id)?id:null;
  let selectedShape;
  for(const polygon of byId('shapes').querySelectorAll('polygon')) {
    const selected=polygon.dataset.id===selectedId;
    polygon.classList.toggle('trace-selected',selected);
    if(selected) selectedShape=polygon;
  }
  byId('selection').textContent=selectedId
    ? tr('Selected plot','चुना प्लॉट')+' · '+selectedId+' · '+lots.get(id).length+' '+tr('corners','कोने')
    : '';
  if(scroll) selectedShape?.scrollIntoView({block:'nearest',inline:'nearest'});
  if(JSON.parse(byId('workspace').dataset.indexed).includes(selectedId)) {
    const link=document.createElement('a');
    link.href='/schemes/layout/'+selectedId+(hi?'?lang=hi':'');
    link.target='_blank';link.rel='noopener';
    link.textContent=tr('Open sheet record','प्रति का अभिलेख खोलें');
    byId('selection').append(' · ',link);
  }
}

function orientation(a,b,c) { return Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])); }
function between(a,b,c) {
  return c.every((v,i)=>v>=Math.min(a[i],b[i]) && v<=Math.max(a[i],b[i]));
}
function intersects(a,b,c,d) {
  const s=orientation(a,b,c), t=orientation(a,b,d), u=orientation(c,d,a), v=orientation(c,d,b);
  return s*t<0 && u*v<0 || !s&&between(a,b,c) || !t&&between(a,b,d) || !u&&between(c,d,a) || !v&&between(c,d,b);
}
function validOutline(points) {
  if (!Array.isArray(points)||points.length<3||points.length>100) return false;
  if (!points.every(p=>Array.isArray(p)&&p.length===2&&p.every((v,i)=>Number.isInteger(v)&&v>=0&&v<sheet.size[i]))) return false;
  if (new Set(points.map(p=>p.join(','))).size!==points.length) return false;
  let twiceArea=0;
  for(let i=0;i<points.length;i++) {
    const next=(i+1)%points.length, a=points[i], b=points[next];
    twiceArea+=a[0]*b[1]-b[0]*a[1];
    for(let j=i+2;j<points.length;j++) {
      if(i===0&&j===points.length-1) continue;
      if(intersects(a,b,points[j],points[(j+1)%points.length])) return false;
    }
  }
  return Math.abs(twiceArea)>0;
}
function shape(type,attrs,parent) {
  const el=document.createElementNS(ns,type);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  parent.append(el);
  return el;
}
function drawDraft() {
  const g=byId('draft'); g.replaceChildren();
  g.setAttribute('visibility',byId('mode').value==='inspect'?'hidden':'visible');
  if(draft.length) shape('polyline',{points:draft.join(' '),class:'trace-line'},g);
  for(const [cx,cy] of draft) shape('circle',{cx,cy,r:2,fill:'#fff',stroke:'#2650aa'},g);
  const [x,y]=cursor;
  shape('path',{d:`M${x-6} ${y}h12 M${x} ${y-6}v12`,class:'trace-line'},g);
  byId('undo').disabled=byId('reset').disabled=!draft.length;
  byId('save').disabled=draft.length<3;
}
function drawLots() {
  const g=byId('shapes'), list=byId('list');
  g.replaceChildren(); list.replaceChildren();
  for(const [id,points] of lots) {
    const polygon=shape('polygon',{points:points.join(' '),class:'trace-lot'},g);
    polygon.dataset.id=id;
    shape('title',{},polygon).textContent=id;
    const mean=axis=>points.reduce((sum,p)=>sum+p[axis],0)/points.length;
    shape('text',{x:mean(0),y:mean(1),'text-anchor':'middle',class:'trace-label'},g).textContent=id;
    const li=document.createElement('li'), remove=document.createElement('button'), locate=document.createElement('button');
    locate.type='button'; locate.className='outline'; locate.textContent=id;
    locate.addEventListener('click',()=>{byId('mode').value='inspect';drawDraft();selectLot(id,true);});
    remove.type='button'; remove.className='outline';
    remove.textContent=tr('Remove','हटाएँ')+' '+id;
    remove.addEventListener('click',()=>{lots.delete(id);dirty=true;drawLots();});
    li.append(locate,' ',remove); list.append(li);
  }
  byId('count').textContent=String(lots.size);
  byId('export').disabled=!lots.size;
  selectLot(selectedId);
  drawDraft();
}
byId('file').addEventListener('change',async e=>{
  const ticket=++generation, file=e.target.files[0];
  if(!file) return;
  if((dirty||draft.length)&&!confirm(tr('Discard edits and open another photo?','संपादन छोड़कर दूसरी फ़ोटो खोलें?'))) { e.target.value=''; return; }
  if(!['image/jpeg','image/png'].includes(file.type)||file.size>16*1024*1024) {say(tr('Choose a JPEG or PNG under 16 MB.','16 MB से छोटी JPEG या PNG चुनें।'));return;}
  let bitmap;
  try {
    bitmap=await createImageBitmap(file);
    if(bitmap.width*bitmap.height>32000000) throw Error();
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    if(ticket!==generation) return;
    const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    sheet={sha256:hash,size:[bitmap.width,bitmap.height]};
    const previous=url;
    url=URL.createObjectURL(file); image.setAttribute('href',url);
    if(previous) URL.revokeObjectURL(previous);
    image.setAttribute('width',bitmap.width); image.setAttribute('height',bitmap.height);
    svg.setAttribute('viewBox',`0 0 ${bitmap.width} ${bitmap.height}`);
    svg.setAttribute('width','100%'); byId('zoom').value='100%';
    cursor=sheet.size.map(n=>Math.floor(n/2)); draft=[]; lots=new Map(); dirty=false;
    byId('id').value=''; byId('import').value=''; byId('tools').hidden=false;
    byId('mode').value='draw';selectedId=null;
    byId('reference').hidden=!reference||!reference.size.every((n,i)=>n===sheet.size[i]);
    drawLots(); say(tr('Photo open. Mark the corners of one plot.','फ़ोटो खुली। एक प्लॉट के कोनों को चिह्नित करें।'));
  } catch {if(ticket===generation) say(tr('Could not open this photo. Choose a smaller original JPEG or PNG.','फ़ोटो नहीं खुली। छोटी मूल JPEG या PNG चुनें।'));}
  finally {bitmap?.close();}
});
function addCorner(point) {
  if(!sheet || draft.length>=100) return;
  cursor=point.map((n,i)=>Math.max(0,Math.min(sheet.size[i]-1,Math.round(n))));
  draft.push([...cursor]); drawDraft();
  say(tr('Corners placed','चिह्नित कोने')+' · '+draft.length);
}
byId('reference').addEventListener('click',()=>{
  if(!reference||!sheet||!reference.size.every((n,i)=>n===sheet.size[i])) return;
  if(draft.length&&!confirm(tr('Replace the unfinished outline?','अधूरा रेखांकन बदलें?'))) return;
  byId('mode').value='draw';byId('id').value=reference.id; draft=reference.points.map(p=>[...p]);cursor=[...draft[0]];
  drawDraft();
  say(tr('Check the corners against the red mark on this exact plot sheet before saving.','सहेजने से पहले इसी प्लॉट की प्रति पर लाल चिह्न से कोनों का मिलान करें।'));
});
svg.addEventListener('click',e=>{
  if(byId('mode').value==='inspect') {
    const id=e.target.closest('[data-id]')?.dataset.id;
    selectLot(id);
    say(id ? tr('Selected on this photo','इस फ़ोटो पर चुना गया')+' · '+id : tr('No indexed outline here.','यहाँ कोई दर्ज रेखांकन नहीं है।'));
    return;
  }
  const transform=svg.getScreenCTM();
  if(!transform||!sheet) return;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(transform.inverse());
  addCorner([p.x,p.y]);
});
svg.addEventListener('keydown',e=>{
  if(!sheet||byId('mode').value==='inspect') return;
  if(e.key==='Enter') {e.preventDefault();addCorner(cursor);return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(!delta) return;
  e.preventDefault();
  cursor=cursor.map((n,i)=>Math.max(0,Math.min(sheet.size[i]-1,n+delta[i]*(e.shiftKey?10:1))));
  drawDraft();
});
byId('zoom').addEventListener('change',e=>svg.setAttribute('width',e.target.value));
byId('mode').addEventListener('change',()=>{drawDraft();say(byId('mode').value==='inspect'?tr('Select a saved outline on the photo or a label in the index.','फ़ोटो पर सहेजा रेखांकन या सूची में उसका नाम चुनें।'):tr('Trace corners in order.','क्रम से कोने चिह्नित करें।'));});
byId('undo').addEventListener('click',()=>{draft.pop();drawDraft();});
byId('reset').addEventListener('click',()=>{draft=[];drawDraft();});
byId('save').addEventListener('click',()=>{
  const id=slug(byId('id').value);
  if(!validId(id)||lots.has(id)||lots.size>=500) {say(tr('Use a unique block and plot label. This index holds up to 500 plots.','एक अलग ब्लॉक और प्लॉट पहचान दें। सूची में 500 प्लॉट की सीमा है।'));return;}
  if(!validOutline(draft)) {say(tr('Trace at least three distinct corners in boundary order without crossing edges.','कम से कम तीन अलग कोने क्रम में रखें। रेखाएँ एक-दूसरे को न काटें।'));return;}
  lots.set(id,draft); draft=[]; dirty=true; byId('id').value='';
  drawLots(); say(tr('Saved in this tab','इस टैब में सहेजा गया')+' · '+id);
});
byId('export').addEventListener('click',()=>{
  const body={format,sheet,coordinateSpace:'image-pixels',plots:Array.from(lots,([id,points])=>({id,points}))};
  const fileUrl=URL.createObjectURL(new Blob([JSON.stringify(body)],{type:'application/json'}));
  const link=document.createElement('a');link.href=fileUrl;link.download='Kshetra-plot-index-'+sheet.sha256.slice(0,8)+'.json';
  link.click();setTimeout(()=>URL.revokeObjectURL(fileUrl),1500);dirty=false;
});
byId('import').addEventListener('change',async e=>{
  const file=e.target.files[0], expected=sheet;
  e.target.value='';
  if(!file||!expected) return;
  try {
    if(file.size>2*1024*1024) throw Error();
    const data=JSON.parse(await file.text());
    if(sheet!==expected)return;
    if(data.format!==format||data.sheet?.sha256!==sheet.sha256||data.coordinateSpace!=='image-pixels'||JSON.stringify(data.sheet?.size)!==JSON.stringify(sheet.size)
      ||!Array.isArray(data.plots)||data.plots.length>500) throw Error();
    const imported=new Map();
    for(const p of data.plots) {
      const id=slug(p.id);
      if(!validId(id)||imported.has(id)||!validOutline(p.points)) throw Error();
      imported.set(id,p.points);
    }
    if((dirty||draft.length)&&!confirm(tr('Replace the edits in this tab with the saved index?','इस टैब के संपादन को सहेजी सूची से बदलें?')))return;
    lots=imported; draft=[]; dirty=false; drawLots();
    say(tr('Index restored for this photograph.','इसी फ़ोटो की सूची खोल दी गई है।'));
  } catch { say(tr('Could not restore. Use a valid index exported for this exact photograph.','सूची नहीं खुली। इसी फ़ोटो के लिए निर्यात की गई मान्य सूची चुनें।')); }
});
window.addEventListener('beforeunload',e=>{if(dirty||draft.length){e.preventDefault();e.returnValue='';}});

byId('locate').addEventListener('click',()=>{
  const raw=slug(byId('find').value);
  const q=raw.replace(/[०-९]/g,n=>String(n.charCodeAt(0)-2406))
    .replace(/BLOCK|ब्लॉक|PLOT|प्लॉट/gu,'').replace(/सी/gu,'C').replace(/[ -]+/gu,'');
  const found=Array.from(lots.keys()).filter(id=>id===raw||id.replace(/[ -]+/g,'')===q||(/^\d+$/.test(q)&&id.split(/[ -]+/).pop()===q));
  if(found.length!==1){say(found.length?found.join(' · '):tr('No outline indexed on this image.','इस फ़ोटो पर रेखांकन उपलब्ध नहीं है।'));return;}
  byId('mode').value='inspect';drawDraft();selectLot(found[0],true);
});
