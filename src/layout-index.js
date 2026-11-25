const fs=require('node:fs');
const path=require('node:path');
const file=process.env.LAYOUT_INDEX_FILE||path.join(__dirname,'../var/layout-index.json');
const empty={name:['Residential layouts','आवासीय लेआउट'],district:['',''],village:['',''],indexedOn:null,plots:[]};
const index=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):empty;
if(!Array.isArray(index.plots)||!index.plots.every(p=>/^[A-Z]-[0-9]+$/.test(p.id)))throw Error('Invalid layout index');
module.exports=index;
