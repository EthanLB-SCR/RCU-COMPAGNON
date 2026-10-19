// LOT DK (16/10 nuit) — la part des postes répartis pour une nouvelle ligne, imputer sur des lignes choisies, un récap consultable. Ethan : « si à côté de ça j'ai une
// ligne en plus […] ma nouvelle ligne […] n'aura pas d'installations par exemple ? J'ai changé un DN complet sur le chantier […] pour les soudures et ml du nouveau
// DN, j'ai pu les pointer en brut, mais toutes les autres dépenses étaient déjà réparties sur les autres lignes et plus rien pour cette ligne-là […] il faudrait
// pouvoir ajouter sur 3 lignes précises et pas tout […] un espace de récap consultable où je vois la constitution de tous mes paniers, tous mes calculs ».
// Données FICTIVES : test/fixture_prix.xlsx, test/fixture_dpgf_suivi.xlsx (make_fixture_dpgfsuivi.py) ; zone 1 : DN 100 (120 soud., 600 ml), DN 80 (50, 300),
// purges DN 32 × 3, chantier (benne, WC, amené / repli × 2), autocontrôle itopo + pression ; zone 2 : DN 65 (40, 250), DN 50 (30, 150).
// Le scénario d'Ethan : 3.1 (soudures DN 100), 1.1 (la moitié du conteneur), 4.1 (épreuves) au calculateur, 5.1 au PU tapé, puis « ⇶ Mettre le reste au ml » ;
// le DN 100 de la zone 1 devient DN 125 (chiffrage) ; la liste est traitée ; le tronçon DN 125 a sa ligne au DPGF (2.6, insérée) pointée en brut (soudures,
// manchons, autocontrôle DN 125) : elle n'a rien des installations, de l'épreuve…
// c1 mise en place (pointé, « Mettre le reste au ml ») · c2 DN 100 → DN 125 au chiffrage, liste traitée · c3 bouton du calculateur · c4 l'élément « ligne sans part »
// (liste, bandeau) · c5 « ✓ Rien à faire » mémorisé, la case revient quand la situation change · c6 onglet « À vérifier » du récap, fenêtre par-dessus, Échap
// · c7 la fenêtre « Donner sa part » (postes cochés d'office, parts au ml, donneuses, aperçu) · c8 « ⇶ Donner sa part » : total inchangé, PU attendus, suivi sans
// fausse alerte, un seul ↶ remet tout, ↷ · c9 après coup : revalidation au calculateur, ↻ Refaire, ✕ Défaire, balance du lot C3 · c10 « en plus » sur 3 lignes
// cochées (somme contrôlée) · c11 balance sur les lignes cochées · c12 le récap : en-tête, 4 onglets · c13 cohérence (Σ lignes = pointé du poste = ventilation)
// · c14 recherche, par ligne · c15 clic vers la grille et le calculateur, Échap · c16 impression (A4, tout déplié, sans boutons) · c17 DPGF sur l'autre écran
// · c18 consultation d'une version : lecture seule · c19 téléphone 390 px · console.
// Captures : SHOTS (défaut /root/work/dk_shots).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {cles} from './dpgf_cles.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'/root/work/dk_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const wait=ms=>page.waitForTimeout(ms);const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();const NUM='O2610-97';
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s  €]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n||NUM);
const rect=s=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};},s);
const shot=async(name,p)=>{p=p||page;try{await p.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}};
const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:'';});
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
const toDpgf=async()=>{await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);};
const shut=async()=>{if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');};
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
const chif=async fn=>{await click('tab|chiffrage');await fn();await toDpgf();};
const band=async()=>sp(await page.$eval('#c3-band',e=>e.textContent).catch(()=>''));
const cellPu=async r=>nbv(await page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:'';},td(r,5)));
const its=()=>page.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it')].map(x=>({k:x.dataset.k,nm:x.querySelector('.c3-in').textContent.trim(),t:x.querySelector('.c3-is').textContent.replace(/[\s  ]+/g,' ').trim(),pu:(x.querySelector('.c3-pu')||{}).textContent||'',b:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.dataset.v),bt:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.textContent.trim())})));
// ── c1) mise en place : affaire, base fictive, 2 zones, DPGF fictif
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Récap et parts (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
await click('chetudeadd|');await dnRow(0,100,120,600);await dnRow(1,80,50,300);
await unfold('purges');await chg('#eq-app [data-afx="e§purges.dn"]','32');await chg('#eq-app [data-afx="e§purges.paires"]','3');
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-20');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await chg('#eq-app [data-afx="e§chantier.arMO"]',true);await chg('#eq-app [data-afx="e§chantier.arMOQty"]','2');
await unfold('eq');for(const t of ['itopo','pression'])await chg(`#eq-app [data-afx="e§eq.ctrl.${t}"]`,true);
await click('chetudeadd|');await dnRow(0,65,40,250);await dnRow(1,50,30,150);
await click('tab|dpgf');
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot05_recap.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_dpgf_suivi.xlsx'))});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600);
const {K,U}=await cles(page,NUM);
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${K(k)}"]`,on);
const fq=async(k,v)=>{const s=`#dx-calc [data-dx="cq"][data-k="${K(k)}"]`;await page.fill(s,v);await page.dispatchEvent(s,'change');await wait(250);};
const lk=(a,ad)=>(a.dpgf.liens||[]).find(L=>L.a===ad);const Pof=(a,k)=>(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).filter(x=>U(x.k)===k).reduce((t,x)=>t+(+x.q||0),0),0);
const qOn=(a,ad,k)=>{const L=lk(a,ad);return L?L.comps.filter(x=>U(x.k)===k).reduce((s,x)=>s+(+x.q||0),0):0;};
const put=async(r,ks,fills,q)=>{await gridTop();await page.click(td(r,5));await wait(500);if(q&&!(await page.$eval('#dx-calc [data-dx="q"]',e=>e.value))){await page.fill('#dx-calc [data-dx="q"]',q);await page.dispatchEvent('#dx-calc [data-dx="q"]','change');await wait(250);}
  for(const k of ks)await ck(k);for(const [k,v] of Object.entries(fills||{}))await fq(k,v);await click('dxput|');await wait(350);};
/* PU de vente d'une composante, recalculé ici à partir du chiffrage (contrôle indépendant de linkNow) */
const pv=k=>page.evaluate(([n,k])=>{const T=window.TRACE.affaires;const a=T.get(n);const Cc=T.calc(a);const m=/^z(\d+)\|([^|]+)(?:\|dn(\d+))?$/.exec(k);const e=Cc.etudes[+m[1]];const L=e.r.postes[m[2]];if(!L)return 0;const v=L.achat/Cc.coef;
  if(!m[3])return m[2]==='purges'?v/(+((e.z||{}).purges||{}).paires||1):v/(e.r.ml||100);const rows=e.r.detail.dn.rows;const wk=m[2]==='soudure'?'soud':m[2]==='manchons'?'manch':'auto';const W=rows.reduce((s,r)=>s+(r[wk]||0),0);const r=rows.find(x=>x.dn===+m[3]);const q=m[2]==='soudure'?(+r.J||0):(+r.K||0);return W&&q?v*(r[wk]||0)/W/q:0;},[NUM,k]);
