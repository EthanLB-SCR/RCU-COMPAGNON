// e2e_band_3010.mjs — 30/10 (charte « Tracé », fiche claude/charte-trace.md) : BANDEAU DU HAUT. Contrôle demandé par Ethan : 390 px et 360 px sans débordement avec le module le plus
// long (« Tracé Concepteur ») et un logo d'entreprise de 112 px ; puis l'affichage large (PC, 64 px, 132 × 40, pastille dans le bandeau).
//  c1  écran Entreprise (Administrateur → 🏢 Entreprise) : envoi d'un logo PNG (rapport 112 × 36), aperçus téléphone + PC, « Enregistrer » → le logo est dans le bandeau
//  c2  390 px : accueil (Moi → « Tracé Compagnon »), chantier (« Tracé Chantier », 2e ligne ⌂ · chantier ▾ … 🔍 ☰), pire cas « Concepteur » forcé : rien ne déborde, nom du module
//      entier, logo entreprise ≤ 112 × 36 et entier, bandeau 56 px, 2e ligne ≥ 44 px, pastille dans la 2e ligne
//  c3  360 px : mêmes contrôles
//  c4  traceur (« Tracé Concepteur ») à 390 et 360 px : rien ne déborde, nom entier, logo entreprise repris
//  c5  menu des modules (toucher « Tracé … ») : modules ouverts à la personne ; « Compagnon » → onglet Moi ; affichage large : bandeau 64 px, logo ≤ 132 × 40, pastille dans le bandeau
//  c6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();});await wait(300);
/* un logo d'entreprise de test, au rapport 112 × 36 (fichier PNG) */
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=224;c.height=72;const g=c.getContext('2d');g.fillStyle='#0a6e4f';g.fillRect(0,0,224,72);g.fillStyle='#fff';g.font='bold 40px sans-serif';g.fillText('ACME BTP',12,52);return c.toDataURL('image/png').split(',')[1];});
/* ── c1 : écran Entreprise */
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Entreprise/.test(x.textContent));b.click();});await wait(400);
await page.fill('#entName','ACME Travaux');
await page.setInputFiles('#entFile',{name:'logo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await wait(600);
let o={prevs:await page.evaluate(()=>[...document.querySelectorAll('#entPrevs .entPrev')].map(p=>!!p.querySelector('.tbCoImg'))),del:!!(await page.$('#entDel'))};
await page.click('#entOk');await wait(500);
o.ent=await page.evaluate(()=>{const e=window.TRACE.band.ent();return {name:e&&e.name,logo:!!(e&&e.logo&&/^data:image\/png;base64,/.test(e.logo))};});
o.band=await page.evaluate(()=>{const i=document.querySelector('#tbHomeCo .tbCoImg');return i?{alt:i.alt,w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height}:null;});
console.log('c1) écran Entreprise :',J(o));
C.c1=o.prevs.length===2&&o.prevs.every(Boolean)&&o.del&&o.ent.name==='ACME Travaux'&&o.ent.logo&&o.band&&o.band.alt==='ACME Travaux'&&o.band.w<=112.5&&o.band.h<=36.5;
/* mesures d'un bandeau */
const measure=(sel)=>page.evaluate(sel=>{const tb=document.querySelector(sel);if(!tb)return null;const band=tb.querySelector('.tbBand');const ctx=tb.querySelector('.tbCtx');const mod=tb.querySelector('.tbModName');const mb=tb.querySelector('.tbMod');const co=tb.querySelector('.tbCo');const img=co&&co.querySelector('.tbCoImg');const W=window.innerWidth;
  const r=e=>e?e.getBoundingClientRect():null;const rb=r(band),rc=r(co),ri=r(img),rm=r(mb);
  const kids=[...tb.querySelectorAll('.tbBand > *, .tbCtx > *, .tbCtx .rolebox > *')].filter(e=>e.offsetParent!==null).map(e=>({id:e.id||e.className,right:Math.round(e.getBoundingClientRect().right)}));
  return {W,bandH:Math.round(rb.height),ctxH:ctx?Math.round(r(ctx).height):0,modTxt:mb?mb.textContent.replace(/▾/,'').trim():'',modFull:mod?mod.scrollWidth<=mod.clientWidth+1:true,modBtnFull:mb?mb.scrollWidth<=mb.clientWidth+1:true,
    modRight:rm?Math.round(rm.right):0,coLeft:rc?Math.round(rc.left):0,coRight:rc?Math.round(rc.right):0,img:ri?{w:Math.round(ri.width*10)/10,h:Math.round(ri.height*10)/10,inside:ri.left>=rc.left-0.5&&ri.right<=rc.right+0.5&&ri.top>=rc.top-0.5&&ri.bottom<=rc.bottom+0.5}:null,
    over:document.documentElement.scrollWidth>W,maxRight:Math.max(0,...kids.map(k=>k.right)),kids:kids.filter(k=>k.right>W).map(k=>k.id)};},sel);
const okBand=(m,ph=true)=>!!m&&!m.over&&m.maxRight<=m.W&&m.modFull&&m.modBtnFull&&m.modRight<=m.coLeft&&m.coRight<=m.W&&(!m.img||(m.img.inside&&m.img.w<=(ph?112.5:132.5)&&m.img.h<=(ph?36.5:40.5)))&&(ph?m.bandH===56:m.bandH===64)&&m.ctxH>=(ph?44:48);
const phone=async(W)=>{await page.setViewportSize({width:W,height:800});await wait(200);const out={};
  await page.evaluate(()=>{const T=window.TRACE;T.showScreen('home');document.getElementById('htEspace').click();});await wait(400);
  out.moi=await measure('#tbHome');out.moi.avaCtx=await page.evaluate(()=>!!document.querySelector('#tbHomeAvaCtx #homeAva'));out.moi.ctxTxt=await page.evaluate(()=>document.querySelector('#tbHome .tbCtx').textContent.trim().slice(0,60));
  if(SHOTS)await page.screenshot({path:SHOTS+`/band_moi_${W}.png`,clip:{x:0,y:0,width:W,height:220}});
  await page.evaluate(()=>{document.getElementById('tbHomeModName').textContent='Concepteur';});out.pire=await measure('#tbHome');await page.evaluate(()=>window.TRACE.band.render());
  await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);T.showScreen('site');if(T.state.siteId!==id)T.switchSite(id);T.state.tab='plan';T.renderAll();});await wait(600);
  out.site=await measure('#tbSite');out.site.btns=await page.evaluate(()=>['btnHome','siteSel','btnSearch','btnMenu'].map(id=>{const e=document.getElementById(id);return !!e&&e.offsetParent!==null&&e.getBoundingClientRect().right<=window.innerWidth;}));
  out.site.hidden=await page.evaluate(()=>['btnWide','btnHelp'].map(id=>getComputedStyle(document.getElementById(id)).display));
  if(SHOTS)await page.screenshot({path:SHOTS+`/band_chantier_${W}.png`,clip:{x:0,y:0,width:W,height:260}});
  return out;};
