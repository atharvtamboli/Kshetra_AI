const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const run = promisify(execFile);

function browsers() {
  return [...new Set([process.env.CHROMIUM_PATH,
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'
  ].filter(Boolean))];
}
let active = 0;
async function renderPdf(html, css) {
  if (active >= 2) throw Error('PDF_BUSY');
  active++;
  let temp;
  try {
    temp = await fs.mkdtemp(path.join(os.tmpdir(),'kshetra-report-'));
    const file = path.join(temp,'report.html');
    await fs.writeFile(file,html.replace('<link rel="stylesheet" href="/style.css">','<style>'+css+'</style>'));
    for (const [index,browser] of browsers().entries()) {
      try {await fs.access(browser);} catch {continue;}
      const pdf=path.join(temp,index+'.pdf');
      try {
        await run(browser,['--headless','--disable-gpu','--no-first-run','--disable-crash-reporter',
          '--no-default-browser-check','--disable-extensions','--user-data-dir='+path.join(temp,'profile-'+index),
          '--no-pdf-header-footer','--print-to-pdf='+pdf,pathToFileURL(file).href],{timeout:20000,windowsHide:true});
        const bytes = await fs.readFile(pdf);
        if (bytes.subarray(0,5).toString() === '%PDF-') return bytes;
      } catch { /* Try the next installed renderer. */ }
    }
    throw Error('PDF_UNAVAILABLE');
  } finally {
    active--;
    if (temp) await fs.rm(temp,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
  }
}
module.exports = {renderPdf};