const amtOf=async L=>{let s=0;for(const x of L.comps)s+=(+x.q||0)*await pv(U(x.k));return s;};
const jd=a=>JSON.stringify(a.dpgf);const sumKeys=a=>{const ks=[...new Set(a.dpgf.liens.flatMap(L=>L.comps.map(x=>U(x.k))))];return Object.fromEntries(ks.map(k=>[k,Pof(a,k)]));};
const sameTot=(t0,t1)=>Object.keys(Object.assign({},t0,t1)).every(k=>Math.abs((t0[k]||0)-(t1[k]||0))<1e-6);
const doIt=async(k,act)=>{await click('dxc3do|'+encodeURIComponent(K(k))+'|'+act);await wait(500);};
const vsum=async()=>sp(await page.$eval('#dx-vent .dx-vsum',e=>e.textContent).catch(()=>''));
const small=(sel,min)=>page.$$eval(sel,(L,min)=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<min).map(b=>(b.textContent||b.dataset.dk||b.type||'').trim().slice(0,24)),min);
const overflow=sel=>page.evaluate(s=>{const c=document.querySelector(s);if(!c)return ['absent'];return [...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width>0&&(r.right>window.innerWidth+1||r.left<-1);}).map(e=>e.className||e.tagName).slice(0,5);},sel);
let a=await A();let out={lines:a.dpgf.lignes.filter(l=>!l.section).map(l=>l.row+':'+l.n+':'+l.u+':'+l.qte).join(' ')};console.log('0) DPGF :',JSON.stringify(out));
// ── c1) le DPGF pointé comme Ethan : 3.1 (soudures DN 100), 1.1 (la moitié du conteneur, au forfait), 4.1 (les épreuves) au calculateur, 5.1 au PU tapé ; puis « ⇶ Mettre le reste au ml »
await put(16,['z0|soudure|dn100']);await put(6,['z0|conteneur'],{'z0|conteneur':'450'});await put(23,['z0|epreuve','z1|epreuve']);
await gridTop();await page.click(td(27,5));await wait(300);await page.keyboard.type('1500');await page.keyboard.press('Enter');await wait(500);await shut();
await click('dxrpsimple|');await wait(500);await click('dxrpsimpleok|');await wait(600);a=await A();const R1=(a.dpgf.reps||[])[0];
out={rep:R1&&R1.nom+' '+R1.lignes.join(','),vsum:await vsum(),band:await band(),e27:((a.dpgf.xl.ed||{}).DPGF||{}).E27,l27:!!lk(a,'E27')};
console.log('c1) pointé :',JSON.stringify(out));
C.c1=out.rep==='Reste au ml E9,E10,E11,E12,E13'&&/pointé [\d ]+ € \(100 %\)/.test(out.vsum)&&/tout est placé/.test(out.vsum)&&out.band===''&&out.e27&&out.e27.v===1500&&!out.l27;
// ── c2) le DN 100 de la zone 1 devient DN 125 (chiffrage) ; la liste traitée (« Tout traiter au prorata ») : les soudures, manchons, autocontrôles DN 100 sortent des lignes
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.dn"]','125');});
out={band:await band()};await click('dxc3list|');await wait(600);let I=await its();out.items=I.map(x=>U(x.k)+' : '+x.t);await click('dxc3all|');await wait(800);a=await A();
out.after={band:await band(),dn100:Pof(a,'z0|soudure|dn100')+Pof(a,'z0|manchons|dn100')+Pof(a,'z0|autoctrl|dn100'),e16:!!lk(a,'E16')};
console.log('c2) DN 100 → DN 125 :',JSON.stringify(out));
C.c2=/Le chiffrage a changé/.test(out.band)&&out.items.some(t=>/^z0\|soudure\|dn100 : supprimée du chiffrage — pointée sur 2\.1, 2\.2, 3\.1$/.test(t))&&out.after.band===''&&out.after.dn100===0&&!out.after.e16;
// ── le tronçon DN 125 a sa ligne au DPGF : 2.6, insérée sous la 2.5, pointée en brut au calculateur (soudures, manchons, autocontrôle DN 125)
await gridTop();await page.click(td(13,2));await wait(150);await click('dxins|');await wait(400);
await page.keyboard.press('Home');await page.keyboard.type('2.6');await page.keyboard.press('Tab');await page.keyboard.type('Tube pré-isolé DN 125 — nouveau tracé (essai)');await page.keyboard.press('Tab');await page.keyboard.type('ml');await page.keyboard.press('Tab');await page.keyboard.type('600');await page.keyboard.press('Enter');await wait(500);
await put(14,['z0|soudure|dn125','z0|manchons|dn125','z0|autoctrl|dn125'],null,'600');a=await A();const L14=lk(a,'E14');const pu14=L14&&L14.pu;
// ── c3) le calculateur de la 2.6 : un bandeau « aucune part des postes répartis » et « ⇶ Lui donner sa part » (pas caché dans un menu)
await gridTop();await page.click(td(14,5));await wait(600);out={cb:sp(await page.$eval('#dx-calc .dk-cbw',e=>e.textContent).catch(()=>'')),cbBtn:await page.$eval('#dx-calc .dk-cbw .btn',b=>{const r=b.getBoundingClientRect(),c=document.getElementById('dx-calc').getBoundingClientRect();return {v:b.dataset.v,vis:b.checkVisibility()&&r.top>=Math.max(0,c.top)&&r.bottom<=Math.min(innerHeight,c.bottom),h:Math.round(r.height)};}).catch(()=>null)}; /* visible sans faire défiler le calculateur */
await shot('pc_1366_calculateur_ligne_sans_part.png');await shut();
await page.click(td(6,5));await wait(500);out.cb11=await page.$eval('#dx-calc .dk-cb .btn',b=>b.textContent.trim()).catch(()=>'');out.cbw11=!!await page.$('#dx-calc .dk-cbw');await shut();
console.log('c3) calculateur :',JSON.stringify(out));
C.c3=/aucune part des postes répartis/.test(out.cb)&&/les 3 autres lignes au ml de sa zone en ont/.test(out.cb)&&out.cbBtn&&out.cbBtn.v==='dxdkpart|14'&&out.cbBtn.vis&&out.cbBtn.h>=40&&out.cb11==='⇶ Donner sa part des postes répartis…'&&!out.cbw11;
// ── c4) l'élément « ligne sans part » : bandeau, liste (en phrases), aperçu des PU, « ⇶ Lui donner sa part » et « ✓ Rien à faire »
out={L14:L14&&L14.comps.map(x=>U(x.k)+'='+x.q).join(' '),band:await band()};await click('dxc3list|');await wait(600);I=await its();out.it=I.find(x=>/^part:/.test(x.k));out.n=I.length;out.intro=sp(await page.$eval('#c3-dlg .c3-intro',e=>e.textContent).catch(()=>''));out.all=!!await page.$('#c3-dlg .c3-all');
await shot('pc_1366_liste_ligne_sans_part.png');
console.log('c4) ligne sans part :',JSON.stringify(out));
C.c4=out.L14==='z0|soudure|dn125=120 z0|manchons|dn125=120 z0|autoctrl|dn125=120'&&/^⚠ ?Postes répartis : 1 ligne sans sa part ?ligne 2\.6 : aucune part des postes répartis ?Voir la liste$/.test(out.band)&&out.n===1&&out.it
  &&out.it.nm==='DN 125 · ligne 2.6'&&/^aucune part des postes répartis : installations, purges, étiquettes \(les 3 autres lignes au ml de sa zone en ont\)$/.test(out.it.t)&&/2\.6 124,29 → [\d ,]+ €/.test(sp(out.it.pu))&&/2\.1 [\d ,]+ → [\d ,]+ €/.test(sp(out.it.pu))
  &&out.it.b.join()==='dxdkpart|14,dxc3do|'+encodeURIComponent(out.it.k)+'|ok'&&out.it.bt.join('|')==='⇶ Lui donner sa part|✓ Rien à faire'&&/n'a aucune part des postes répartis/.test(out.intro)&&!out.all;
