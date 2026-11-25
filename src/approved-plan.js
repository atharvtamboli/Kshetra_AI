const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {h}=require('./views');

// An operator supplies a reviewed, redacted PNG and traces in its native pixels.
function loadPlan(dir=path.join(__dirname,'../var/layout-plan')){
  if(!fs.existsSync(path.join(dir,'plan.json')))return null;
  const m=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'));
  const bytes=fs.readFileSync(path.join(dir,'plan.png'));
  if(bytes.length<24||bytes.length>16*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
    m.sha256!==crypto.createHash('sha256').update(bytes).digest('hex')||m.reviewedForSharing!==true)
    throw Error('Layout image needs a matching digest and sharing review');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(!m.outlines||!Object.keys(m.outlines).length||!Object.keys(m.outlines).every(id=>require('./schemes').records.has(id))||!m.source||!m.revisionDate||!width||!height||width*height>32000000)throw Error('Incomplete plan source');
  for(const id of Object.keys(m.outlines)){
    const ring=m.outlines?.[id];
    if(!Array.isArray(ring)||ring.length<3||ring.length>1000||!ring.every(p=>Array.isArray(p)&&p.length===2&&p.every((v,i)=>Number.isFinite(v)&&v>=0&&v<(i?height:width))))
      throw Error('Invalid native-pixel outline for '+id);
  }
  return {bytes,width,height,manifest:m};
}
function drawPlan(c,plan,selected,print=false,zoom=1){
  const {width,height,manifest:m}=plan;
  const ring=m.outlines[selected];
  let box=[0,0,width,height];
  if((zoom>1||print)&&ring){
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    const w=Math.max(width/(print?4:zoom),Math.max(...xs)-Math.min(...xs)+20);
    const ht=Math.max(height/(print?4:zoom),Math.max(...ys)-Math.min(...ys)+20);
    box=[Math.max(0,Math.min(width-w,(Math.max(...xs)+Math.min(...xs)-w)/2)),Math.max(0,Math.min(height-ht,(Math.max(...ys)+Math.min(...ys)-ht)/2)),w,ht];
  }
  const src=print?'data:image/png;base64,'+plan.bytes.toString('base64'):'/schemes/layout/plan.png';
  const shapes=Object.keys(m.outlines).map(id=>{
    const polygon=`<polygon points="${m.outlines[id].join(' ')}" stroke="${selected===id?'#b83312':'#11624d'}" fill="${selected===id?'#ffad56':'#359b82'}" fill-opacity=".32" stroke-width="3" vector-effect="non-scaling-stroke"><title>${id}</title></polygon>`;
    return print?polygon:`<a href="${c.link('/schemes/layout/'+id)}" aria-label="${id}">${polygon}</a>`;
  }).join('');
  return `<svg class="scheme-map" viewBox="${box.join(' ')}" aria-label="${c.t('Scheme layout','योजना लेआउट')}"><image href="${src}" width="${width}" height="${height}"/>${shapes}</svg><small>${h(m.source)} · ${h(m.revisionDate)}</small>`;
}
module.exports={loadPlan,drawPlan};