/* ── c2 / c3 */
o=await phone(390);console.log('c2) 390 px :',J(o));
C.c2=okBand(o.moi)&&/Compagnon/.test(o.moi.modTxt)&&o.moi.avaCtx&&!/\bMoi\b/.test(o.moi.ctxTxt)&&/Ethan/.test(o.moi.ctxTxt) /* 31/10 : 2e ligne = la personne, plus « Moi » */&&okBand(o.pire)&&/Concepteur/.test(o.pire.modTxt)&&okBand(o.site)&&/Chantier/.test(o.site.modTxt)&&o.site.btns.every(Boolean)&&o.site.hidden.every(d=>d==='none');
o=await phone(360);console.log('c3) 360 px :',J(o));
C.c3=okBand(o.moi)&&o.moi.avaCtx&&okBand(o.pire)&&/Concepteur/.test(o.pire.modTxt)&&okBand(o.site)&&o.site.btns.every(Boolean);
/* ── c4 : traceur */
const tr={};for(const W of [390,360,1366]){const p2=await ctx.newPage();p2.on('pageerror',e=>logs.push('PAGEERROR (traceur): '+e.message.slice(0,200)));await p2.setViewportSize({width:W,height:800});await p2.goto(BASE+'/traceur.html');await p2.waitForTimeout(1200);
  tr[W]=await p2.evaluate(()=>{const tb=document.getElementById('tbTr');const band=tb.querySelector('.tbBand');const mb=tb.querySelector('.tbMod');const mod=tb.querySelector('.tbModName');const co=tb.querySelector('.tbCo');const img=co.querySelector('.tbCoImg');const W=window.innerWidth;
    return {W,bandH:Math.round(band.getBoundingClientRect().height),mod:mb.textContent.trim(),full:mod.scrollWidth<=mod.clientWidth+1&&mb.scrollWidth<=mb.clientWidth+1,modRight:Math.round(mb.getBoundingClientRect().right),coLeft:Math.round(co.getBoundingClientRect().left),coRight:Math.round(co.getBoundingClientRect().right),img:img?{w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height,alt:img.alt}:null,ctx:document.getElementById('siteBadge').textContent.slice(0,50),ctxVis:(()=>{const a=document.getElementById('siteBadge'),b=document.getElementById('siteBadge2');const v=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0&&getComputedStyle(e.closest('.tbCtx')||e).display!=='none';return {inBand:v(a),line2:v(b),txt2:b?b.textContent.slice(0,50):null,tbH:Math.round(tb.getBoundingClientRect().height)};})()};});
  if(SHOTS)await p2.screenshot({path:SHOTS+`/band_traceur_${W}.png`,clip:{x:0,y:0,width:W,height:200}});await p2.close();}
