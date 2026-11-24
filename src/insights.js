const {source} = require('./data');

function comparison(parcel) {
  const sheet = source.sheets[parcel.khasra];
  if (!sheet) return {status:'unavailable', sheet:null, fields:[]};
  const fields = [
    {key:'khasra', first:parcel.khasra, second:sheet.khasra},
    {key:'khata', first:source.holding.khata, second:sheet.khata},
    {key:'area', first:parcel.area, second:sheet.area},
    {key:'cultivator', first:source.holding.cultivator[1], second:sheet.cultivator},
    {key:'landholder', first:source.holding.landholder[1], second:null},
  ].map(field=>({...field,status:field.second==null?'unavailable':field.first===field.second?'agrees':'differs'}));
  return {status:fields.some(f=>f.status==='differs')?'differs':'agrees-where-available',sheet,fields};
}

function coverage(parcels) {
  const classifications = new Map();
  let areaUnits=0, linked=0, agreement=0, differences=0;
  for (const parcel of parcels) {
    const units=Math.round(Number(parcel.area)*10000);
    areaUnits+=units;
    const item=classifications.get(parcel.kind)||{kind:parcel.kind,count:0,areaUnits:0};
    item.count++;
    item.areaUnits+=units;
    classifications.set(parcel.kind,item);
    const evidence=comparison(parcel);
    if(evidence.sheet) linked++;
    if(evidence.status==='agrees-where-available')agreement++;
    if(evidence.status==='differs')differences++;
  }
  return {count:parcels.length,area:(areaUnits/10000).toFixed(4),linked,agreement,differences,
    villageLocator:parcels.length,preciseBoundaries:0,
    classifications:[...classifications.values()].map(({kind,count,areaUnits})=>({kind,count,area:(areaUnits/10000).toFixed(4)}))};
}

module.exports={comparison,coverage};
