'use strict';

// The photograph is decoded on this device. There is no upload endpoint.
const panel = document.querySelector('.private-lens');
if (panel) {
  const hi = document.documentElement.lang === 'hi';
  const words = (en, hindi) => hi ? hindi : en;
  const file = panel.querySelector('[type=file]');
  const zoom = panel.querySelector('[type=range]');
  const overlay = panel.querySelector('[type=checkbox]');
  const status = panel.querySelector('[role=status]');
  const controls = panel.querySelector('.lens-controls');
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const points = JSON.parse(panel.dataset.outline);
  const [width,height] = panel.dataset.size.split(',').map(Number);
  const center = [0,1].map(axis => points.reduce((sum,p)=>sum+p[axis],0)/points.length);
  let bitmap, generation = 0;

  function draw() {
    if (!bitmap) return;
    const scale = 3 * Number(zoom.value);
    ctx.resetTransform();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(Number(panel.dataset.rotation)*Math.PI/180);
    ctx.scale(scale,scale);
    ctx.translate(-center[0],-center[1]);
    ctx.drawImage(bitmap,0,0);
    if (overlay.checked) {
      ctx.beginPath();
      points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath();
      ctx.strokeStyle = '#006b60';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6/scale,4/scale]);
      ctx.stroke();
    }
    ctx.restore();
  }
  file.addEventListener('change', async () => {
    const ticket = ++generation;
    bitmap?.close(); bitmap = undefined;
    controls.hidden = true;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    status.textContent = '';
    const selected = file.files[0];
    if (!selected) return;
    if (!['image/jpeg','image/png'].includes(selected.type) || selected.size > 8*1024*1024) {
      status.textContent = words('Choose a JPEG or PNG under 8 MB.','8 MB से छोटी JPEG या PNG चुनें।');
      return;
    }
    let candidate;
    try {
      candidate = await createImageBitmap(selected);
      if (ticket !== generation) { candidate.close(); return; }
      if (candidate.width !== width || candidate.height !== height) {
        candidate.close();
        status.textContent = words('The dimensions differ from this plot sheet. Choose its original photograph.','फ़ोटो का आकार इस प्रति से अलग है। इसकी मूल फ़ोटो चुनें।');
        return;
      }
      bitmap = candidate;
      zoom.value = '1'; overlay.checked = true;
      draw();
      controls.hidden = false;
      status.textContent = words('Check that the red mark matches the dashed outline. Matching dimensions alone cannot identify a sheet.','लाल चिह्न को टूटी रेखा से मिलाएँ। केवल आकार से प्रति की पहचान सुनिश्चित नहीं होती।');
    } catch {
      if (ticket !== generation) return;
      candidate?.close(); bitmap = undefined;
      status.textContent = words('This image could not be opened. Try the original JPEG.','फ़ोटो नहीं खुली। मूल JPEG आज़माएँ।');
    }
  });
  zoom.addEventListener('input',draw);
  overlay.addEventListener('change',draw);
}
