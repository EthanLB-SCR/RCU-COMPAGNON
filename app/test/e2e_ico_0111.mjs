// e2e_ico_0111 — 01/11 soir (identité Tracé, étape 2) : les icônes des modules de la charte à la place des icônes génériques / emoji
//  i1  menu des modules : une tuile Nuit (44 px, coins 25 %, icône blanche à 58 %) par ligne, l'icône du module (Accueil = soleil levant) ; lignes ≥ 62 px
//  i2  accueil « Espaces » : les modules en tuiles Nuit à icône blanche ; Réglages (pas un module) garde son icône
//  i3  onglets des modules (ruban masqué) : icônes de la charte ; catalogue des tutos : l'icône devant chaque module
//  i4  360 px : rien ne déborde (menu des modules) ; i5 zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const ctx=await b.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();
page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(fn,a)=>page.evaluate(fn,a);
await page.goto(BASE+'/index.html');await W(400);await T(()=>{localStorage.clear();localStorage.setItem('trace:skipLogin','1');});await page.reload();await W(1500);
const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible()){await sk.click();await W(700);}
await T(()=>{const X=window.TRACE;try{X.tuto.close(null);}catch(e){}X.state.userId='ethan';X.showScreen('home');document.getElementById('htHome').click();});await W(600);
const D={aujourdhui:'M3 17h18',chantier:'M4.5 15.5a7.5',pilotage:'M5.5 5h13',compagnon:'M8.4 8a3.6',commerce:'M3.5 12.3V4.8',affaire:'M4.5 7.5h15',flotte:'M2.5 16.5V7.5',magasin:'M12 2.8l8.5',rh:'M3 7.2V6.2a1.5',equipe:'M9 8.2a3',concepteur:'M3.5 19.5'};
const which=d=>Object.keys(D).find(k=>String(d||'').startsWith(D[k]))||null;
const o={};
// i1
await T(()=>document.getElementById('tbHomeMod').click());await W(400);
o.i1=await T(()=>[...document.querySelectorAll('#modal .modList button')].map(b=>{const t=b.querySelector('.tr-tuile');const r=t&&t.getBoundingClientRect();const p=t&&t.querySelector('svg path');return {lab:(b.querySelector('b')||{}).textContent,w:r&&Math.round(r.width),bg:t&&getComputedStyle(t).backgroundColor,col:t&&getComputedStyle(t).color,rad:t&&t.style.borderRadius,d:p&&p.getAttribute('d'),h:Math.round(b.getBoundingClientRect().height)};}));
o.i1.forEach(x=>{x.k=which(x.d);delete x.d;});
const MAP={'Tracé':'aujourdhui','Tracé Chantier':'chantier','Tracé Concepteur':'concepteur','Tracé Commerce':'commerce','Tracé Affaire':'affaire','Tracé Pilotage':'pilotage','Tracé Flotte':'flotte','Tracé Magasin':'magasin','Tracé Compagnon':'compagnon','Tracé Équipe':'equipe','Tracé Ressources humaines':'rh'}; /* 10/11 soir : + RH */
C.i1=o.i1.length>=8&&o.i1.every(x=>x.w===44&&x.bg==='rgb(43, 27, 90)'&&x.col==='rgb(255, 255, 255)'&&x.rad==='11px'&&x.h>=62&&x.k===MAP[x.lab.replace(/\s+/g,' ').trim()]);
await T(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await W(200);
// i2
o.i2=await T(()=>[...document.querySelectorAll('.ac-spaces .ac-tile')].map(t=>{const ic=t.querySelector('.ic');const p=ic&&ic.querySelector('svg path');return {lab:(t.querySelector('b')||{}).textContent,mod:ic&&ic.classList.contains('trMod'),bg:ic&&getComputedStyle(ic).backgroundColor,d:p&&p.getAttribute('d')};}));
o.i2.forEach(x=>{x.k=which(x.d);delete x.d;});
{const M2={Chantier:'chantier',Pilotage:'pilotage',Compagnon:'compagnon',Commerce:'commerce',Affaire:'affaire',Flotte:'flotte',Magasin:'magasin','Équipe':'equipe'};
 C.i2=o.i2.length>=8&&o.i2.filter(x=>M2[x.lab]).every(x=>x.mod&&x.bg==='rgb(43, 27, 90)'&&x.k===M2[x.lab])&&o.i2.some(x=>x.lab==='Réglages'&&!x.mod);}
// i3
o.i3={tabs:await T(()=>['htHome','htSites','htExpl','htEspace','htCom','htAff','htParc','htMag','htEnt'].map(id=>{const p=document.querySelector('#'+id+' svg.tr-ico path');return p?p.getAttribute('d'):null;}))};
o.i3.tabs=o.i3.tabs.map(which);
await T(()=>{const X=window.TRACE;if(X.tuto&&X.tuto.catalog)X.tuto.catalog();});await W(300);
o.i3.cat=await T(()=>[...document.querySelectorAll('#modal .tuCatM > b')].map(b=>({t:b.textContent.trim(),ico:!!b.querySelector('svg.tr-ico')})));
C.i3=J(o.i3.tabs)==='["aujourdhui","chantier","pilotage","compagnon","commerce","affaire","flotte","magasin","equipe"]'&&(!o.i3.cat.length||o.i3.cat.filter(x=>/^Tracé /.test(x.t)).every(x=>x.ico));
await T(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await W(200);
// i4 — 360 px
await page.setViewportSize({width:360,height:740});await W(300);await T(()=>document.getElementById('tbHomeMod').click());await W(400);
o.i4=await T(()=>{const m=document.querySelector('#modal .modList');const r=m.getBoundingClientRect();const over=[...m.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>r.right+1).length;return {over,sw:document.scrollingElement.scrollWidth,iw:innerWidth};});
C.i4=o.i4.over===0&&o.i4.sw<=o.i4.iw+1;
console.log('mesures :',J(o).slice(0,4000));
await b.close();C.i5=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