// ── c5) « ✓ Rien à faire » : mémorisé dans suivi.ok ; la case revient quand la situation change (quantité de la ligne) ; ↶
const kPart=out.it?out.it.k:'part:?';await click('dxc3do|'+encodeURIComponent(kPart)+'|ok');await wait(500);a=await A();out={ok:((a.dpgf.suivi||{}).ok||{})[kPart],band:await band(),dlg:!!await page.$('#c3-dlg')};
await gridTop();await page.click(td(14,4));await wait(150);await page.keyboard.type('610');await page.keyboard.press('Enter');await wait(600);a=await A();out.back={band:await band(),ok:((a.dpgf.suivi||{}).ok||{})[kPart]||null};
await click('dxundo|');await wait(500);a=await A();out.undo1={band:await band(),q:a.dpgf.lignes.find(l=>l.n==='2.6').qte};await click('dxundo|');await wait(500);out.undo2=await band();
console.log('c5) rien à faire :',JSON.stringify(out));
C.c5=/^part\|600\|/.test(out.ok||'')&&out.band===''&&!out.dlg&&/1 ligne sans sa part/.test(out.back.band)&&out.back.ok===null&&out.undo1.band===''&&out.undo1.q===600&&/1 ligne sans sa part/.test(out.undo2);
// ── c6) le récap avant la part : onglet « À vérifier », la 2.6 avec « ⇶ Lui donner sa part » (ouvre la fenêtre par-dessus le récap)
await click('dxdkrecap|');await wait(500);await click('dxdktab|chk');await wait(300);out={chk:sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>'')),btn:await has('dxdkpart|14')};
if(out.btn){await click('dxdkpart|14');await wait(500);}out.over=await page.evaluate(()=>{const p=document.getElementById('dk-pov'),r=document.getElementById('dk-ov');return !!p&&!!r&&+getComputedStyle(p).zIndex>+getComputedStyle(r).zIndex;});
await page.keyboard.press('Escape');await wait(300);out.esc1={pov:!!await page.$('#dk-pov'),rc:!!await page.$('#dk-ov')};await page.keyboard.press('Escape');await wait(300);out.esc2=!!await page.$('#dk-ov');
console.log('c6) à vérifier :',JSON.stringify(out));
C.c6=/Lignes au ml sans part des postes répartis · 1 /.test(out.chk)&&/ 2\.6 Tube pré-isolé DN 125/.test(out.chk)&&/PU saisis à la main, sans lien · 1 /.test(out.chk)&&/ 5\.1 Divers/.test(out.chk)&&out.btn&&out.over&&!out.esc1.pov&&out.esc1.rc&&!out.esc2;
// ── c7) la fenêtre « ⇶ Donner sa part » (depuis la liste) : postes répartis cochés d'office (les communs), part au ml, réparti sur N lignes, donneuses (la 1.1 au forfait n'en est pas), aperçu
await click('dxc3list|');await wait(500);await click('dxdkpart|14');await wait(600);a=await A();const B0=JSON.parse(JSON.stringify(a.dpgf));const tot0=sumKeys(a);
const KS=['z0|amene','z0|conteneur','z0|purges','z0|etiquettes'];const ml={E9:420,E10:180,E11:300,E12:250,E13:150};
const expPart={};KS.forEach(k=>{const Qd=Object.keys(ml).reduce((s,ad)=>s+qOn(a,ad,k),0);expPart[k]=Math.round(Qd*600/(1300+600)*1000)/1000;});
out=await page.evaluate(()=>{const d=document.getElementById('dk-pdlg');if(!d)return null;return {h:d.querySelector('.rp-hd h3').textContent.trim(),rows:[...d.querySelectorAll('.dk-pr')].map(r=>({k:r.dataset.k,on:r.querySelector('input[type=checkbox]').checked,dis:r.querySelector('input[type=checkbox]').disabled,txt:r.querySelector('small').textContent.replace(/[\s  ]+/g,' ').trim(),q:(r.querySelector('[data-dk="pq"]')||{}).value,e:(r.querySelector('[data-dk="pe"]')||{}).value})),
  key:d.querySelectorAll('.dk-pi')[1].textContent.replace(/[\s  ]+/g,' ').trim(),don:[...d.querySelectorAll('.dk-pdr')].map(x=>x.querySelector('b').textContent+':'+x.querySelector('input').checked),donOpen:d.querySelector('.dk-pdn').open,
  pv:(d.querySelector('#dk-ppv')||{}).textContent.replace(/[\s  ]+/g,' ').trim(),tot:d.querySelector('#dk-ptot').textContent.replace(/[\s  ]+/g,' ').trim(),ok:!d.querySelector('[data-v="dxdkpartok|"]').disabled};});
out.exp=expPart;await shot('pc_1366_donner_sa_part.png');
/* la case jumelle : taper 500 € dans l'amené → la quantité suit ; une part au-delà de ce que portent les donneuses est refusée ; puis on revient aux parts proposées */
const pe=s=>`#dk-pdlg .dk-pr[data-k="${K(s)}"]`;await page.fill(pe('z0|amene')+' [data-dk="pe"]','500');await page.dispatchEvent(pe('z0|amene')+' [data-dk="pe"]','input');await wait(300);
const pvAm=await pv('z0|amene');out.twin={q:await page.$eval(pe('z0|amene')+' [data-dk="pq"]',e=>e.value),exp:String(+(500/pvAm).toFixed(3)).replace('.',',')};
await page.fill(pe('z0|amene')+' [data-dk="pq"]','5000');await page.dispatchEvent(pe('z0|amene')+' [data-dk="pq"]','input');await wait(300);out.bad={cls:await page.$eval(pe('z0|amene'),e=>e.classList.contains('bad')),msg:await page.$eval(pe('z0|amene')+' .dk-pbad',e=>e.textContent),dis:await page.$eval('#dk-pdlg [data-v="dxdkpartok|"]',b=>b.disabled)};
await click('dxdkpartx|');await wait(300);await click('dxdkpart|14');await wait(500);out.reset=await page.$eval(pe('z0|amene')+' [data-dk="pq"]',e=>e.value);
console.log('c7) la fenêtre :',JSON.stringify(out));
const rowOf=k=>(out.rows||[]).find(r=>r.k===K(k));const fr=x=>String(+(+x).toFixed(3)).replace('.',',');
C.c7=!!out.rows&&out.h==='⇶ Donner sa part à la ligne 2.6'&&out.rows.length===4&&KS.every(k=>{const r=rowOf(k);return r&&r.on&&!r.dis&&r.q===fr(expPart[k]);})&&/^réparti sur 5 lignes · part proposée/.test(rowOf('z0|amene').txt)&&/^réparti sur 6 lignes/.test(rowOf('z0|conteneur').txt)
  &&/au ml : ce que portent les lignes qui donnent × 600 ml ÷ \(leurs ml \+ 600 ml\)/.test(out.key)&&out.don.join()==='1.1:false,2.1:true,2.2:true,2.3:true,2.4:true,2.5:true'&&!out.donOpen&&/^PU qui changent : /.test(out.pv)&&/2\.6 124,29 → /.test(out.pv)&&/^Part totale [\d ,]+ € · 4 postes, reprise sur 5 lignes$/.test(out.tot)&&out.ok
  &&out.twin.q===out.twin.exp&&out.bad.cls&&/au plus 900 ml/.test(out.bad.msg)&&out.bad.dis&&out.reset===fr(expPart['z0|amene']);
