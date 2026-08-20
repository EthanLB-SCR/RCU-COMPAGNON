// Photos : une photo de téléphone (4000×3000, plusieurs Mo) est réduite à 1600 px / JPEG avant d'être gardée (≈ 10-15 × moins lourde)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await (await browser.newContext({viewport:{width:560,height:940}})).newPage();
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await page.evaluate(()=>window.TRACE.go());await page.waitForTimeout(600); // passer l'écran d'accueil
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const l=Object.values(T.state.lines)[0];const c=l.cond.A?'A':'R';const i=l.cond[c].joints.findIndex(j=>j.status==='a_souder');T.openJoint(l.id,c,i>=0?i:0);});await page.waitForTimeout(400);
await page.click('#sheet [data-act="form-soudee"]');await page.waitForTimeout(400);
await page.setInputFiles('#sheet input[data-photo]','/tmp/bigphoto.jpg');await page.waitForTimeout(2500);
const out=await page.evaluate(async()=>{const d=window.TRACE.state.pendingPhotos[0];if(!d)return {none:true};const img=new Image();img.src=d;await img.decode();return {ko:Math.round(d.length*0.75/1024),w:img.naturalWidth,h:img.naturalHeight,jpeg:d.startsWith('data:image/jpeg'),thumbs:document.querySelectorAll('#sheet .thumb').length};});
console.log('photo compressée (≤1600 px, quelques centaines de Ko, jpeg):',JSON.stringify(out),(out.w<=1600&&out.ko<900&&out.jpeg)?'OK':'KO');
await browser.close();
