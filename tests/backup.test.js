const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {openStore}=require('../src/data');
const {backupDatabase}=require('../scripts/backup');
test('online backup opens independently and contains the complete parcel archive',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kshetra-backup-'));
  const source=path.join(temp,'live.sqlite'),store=openStore(source);
  try{
    const file=await backupDatabase(source,path.join(temp,'snapshots'));
    const restored=new DatabaseSync(file,{readOnly:true});
    try{
      assert.equal(restored.prepare('SELECT COUNT(*) AS count FROM plots').get().count,98);
      assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    }finally{restored.close();}
  }finally{store.db.close();fs.rmSync(temp,{recursive:true,force:true});}
});