// ── c8) « ⇶ Donner sa part » : la 2.6 reçoit {k, q, via:'part'} ; les donneuses perdent au prorata de ce qu'elles tiennent ; total pointé inchangé ; PU attendus ;
//    suivi sans fausse alerte ; PU surlignés ; un seul ↶ remet tout ; ↷
const before={E9:lk(a,'E9').comps.map(x=>({k:U(x.k),q:x.q})),E6:qOn(a,'E6','z0|conteneur')};
await click('dxdkpartok|');await wait(800);a=await A();const A3=JSON.parse(JSON.stringify(a.dpgf));const L14b=lk(a,'E14');const parts=L14b.comps.filter(x=>x.via==='part');
out={parts:parts.map(x=>U(x.k)+'='+x.q),pid:new Set(parts.map(x=>x.pid)).size,at:parts.every(x=>/^\d{4}-\d\d-\d\dT/.test(x.at)),tot:sameTot(tot0,sumKeys(a)),e6:qOn(a,'E6','z0|conteneur')};
out.ratio=KS.map(k=>{const Qd=Object.keys(ml).reduce((s,ad)=>s+qOn({dpgf:B0},ad,k),0);const f=1-expPart[k]/Qd;return Object.keys(ml).every(ad=>{const q0=qOn({dpgf:B0},ad,k),q1=qOn(a,ad,k);return Math.abs(q1-q0*f)<=0.0015;});});
const amt14=await amtOf(L14b);out.pu14=[L14b.pu,await cellPu(14),Math.round(amt14/600*100)/100,pu14];const amt9=await amtOf(lk(a,'E9'));out.pu9=[lk(a,'E9').pu,await cellPu(9),Math.round(amt9/420*100)/100];
out.band=await band();out.flash=await page.evaluate(()=>{const s=document.getElementById('c3-flash');return !!s&&/outline/.test(s.textContent);});out.toast=sp(await toast());out.dlg=!!await page.$('#dk-pov');out.list=!!await page.$('#c3-dlg');out.vsum=await vsum();
await click('dxundo|');await wait(500);a=await A();out.undo=JSON.stringify(a.dpgf)===JSON.stringify(B0);out.bandU=await band();await click('dxredo|');await wait(500);a=await A();out.redo=JSON.stringify(a.dpgf)===JSON.stringify(A3);
await shot('pc_1366_apres_la_part.png');
console.log('c8) donner sa part :',JSON.stringify(out));
C.c8=out.parts.length===4&&KS.every(k=>{const x=parts.find(y=>U(y.k)===k);return x&&Math.abs(x.q-expPart[k])<=0.0015;})&&out.pid===1&&out.at&&out.tot&&out.e6===450&&out.ratio.every(Boolean)
  &&out.pu14[0]===out.pu14[1]&&Math.abs(out.pu14[0]-out.pu14[2])<0.011&&out.pu14[0]>out.pu14[3]&&out.pu9[0]===out.pu9[1]&&Math.abs(out.pu9[0]-out.pu9[2])<0.011
  &&out.band===''&&out.flash&&/sa part reçue \(4 postes, [\d ]+ €\), reprise au prorata sur 5 lignes/.test(out.toast)&&!out.dlg&&!out.list&&/\(100 %\)/.test(out.vsum)&&out.undo&&/1 ligne sans sa part/.test(out.bandU)&&out.redo;
// ── c9) après coup : « ↻ Refaire avec le reste actuel », « ✕ Défaire », « ⇶ Mettre le reste au ml » : la part donnée reste, rien n'est compté deux fois ;
//    puis la balance du lot C3 (ml de la zone 900 → 930) la met à l'échelle comme les autres morceaux
/* la ligne revalidée au calculateur sans rien changer : sa part reste « part donnée » (mêmes morceaux, même PU) */
const c14a=JSON.stringify(lk(a,'E14').comps);await gridTop();await page.click(td(14,5));await wait(600);await click('dxput|');await wait(500);await shut();a=await A();const reput={same:JSON.stringify(lk(a,'E14').comps)===c14a,pu:lk(a,'E14').pu};
const S1=JSON.stringify(a.dpgf);const tot1=sumKeys(a);const part1=lk(a,'E14').comps.filter(x=>x.via==='part').map(x=>U(x.k)+'='+x.q).join(' ');
await click('dxrpredo|'+R1.id);await wait(500);a=await A();out={redo:{pu14:reput.pu,part:lk(a,'E14').comps.filter(x=>x.via==='part').map(x=>U(x.k)+'='+x.q).join(' ')===part1,tot:sameTot(tot1,sumKeys(a)),vsum:await vsum(),tag:sp(await page.$eval('#dx-vent .rp-rep',e=>e.textContent).catch(()=>''))}};
await click('dxrpundo|'+R1.id);await wait(500);a=await A();out.undo={part:lk(a,'E14').comps.filter(x=>x.via==='part').map(x=>U(x.k)+'='+x.q).join(' ')===part1,reps:(a.dpgf.reps||[]).length,vsum:await vsum()};
const c14=JSON.stringify(lk(a,'E14').comps);await click('dxrpsimple|');await wait(500);await click('dxrpsimpleok|');await wait(600);a=await A();const R2=(a.dpgf.reps||[]).slice(-1)[0];
out.r2={lignes:R2&&R2.lignes.join(','),c14:JSON.stringify(lk(a,'E14').comps)===c14,tot:Object.entries(sumKeys(a)).every(([k,v])=>Math.abs(v-(tot1[k]||0))<0.002),vsum:await vsum()};
for(let i=0;i<3;i++){await click('dxundo|');await wait(400);}a=await A();out.back=JSON.stringify(a.dpgf)===S1;
const am0=qOn(a,'E14','z0|amene');await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.1.ml"]','330');});await click('dxc3list|');await wait(600);I=await its();out.bal=(I.find(x=>U(x.k)==='z0|amene')||{}).t||'';
/* 19/10 (lot DY) : des ml en plus au chiffrage, lignes du DPGF inchangées → « Laisser à placer » d'office (et « Tout traiter » aussi) ; ici on veut la balance : son bouton, élément par élément */
for(const x of I){const v=x.b.find(v=>/\|bal$/.test(v));if(!v)continue;if(!await page.$('#c3-dlg')){await click('dxc3list|');await wait(500);}await click(v);await wait(600);}if(await page.$('#c3-dlg')&&(await its()).length){await click('dxc3all|');await wait(800);}
a=await A();out.am=[am0,qOn(a,'E14','z0|amene'),Pof(a,'z0|amene')];out.bandB=await band();
out.reput=reput;console.log('c9) après coup :',JSON.stringify(out));
C.c9=out.reput.same&&out.reput.pu===out.redo.pu14&&out.redo.part&&out.redo.tot&&/\(100 %\)/.test(out.redo.vsum)&&!/reste à reprendre|pris en trop/.test(out.redo.tag)&&out.undo.part&&out.undo.reps===0&&/reste à placer/.test(out.undo.vsum)
  &&out.r2.lignes==='E9,E10,E11,E12,E13,E14'&&out.r2.c14&&out.r2.tot&&/\(100 %\)/.test(out.r2.vsum)&&out.back&&/^900 → 930 ml au chiffrage, montant inchangé : .* tes 6 lignes \(2\.1, 2\.2, 2\.3, 2\.4, 2\.5, 2\.6\) gardent leurs ml/.test(out.bal) /* (lot DY) la phrase des ml en plus */
  &&Math.abs(out.am[1]-out.am[0]*930/900)<=0.002&&Math.abs(out.am[2]-930)<1e-6&&out.bandB==='';
