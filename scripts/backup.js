const {DatabaseSync, backup} = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

async function backupDatabase(input, folder) {
  const db = new DatabaseSync(input, {readOnly:true});
  fs.mkdirSync(folder,{recursive:true,mode:0o700});
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const output = path.join(folder, 'kshetra-' + stamp + '-' + randomUUID() + '.sqlite');
  const partial = output + '.partial';
  try {
    await backup(db,partial);
    const copy = new DatabaseSync(partial,{readOnly:true});
    try {
      if (copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok')
        throw Error('Backup integrity check failed');
    } finally { copy.close(); }
    fs.chmodSync(partial,0o600);
    fs.renameSync(partial,output);
    return output;
  } finally {
    db.close();
    fs.rmSync(partial,{force:true});
  }
}
if (require.main===module) {
  const input=process.env.DATABASE_PATH || path.join(__dirname,'..','var','kshetra.sqlite');
  backupDatabase(input,process.argv[2] || path.join(path.dirname(input),'backups'))
    .then(console.log).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={backupDatabase};
