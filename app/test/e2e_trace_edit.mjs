// ÉDITION DU TRACÉ (14/10/2026, Ethan) — traceur (maquette/main.js, traceur.js, bridge.js) :
// 1) le DN (bandeau #dn ou formulaire du bas #tfDn) se change PENDANT le tracé : la ligne prend la valeur au moment de la validation ;
// 2) ⏸ Mettre en pause (touche P) : la ligne est créée avec les sommets posés, sans kit de bout (marqueur pause) ; on lui pose une pièce (vidange haute)
//    et une antenne ; ▶ Reprendre (fiche, ou clic sur son dernier sommet en mode Tracer) prolonge la ligne : pièces et antenne gardées, pause retirée ;
// 3) tout ce qu'on a ajouté se supprime : pièce depuis le plan (fiche → Supprimer) et depuis la fiche de la ligne (✕), sommet (✕ sommet, pièces recalées,
//    refus : 2 sommets mini / départ d'antenne) ;
// 4) ✂ Raccourcir : refus si une antenne part au-delà ; par clic ou par longueur saisie (pièces au-delà retirées après confirmation) ; glisser un sommet existe ;
// 5) DN d'une ligne : toute la ligne jusqu'à la première réduction (dn2 inchangé), antennes non touchées ;
// 6) vidange HAUTE = té droit vers le haut : 2 soudures sur le té (comme une vidange basse), symbole distinct (▲ bleu barré), remontée dans l'appli comme VIDANGE ;
// 7) profondeur de pose : défaut (bandeau #prof) + surcharge par ligne, enregistrées dans TRACÉ (site.traceur.profondeur, ligne.prof) et relues dans le traceur.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.type()+':'+d.message().slice(0,100));d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(x,y)=>{const s=await toScreen(x,y);await page.mouse.click(s[0],s[1]);await wait(120);};
const hint=()=>page.evaluate(()=>document.getElementById('hint').textContent);
const line=id=>page.evaluate(id=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id===id);if(!l)return null;const B=M.state.built[id];return {id:l.id,dn:l.dn,bar:l.bar,pts:l.pts,pause:l.pause,prof:l.prof,len:+B.A.length.toFixed(2),parent:l.parent,specials:(l.specials||[]).map(s=>({id:s.id,type:s.type,m:+s.m.toFixed(2),vert:s.vert,pvKind:s.pvKind,dnb:s.dnb,dn2:s.dn2})),endcap:['A','R'].map(c=>B[c].pieces.some(p=>p.kind==='endcap')),welds:B.A.welds.length+B.R.welds.length,
  teeWelds:['A','R'].reduce((s,c)=>{const t=B[c].pieces.find(p=>p.kind==='tee'&&p.vert);return s+(t?B[c].welds.filter(w=>w.between.includes(t.id)).length:0);},0),tee:(()=>{const t=B.A.pieces.find(p=>p.kind==='tee'&&p.vert);return t?{vert:t.vert,pvKind:t.pvKind,ref:t.ref,dnb:t.dnb}:null;})(),dns:B.A.pieces.filter(p=>p.kind==='tube'||p.kind==='reducer').map(p=>p.kind==='reducer'?'R'+p.dn+'>'+p.dn2:p.dn)};},id);
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(800);
// ── 1) DN changé PENDANT le tracé : bandeau puis formulaire du bas ; la ligne prend la dernière valeur à la validation (Entrée)
let out=await page.evaluate(()=>({mode:window.MAQ.state.mode,form:!!document.getElementById('traceForm'),tfDn:(document.getElementById('tfDn')||{}).value,dn:document.getElementById('dn').value}));
await clickW(10,10);await clickW(40,10);
out.n2=await page.evaluate(()=>window.MAQ.state.tracing.pts.length);
await page.selectOption('#dn','80');await wait(100);out.afterBandeau=await page.evaluate(()=>({dn:window.MAQ.state.dn,tfDn:document.getElementById('tfDn').value,n:window.MAQ.state.tracing.pts.length,disabled:document.getElementById('dn').disabled}));
await page.selectOption('#tfDn','65');await wait(100);out.afterForm=await page.evaluate(()=>({dn:window.MAQ.state.dn,bandeau:document.getElementById('dn').value}));
await page.keyboard.press('Enter');await wait(300);
const L1=await line('L1');out.L1={dn:L1&&L1.dn,pts:L1&&L1.pts};
console.log('1) DN pendant le tracé :',JSON.stringify(out));
C.c1=out.mode==='trace'&&out.form&&out.tfDn==='100'&&out.dn==='100'&&out.n2===2&&out.afterBandeau.dn===80&&out.afterBandeau.tfDn==='80'&&out.afterBandeau.n===2&&!out.afterBandeau.disabled&&out.afterForm.dn===65&&out.afterForm.bandeau==='65'&&L1&&L1.dn===65&&L1.pts.length===2;
// ── 2) PAUSE : 2 sommets, touche P → ligne créée en pause (pas de kit de bout, badge fiche + plan + pied de page)
await clickW(10,40);await clickW(40,40);await page.keyboard.press('p');await wait(300);
let L2=await line('L2');
out={L2:{pause:L2.pause,n:L2.pts.length,dn:L2.dn,endcap:L2.endcap,len:L2.len},panel:/en pause/.test(await page.evaluate(()=>document.getElementById('panel').textContent)),resumeBtn:await page.evaluate(()=>!!document.querySelector('#panel [data-act=resumeLine]')),plan:await page.evaluate(()=>/en pause/.test(document.getElementById('net').textContent)),foot:await page.evaluate(()=>/1 ligne\(s\) en pause/.test(document.getElementById('foot').textContent)),mode:await page.evaluate(()=>window.MAQ.state.mode),tracing:await page.evaluate(()=>!!window.MAQ.state.tracing),hint:(await hint()).slice(0,60)};
console.log('2a) mise en pause :',JSON.stringify(out));
C.c2a=L2.pause===true&&L2.pts.length===2&&L2.dn===65&&L2.endcap.join()==='false,false'&&near(L2.len,30)&&out.panel&&out.resumeBtn&&out.plan&&out.foot&&out.mode==='trace'&&!out.tracing&&/en pause/.test(out.hint);
// 2b) une pièce sur la ligne en pause : ＋ à PK 10 → vidange HAUTE (té droit vers le haut) DN40 par défaut
const w0=L2.welds;
await page.evaluate(()=>window.MAQ.setMode('add'));await clickW(20,40);await wait(200);
out={modal:await page.evaluate(()=>document.getElementById('modal').classList.contains('show')&&/PK 10 m/.test(document.querySelector('#modalBody h3').textContent))};
await page.selectOption('#addType','pv');await wait(80);out.opts=await page.evaluate(()=>[...document.querySelectorAll('#addPvKind option')].map(o=>o.value).join());await page.selectOption('#addPvKind','vup');await wait(80);out.dnb=await page.evaluate(()=>document.getElementById('addPvDn').value);
await page.click('#addOk');await wait(300);L2=await line('L2');
out.sp=L2.specials;out.tee=L2.tee;out.teeWelds=L2.teeWelds;out.symb=await page.evaluate(()=>({vid:document.querySelectorAll('#net polygon.pv.vidange').length,bar:document.querySelectorAll('#net line.pvbar').length,purge:document.querySelectorAll('#net polygon.pv.purge').length}));out.table=await page.evaluate(()=>/vidange ▲ té droit DN40/.test(document.getElementById('panel').textContent));
console.log('2b) vidange haute posée sur la ligne en pause :',JSON.stringify(out));
C.c2b=out.modal&&out.opts==='up,down,vup'&&out.dnb==='40'&&L2.specials.length===1&&L2.specials[0].vert==='up'&&L2.specials[0].pvKind==='vidange'&&L2.specials[0].dnb===40&&near(L2.specials[0].m,10)&&L2.tee&&L2.tee.pvKind==='vidange'&&L2.tee.vert==='up'&&/té de vidange DN65\/40/.test(L2.tee.ref)&&/té droit, branche vers le haut/.test(L2.tee.ref)&&out.teeWelds===4&&out.symb.vid===2&&out.symb.bar===2&&out.symb.purge===0&&out.table&&L2.pause===true;
// 2c) même comptage qu'une vidange basse : fiche de la pièce → type « vidange ▼ » : mêmes soudures, symbole ▼ (plus de barre) ; retour en vidange haute
await page.evaluate(()=>{const M=window.MAQ;const B=M.state.built.L2;const t=B.A.pieces.find(p=>p.kind==='tee'&&p.vert);M.state.sel={kind:'piece',line:'L2',cond:'A',id:t.id};M.state.tab='sel';M.rebuild();});await wait(100);
out={pvKind:await page.evaluate(()=>(document.getElementById('pvKind')||{}).value),del:await page.evaluate(()=>!!document.querySelector('#panel [data-act=delSpecial]'))};
await page.selectOption('#pvKind','down');await wait(200);const L2b=await line('L2');out.basse={vert:L2b.specials[0].vert,pvKind:L2b.specials[0].pvKind,welds:L2b.welds,teeWelds:L2b.teeWelds,bar:await page.evaluate(()=>document.querySelectorAll('#net line.pvbar').length)};
await page.evaluate(()=>{const M=window.MAQ;const B=M.state.built.L2;const t=B.A.pieces.find(p=>p.kind==='tee'&&p.vert);M.state.sel={kind:'piece',line:'L2',cond:'A',id:t.id};M.rebuild();});await wait(100);await page.selectOption('#pvKind','vup');await wait(200);L2=await line('L2');out.haute={vert:L2.specials[0].vert,pvKind:L2.specials[0].pvKind,welds:L2.welds};
console.log('2c) vidange basse ↔ haute : même comptage :',JSON.stringify(out));
C.c2c=out.pvKind==='vup'&&out.del&&out.basse.vert==='down'&&out.basse.pvKind==='vidange'&&out.basse.teeWelds===4&&out.basse.bar===0&&out.basse.welds===L2.welds&&out.haute.vert==='up'&&out.haute.pvKind==='vidange'&&L2.welds>w0;
// 2d) une ANTENNE tracée sur la ligne en pause (clic sur la ligne à PK 20 = té automatique), puis ▶ Reprendre (fiche) : les clics PROLONGENT ; Entrée → pause retirée, pièces et antenne gardées
await page.evaluate(()=>window.MAQ.setMode('trace'));await clickW(30,40.3);await clickW(30,60);await page.keyboard.press('Enter');await wait(300);
const L3=await line('L3');out={L3:{parent:L3&&L3.parent,dn:L3&&L3.dn}};
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L2'};M.state.tab='sel';M.rebuild();});await wait(100);
await page.click('#panel [data-act=resumeLine]');await wait(200);
out.resume=await page.evaluate(()=>{const t=window.MAQ.state.tracing;return {resume:t&&t.resume,base:t&&t.base,n:t&&t.pts.length,dn:t&&t.dn,form:/reprise de « Ligne L2 »/.test(document.getElementById('traceForm').textContent),noDn:!document.getElementById('tfDn'),mode:window.MAQ.state.mode,hint:/Reprise de « Ligne L2 »/.test(document.getElementById('hint').textContent)};});
await clickW(70,40);await wait(100);out.n3=await page.evaluate(()=>window.MAQ.state.tracing.pts.length);await page.keyboard.press('Enter');await wait(300);
L2=await line('L2');out.L2={pts:L2.pts,pause:L2.pause,len:L2.len,sp:L2.specials.map(s=>s.m),endcap:L2.endcap,kids:await page.evaluate(()=>window.MAQ.state.lines.filter(x=>x.parent&&x.parent.line==='L2').map(x=>[x.id,+x.parent.m.toFixed(2)]))};out.hint=(await hint()).slice(0,60);
console.log('2d) antenne sur la ligne en pause, reprise, prolongement :',JSON.stringify(out));
C.c2d=L3&&L3.parent&&L3.parent.line==='L2'&&near(L3.parent.m,20,0.3)&&out.resume.resume==='L2'&&out.resume.base===2&&out.resume.n===2&&out.resume.dn===65&&out.resume.form&&out.resume.noDn&&out.resume.mode==='trace'&&out.resume.hint&&out.n3===3&&L2.pts.length===3&&near(L2.pts[2][0],70,0.3)&&near(L2.pts[2][1],40,0.3)&&L2.pause===undefined&&near(L2.len,60,0.3)&&L2.specials.length===1&&near(L2.specials[0].m,10)&&L2.endcap.join()==='true,true'&&out.L2.kids.length===1&&near(out.L2.kids[0][1],20,0.3)&&/terminée/.test(out.hint);
// 2e) reprise par CLIC sur le dernier sommet (mode Tracer), Échap = la ligne reste en pause ; reprise puis P sans nouveau sommet = reste en pause ; enregistrement garde le marqueur (vérifié en 7)
await clickW(10,70);await clickW(40,70);await page.keyboard.press('p');await wait(250);
await clickW(40,70);await wait(150);out={resume:await page.evaluate(()=>window.MAQ.state.tracing&&window.MAQ.state.tracing.resume)};
await page.keyboard.press('Escape');await wait(150);let L4=await line('L4');out.afterEsc={tracing:await page.evaluate(()=>!!window.MAQ.state.tracing),pause:L4.pause,n:L4.pts.length,hint:(await hint()).slice(0,40)};
await clickW(40,70);await wait(150);await page.keyboard.press('p');await wait(250);L4=await line('L4');out.afterP={pause:L4.pause,n:L4.pts.length,tracing:await page.evaluate(()=>!!window.MAQ.state.tracing)};
console.log('2e) reprise par clic sur le dernier sommet :',JSON.stringify(out));
C.c2e=out.resume==='L4'&&!out.afterEsc.tracing&&out.afterEsc.pause===true&&out.afterEsc.n===2&&/Reprise annulée/.test(out.afterEsc.hint)&&out.afterP.pause===true&&out.afterP.n===2&&!out.afterP.tracing;
// ── 3) SUPPRIMER : deux vannes sur L2 (PK 40 et 50) ; l'une depuis le PLAN (clic sur la pièce → fiche → Supprimer), l'autre depuis la fiche de la ligne (✕)
await page.evaluate(()=>window.MAQ.setMode('add'));await clickW(50,40);await wait(150);await page.selectOption('#addType','valve');await page.click('#addOk');await wait(200);
await clickW(60,40);await wait(150);await page.selectOption('#addType','valve');await page.click('#addOk');await wait(250);L2=await line('L2');out={sp:L2.specials.map(s=>s.type+'@'+s.m)};
await page.evaluate(()=>window.MAQ.setMode('select'));await wait(100);
{const s=await toScreen(50,40);await page.mouse.move(s[0],s[1]);for(let i=0;i<12;i++){await page.mouse.wheel(0,-100);await wait(30);}await wait(200);} // zoom (molette) sur la vanne, comme sur le terrain : à 1 m ≈ 6 px les ronds de soudure couvrent la vanne
out.k=await page.evaluate(()=>+window.MAQ.state.view.k.toFixed(1));
{const r=await page.evaluate(()=>{const el=document.querySelector('#net .piece.hit[data-id="V1"][data-cond="A"]');if(!el)return null;const b=el.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2];});out.hit=!!r;if(r){await page.mouse.click(r[0],r[1]);await wait(200);}}
out.sel=await page.evaluate(()=>({sel:window.MAQ.state.sel,btn:!!document.querySelector('#panel [data-act=delSpecial]'),txt:/V1/.test(document.getElementById('panel').textContent)}));
await page.click('#panel [data-act=delSpecial]');await wait(250);L2=await line('L2');out.afterPlan={sp:L2.specials.map(s=>s.type+'@'+s.m),sel:await page.evaluate(()=>window.MAQ.state.sel),hint:(await hint()).slice(0,40)};
{const sid=await page.evaluate(()=>{const l=window.MAQ.state.lines.find(x=>x.id==='L2');const v=l.specials.find(s=>s.type==='valve');return v&&v.id;});await page.click(`#panel [data-act=delSpecial][data-sid="${sid}"]`);await wait(250);}
L2=await line('L2');out.afterPanel=L2.specials.map(s=>s.type+'@'+s.m);
await page.evaluate(()=>{window.MAQ.state.view={k:6,tx:80,ty:80};window.dispatchEvent(new Event('resize'));});await wait(150); // vue de départ (le zoom a changé les positions à l'écran)
console.log('3a) suppression d\'une pièce depuis le plan et depuis la fiche :',JSON.stringify(out));
C.c3a=out.sp.join()==='tee@10,valve@40,valve@50'&&out.k>20&&out.hit&&out.sel.sel&&out.sel.sel.kind==='piece'&&out.sel.btn&&out.sel.txt&&out.afterPlan.sp.join()==='tee@10,valve@50'&&out.afterPlan.sel.kind==='line'&&/vanne PK 40 supprimée/.test(out.afterPlan.hint)&&out.afterPanel.join()==='tee@10';
// 3b) ✕ SOMMET : L5 à 3 sommets (coude), une vanne sur le 2e tronçon ; suppression du sommet 1 → la vanne reste à sa PLACE (reprojetée), 2 sommets ; refus : 2 sommets mini, départ d'antenne
await page.evaluate(()=>window.MAQ.setMode('trace'));await clickW(80,10);await clickW(110,10);await clickW(110,40);await page.keyboard.press('Enter');await wait(250);
await page.evaluate(()=>{window.MAQ.openAddModal('L5',45);});await wait(150);await page.selectOption('#addType','valve');await page.click('#addOk');await wait(250);
let L5=await line('L5');out={before:{n:L5.pts.length,sp:L5.specials.map(s=>s.m)},rows:await page.evaluate(()=>document.querySelectorAll('#panel [data-act=delVertex]').length)};
await page.click('#panel [data-act=delVertex][data-i="1"]');await wait(250);L5=await line('L5');out.after={pts:L5.pts,sp:L5.specials.map(s=>s.m),len:L5.len,hint:(await hint()).slice(0,70)};
// position physique de la vanne : avant (110,25) sur le 2e tronçon → après, projetée sur (80,10)-(110,40) : PK = projection (≈ 31,8 m)
{const d=Math.hypot(30,30);const t=((110-80)*30+(25-10)*30)/(d*d);out.expect=+(t*d).toFixed(2);}
out.refus2=await page.evaluate(()=>window.MAQ.delVertex('L1',1));out.refusAnt=await page.evaluate(()=>window.MAQ.delVertex('L3',0));out.L1n=(await line('L1')).pts.length;out.L3n=(await line('L3')).pts.length;
console.log('3b) ✕ sommet, pièces recalées, refus :',JSON.stringify(out));
C.c3b=out.before.n===3&&out.before.sp.length===1&&near(out.before.sp[0],45)&&out.rows===3&&L5.pts.length===2&&near(L5.pts[1][0],110,0.3)&&near(L5.pts[1][1],40,0.3)&&L5.specials.length===1&&near(L5.specials[0].m,out.expect,0.3)&&/Sommet 1 supprimé/.test(out.after.hint)&&out.refus2===false&&out.refusAnt===false&&out.L1n===2&&out.L3n===2;
// ── 4) ✂ RACCOURCIR L2 (60 m, antenne à PK 20, vidange PK 10, vanne PK 50) : à PK 15 → REFUS (antenne au-delà) ; à 45 m par la longueur → vanne retirée (confirmation), vidange et antenne gardées
await page.evaluate(()=>window.MAQ.setMode('add'));await clickW(60,40);await wait(150);await page.selectOption('#addType','valve');await page.click('#addOk');await wait(250);
await page.evaluate(()=>{const M=window.MAQ;M.setMode('select');M.state.sel={kind:'line',id:'L2'};M.state.tab='sel';M.rebuild();});await wait(100);
await page.click('#panel [data-act=shortenLine]');await wait(150);out={mode:await page.evaluate(()=>window.MAQ.state.mode),shorten:await page.evaluate(()=>window.MAQ.state.shorten&&window.MAQ.state.shorten.line),hint0:(await hint()).slice(0,30)};
await clickW(25,40);await wait(150);L2=await line('L2');out.refus={hint:(await hint()).slice(0,90),n:L2.pts.length,len:L2.len,mode:await page.evaluate(()=>window.MAQ.state.mode)};
await page.keyboard.press('Escape');await wait(100);out.modeEsc=await page.evaluate(()=>window.MAQ.state.mode);
const nd0=dialogs.length;await page.fill('#shortLen','45');await page.click('#panel [data-act=shortenTo]');await wait(300);L2=await line('L2');
out.after={pts:L2.pts,len:L2.len,sp:L2.specials.map(s=>s.type+'@'+s.m),kids:await page.evaluate(()=>window.MAQ.state.lines.filter(x=>x.parent&&x.parent.line==='L2').map(x=>+x.parent.m.toFixed(2))),confirm:dialogs.slice(nd0).filter(d=>/^confirm/.test(d)&&/Raccourcir/.test(d)&&/vanne PK 50/.test(d)).length,endcap:L2.endcap,hint:(await hint()).slice(0,50)};
console.log('4a) ✂ raccourcir : refus (antenne), puis à 45 m :',JSON.stringify(out));
C.c4a=out.mode==='shorten'&&out.shorten==='L2'&&/✂/.test(out.hint0)&&/Impossible/.test(out.refus.hint)&&/antenne/.test(out.refus.hint)&&out.refus.n===3&&near(out.refus.len,60,0.3)&&out.refus.mode==='shorten'&&out.modeEsc==='select'&&L2.pts.length===3&&near(L2.pts[2][0],55,0.3)&&near(L2.len,45,0.05)&&out.after.sp.join()==='tee@10'&&out.after.kids.length===1&&near(out.after.kids[0],20,0.3)&&out.after.confirm===1&&L2.endcap.join()==='true,true'&&/raccourcie à 45/.test(out.after.hint);
// 4b) ↔ déplacer un sommet (glisser le carré jaune) existe déjà : sommet 1 de L1 glissé de (40,10) à (40,20)
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L1'};M.rebuild();});await wait(100);
{const s=await toScreen(40,10);const e=await toScreen(40,20);await page.mouse.move(s[0],s[1]);await page.mouse.down();await page.mouse.move(s[0],s[1]+20);await page.mouse.move(e[0],e[1]);await page.mouse.up();await wait(250);}
out={pts:(await line('L1')).pts};console.log('4b) glisser un sommet :',JSON.stringify(out));
C.c4b=near(out.pts[1][0],40,0.5)&&near(out.pts[1][1],20,0.5);
// ── 5) DN d'une ligne jusqu'à la RÉDUCTION : L1 DN65, réduction à PK 20 → DN50 ; fiche : DN 100 → tubes avant en DN100, après en DN50 ; antenne L3 inchangée
await page.evaluate(()=>{window.MAQ.openAddModal('L1',20);});await wait(150);await page.selectOption('#addType','reducer');await page.selectOption('#addDn2','50');await page.click('#addOk');await wait(250);
out={before:(await line('L1')).dns,lbl:await page.evaluate(()=>/jusqu'à la réduction PK 20/.test(document.getElementById('panel').textContent))};
await page.selectOption('#lineDn','100');await wait(300);const L1b=await line('L1');out.after={dn:L1b.dn,dns:L1b.dns,sp:L1b.specials,hint:(await hint()).slice(0,110)};out.L3dn=(await line('L3')).dn;
console.log('5) DN de ligne jusqu\'à la réduction :',JSON.stringify(out));
C.c5=/^65(,65)*,R65>50,50$/.test(out.before.join())&&out.lbl&&L1b.dn===100&&/^100(,100)*,R100>50,50$/.test(out.after.dns.join())&&L1b.specials[0].dn2===50&&/DN65 → DN100 jusqu'à la réduction PK 20/.test(out.after.hint)&&out.L3dn===65;
// ── 7) PROFONDEUR : défaut 0,8 → 1,2 (bandeau) ; L2 surchargée à 0,9 ; onglet Lignes
out={def0:await page.evaluate(()=>({v:document.getElementById('prof').value,s:window.MAQ.state.prof}))};
await page.fill('#prof','1.2');await page.dispatchEvent('#prof','change');await wait(150);out.def=await page.evaluate(()=>window.MAQ.state.prof);
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L2'};M.state.tab='sel';M.rebuild();});await wait(100);out.ph=await page.evaluate(()=>document.getElementById('lineProf').placeholder);
await page.fill('#lineProf','0.9');await page.dispatchEvent('#lineProf','change');await wait(150);out.L2prof=(await line('L2')).prof;out.L1prof=(await line('L1')).prof;
await page.evaluate(()=>{const M=window.MAQ;M.state.tab='lignes';M.rebuild();});await wait(100);out.lignes=await page.evaluate(()=>{const t=document.getElementById('panel').textContent;return {col:/Prof\./.test(t),v09:/0,9/.test(t),v12:/1,2/.test(t),pauseBadge:document.querySelectorAll('#panel .badge.pause').length};});
console.log('7a) profondeur par défaut et par ligne :',JSON.stringify(out));
C.c7a=out.def0.v==='0.8'&&out.def0.s===0.8&&out.def===1.2&&out.ph==='1,2'&&out.L2prof===0.9&&out.L1prof===undefined&&out.lignes.col&&out.lignes.v09&&out.lignes.v12&&out.lignes.pauseBadge===1;
// ── 6 + 7b) ENREGISTRER DANS TRACÉ : la vidange haute remonte comme VIDANGE (vert 'down' pour l'appli, pvKind, pvDir 'up'), le marché la compte en vidange ;
//    profondeur dans site.traceur.profondeur et ligne.prof ; ligne en pause L4 : pause + pas de kit ; traceur.lines gardent pause / prof / pvKind
await page.click('#bSave');await wait(250);await page.fill('#svName','Édition du tracé');await page.click('#svOk');await wait(1500);
const site=await page.evaluate(()=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const st=q.result.transaction('kv','readonly').objectStore('kv');const g=st.getAll(),gk=st.getAllKeys();g.onsuccess=()=>{gk.onsuccess=()=>{const i=gk.result.findIndex(k=>String(k).startsWith('trace:handoff:'));res(i<0?null:g.result[i]);};};};q.onerror=()=>res(null);}));
const SITE_ID=site&&site.id;
out=(()=>{if(!site)return {site:false};const L2s=site.lines.find(l=>l.id==='L2'),L1s=site.lines.find(l=>l.id==='L1'),L4s=site.lines.find(l=>l.id==='L4');const tee=L2s.cond.A.els.find(e=>e.kind==='tee'&&e.vert);const tr2=site.traceur.lines.find(l=>l.id==='L2'),tr4=site.traceur.lines.find(l=>l.id==='L4');
  return {tee:tee&&{vert:tee.vert,pvKind:tee.pvKind,pvDir:tee.pvDir,label:tee.kindLabel},marche:{vid:site.marche.tot.vidanges,pur:site.marche.tot.purges},prof:site.traceur.profondeur,L2prof:L2s.prof,L1prof:L1s.prof,L4:{pause:L4s.pause,end:L4s.endType,endcap:L4s.cond.A.els.some(e=>e.kind==='endcap')},L2end:L2s.endType,tr:{pause:tr4.pause,prof:tr2.prof,sp:tr2.specials[0]&&{vert:tr2.specials[0].vert,pvKind:tr2.specials[0].pvKind}}};})();
