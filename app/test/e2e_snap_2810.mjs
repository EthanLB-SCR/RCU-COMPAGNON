// e2e_snap_2810.mjs — 28/10 (Ethan, captures : « cette situation me compte deux soudures en trop… deux soudures proches ne font qu'une — moins de 30 cm on va dire, au-dessus il peut
// y en avoir deux ; quand tu déplaces une pièce il doit y avoir un aimant près d'une soudure proche » ; « ce qui est jeu de coudes qui crée des manchettes, ça arrive, mais pas pour deux
// pièces côte à côte » ; « ça ne doit pas compter les fins de ligne : pas de soudure ni de manchon sur les bouts de ligne, c'est compris dans les by-pass, sous-station… sauf les
// coudes de remontée »). TRACEUR, réseau FICTIF (L1 DN 100, 40 m droit + sommet 90° ; chaufferie → sous-station).
// c1 bouts de ligne : les soudures contre les raccordements = points de bout (sst), hors « N soudures » ; kit fin de ligne et by-pass : pareil (+ la soudure du by-pass)
// c2 soudure coulissée à 0,2 m de la jambe d'un coude → la coupe tombe sur les DEUX conduites (la paire décide : au coude, l'intérieure et l'extérieure n'ont pas le même chaînage, ± e/2 —
//    c'est la manchette de 0,36 m d'un côté / rien de l'autre de la capture d'Ethan) ; à 0,8 m → manchette gardée des deux côtés (2 soudures)
// c3 vanne posée à 0,1 m du coude → glisse contre le coude (aimant, même si elle mord de quelques cm sur la jambe), une seule soudure, pas de manchette ; réduction à 0,2 m d'une vanne → contre
//    la vanne ; vanne à 0,4 m du coude → l'intérieure colle (0,22 m), l'extérieure suit la paire (0,57 m < 0,3 + entraxe)
// c3d (28/10 après-midi, lot 2810c — le tracé réel d'Ethan, PK 89 de L1) vidange 0,25 m après une réduction et qui mord de 0,30 m sur la jambe d'un coude : elle se colle à la réduction,
//    le reste est pris sur la jambe — plus jamais repoussée DANS la réduction (« les pièces catalogue ne rentrent pas ») ; c3e vidange coincée entre deux coudes (4 cm d'un côté, 6 de l'autre) :
//    une soudure de chaque côté, pas de manchette nue (« pièces côte à côte ») — lignes droites, coudes de jeu en altimétrie : même chaînage sur les deux conduites
// c4 jeu de coudes (deux sommets à 0,6 m) → manchette gardée (ça arrive) ; c5 enregistrement → l'appli compte sans les bouts (tête de chantier) ; c6 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1});const page=await ctx.newPage();const logs=[];const C={};
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(600);
const setLines=async lines=>{await page.evaluate(L=>{const S=window.MAQ.state;S.lines=L;S.seq=L.length+1;window.MAQ.setMode('select');window.MAQ.rebuild();},lines);await wait(250);};
const info=(id='L1')=>page.evaluate(id=>{const S=window.MAQ.state;const B=S.built[id];const cd=c=>{const b=B[c];const P=b.pieces;return {nW:b.welds.length,nS:b.welds.filter(w=>w.sst).length,nWc:b.welds.filter(w=>!w.sst).length,ends:b.welds.filter(w=>w.sst).map(w=>w.endType||'?'),short:P.filter(p=>p.kind==='tube'&&p.L<1-1e-6).map(p=>+p.L.toFixed(2)),manch:P.filter(p=>p.manchette).length,pcs:P.map(p=>p.id+(p.kind==='tube'?'':'')+':'+(+p.L).toFixed(2)).join(' '),notes:b.notes.map(n=>n.txt.slice(0,220))};};
  const foot=document.getElementById('foot')?document.getElementById('foot').textContent.replace(/\s+/g,' '):'';return {A:cd('A'),R:cd('R'),foot};},id);
const L0=(o)=>Object.assign({id:'L1',name:'Fictif snap',dn:100,bar:12,pts:[[0,100],[30,100],[30,70]],specials:[],parent:null,startType:'chaufferie',endType:'sousstation'},o||{});
// ── c1) bouts de ligne
await setLines([L0()]);let I=await info();console.log('c1) raccordements :',J({A:{nW:I.A.nW,nS:I.A.nS,nWc:I.A.nWc,ends:I.A.ends},foot:I.foot.slice(0,80)}));
await setLines([L0({endType:'kit'})]);const Ik=await info();await setLines([L0({endType:'bypass_regard'})]);const Ib=await info();
console.log('c1) kit :',J({nS:Ik.A.nS,ends:Ik.A.ends}),'· by-pass :',J({nS:Ib.A.nS,ends:Ib.A.ends,nSr:Ib.R.nS}));
C.c1=I.A.nS===2&&I.A.ends.join()==='chaufferie,sousstation'&&I.A.nWc===I.A.nW-2&&/\b(\d+) soudures/.test(I.foot)&&+I.foot.match(/(\d+) soudures/)[1]===I.A.nWc+I.R.nWc
  &&Ik.A.nS===2&&Ik.A.ends.join()==='chaufferie,kit'&&Ib.A.nS===3&&Ib.A.ends.filter(e=>e==='bypass_regard').length===2&&Ib.R.nS===2; /* by-pass : coude du by-pass + la soudure de jonction (portée par l'aller) */