// ── c10) « en plus » sur les lignes que je coche : DN 125, 120 → 130 soudures (10 à imputer, pointées sur 2.6) → 2.6, 2.1 et 3.1 (soudures en fouille, sans lien : elle en reçoit un) ;
//    pré-rempli au ml, la somme est contrôlée (9 / 10 → bouton grisé), aperçu des PU, recherche dans les autres lignes ; un seul ↶
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.soud"]','130');});
/* le récap le dit aussi (onglet « À vérifier » : reste à placer, changements du chiffrage à traiter) et mène à la liste */
await click('dxdkrecap|');await wait(500);await click('dxdktab|chk');await wait(300);const chk2=sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>''));const toList=await has('dxdkc3|');if(toList){await click('dxdkc3|');await wait(600);}const viaRecap={rc:!!await page.$('#dk-ov'),list:!!await page.$('#c3-dlg')};
I=await its();const iS=I.find(x=>U(x.k)==='z0|soudure|dn125');
out={t:iS&&iS.t,btn:iS&&iS.bt.includes('Sur les lignes que je coche…'),chk2,toList,viaRecap};a=await A();const id9=lk(a,'E9').id,id14=lk(a,'E14').id;const v9='L:'+id9,v14='L:'+id14,v17='R:17';out.l17=!!lk(a,'E17');const M2=JSON.stringify(a.dpgf);const kS=K('z0|soudure|dn125');
await click('dxdkmulti|'+encodeURIComponent(kS));await wait(500);const mp=`#c3-dlg .dk-mp[data-k="${kS}"]`;
const mstate=()=>page.evaluate(s=>{const p=document.querySelector(s);if(!p)return null;return {h:p.querySelector('.dk-mph').textContent.trim(),key:(p.querySelector('[data-dk="mkey"]:checked')||{}).value,on:[...p.querySelectorAll('[data-dk="mon"]:checked')].map(x=>x.dataset.v),q:Object.fromEntries([...p.querySelectorAll('[data-dk="mq"]')].map(x=>[x.dataset.v,x.value])),
  pv:p.querySelector('[data-dk="mpv"]').textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim(),sum:p.querySelector('[data-dk="msum"]').textContent.replace(/[\s  ]+/g,' ').trim(),go:{dis:p.querySelector('[data-v^="dxdkmultigo|"]').disabled,t:p.querySelector('[data-v^="dxdkmultigo|"]').textContent.trim()},oth:(p.querySelector('.dk-moth summary')||{}).textContent,find:!!p.querySelector('[data-dk="mf"]')};},mp);
out.m0=await mstate();await chg(`${mp} [data-dk="mon"][data-v="${v9}"]`,true);await chg(`${mp} [data-dk="mon"][data-v="${v17}"]`,true);out.m1=await mstate();
const setQ=async(v,q)=>{await page.fill(`${mp} [data-dk="mq"][data-v="${v}"]`,q);await page.dispatchEvent(`${mp} [data-dk="mq"][data-v="${v}"]`,'input');await wait(150);};
await setQ(v9,'3');await setQ(v17,'2');await setQ(v14,'4');out.m2=await mstate();await setQ(v14,'5');out.m3=await mstate();
await page.fill(`${mp} [data-dk="mf"]`,'2.3');await wait(450);out.find=await page.evaluate(s=>[...document.querySelectorAll(s+' .dk-moth .dk-mr')].map(x=>x.querySelector('b').textContent),mp);out.m4=await mstate();
await shot('pc_1366_lignes_que_je_coche.png');
await click('dxdkmultigo|'+encodeURIComponent(kS));await wait(800);a=await A();const L17=lk(a,'E17');out.after={e9:qOn(a,'E9','z0|soudure|dn125'),e17:L17&&{comps:L17.comps.map(x=>U(x.k)+'='+x.q).join(' '),u:L17.u,q:L17.q,pu:L17.pu,cell:await cellPu(17),exp:Math.round(2*await pv('z0|soudure|dn125')/40*100)/100},e14:qOn(a,'E14','z0|soudure|dn125'),P:Pof(a,'z0|soudure|dn125'),left:(await its()).map(x=>U(x.k)),toast:sp(await toast())};
const M3=JSON.stringify(a.dpgf);await click('dxundo|');await wait(500);a=await A();out.undo=JSON.stringify(a.dpgf)===M2;await click('dxredo|');await wait(500);a=await A();out.redo=JSON.stringify(a.dpgf)===M3;
console.log('c10) en plus sur 3 lignes :',JSON.stringify(out));
C.c10=/^10 soudures EN PLUS \(120 → 130\) — pointées sur 2\.6 : 10 à imputer$/.test(out.t||'')&&out.btn&&/Reste à placer, par poste · \d+ .*Soudure \(compris manutention\) · DN 125 pointé 120 \/ 130 soudures reste/.test(out.chk2)
  &&/Liens à mettre à jour · 1 \d+ changements? du chiffrage à traiter/.test(out.chk2)&&out.toList&&!out.viaRecap.rc&&out.viaRecap.list&&out.m0&&out.m0.h==='Mettre 10 soudures en plus sur les lignes cochées'&&out.m0.key==='pro'&&out.m0.on.join()==='L:'+id14&&out.m0.q['L:'+id14]==='10'&&/✓ 10 \/ 10 soudures/.test(out.m0.sum)&&!out.m0.go.dis&&out.m0.go.t==='Mettre sur cette ligne'&&/^Autres lignes du DPGF · 14/.test(out.m0.oth)&&out.m0.find
  &&!out.l17&&out.m1.key==='ml'&&out.m1.q[v14]==='5,882'&&out.m1.q[v9]==='4,118'&&out.m1.q[v17]==='0'&&/✓ 10 \/ 10/.test(out.m1.sum)&&out.m1.go.t==='Mettre sur ces 3 lignes'
  &&/^réparti 9 \/ 10 — il manque 1/.test(out.m2.sum)&&out.m2.go.dis&&/dès que la somme est juste/.test(out.m2.pv)&&/^PU qui changent : 2\.1 [\d ,]+ → [\d ,]+ € ?2\.6 [\d ,]+ → [\d ,]+ € ?3\.1 vide → [\d ,]+ €$/.test(out.m3.pv)&&/✓ 10 \/ 10/.test(out.m3.sum)&&!out.m3.go.dis&&out.find.join()==='2.1,2.3,3.1'&&!out.m4.go.dis
  &&out.after.e9===3&&!!out.after.e17&&out.after.e17.comps==='z0|soudure|dn125=2'&&out.after.e17.u==='u'&&out.after.e17.q===40&&out.after.e17.pu===out.after.e17.cell&&Math.abs(out.after.e17.pu-out.after.e17.exp)<0.011
  &&out.after.e14===125&&out.after.P===130&&!out.after.left.includes('z0|soudure|dn125')&&/Mis sur 3 lignes \(2\.1, 2\.6, 3\.1\)/.test(out.after.toast)&&out.undo&&out.redo;
