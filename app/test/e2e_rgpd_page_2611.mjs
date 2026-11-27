// e2e_rgpd_page_2611.mjs — 26/11/2026 (RGPD) : « 🔒 TES DONNÉES DANS TRACÉ » (information des salariés et intérimaires, RGPD art. 13, Code du travail L1222-4)
// + « ⬇ Télécharger mes données ». Démo hors connexion, personnages de démonstration, aucune donnée réelle.
//  m1  Karim (soudeur, 390) : l'accueil Compagnon montre la carte « 🔒 Tes données dans Tracé » tant qu'elle n'est pas lue ; « Lire » ouvre la page :
//      6 rubriques, position « à 100 m environ » et « 2 mois », assistant (Anthropic), droits, CNIL ; une fois lue, la carte quitte l'accueil (reste dans Documents)
//  m2  « Ta fiche » : bouton « 🔒 Tes données dans Tracé » ; carte de pointage : la ligne « 📍 Ta position est notée seulement quand tu pointes… » ouvre la page
//  m3  « ⬇ Télécharger mes données » : un fichier JSON (compte, fiche, pointages de Karim seulement)
//  m4  Équipe → « Données personnelles (RGPD) » : la page dans l'écran, sans « Fermer », retour possible ; le téléchargement marche aussi
//  m5  Administrateur → 🏢 Entreprise : référent RGPD, e-mail et région d'hébergement saisis → la page les affiche
//  m6  assistant 💬 : la consigne « N'écris ni information de santé ni rien sur un collègue » est sous la zone de saisie
//  m7  360 px : rien ne déborde, boutons ≥ 44 px ; console propre
import { chromium } from 'playwright';import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8844';
const C={};const logs=[];const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
async function open(vp){ctx=await browser.newContext({viewport:vp,isMobile:vp.width<700,hasTouch:vp.width<700,deviceScaleFactor:1,acceptDownloads:true});page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR '+e.message.slice(0,200)));
  page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|geopf|open-meteo|nominatim|ERR_|tile/i.test(m.text()))logs.push(m.text().slice(0,200));});
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.route(u=>/geopf|geo\.api|open-meteo|nominatim|tile\.openstreetmap|arcgis|ign\.fr/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.clock.install({time:new Date(2026,10,26,8,30,0)});
  await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>localStorage.clear());
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}}
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.state.userId=id;T.showScreen('home');T.renderHome();},id);await wait(400);};
const tab=async id=>{await page.evaluate(id=>{const T=window.TRACE;if(T.state.screen!=='home'){T.showScreen('home');T.renderHome();}const e=document.getElementById(id);if(e)e.click();},id);await wait(700);};
const txt=sel=>page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent.replace(/\s+/g,' '):'';},sel);
const modal=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show');if(!m)return null;return {t:m.textContent.replace(/\s+/g,' '),secs:[...m.querySelectorAll('.rgpdSec summary')].map(x=>x.textContent.trim()),fermer:!!m.querySelector('[data-close]'),exp:!!m.querySelector('[data-act="rgpdexport"]')};});
const fermer=async()=>{await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-close]');if(b)b.click();});await wait(400);};
await open({width:390,height:844});
await as('karim');await tab('htEspace');
/* m1 */
const avant=await page.evaluate(()=>!!document.querySelector('#eq-app .rgpdCarte'));
await page.evaluate(()=>{const b=document.querySelector('#eq-app .rgpdCarte [data-act="rgpd"]');if(b)b.click();});await wait(700);const M1=await modal();
await fermer();await tab('htEspace');const apres=await page.evaluate(()=>!!document.querySelector('#eq-app .rgpdCarte'));
console.log('m1) carte à l\'accueil :',avant,'→ après lecture :',apres,'| rubriques :',J(M1&&M1.secs));
C.m1=avant&&!apres&&!!M1&&M1.secs.length===6&&/à 100 m environ/.test(M1.t)&&/2 mois/.test(M1.t)&&/Anthropic/.test(M1.t)&&/CNIL/.test(M1.t)&&/Jamais de suivi en continu/.test(M1.t)&&M1.fermer&&M1.exp;
/* m2 */
const fiche=await page.evaluate(()=>!![...document.querySelectorAll('#eq-app [data-act="rgpd"]')].find(b=>/Tes données dans Tracé/.test(b.textContent)));
const pt=await page.evaluate(()=>{const l=document.querySelector('#eq-app .ptc .pt-rgpd');return l?l.textContent.replace(/\s+/g,' '):null;});
await page.evaluate(()=>{const l=document.querySelector('#eq-app .ptc .pt-rgpd [data-act="rgpd"]');if(l)l.click();});await wait(700);const M2=await modal();
console.log('m2) bouton dans Ta fiche :',fiche,'| carte de pointage :',pt,'| ouvre la page :',!!M2);
C.m2=fiche&&!!pt&&/seulement quand tu pointes, à 100 m près/.test(pt)&&!!M2;
/* m3 */
const [dl]=await Promise.all([page.waitForEvent('download',{timeout:8000}).catch(()=>null),page.evaluate(()=>{const b=document.querySelector('#modal.show [data-act="rgpdexport"]');if(b)b.click();})]);
let fic=null;if(dl){const pth=await dl.path();try{fic=JSON.parse(fs.readFileSync(pth,'utf8'));}catch(e){fic={err:e.message};}}
const autres=fic&&Array.isArray(fic.pointages)?fic.pointages.length:-1;
console.log('m3) fichier :',dl&&dl.suggestedFilename(),'| clés :',fic&&Object.keys(fic).join(','),'| compte :',J(fic&&fic.compte),'| pointages :',autres);
C.m3=!!dl&&/^mes_donnees_trace_\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename())&&!!fic&&fic.compte&&/Karim/.test(fic.compte.nom||'')&&Array.isArray(fic.pointages)&&typeof fic.fiche==='object';
await fermer();
/* m4 */
await tab('htEnt');const row=await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Données personnelles \(RGPD\)/.test(x.textContent));if(r){r.click();return true;}return false;});await wait(700);
const hubPage=await page.evaluate(()=>{const e=document.getElementById('eq-app');return {t:e.textContent.replace(/\s+/g,' '),fermer:!!e.querySelector('.rgpdPage [data-close]'),exp:!!e.querySelector('.rgpdPage [data-act="rgpdexport"]'),back:!!e.querySelector('.ac-back')};});
const [dl2]=await Promise.all([page.waitForEvent('download',{timeout:8000}).catch(()=>null),page.evaluate(()=>{const b=document.querySelector('#eq-app .rgpdPage [data-act="rgpdexport"]');if(b)b.click();})]);
console.log('m4) ligne Équipe :',row,'| page :',/Tes données personnelles/.test(hubPage.t),'Fermer :',hubPage.fermer,'retour :',hubPage.back,'téléchargement :',!!dl2);
C.m4=row&&/Tes données personnelles/.test(hubPage.t)&&!hubPage.fermer&&hubPage.exp&&hubPage.back&&!!dl2;
/* m5 */
await as('ethan');await tab('htAdmin');await page.evaluate(()=>{const b=document.querySelector('[data-av="entreprise"]');if(b)b.click();});await wait(700);
const champ=await page.evaluate(()=>!!document.getElementById('entRgpdHeb'));
await page.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}};s('entRgpdNom','Nina FICTIVE');s('entRgpdMail','rgpd@exemple.fr');s('entRgpdHeb','Union européenne — Paris (eu-west-3)');const b=document.getElementById('entSignOk');if(b)b.click();});await wait(900);
await as('karim');await tab('htEspace');await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="rgpd"]')].pop();if(b)b.click();});await wait(700);const M5=await modal();await fermer();
console.log('m5) champ région :',champ,'| page : référent',/Nina FICTIVE/.test(M5&&M5.t||''),'e-mail',/rgpd@exemple\.fr/.test(M5&&M5.t||''),'région',/Paris \(eu-west-3\)/.test(M5&&M5.t||''));
C.m5=champ&&!!M5&&/Nina FICTIVE/.test(M5.t)&&/rgpd@exemple\.fr/.test(M5.t)&&/Union européenne — Paris \(eu-west-3\)/.test(M5.t);
/* m6 */
await page.evaluate(()=>window.TRACE.ia.open('chat'));await wait(700);const ia=await txt('.ia-rgpd');await page.evaluate(()=>window.TRACE.ia.close());await wait(300);
console.log('m6) assistant :',ia);C.m6=/N'écris ni information de santé ni rien sur un collègue/.test(ia);
await ctx.close();
/* m7 : 360 px */
await open({width:360,height:740});await as('karim');await tab('htEspace');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="rgpd"]');if(b)b.click();});await wait(700);
const m7=await page.evaluate(()=>{const m=document.querySelector('#modal.show');if(!m)return null;const vw=innerWidth;const large=[...m.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>vw+0.5||r.left<-0.5);}).length;
  const bt=[...m.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height));return {large,minBtn:Math.min(...bt),doc:document.documentElement.scrollWidth<=vw+1};});
const maj=await page.evaluate(()=>/TRACÉ/.test(document.body.innerText));console.log('m7) 360 px :',J(m7),'| « TRACÉ » en capitales :',maj);C.m7=!!m7&&!m7.large&&m7.minBtn>=44&&m7.doc&&!maj;
await ctx.close();
C.m8=!logs.length;console.log('console :',J(logs));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