// ── c2) soudure coulissée près du coude
const legs=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L1;const c=B.A.pieces.find(p=>p.kind==='bend');return {m1:c.m1,legOut:c.legOut,legIn:c.legIn};});
/* sur l'axe, 0,2 m avant la soudure d'entrée du coude : la conduite intérieure (sommet à − e/2) la voit à moins de 0,3 m → la coupe tombe ; l'extérieure la voyait à ~0,38 m (la manchette de la capture d'Ethan) → la PAIRE décide : elle tombe aussi */
await setLines([L0({cuts:[{id:'ct1',m:30-legs.legIn-0.2}]})]);const I2=await info();const N2=I2.A.notes.concat(I2.R.notes);
await setLines([L0({cuts:[{id:'ct2',m:30-legs.legIn-0.8}]})]);const I2b=await info(); /* 0,8 m : deux soudures (≈ 0,6 / 1,0 m selon la conduite) — au-dessus de 0,3 m « il peut y en avoir deux » */
console.log('c2) coulissée 0,2 m :',J({nW:[I2.A.nW,I2.R.nW],short:[I2.A.short,I2.R.short],notes:N2.filter(n=>/coulissée/.test(n))}),'· 0,8 m :',J({nW:[I2b.A.nW,I2b.R.nW],short:[I2b.A.short,I2b.R.short],manch:[I2b.A.manch,I2b.R.manch]}));
C.c2=I2.A.nW===I.A.nW&&I2.R.nW===I.R.nW&&!I2.A.short.length&&!I2.R.short.length&&N2.some(n=>/coulissée .* à moins de 0,3 m d'une autre soudure/.test(n))&&N2.some(n=>/même soudure que sa voisine sur l'autre conduite .* retirée ici aussi/.test(n))
  &&I2b.A.nW===I.A.nW+1&&I2b.R.nW===I.R.nW+1&&I2b.A.short.length===1&&I2b.R.short.length===1&&I2b.A.short[0]>0.45&&I2b.R.short[0]>0.45&&I2b.A.manch===1&&I2b.R.manch===1;
// ── c3) vanne à 0,1 m du coude (sur la conduite intérieure elle mord même de quelques cm sur la jambe) ; réduction à 0,2 m d'une vanne ; vanne à 0,4 m du coude (l'intérieure colle, l'extérieure suit la paire)
const V=await page.evaluate(()=>{const c=window.MAQ.cat();return c?c.valve(100).L:null;});
await setLines([L0({specials:[{id:'v1',type:'valve',m:30-legs.legIn-0.1-(V||1.5)/2}]})]);const I3=await info();
await setLines([L0({specials:[{id:'v1',type:'valve',m:10},{id:'r1',type:'reducer',dn2:80,m:10+(V||1.5)/2+0.2+0.5}]})]);const I3b=await info();
await setLines([L0({specials:[{id:'v1',type:'valve',m:30-legs.legIn-0.4-(V||1.5)/2}]})]);const I3c=await info();
const aim=x=>x.notes.filter(n=>/aimant|manchette/.test(n));
console.log('c3) vanne 0,1 m :',J({nW:[I3.A.nW,I3.R.nW],short:[I3.A.short,I3.R.short],notes:aim(I3.A).concat(aim(I3.R))}),'· réduction 0,2 m :',J({nW:I3b.A.nW,short:I3b.A.short,notes:aim(I3b.A)}),'· vanne 0,4 m :',J({nW:[I3c.A.nW,I3c.R.nW],short:[I3c.A.short,I3c.R.short],notes:aim(I3c.A).concat(aim(I3c.R))}));
const glued=(X,re)=>['A','R'].every(c=>!X[c].short.length&&X[c].nW===I[c].nW+1&&X[c].notes.some(n=>re.test(n)));
C.c3=glued(I3,/une seule soudure : la vanne glissée contre le coude/)&&!I3b.A.short.length&&I3b.A.nW===I.A.nW+2&&I3b.A.notes.some(n=>/la réduction glissée contre la vanne \(aimant\)/.test(n))&&glued(I3c,/une seule soudure : la vanne glissée contre le coude/);
// ── c3d / c3e) pièce coincée (lot 2810c)
const STR=sp=>L0({pts:[[0,100],[60,100]],specials:sp});
const probe=async sp=>{await setLines([STR(sp)]);return page.evaluate(()=>window.MAQ.state.built.L1.A.pieces.filter(p=>p.kind!=='tube').map(p=>({kind:p.kind,L:+p.L,legIn:+p.legIn||0,legOut:+p.legOut||0})));};
const seqOf=()=>page.evaluate(()=>{const B=window.MAQ.state.built.L1;return ['A','R'].map(c=>({err:B[c].notes.filter(n=>n.kind==='err').map(n=>n.txt.slice(0,110)),seq:B[c].pieces.filter(p=>p.m0>12&&p.m1<45).map(p=>p.id).join(' '),
  bend:+((B[c].pieces.find(p=>p.kind==='bend')||{}).legIn||0).toFixed(3),side:B[c].notes.filter(n=>/côte à côte/.test(n.txt)).length,nW:B[c].welds.length}));});
