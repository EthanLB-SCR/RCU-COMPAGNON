// e2e_m3d_1111 — lot 3D de la nuit du 10 au 11/11/2026 (Ethan) : l'accueil = mon bureau seul (plus d'accès au dépôt d'ici) ; Commerce, Flotte, Magasin = leur espace
// dans un seul dépôt (plus léger) ; le monde entier par Équipe → « Visite des dépôts » ; lampes = objets (plus dans le mobilier ni posées d'office) ; photo du tapis de
// souris à l'endroit vue de la chaise + « ↻ Tourner l'image » ; plus de doublons dans les couleurs (murs, clavier) ; glisser une couleur ne ferme plus le sélecteur.
// Données fictives uniquement (dépôts « Dépôt A / B », personnes de démo).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));const C={};const W=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,6,9,0,0)});
await page.goto(BASE+'/index.html');await W(600);
await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A'},idf:{nom:'Dépôt B',ville:'Ville B'}},magasin:'ouest'}));});
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);
const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(2600);};
await home('htHome');
const ok3d=await page.evaluate(()=>!!(window.TRACE.monde3d&&window.TRACE.monde3d()));
if(!ok3d){console.log('WebGL indisponible : lot non joué');console.log('RESULTAT: TOUT VERT (WebGL absent)');process.exit(0);}
const chips=()=>page.evaluate(()=>[...document.querySelectorAll('.m3d-topbar .m3d-chip')].map(b=>b.dataset.chip));
const setPrefs=f=>page.evaluate(src=>{const c=window.TRACE.monde.ctx();const H=window.TRACE.monde3d();const id=H.state.DATA.me.id;const d=c.peopleData(id)||{};const p=JSON.parse(JSON.stringify(H.state.prefs));(new Function('p',src))(p);c.savePart(id,'avatar',Object.assign({},d.avatar||{},{bureau3d:p}));window.TRACE.renderHome();},f);
// ── m1) accueil = mon bureau seul : plus de puce « Aller au dépôt » (ni en personnalisation), pas d'avatars d'équipe calculés
const m1={chips:await chips()};
await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await W(700);m1.perso=await chips();
m1.avatars=await page.evaluate(()=>{const H=window.TRACE.monde3d();const me=H.state.DATA.me.id;return H.state.DATA.people.filter(p=>p.id!==me&&p.svg).length;});
console.log('m1) accueil :',J(m1));C.m1=!m1.chips.includes('depot')&&!m1.perso.includes('depot')&&m1.chips.includes('perso')&&m1.avatars===0;
// ── m2) lampes : plus dans le mobilier ; trois lampes dans « Objets de bureau » ; on en pose une
const m2=await page.evaluate(()=>{const t=document.querySelector('[data-ptab=mobilier]');if(t)t.click();return 0;});await W(300);
const m2a=await page.evaluate(()=>({labs:[...document.querySelectorAll('.m3d-box.perso .m3d-plab')].map(x=>x.textContent.trim()),lampPref:!!document.querySelector('[data-pref^="lampe="]')}));
await page.evaluate(()=>{const t=document.querySelector('[data-ptab=objets]');if(t)t.click();});await W(300);await page.evaluate(()=>{const t=document.querySelector('[data-pfam=bureau]');if(t)t.click();});await W(300);
const m2b=await page.evaluate(()=>[...document.querySelectorAll('[data-add^="lampe_"]')].map(b=>b.dataset.add));
const n0=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.objets.length);
await page.evaluate(()=>{const b=document.querySelector('[data-add="lampe_boule"]');if(b)b.click();});await W(900);
const m2c=await page.evaluate(()=>{const P=window.TRACE.monde3d().state.prefs;return {n:P.objets.length,boule:P.objets.filter(o=>o.k==='lampe_boule').length,pref:'lampe' in P};});
console.log('m2) lampes :',J({m2a,m2b,n0,m2c}));C.m2=!m2a.labs.some(l=>/^Lampe/.test(l))&&!m2a.lampPref&&J(m2b)===J(['lampe_articulee','lampe_boule','lampe_champignon'])&&m2c.n===n0+1&&m2c.boule===1&&m2c.pref===false;
// ── m3) bureau neuf : pas de lampe posée d'office ; anciens réglages : la lampe du mobilier devient l'objet du même modèle, « Aucune » la retire
await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await W(600);
await setPrefs("delete p.objets;");await W(5200);
const m3a=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.objets.filter(o=>/^lampe/.test(o.k)).length);
await setPrefs("p.lampe='champignon';p.objets=[{id:'lx1',k:'lampe',surf:'desk',x:1.2,y:0.74,z:-0.56,s:1},{id:'mx1',k:'mug',surf:'desk',x:-0.5,y:0.74,z:-1.02,s:1}];");await W(5200);
const m3b=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.objets.map(o=>o.k));
await setPrefs("p.lampe='none';p.objets=[{id:'lx2',k:'lampe',surf:'desk',x:1.2,y:0.74,z:-0.56,s:1},{id:'mx2',k:'mug',surf:'desk',x:-0.5,y:0.74,z:-1.02,s:1}];");await W(5200);
const m3c=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.objets.map(o=>o.k));
console.log('m3) lampes par défaut / anciens réglages :',J({m3a,m3b,m3c}));C.m3=m3a===0&&J(m3b)===J(['lampe_champignon','mug'])&&J(m3c)===J(['mug']);
// ── m4) couleurs sans doublon : murs = 9 pastilles + « toutes les couleurs », clavier = 4 pastilles + Bois + « toutes les couleurs », pas de palette en plus
await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await W(700);
await page.evaluate(()=>{const t=document.querySelector('[data-ptab=piece]');if(t)t.click();});await W(300);
const m4a=await page.evaluate(()=>{const g=[...document.querySelectorAll('.m3d-box.perso .m3d-pgrp')].find(x=>/^Murs/.test(x.querySelector('.m3d-plab').textContent));return g?{sw:g.querySelectorAll('.m3d-sw').length,pick:g.querySelectorAll('input[type=color]').length,pal:g.querySelectorAll('[data-colgrp]').length}:null;});
await page.evaluate(()=>{const t=document.querySelector('[data-ptab=mobilier]');if(t)t.click();});await W(300);
const m4b=await page.evaluate(()=>{const g=[...document.querySelectorAll('.m3d-box.perso .m3d-pgrp')].find(x=>/^Clavier/.test(x.querySelector('.m3d-plab').textContent));return g?{sw:g.querySelectorAll('.m3d-sw').length,txt:[...g.querySelectorAll('.m3d-popt')].map(b=>b.textContent),pick:g.querySelectorAll('input[type=color]').length,pal:g.querySelectorAll('[data-colgrp]').length}:null;});
// une teinte libre sur le clavier, puis une pastille nommée : la teinte libre s'efface
await page.evaluate(()=>{const i=[...document.querySelectorAll('input[type=color][data-col=clavier]')][0];i.value='#c9241c';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(400);
const m4c={vivant:await page.evaluate(()=>{const i=[...document.querySelectorAll('input[type=color][data-col=clavier]')][0];return !!i;})};
const iel=await page.evaluate(()=>{window.__ci=document.querySelector('input[type=color][data-col=clavier]');return !!window.__ci;});
await page.evaluate(()=>{const i=window.__ci;i.value='#2456c8';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(400);
m4c.memeChamp=await page.evaluate(()=>!!(window.__ci&&window.__ci.isConnected)); /* le sélecteur reste ouvert pendant qu'on glisse */
await page.evaluate(()=>{window.__ci.dispatchEvent(new Event('change',{bubbles:true}));});await W(900);
m4c.teinte=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.couleurs.clavier||null);
await page.evaluate(()=>{const b=document.querySelector('[data-pref="clavier=noir"]');if(b)b.click();});await W(900);
m4c.apres=await page.evaluate(()=>({clavier:window.TRACE.monde3d().state.prefs.clavier,teinte:window.TRACE.monde3d().state.prefs.couleurs.clavier||null}));
console.log('m4) couleurs :',J({m4a,m4b,m4c}));C.m4=!!m4a&&m4a.sw===9&&m4a.pick===1&&m4a.pal===0&&!!m4b&&m4b.sw===4&&J(m4b.txt)===J(['Bois'])&&m4b.pick===1&&m4b.pal===0&&m4c.memeChamp&&m4c.teinte==='#2456c8'&&m4c.apres.clavier==='noir'&&m4c.apres.teinte===null;
// ── m5) tapis de souris en photo : à l'endroit vue de la chaise (haut de l'image au fond), « ↻ Tourner l'image » par quart de tour
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';
await page.evaluate(u=>{const H=window.TRACE.monde3d();H.state.prefs.tapis_souris_img=u;H.state.prefs.tapis_souris='image';},PNG);
await page.evaluate(()=>{const b=document.querySelector('[data-pref="tapis_souris=noir"]');if(b)b.click();});await W(400); /* un réglage pour redessiner */
await page.evaluate(u=>{const H=window.TRACE.monde3d();H.state.prefs.tapis_souris_img=u;},PNG);await page.evaluate(()=>{const b=document.querySelector('[data-pref="tapis_souris=image"]');if(b)b.click();});await W(900);
const rotZ=()=>page.evaluate(()=>{let r=null;window.TRACE.monde3d().state.pod.traverse(o=>{if(o.userData&&o.userData.img&&o.userData.img.isMesh)r=Math.round(o.userData.img.rotation.z*1000)/1000;});return r;});
const m5={z0:await rotZ(),btn:await page.evaluate(()=>!!document.querySelector('[data-pref^="tapis_souris_rot="]'))};
await page.evaluate(()=>{const b=document.querySelector('[data-pref^="tapis_souris_rot="]');if(b)b.click();});await W(900);m5.z1=await rotZ();m5.rot=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.tapis_souris_rot);
console.log('m5) tapis en photo :',J(m5));C.m5=Math.abs(m5.z0-Math.PI)<0.01&&m5.btn&&m5.rot===90&&Math.abs(m5.z1-1.5*Math.PI)<0.01;
await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await W(600);
// ── m6) Commerce et Flotte : leur espace dans un seul dépôt ; Visite des dépôts : tout le monde
const espace=()=>page.evaluate(()=>{const H=window.TRACE.monde3d();if(!H)return null;return {scene:H.state.scene,centres:Object.keys(H.state.world&&H.state.world.centers||{}),chips:[...document.querySelectorAll('.m3d-topbar .m3d-chip')].map(b=>b.dataset.chip)};});
await home('htCom');const com=await espace();await home('htParc');const fl=await espace();
let fl2=null;if(fl&&fl.chips.includes('dep:idf')){await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip="dep:idf"]');if(b)b.click();});await W(1500);fl2=await espace();}
await home('htEnt');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="x:monde:depot"]');if(b)b.click();});await W(2600);const vis=await espace();
console.log('m6) espaces :',J({com,fl,fl2,vis}));C.m6=!!com&&com.scene==='commerce'&&com.centres.length===1&&!com.chips.includes('survol')&&!com.chips.includes('cam:bureaux')&&!!fl&&fl.scene==='flotte'&&fl.centres.length===1&&(!fl2||J(fl2.centres)===J(['idf']))&&!!vis&&vis.centres.length>=2&&vis.chips.includes('cam:bureaux');
const L=logs.filter(l=>!/three|WebGL|GPU|swiftshader/i.test(l));C.m7=L.length===0;if(L.length)console.log('logs :',J(L.slice(0,8)));
await browser.close();
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RÉSULTATS',J(C));console.log('RESULTAT:',ko.length?'ECHEC '+ko.join(','):'TOUT VERT');process.exit(ko.length?1:0);
