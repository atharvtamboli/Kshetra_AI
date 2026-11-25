const {h,shell}=require('./views');
const fields={pattaReading:['Patta reading','पट्टा पाठ'],areaReadingSqFt:['Sheet area (sq ft)','प्रति क्षेत्रफल (वर्ग फुट)'],outline:['Image outline (pixels)','चित्र सीमा (पिक्सेल)']};

function syncLayout(db,scheme,claims=[],plan=null) {
  db.exec(`CREATE TABLE IF NOT EXISTS layout_versions(
    id INTEGER PRIMARY KEY, plot TEXT NOT NULL, source TEXT NOT NULL, indexed TEXT NOT NULL,
    observed TEXT NOT NULL, values_json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS layout_versions_plot ON layout_versions(plot,id);
    CREATE TABLE IF NOT EXISTS layout_watches(user_id INTEGER NOT NULL,plot TEXT NOT NULL,
    since_id INTEGER NOT NULL,PRIMARY KEY(user_id,plot));
    CREATE TABLE IF NOT EXISTS layout_images(digest TEXT PRIMARY KEY, bytes BLOB NOT NULL);`);
  db.exec('BEGIN IMMEDIATE');
  try {
    if(plan)db.prepare('INSERT OR IGNORE INTO layout_images VALUES(?,?)').run(plan.manifest.sha256,plan.bytes);
    for(const p of scheme.plots) {
      const values=JSON.stringify({...Object.fromEntries(Object.keys(fields).map(key=>[key,p[key]])),claims:claims.filter(r=>r.plot===p.id),
        plan:plan?.manifest.outlines[p.id]?{sha256:plan.manifest.sha256,source:plan.manifest.source,date:plan.manifest.revisionDate,outline:plan.manifest.outlines[p.id]}:null});
      const prev=db.prepare('SELECT * FROM layout_versions WHERE plot=? ORDER BY id DESC LIMIT 1').get(p.id);
      if(prev?.values_json===values && prev.source===p.source && prev.indexed===scheme.indexedOn) continue;
      db.prepare('INSERT INTO layout_versions(plot,source,indexed,observed,values_json) VALUES(?,?,?,?,?)')
        .run(p.id,p.source,scheme.indexedOn,new Date().toISOString(),values);
    }
    db.exec('COMMIT');
  } catch(e){db.exec('ROLLBACK');throw e;}
}
function history(c,db,plot) {
  const {t,link,user}=c;
  const rows=db.prepare('SELECT * FROM layout_versions WHERE plot=? ORDER BY id').all(plot.id);
  const watch=user && db.prepare('SELECT since_id FROM layout_watches WHERE user_id=? AND plot=?').get(user.id,plot.id);
  const path='/schemes/layout/'+plot.id+'/history';
  const versions=rows.map((row,i)=>{
    const values=JSON.parse(row.values_json),prev=i&&JSON.parse(rows[i-1].values_json);
    const changes=Object.entries(fields).filter(([k])=>!i||JSON.stringify(values[k])!==JSON.stringify(prev[k]));
    return `<article class="panel pad" id="v${row.id}"><h2>${h(row.source)} · ${h(row.indexed)}</h2>
      <p>${t('Local snapshot time','स्थानीय प्रति का समय')} ${h(row.observed)}</p>
      ${watch&&row.id>watch.since_id?`<strong>${t('Watched sheet updated','निगरानी वाली प्रति बदली')}</strong>`:''}
      <dl>${changes.map(([k,label])=>`<div><dt>${t(...label)}</dt><dd>${i?`<a href="#v${rows[i-1].id}">${h(JSON.stringify(prev[k]))} · ${h(rows[i-1].indexed)}</a> → `:''}<a href="#v${row.id}">${h(JSON.stringify(values[k]))} · ${h(row.indexed)}</a></dd></div>`).join('')}</dl>
      ${i&&JSON.stringify(prev.claims||[])!==JSON.stringify(values.claims||[])?`<a href="#v${rows[i-1].id}">${t('Compare previous document references','पिछले दस्तावेज़ संदर्भ देखें')}</a>`:''}
      ${i&&JSON.stringify(prev.plan??null)!==JSON.stringify(values.plan??null)?`<p>${t('Layout drawing or outline changed','लेआउट चित्र या सीमा बदली')} · <a href="#v${rows[i-1].id}">${t('Previous source','पिछला स्रोत')}</a></p>`:''}
      ${values.plan?`<p><a href="/schemes/layout/images/${values.plan.sha256}">${h(values.plan.source)} · ${h(values.plan.date)}</a></p>`:''}
      ${require('./layout-evidence').evidenceTable(c,values.claims)}</article>`;
  }).reverse().join('');
  const form=user?`<form method="post" action="${link('/layout-watch')}"><input type="hidden" name="plot" value="${plot.id}"><button name="action" value="${watch?'remove':'add'}">${watch?t('Stop watching','निगरानी हटाएँ'):t('Watch this sheet','इस प्रति की निगरानी करें')}</button></form>`:`<a href="${link('/account')}">${t('Sign in to watch','निगरानी के लिए लॉग इन')}</a>`;
  return shell(c,plot.id,`<h1>${plot.id} · ${t('Sheet history','प्रति इतिहास')}</h1><p>${t('Changes are detected when the local sheet index is loaded. Dates below refer to local indexing.','स्थानीय सूची लोड होने पर बदलाव दर्ज होते हैं। नीचे स्थानीय सूचीकरण तिथियाँ हैं।')}</p>${form}${versions}<a href="${link(path.replace('/history',''))}">${t('Open record','अभिलेख खोलें')}</a>`,'schemes');
}
module.exports={syncLayout,history};