console.log('c4) traceur :',J(tr));
C.c4=[390,360].every(W=>{const t=tr[W];return t&&t.bandH===56&&/Tracé\s*Concepteur/.test(t.mod)&&t.full&&t.modRight<=t.coLeft&&t.coRight<=W&&t.img&&t.img.alt==='ACME Travaux'&&t.img.w<=112.5&&t.img.h<=36.5&&!t.ctxVis.inBand&&t.ctxVis.line2&&t.ctxVis.tbH<=60&&/réseau|chantier|étude/.test(t.ctxVis.txt2);})
  &&(t=>t&&t.bandH===64&&t.ctxVis.inBand&&!t.ctxVis.line2&&t.ctxVis.tbH<=68&&t.img&&t.img.h<=40.5)(tr[1366]); /* 31/10 : sur PC, le contexte du traceur est DANS le bandeau (une seule ligne : le dessin garde sa hauteur) */
/* ── c5 : menu des modules + affichage large */
await page.setViewportSize({width:1366,height:900});await wait(200);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='accueil';window.TRACE.renderHome();});await wait(300);
o={list:await page.evaluate(()=>window.TRACE.band.modules())};
await page.click('#tbHomeMod');await wait(250);o.menu=await page.evaluate(()=>[...document.querySelectorAll('#modal .modList b')].map(b=>b.textContent.trim()));
await page.evaluate(()=>{const b=[...document.querySelectorAll('#modal .modList button')].find(x=>/Compagnon/.test(x.textContent));b.click();});await wait(400);
o.after={tab:await page.evaluate(()=>window.TRACE.state.homeTab),mod:await page.evaluate(()=>document.getElementById('tbHomeModName').textContent)};
await page.click('#tbHomeMod');await wait(250);await page.click('#modal [data-mod=wide]');await wait(400);
o.wide=await measure('#tbHome');o.wide.ava=await page.evaluate(()=>!!document.querySelector('#tbHomeAvaBand #homeAva'));o.wide.isWide=await page.evaluate(()=>document.getElementById('app').classList.contains('wide'));
if(SHOTS)await page.screenshot({path:SHOTS+'/band_pc_1366.png',clip:{x:0,y:0,width:1366,height:200}});
await page.evaluate(()=>{const T=window.TRACE;T.showScreen('site');T.renderAll();});await wait(400);o.wideSite=await measure('#tbSite');
if(SHOTS)await page.screenshot({path:SHOTS+'/band_pc_chantier_1366.png',clip:{x:0,y:0,width:1366,height:220}});
console.log('c5) modules + PC :',J(o));
C.c5=o.list.includes('chantier')&&o.list.includes('compagnon')&&o.menu.length===o.list.length&&o.menu.some(t=>/Tracé\s*Chantier/.test(t))&&o.after.tab==='espace'&&o.after.mod==='Compagnon'&&o.wide.isWide&&okBand(o.wide,false)&&o.wide.ava&&okBand(o.wideSite,false);
C.c6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