if((await its()).length){await click('dxc3all|');await wait(700);}await click('dxc3close|').catch(()=>{});
// ── c11) la balance sur les lignes que je coche : l'amené (A/R de la MO 2 → 3, montant changé) refait sur 5 lignes, la 2.5 décochée perd sa part
await chif(async()=>{await click('chei|0');await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.arMOQty"]','3');});await click('dxc3list|');await wait(600);I=await its();const iA=I.find(x=>U(x.k)==='z0|amene');
a=await A();const id13=lk(a,'E13').id;const kA=K('z0|amene');const am13=qOn(a,'E13','z0|amene');const B2=JSON.stringify(a.dpgf);out={t:iA&&iA.t,btn:iA&&iA.bt.includes('Refaire la balance sur les lignes que je coche…')};
await click('dxdkmulti|'+encodeURIComponent(kA));await wait(500);const mpA=`#c3-dlg .dk-mp[data-k="${kA}"]`;const ms2=()=>page.evaluate(s=>{const p=document.querySelector(s);return p?{h:p.querySelector('.dk-mph').textContent.trim(),on:p.querySelectorAll('[data-dk="mon"]:checked').length,sum:p.querySelector('[data-dk="msum"]').textContent.replace(/[\s  ]+/g,' ').trim(),lost:[...p.querySelectorAll('.dk-mr small.c3-bad')].map(x=>x.textContent),go:p.querySelector('[data-v^="dxdkmultigo|"]').textContent.trim()}:null;},mpA);
out.b0=await ms2();await chg(`${mpA} [data-dk="mon"][data-v="L:${id13}"]`,false);out.b1=await ms2();await shot('pc_1366_balance_lignes_cochees.png');
await click('dxdkmultigo|'+encodeURIComponent(kA));await wait(800);a=await A();out.after={e13:qOn(a,'E13','z0|amene'),P:Pof(a,'z0|amene'),e14:qOn(a,'E14','z0|amene'),left:(await its()).map(x=>U(x.k))};
const B3=JSON.stringify(a.dpgf);await click('dxundo|');await wait(500);a=await A();out.undo=JSON.stringify(a.dpgf)===B2;await click('dxredo|');await wait(500);a=await A();out.redo=JSON.stringify(a.dpgf)===B3;
console.log('c11) balance sur les lignes cochées :',JSON.stringify(out));
C.c11=out.btn&&out.b0&&/^Refaire la balance : 930 ml à tenir, sur les lignes cochées$/.test(out.b0.h)&&out.b0.on===6&&/✓ 930 \/ 930 ml/.test(out.b0.sum)&&out.b1.on===5&&out.b1.lost.length===1&&/perd sa part/.test(out.b1.lost[0])&&out.b1.go==='Refaire la balance sur ces 5 lignes'&&/✓ 930 \/ 930/.test(out.b1.sum)
  &&am13>0&&out.after.e13===0&&Math.abs(out.after.P-930)<1e-6&&out.after.e14>0&&!out.after.left.includes('z0|amene')&&out.undo&&out.redo;
if((await its()).length){await click('dxc3all|');await wait(700);}await click('dxc3close|').catch(()=>{});await shut();
// ── un panier de prestation dans la zone 2 (MO, fourniture, sous-traitance), pris en entier par la 3.4 : son contenu se lit dans le récap (r2)
await chif(async()=>{await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);const E=a.chiffrage.etudes.map((z,i)=>i!==1?z:Object.assign({},z,{paniers:[{id:'Pessai1',nom:'Chambre de raccordement (essai)',unit:'u',qty:1,
  items:[{kind:'mo',eq:'S+T',h:4,unit:'h'},{kind:'fo',label:'Regard béton',qty:1,pu:350},{kind:'st',label:'Grutage',montant:600}],notes:''}]}));T.set(n,{chiffrage:Object.assign({},a.chiffrage,{etudes:E})});},NUM);});
await put(20,['z1|paniers|ppessai1']);await shut();
// ── c12) LE RÉCAP (lecture seule) : en-tête (notre prix, pointé € et %, reste, lignes liées), 4 onglets, rien n'est écrit
a=await A();const D0=jd(a);await gridTop();await click('dxdkrecap|');await wait(600);await click('dxdktab|poste');await wait(300); /* le récap rouvre sur l'onglet laissé (ici « À vérifier ») */
const rc=()=>page.evaluate(()=>{const d=document.getElementById('dk-dlg');if(!d)return null;return {sum:d.querySelector('.dk-sum').textContent.replace(/[\s  ]+/g,' ').trim(),tabs:[...d.querySelectorAll('.dk-tabs .btn')].map(b=>b.textContent.trim()),on:(d.querySelector('.dk-tabs .btn.on')||{}).textContent,tools:[...d.querySelectorAll('.dk-tools .btn')].map(b=>b.textContent.trim()),f:!!d.querySelector('[data-dk="rf"]'),body:d.querySelector('#dk-body').innerText.replace(/[\s  ]+/g,' ').trim()};});
out={r:await rc(),vs:await vsum(),nL:(await A()).dpgf.liens.length,menu:await page.$$eval('#dx-card .c2-menu [data-v="dxdkrecap|"]',L=>L.map(b=>b.textContent.trim()))};await shot('pc_1366_recap_par_poste.png');
await click('dxdktab|ligne');await wait(300);out.lg=(await rc()).body.slice(0,200);await shot('pc_1366_recap_par_ligne.png');
await click('dxdktab|rep');await wait(300);out.rp=(await rc()).body;await shot('pc_1366_recap_repartitions.png');
await click('dxdktab|chk');await wait(300);out.ck=(await rc()).body;await shot('pc_1366_recap_a_verifier.png');a=await A();out.noWrite=jd(a)===D0;
console.log('c12) le récap :',JSON.stringify(out));
const vpt=(out.vs.match(/pointé ([\d ]+) €/)||[])[1];
C.c12=!!out.r&&/^Notre prix [\d ]+ € pointé [\d ]+ € \(100 %\) ✓ tout est placé \d+ lignes du DPGF liées$/.test(out.r.sum)&&out.r.sum.includes('pointé '+vpt+' €')&&out.r.sum.includes(out.nL+' lignes du DPGF liées')
  &&out.r.tabs[0]==='Par poste du chiffrage'&&out.r.tabs[1]==='Par ligne du DPGF'&&/^Répartitions · 2$/.test(out.r.tabs[2])&&/^À vérifier · 1$/.test(out.r.tabs[3])&&out.r.on==='Par poste du chiffrage'&&out.r.tools.join('|')==='Tout déplier|Tout replier|🖨 Imprimer'&&out.r.f
  &&/^🏗 Installations · [\d ]+ € · pointé 100 %/.test(out.r.body)&&out.menu.join()==='🔎 Récap : postes, lignes, répartitions'&&/Reste au ml/.test(out.rp)&&/Part donnée à la ligne 2\.6/.test(out.rp)&&/PU saisis à la main, sans lien · 1/.test(out.ck)&&/5\.1 Divers/.test(out.ck)&&out.noWrite;
// ── c13) COHÉRENCE : par composante, Σ € des lignes = pointé du poste ; par poste, Σ des composantes = la colonne « Pointé » de la ventilation ; l'exemple « Amené … → 2.1 (… € · … %) … »
await click('dxdktab|poste');await wait(300);await click('dxdkall|1');await wait(400);
out=await page.evaluate(()=>{const R=[...document.querySelectorAll('#dk-body .dk-it[data-k]')].map(x=>({k:x.dataset.k,p:x.dataset.p,pt:+x.dataset.pt,amt:+x.dataset.amt,ls:[...x.querySelectorAll('.dk-bd .dk-ln[data-e]')].map(l=>+l.dataset.e),sm:x.querySelector('.dk-sm').textContent.replace(/[\s  ]+/g,' ').trim(),or:[...x.querySelectorAll('.dk-or')].map(o=>o.textContent.trim())}));
  const vt=document.querySelector('#dx-vent .dx-vt');const hd=[...vt.querySelectorAll('thead th')].map(t=>t.textContent.replace(/[▾▸]/g,'').trim());const ip=hd.indexOf('Pointé');
  const V={};[...vt.querySelectorAll('tbody tr')].forEach(r=>{if(r.classList.contains('g')||r.classList.contains('tot'))return;const c=[...r.cells];V[c[0].firstChild.textContent.trim()]=+(c[ip].textContent.replace(/[\s  ]/g,'')||0);});return {R,V,ip};});
