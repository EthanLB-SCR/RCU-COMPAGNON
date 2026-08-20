// Écrans d'entrée : 1re visite → connexion ; « hors connexion » → accueil (carte de France + liste) ; ouverture d'un chantier ;
// retour ⌂ ; ?site= (remise traceur) saute l'accueil ; recherche/tri en liste
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(1200);
// 1) première visite, pas de session → écran de connexion
let out=await page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),logo:!!document.querySelector('#loginLogo svg'),btn:document.querySelector('#loginGo').textContent}));
console.log('1re visite → connexion:',JSON.stringify(out));
// e-mail invalide → message
await page.fill('#loginEmail','pasunemail');await page.click('#loginGo');await page.waitForTimeout(200);
out=await page.evaluate(()=>document.querySelector('#loginHint').textContent.slice(0,20));console.log('email invalide:',out);
// 2) « continuer hors connexion » → accueil
await page.click('#loginSkip');await page.waitForTimeout(500);
out=await page.evaluate(()=>({home:document.querySelector('#homeView').classList.contains('show'),count:document.querySelector('#homeCount').textContent,banner:document.querySelector('#homeBanner').style.display!=='none',tabMap:document.querySelector('#htMap').classList.contains('on')}));
console.log('accueil (2 démos, bandeau hors connexion):',JSON.stringify(out));
// 3) carte de France : contour + pins (les démos ont-elles une géoréf ? sinon cartes « non localisés »)
out=await page.evaluate(()=>({fr:!!document.querySelector('#homeBody svg path'),pins:document.querySelectorAll('#homeBody [data-pin]').length,cards:document.querySelectorAll('#homeBody .siteCard').length}));
console.log('carte (contour true):',JSON.stringify(out));
// 4) vue liste : recherche + tri + cartes démo
await page.click('#htList');await page.waitForTimeout(300);
out=await page.evaluate(()=>({cards:document.querySelectorAll('#homeBody .siteCard').length,search:!!document.querySelector('#homeQ'),sorts:document.querySelectorAll('#homeBody [data-sort]').length,newBtn:!!document.querySelector('#homeNew')}));
console.log('liste:',JSON.stringify(out));
await page.fill('#homeQ','saint');await page.waitForTimeout(300);
out=await page.evaluate(()=>({cards:document.querySelectorAll('#homeBody .siteCard').length,first:document.querySelector('#homeBody .siteCard .n span')?.textContent}));
console.log('recherche « saint »:',JSON.stringify(out));
await page.fill('#homeQ','');await page.waitForTimeout(300);
// 5) ouverture d'un chantier depuis la liste → plan affiché, overlays cachés
await page.screenshot({path:new URL('./e2e_home.png',import.meta.url).pathname});
await page.click('#homeBody .siteCard');await page.waitForTimeout(900);
out=await page.evaluate(()=>({home:document.querySelector('#homeView').classList.contains('show'),login:document.querySelector('#loginView').classList.contains('show'),net:!!window.TRACE.net,markers:document.querySelectorAll('#markers .marker').length>0||document.querySelectorAll('#net *').length>0,name:window.TRACE.net&&window.TRACE.net.name}));
console.log('chantier ouvert (overlays cachés):',JSON.stringify(out));
// 6) bouton ⌂ → retour accueil, carte « Reprendre » présente
await page.click('#btnHome');await page.waitForTimeout(400);
out=await page.evaluate(()=>({home:document.querySelector('#homeView').classList.contains('show'),resume:document.querySelector('#homeResume').style.display!=='none',rtxt:document.querySelector('#homeResume')?.textContent.slice(0,30)}));
console.log('retour ⌂ + Reprendre:',JSON.stringify(out));
// 7) Reprendre → rouvre direct
await page.click('#homeResume');await page.waitForTimeout(600);
out=await page.evaluate(()=>({home:document.querySelector('#homeView').classList.contains('show'),name:window.TRACE.net&&window.TRACE.net.name}));
console.log('reprendre:',JSON.stringify(out));
// 8) rechargement : plus de login (déjà vu), accueil direct
await page.reload();await page.waitForTimeout(1200);
out=await page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show')}));
console.log('rechargement → accueil direct:',JSON.stringify(out));
// 9) window.TRACE.go() (pour les autres tests) : ouvre le premier chantier sans interaction
await page.evaluate(()=>window.TRACE.go());await page.waitForTimeout(600);
out=await page.evaluate(()=>({home:document.querySelector('#homeView').classList.contains('show'),net:!!window.TRACE.net}));
console.log('TRACE.go():',JSON.stringify(out));
console.log(logs);await browser.close();