const JEU=(id,m,dz)=>({id,type:'bend3d',m,angle:15,dz,jeu:true,cover:1.3}),VID=m=>({id:'v1',type:'tee',vert:'down',pvKind:'vidange',dnb:32,m});
const p1=await probe([{id:'r1',type:'reducer',dn2:80,m:10},VID(20),JEU('j1',30,0.3)]);const Lr=p1.find(p=>p.kind==='reducer').L,Lv=p1.find(p=>p.kind==='tee').L,Lb=p1.find(p=>p.kind==='bend').legIn;
const vs=20+Lr/2+0.25;await setLines([STR([{id:'r1',type:'reducer',dn2:80,m:20},VID(vs+Lv/2),JEU('j1',vs+Lv-0.30+Lb,0.3)])]);const E3d=await seqOf();
const p2=await probe([VID(20),JEU('j1',10,0.3)]);const Lv2=p2.find(p=>p.kind==='tee').L,Lb2=p2.find(p=>p.kind==='bend').legIn,Lo2=p2.find(p=>p.kind==='bend').legOut;
const v2=20+Lo2+0.04;await setLines([STR([JEU('j1',20,0.3),VID(v2+Lv2/2),JEU('j2',v2+Lv2+0.06+Lb2,-0.3)])]);const E3e=await seqOf();
console.log('c3d) vidange coincée réduction / coude :',J({Lr,Lv,Lb,E3d}),'\nc3e) vidange coincée entre deux coudes :',J(E3e));
C.c3d=E3d.every(x=>!x.err.length&&/^R1 T1 C1( |$)/.test(x.seq)&&Math.abs(x.bend-(Lb-0.05))<0.011)&&E3d[0].nW===E3d[1].nW;
C.c3e=E3e.every(x=>!x.err.length&&/^C1 T1 C2( |$)/.test(x.seq)&&x.side>=1)&&E3e[0].nW===E3e[1].nW;
// ── c4) jeu de coudes : deux sommets proches → manchette gardée
await setLines([L0({pts:[[0,100],[30,100],[30,97.6],[32.4,97.6],[32.4,70]]})]);const I4=await info(); /* 2,4 m entre sommets : jambes 1 + 1 → manchette de 0,4 m (ça arrive) */
console.log('c4) jeu de coudes :',J({short:I4.A.short,manch:I4.A.manch,notes:I4.A.notes.filter(n=>/manchette|coude contre coude/.test(n)).slice(0,2)}));
C.c4=I4.A.nS===2&&(I4.A.manch>=1||I4.A.notes.some(n=>/coude contre coude/.test(n)))&&!I4.A.notes.some(n=>/aimant/.test(n));
// ── c5) enregistrement → appli : tête de chantier sans les bouts
await setLines([L0()]);await page.click('#bSave');await wait(250);await page.fill('#svName','Snap fictif');await page.click('#svOk');await wait(1400);
const sid=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
const site=await page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),sid);
await page.goto(BASE+'/index.html');await wait(900);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
const app=await page.evaluate(async site=>{const T=window.TRACE;T.etude.addSite(site);await T.go(site.id);const l=T.lines[site.lines[0].id];const c=T.ts.counts(l);const q=T.etude.qty(site.id);const nS=['A','R'].reduce((n,k)=>n+l.cond[k].joints.filter(j=>j.sst).length,0);const ends=l.cond.A.joints.filter(j=>j.sst).map(j=>j.endType);
  return {soud:c.soud,manchons:c.manchons,qty:q&&q.tot&&q.tot.soud,nS,ends,sh:(document.getElementById('shStat')||{}).textContent||'',rep:site.report&&site.report.welds};},site);
console.log('c5) appli :',J(app));
C.c5=app.nS===4&&app.ends.join()==='chaufferie,sousstation'&&app.soud===I.A.nWc+I.R.nWc&&app.manchons===app.soud&&app.qty===app.soud&&app.rep===app.soud&&new RegExp('/'+app.soud+' soudures').test(app.sh);
console.log('c6) console :',J(logs));C.c6=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(J(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