const okLines=out.R.every(x=>Math.abs(x.ls.reduce((s,v)=>s+v,0)-x.pt)<0.02*Math.max(1,x.ls.length));
const lab={amene:'Amené - Repli - Nettoyage chantier',soudure:'Soudure (compris manutention)',conteneur:'Contener - Benne - Pelle',etiquettes:'Étiquettes',epreuve:'Épreuve hydraulique'};
const okVent=Object.entries(lab).map(([p,l])=>{const s=out.R.filter(x=>x.p===p).reduce((t,x)=>t+x.pt,0);return Math.abs(s-(out.V[l]||0))<1;});
const amI=out.R.find(x=>x.k===K('z0|amene'));const s125=out.R.find(x=>x.k===K('z0|soudure|dn125'));out.pan=await page.evaluate(()=>{const x=document.querySelector('#dk-body .dk-it[data-p="paniers"]');return x?{pan:x.querySelector('.dk-pan').textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim(),ls:[...x.querySelectorAll('.dk-ln .dk-n')].map(n=>n.textContent)}:null;});
console.log('c13) cohérence :',JSON.stringify({okLines,okVent,ip:out.ip,V:out.V,am:amI&&{sm:amI.sm,or:amI.or},s125:s125&&{sm:s125.sm,or:s125.or},pan:out.pan}));
C.c13=okLines&&okVent.every(Boolean)&&out.R.length>=12&&amI&&/^→ 2\.1 \([\d ,]+ € · [\d ,]+ %\), 2\.2 \(/.test(amI.sm)&&amI.or.includes('part donnée le '+new Date().toLocaleDateString('fr-FR'))&&amI.or.some(o=>/^répartition « Reste au ml »/.test(o))
  &&s125&&s125.or.some(o=>/saisi au calculateur/.test(o))&&!!out.pan&&out.pan.pan==='Contenu du panier : MO 4 h (S+T) · Regard béton × 1 · Grutage 600 €'&&out.pan.ls.join()==='3.4';
// ── c14) LA RECHERCHE : « DN 125 » → les composantes DN 125 ; « 2.6 » → ce que porte la 2.6, déplié sur la 2.6 seule ; « Par ligne » : la 2.6 (propre / noyé, dont … € / ml d'installations)
await click('dxdkall|0');await wait(300);await page.fill('#dk-dlg [data-dk="rf"]','DN 125');await wait(500);
out={dn:await page.evaluate(()=>[...document.querySelectorAll('#dk-body .dk-it[data-k]')].map(x=>({nm:x.querySelector('.dk-nm').textContent.replace(/[\s  ]+/g,' ').trim().split('→')[0].trim(),open:x.classList.contains('open'),ls:[...x.querySelectorAll('.dk-bd .dk-ln')].map(l=>l.querySelector('.dk-n').textContent)})))};
out.focus=await page.evaluate(()=>document.activeElement&&document.activeElement.dataset.dk==='rf');
await page.fill('#dk-dlg [data-dk="rf"]','2.6');await wait(500);out.l26=await page.evaluate(()=>[...document.querySelectorAll('#dk-body .dk-it[data-k]')].map(x=>({open:x.classList.contains('open'),ls:[...x.querySelectorAll('.dk-bd .dk-ln')].map(l=>l.querySelector('.dk-n').textContent)})));
await click('dxdktab|ligne');await wait(300);out.lg=await page.evaluate(()=>[...document.querySelectorAll('#dk-body .dk-it')].map(x=>x.dataset.row));
await page.fill('#dk-dlg [data-dk="rf"]','');await wait(500);await click('dxdktg|'+encodeURIComponent('l:14'));await wait(300);
out.c26=await page.evaluate(()=>{const x=document.querySelector('#dk-body .dk-it[data-row="14"]');if(!x)return null;return {sts:[...x.querySelectorAll('.dk-st')].map(s=>s.textContent.replace(/[\s  ]+/g,' ').trim()),n:x.querySelectorAll('.dk-cr').length,pu:+x.dataset.pu};});
await click('dxdktg|'+encodeURIComponent('l:28'));await wait(300);out.c51=sp(await page.$eval('#dk-body .dk-it[data-row="28"]',e=>e.textContent).catch(()=>''));await shot('pc_1366_recap_par_ligne_detail.png');
a=await A();const L14c=lk(a,'E14');let inst=0;for(const x of L14c.comps)if(x.via==='part'&&/\|(amene|conteneur)$/.test(U(x.k)))inst+=(+x.q||0)*await pv(U(x.k));
console.log('c14) recherche, par ligne :',JSON.stringify(out),'installations / ml attendu :',(inst/600).toFixed(2));
C.c14=out.dn.filter(x=>/DN 125/.test(x.nm)).length===3&&out.dn.filter(x=>!/DN 125/.test(x.nm)).every(x=>x.open&&x.ls.join()==='2.6')&&out.dn.length>=7&&out.focus /* « DN 125 » : les composantes DN 125, et ce que porte la 2.6 (sa désignation dit DN 125), dépliées sur elle */&&out.l26.length>=7&&out.l26.every(x=>x.open&&x.ls.join()==='2.6')&&out.lg.join()==='14'&&!!out.c26
  &&out.c26.sts.some(s=>/^Propre à la ligne : [\d ,]+ € · [\d ,]+ € \/ ml · [\d ,]+ % du PU$/.test(s))&&out.c26.sts.some(s=>s.includes('Noyé (postes répartis, installations)')&&s.includes('dont '+(inst/600).toFixed(2).replace('.',',')+' € / ml d\'installations'))
  &&out.c26.sts.some(s=>new RegExp('^PU calculé : [\\d ,]+ € ÷ 600 ml = '+String(L14c.pu.toFixed(2)).replace('.',',')+' €$').test(s))&&/PU saisi, sans calcul/.test(out.c51);
// ── c15) un clic sur une ligne du DPGF dans le récap : le récap se ferme, la ligne est sélectionnée dans la grille, le calculateur s'ouvre dessus ; Échap ferme le récap
await click('dxdktab|poste');await wait(300);await page.fill('#dk-dlg [data-dk="rf"]','2.6');await wait(500);
await page.evaluate(()=>{const b=document.querySelector('#dk-body button.dk-ln[data-row="14"]');b.click();});await wait(900);
out={rc:!!await page.$('#dk-ov'),sel:await page.evaluate(n=>{const s=window.TRACE&&null;return null;},NUM),h4:sp(await page.$eval('#dx-calc h4',e=>e.textContent).catch(()=>'')),on:await page.evaluate(()=>{const c=document.querySelector('#dx-vp td.dx-on');return c?c.dataset.r+':'+c.dataset.c:'';}),
  calc:await page.evaluate(()=>{const c=document.getElementById('dx-calc');if(!c)return false;const r=c.getBoundingClientRect();return r.width>0&&r.bottom>0&&r.top<innerHeight;})};
await shut();await click('dxdkrecap|');await wait(400);out.kept=await page.$eval('#dk-dlg [data-dk="rf"]',e=>e.value).catch(()=>null);await page.keyboard.press('Escape');await wait(300);out.esc=!!await page.$('#dk-ov');
console.log('c15) clic vers la grille :',JSON.stringify(out));
C.c15=!out.rc&&/ligne 14/.test(out.h4)&&out.on==='14:5'&&out.calc&&out.kept==='2.6'&&!out.esc;
// ── c16) L'IMPRESSION : l'onglet affiché, tout déplié, sans boutons, A4 portrait ; le reste de l'appli n'est pas imprimé
await click('dxdkrecap|');await wait(400);await page.fill('#dk-dlg [data-dk="rf"]','');await wait(400);await click('dxdktab|poste');await wait(300);await click('dxdkall|0');await wait(300);await click('dxdkprint|');await wait(400);
await page.emulateMedia({media:'print'});await wait(200);
out=await page.evaluate(()=>{const p=document.getElementById('dk-print');if(!p)return null;const cs=getComputedStyle(p);const app=document.getElementById('eq-app');
  return {disp:cs.display,app:app?app.checkVisibility():null,btn:p.querySelectorAll('button').length,its:p.querySelectorAll('.dk-it').length,open:p.querySelectorAll('.dk-it>.dk-bd').length,h1:p.querySelector('h1').textContent,
    page:[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>r.cssText&&/@media print/.test(r.cssText)&&/size: a4 portrait/i.test(r.cssText));}catch(e){return false;}}),w:Math.round(p.getBoundingClientRect().width)};});
