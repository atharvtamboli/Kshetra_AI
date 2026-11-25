const fs=require('node:fs');
const path=require('node:path');
const {h,shell}=require('./views');

function inside([x,y],ring){
  let hit=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [a,b]=ring[i],[c,d]=ring[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
  }
  return hit;
}
const ids=Object.keys;
function validateGround(data){
  const coord=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  if(!data.rings||!ids(data.rings).length||!ids(data.rings).every(id=>/^[A-Z]-[0-9]+$/.test(id))||data.crs!=='EPSG:4326'||![data.originalCrs,data.source,data.sourceDate,data.checkSource].every(v=>typeof v==='string'&&v.trim())||
    data.source===data.checkSource||!Number.isFinite(data.reportedRmseM)||data.reportedRmseM<0)throw Error('Missing ground source, CRS or survey error');
  for(const id of ids(data.rings)){
    const ring=data.rings?.[id];
    if(!Array.isArray(ring)||ring.length<4||ring.length>5000||!ring.every(coord)||String(ring[0])!==String(ring.at(-1)))throw Error('Invalid ground ring: '+id);
  }
  if(!Array.isArray(data.checks)||!ids(data.rings).every(id=>data.checks.some(p=>p.id===id))||
    !data.checks.every(p=>ids(data.rings).includes(p.id)&&coord(p.point)&&ids(data.rings).filter(id=>inside(p.point,data.rings[id])).join()===p.id))
    throw Error('Independent interior check failed');
  return data;
}
function loadGround(file=path.join(__dirname,'../var/layout-ground.json')){
  return fs.existsSync(file)?validateGround(JSON.parse(fs.readFileSync(file,'utf8'))):null;
}
function groundPage(c,data,selected){
  const {t,link}=c;
  const title=t('Ground location','भू-स्थिति');
  if(!data)return shell(c,title,`<h1>${title}</h1><article class="panel pad"><h2>${t('Survey evidence pending','सर्वेक्षण साक्ष्य लंबित')}</h2><p>${t('No authorised geometry and independent check points have been indexed for these plots.','इन प्लॉट के अधिकृत भू-निर्देशांक और स्वतंत्र जाँच बिंदु उपलब्ध नहीं हैं।')}</p><a href="${link('/schemes/layout')}">Layout</a></article>`,'schemes');
  const points=ids(data.rings).flatMap(id=>data.rings[id]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs),top=Math.max(...ys),aspect=Math.cos(top*Math.PI/180);
  const scale=480/Math.max((Math.max(...xs)-left)*aspect,top-Math.min(...ys));
  const project=([x,y])=>[(x-left)*aspect*scale+10,(top-y)*scale+10];
  const shapes=ids(data.rings).map(id=>`<a href="${link('/schemes/layout/'+id)}" aria-label="${id}"><polygon points="${data.rings[id].map(project).join(' ')}" stroke="white" stroke-width="2" fill="${id===selected?'#996520':'#245a4b'}"/><text x="${project(data.checks.find(p=>p.id===id).point)[0]}" y="${project(data.checks.find(p=>p.id===id).point)[1]}" fill="white" text-anchor="middle">${id}</text></a>`).join('');
  return shell(c,title,`<h1>${title}</h1><svg class="scheme-map" viewBox="0 0 500 500">${shapes}</svg><p>${h(data.source)} · ${h(data.sourceDate)} · ${h(data.originalCrs)} → EPSG:4326</p><p>${t('Survey-reported alignment RMSE','सर्वेक्षण में दर्ज संरेखण RMSE')} · ${data.reportedRmseM} m</p><p>${t('Independent check source','स्वतंत्र जाँच स्रोत')} · ${h(data.checkSource)}</p>`,'schemes');
}
module.exports={loadGround,validateGround,groundPage};