console.log('6/7b) chantier enregistré :',JSON.stringify(out));
C.c6=!!site&&out.tee&&out.tee.vert==='down'&&out.tee.pvKind==='vidange'&&out.tee.pvDir==='up'&&out.marche.vid===2&&out.marche.pur===0&&out.L4.pause===true&&out.L4.end==='libre'&&!out.L4.endcap&&out.L2end==='kit'&&out.tr.pause===true&&out.tr.sp.vert==='up'&&out.tr.sp.pvKind==='vidange';
C.c7b=!!site&&out.prof===1.2&&out.L2prof===0.9&&out.L1prof===1.2&&out.tr.prof===0.9;
// l'appli : la pièce est un té de VIDANGE (vert 'down'), comptée en vidange dans le marché figé
await page.click('#svGo');await wait(1500);try{await page.waitForFunction(()=>window.TRACE&&/^trc_/.test(window.TRACE.state.siteId)&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>1,{timeout:20000});}catch(e){}
out=await page.evaluate(()=>{const T=window.TRACE;const L=T.lines&&T.lines.L2;const tee=L&&L.cond.A.els.find(e=>e.kind==='tee'&&e.vert);return {site:T.state.siteId,tee:tee&&{vert:tee.vert,pvKind:tee.pvKind},vid:T.net&&T.net.marche&&T.net.marche.tot.vidanges,lines:Object.keys(T.lines||{}).length};});
console.log('6b) dans l\'appli :',JSON.stringify(out));
C.c6b=out.site===SITE_ID&&out.tee&&out.tee.vert==='down'&&out.vid===2&&out.lines===5;
// 7c) retour dans le traceur depuis le chantier (mémoire locale effacée) : profondeur, surcharge, pause, vidange haute relus ; ▶ Reprendre proposé
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:maquette')).forEach(k=>localStorage.removeItem(k));});
await page.goto(BASE+'/traceur.html?site='+SITE_ID);await wait(1800);
out=await page.evaluate(()=>{const M=window.MAQ;const L2=M.state.lines.find(l=>l.id==='L2'),L4=M.state.lines.find(l=>l.id==='L4');return {n:M.state.lines.length,prof:M.state.prof,input:document.getElementById('prof').value,L2prof:L2&&L2.prof,L4pause:L4&&L4.pause,sp:L2&&L2.specials[0]&&{vert:L2.specials[0].vert,pvKind:L2.specials[0].pvKind},badge:M.state.siteRef&&M.state.siteRef.name,foot:/1 ligne\(s\) en pause/.test(document.getElementById('foot').textContent)};});
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L4'};M.state.tab='sel';M.rebuild();});await wait(100);out.resumeBtn=await page.evaluate(()=>!!document.querySelector('#panel [data-act=resumeLine]'));out.endcapL4=(await line('L4')).endcap.join();
console.log('7c) relu dans le traceur :',JSON.stringify(out));
C.c7c=out.n===5&&out.prof===1.2&&out.input==='1.2'&&out.L2prof===0.9&&out.L4pause===true&&out.sp&&out.sp.vert==='up'&&out.sp.pvKind==='vidange'&&out.badge==='Édition du tracé'&&out.foot&&out.resumeBtn&&out.endcapL4==='false,false';
// ── 8) COMPATIBILITÉ : une ligne d'avant (sans pause, prof, pvKind ; vidange = vert 'down') se charge telle quelle : kit de bout, vidange comptée, purge comptée
out=await page.evaluate(()=>{const M=window.MAQ;M.state.lines=[{id:'L9',name:'Ancienne',dn:100,bar:12,pts:[[0,0],[40,0]],specials:[{id:'o1',type:'tee',vert:'down',m:10},{id:'o2',type:'tee',vert:'up',m:20}],parent:null}];M.state.seq=10;M.state.sel={kind:'line',id:'L9'};M.state.tab='sel';M.rebuild();
  const B=M.state.built.L9;const tees=B.A.pieces.filter(p=>p.kind==='tee');return {endcap:B.A.pieces.some(p=>p.kind==='endcap'),kinds:tees.map(t=>t.pvKind+'/'+t.vert).join(),panel:/vidange ▼ DN40/.test(document.getElementById('panel').textContent)&&/purge ▲ DN25/.test(document.getElementById('panel').textContent),symb:document.querySelectorAll('#net polygon.pv.vidange').length+'/'+document.querySelectorAll('#net polygon.pv.purge').length+'/'+document.querySelectorAll('#net line.pvbar').length};});
console.log('8) ligne d\'avant :',JSON.stringify(out));
C.c8=out.endcap&&out.kinds==='vidange/down,purge/up'&&out.panel&&out.symb==='2/2/0';
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