await shot('pc_impression_recap.png');await page.emulateMedia({media:'screen'});await wait(200);out.screen=await page.evaluate(()=>getComputedStyle(document.getElementById('dk-print')).display);
await click('dxdkclose|');out.gone=!await page.$('#dk-print');
console.log('c16) impression :',JSON.stringify(out));
C.c16=!!out&&out.disp==='block'&&out.app===false&&out.btn===0&&out.its>=12&&out.open===out.its&&out.h1==='Récap du DPGF — par poste du chiffrage'&&out.page&&out.screen==='none'&&out.gone;
// ── c17) LE DPGF SUR L'AUTRE ÉCRAN : le récap s'ouvre dans la fenêtre principale ; un clic sur une ligne sélectionne la ligne là-bas, le calculateur ici
await gridTop();const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop);await wait(900);out={btn:await has('dxdkrecap|')};if(out.btn){await click('dxdkrecap|');await wait(500);}out.rc=!!await page.$('#dk-ov');
await click('dxdktab|ligne');await wait(300);await click('dxdkgo|11');await wait(900);out.popSel=await pop.evaluate(()=>{const c=document.querySelector('#dx-vp td.dx-on');return c?c.dataset.r+':'+c.dataset.c:'';});out.h4=sp(await page.$eval('#dx-calc h4',e=>e.textContent).catch(()=>''));out.closed=!await page.$('#dk-ov');
await shot('pc_1366_autre_ecran_recap.png');await pop.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);
console.log('c17) autre écran :',JSON.stringify(out));
C.c17=out.btn&&out.rc&&out.popSel==='11:5'&&/ligne 11/.test(out.h4)&&out.closed;
// ── c18) CONSULTATION D'UNE VERSION : le récap s'ouvre (lecture seule) ; aucun bouton qui écrit ; le calculateur sans « Donner sa part »
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Essai récap';document.getElementById('vv-ok').click();});await wait(500);
await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);a=await A();const V0=jd(a);
out={vv:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')).slice(0,40),btn:await has('dxdkrecap|')};if(out.btn){await click('dxdkrecap|');await wait(500);}
out.rc=await rc();out.hd=sp(await page.$eval('#dk-dlg .rp-hd h3',e=>e.textContent).catch(()=>''));await click('dxdktab|chk');await wait(300);out.write=await page.evaluate(()=>document.querySelectorAll('#dk-dlg [data-v^="dxdkpart|"],#dk-dlg [data-v="dxdkc3|"],#dk-dlg input[type=checkbox]').length);
await click('dxdktab|ligne');await wait(300);await shot('pc_1366_consultation_recap.png');await click('dxdkgo|14');await wait(900);out.go={rc:!!await page.$('#dk-ov'),h4:sp(await page.$eval('#dx-calc h4',e=>e.textContent).catch(()=>''))};
await shut();await gridTop();await page.click(td(14,5));await wait(600);out.cb=!!await page.$('#dx-calc .dk-cb');a=await A();out.noWrite=jd(a)===V0;await shut();
await click('vexit|');await wait(500);await toDpgf();
console.log('c18) consultation :',JSON.stringify(out));
C.c18=/Tu consultes la v1/.test(out.vv)&&out.btn&&!!out.rc&&/lecture seule · version v1/.test(out.hd)&&out.write===0&&!out.go.rc&&/ligne 14/.test(out.go.h4)&&!out.cb&&out.noWrite;
// ── c19) TÉLÉPHONE 390 px : le récap plein écran (chaque onglet), la fenêtre « Donner sa part », les cases de D2 (≥ 40 px), boutons ≥ 34 px, rien ne déborde
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await toDpgf();await shut();
await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(300);out={sw:await page.evaluate(()=>document.documentElement.scrollWidth),bar:await page.$eval('#dx-card [data-v="dxdkrecap|"]',b=>{const r=b.getBoundingClientRect();return {h:Math.round(r.height),r:Math.round(r.right)};}).catch(()=>null)};
await click('dxdkrecap|');await wait(500);out.dlg=await rect('#dk-dlg');out.tabs={};
for(const t of ['poste','ligne','rep','chk']){await click('dxdktab|'+t);await wait(300);if(t==='ligne')await click('dxdktg|'+encodeURIComponent('l:14'));else if(t==='poste')await click('dxdktg|'+encodeURIComponent('c:'+K('z0|amene')));await wait(300);
  out.tabs[t]={small:await small('#dk-dlg button, #dk-dlg input',34),over:await overflow('#dk-dlg'),sw:await page.evaluate(()=>{const b=document.getElementById('dk-body');return b.scrollWidth-b.clientWidth;})};await shot('tel_390_recap_'+t+'.png');}
await click('dxdkclose|');
/* la fenêtre « Donner sa part » au téléphone (ligne 1.1, au forfait : au prorata des montants), puis D2 (purges 3 → 4 paires : « en plus ») */
await page.click(td(6,5));await wait(600);if(await has('dxdkpart|6')){await click('dxdkpart|6');await wait(500);}out.pd=await rect('#dk-pdlg');out.pk=sp(await page.$eval('#dk-pdlg .dk-pi.dim',e=>e.textContent).catch(()=>''));
await page.evaluate(()=>{const d=document.querySelector('#dk-pdlg .dk-pdn');if(d)d.open=true;});await wait(200);out.psmall=await small('#dk-pdlg button, #dk-pdlg input:not([type=checkbox])',34);out.pcb=await small('#dk-pdlg input[type=checkbox]',40);out.pover=await overflow('#dk-pdlg');await shot('tel_390_donner_sa_part.png');
await click('dxdkpartx|');await shut();
await chif(async()=>{await click('chei|0');await unfold('purges');await chg('#eq-app [data-afx="e§purges.paires"]','4');});await shut();await click('dxc3list|');await wait(600);const kP=K('z0|purges');
await click('dxdkmulti|'+encodeURIComponent(kP));await wait(500);await page.evaluate(()=>{const d=document.querySelector('#c3-dlg .dk-moth');if(d)d.open=true;});await wait(200);
out.mrow=await page.$$eval('#c3-dlg .dk-mp .dk-mrl',L=>L.filter(x=>x.offsetParent).map(x=>Math.round(x.getBoundingClientRect().height)).filter(h=>h<40).length);out.mcb=await small('#c3-dlg .dk-mp input[type=checkbox]',40);out.mbtn=await small('#c3-dlg .dk-mp button, #c3-dlg .dk-mp input:not([type=checkbox]):not([type=radio])',34);
out.mgo=await page.$eval('#c3-dlg .dk-mp [data-v^="dxdkmultigo|"]',b=>Math.round(b.getBoundingClientRect().height)).catch(()=>0);out.mover=await overflow('#c3-dlg');
await page.evaluate(k=>{const p=document.querySelector(`#c3-dlg .dk-mp[data-k="${k}"]`);if(p)p.scrollIntoView({block:'start'});},kP);await wait(200);await shot('tel_390_lignes_que_je_coche.png');await click('dxc3close|');
console.log('c19) téléphone 390 px :',JSON.stringify(out));
C.c19=out.sw<=390&&out.bar&&out.bar.h>=34&&out.bar.r<=390&&out.dlg&&out.dlg.w===390&&Object.values(out.tabs).every(x=>!x.small.length&&!x.over.length&&x.sw<=0)&&out.pd&&out.pd.w===390&&/au prorata des montants/.test(out.pk)&&!out.psmall.length&&!out.pcb.length&&!out.pover.length
  &&out.mrow===0&&!out.mcb.length&&!out.mbtn.length&&out.mgo>=40&&!out.mover.length;
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
