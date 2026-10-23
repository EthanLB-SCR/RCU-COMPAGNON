// 23/10 — MODE OPÉRATOIRE VISUEL (modop.js). Ethan : « un bouton “Créer un mode opératoire” → mode de quoi (épreuve seule, épreuve + rinçage…) → prérequis : comment doit
// être le réseau au début, vannes ouvertes / fermées sur une vue plan où on les manœuvre → on remplit de ce point, on purge là, là, là, on ouvre telle vanne, on monte en
// pression, 24 h, on casse la pression, on vidange là… : une liste des tâches À CÔTÉ d'un plan interactif, une vraie maquette du réseau et de son évolution ».
// Réseau FICTIF du traceur : L1 DN 100, 120 m, vanne PK 20, té de purge PK 35, té de vidange PK 50, vanne PK 90, sous-station en bout ; L2 antenne fictive DN 65 au PK 60, 40 m, purge PK 30, SST en bout.
//  c1  Hydraulique → « 2 ter · Modes opératoires », bouton « ＋ Créer un mode opératoire » → fenêtre (6 types, nom) → éditeur plein écran : plan avec tous les points, 1 carte « État de départ », toutes les vannes fermées
//  c2  état de départ : toucher une vanne sur le plan l'ouvre (◆ creuse), re-toucher la ferme ; le compteur « ouvertes » suit
//  c3  ＋ Remplir : bannière orange « touche le point de remplissage », tap sur la vidange PK 50 → phrase « Remplir jusqu'à V PK 20, V PK 90 … depuis vidange … — eau brute », eau dessinée
//      (tronçons bleus, pointillés = se remplit), antenne reliée par le té, alerte « ouvre une purge » ; eau adoucie au bouton
//  c4  ＋ Purger (tap purge PK 35 → ouverte à cette étape, pastille « Purger ici ») ; ＋ Mettre en pression → alerte « purge ouverte : la pression ne tiendra pas » ; on la referme
//      sur le plan à l'étape 3 → alerte partie ; 6 bar / 120 min dans la phrase ; ＋ Attendre 24 h ; ＋ Casser la pression (purge) ; ＋ Vidanger (vidange PK 50) → plus d'eau
//  c5  ordre ↑ ↓, suppression d'une étape, données dans NET.hydro.modops, impression = une page par étape avec le plan
//  c6  Terrain : « ✓ Fait » sur l'étape 1 → coche (registre pteq, ctx modop), carte verte, liste Hydro « 1 faite », 📍 Points « Suivre sur le plan », DOE
//  c7  soudeur (sans droit hydro) : liste « Voir », pas de « Créer », l'éditeur s'ouvre côté Terrain, toucher une vanne ne change rien
//  c8  téléphone 390 : plan au-dessus, étapes en dessous, aucun débordement · c9 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp,role){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.serie=1;S.lines=[
    {id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[0,0],[120,0]],specials:[{id:'v1',type:'valve',m:20},{id:'pv1',type:'tee',vert:'up',pvKind:'purge',m:35,dnb:25},{id:'pv2',type:'tee',vert:'down',pvKind:'vidange',m:50,dnb:40},{id:'v2',type:'valve',m:90}],parent:null,endType:'sousstation'},
    {id:'L2',name:'Antenne fictive',dn:65,bar:12,pts:[[60,0],[60,40]],specials:[{id:'pv3',type:'tee',vert:'up',pvKind:'purge',m:30,dnb:25}],parent:{line:'L1',m:60,side:1},endType:'sousstation'}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Mode op fictif');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel',role||'ethan');await page.waitForTimeout(300);
  await page.evaluate(()=>{const T=window.TRACE;T.state.tab='hydro';T.renderAll();});await page.waitForTimeout(300);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/mo_${n}.png`});};
const txt=(page,sel)=>page.evaluate(s=>{const el=document.querySelector(s);return el?el.textContent.replace(/[\s  ]+/g,' ').trim():null;},sel);
const keys=page=>page.evaluate(()=>{const o={};window.TRACE.ptseq.points().forEach(p=>{o[p.line+':'+p.nature+':'+Math.round(p.pk)]=p.key;});return o;});
const tapPt=async(page,key)=>{await page.click(`#moPlan .moPt[data-key="${key}"]`);await page.waitForTimeout(200);};
const ed=page=>page.evaluate(()=>{const E=window.TRACE.modop.ed;const mo=E.mo;const el=document.getElementById('moEd');const S=window.TRACE.modop.simulate(mo);return {sel:E.sel,pick:E.pick,terrain:E.terrain,steps:mo.steps.map(s=>({type:s.type,src:s.src,outs:s.outs||[],set:s.set||{},water:s.water,bar:s.bar,min:s.min,h:s.h})),
  cards:[...el.querySelectorAll('.moCard')].map(c=>({on:c.classList.contains('on'),done:c.classList.contains('done'),txt:c.querySelector('.moTxt').textContent.trim(),warn:[...c.querySelectorAll('.moWarn')].map(w=>w.textContent.trim()),chips:[...c.querySelectorAll('.moChip')].map(x=>x.textContent.trim())})),
  title:el.querySelector('.moStepTitle').textContent.replace(/\s+/g,' ').trim(),banner:el.querySelector('.moBanner').textContent.trim(),pickCls:el.querySelector('.moBanner').className,
  filled:el.querySelectorAll('#moPlan path[stroke="#5b9bd8"],#moPlan path[stroke="#1565c0"]').length,flow:el.querySelectorAll('#moPlan .moFlow').length,
  valves:Object.fromEntries([...el.querySelectorAll('#moPlan .moPt')].filter(g=>/^V /.test(g.querySelector('text').textContent)).map(g=>[g.dataset.key,g.querySelector('path').getAttribute('fill')])),
  labels:[...el.querySelectorAll('#moPlan .moPt text')].map(t=>t.textContent.trim()),extra:[...el.querySelectorAll('#moPlan > svg > text')].map(t=>t.textContent.trim()),
  sim:S.steps.map(s=>({filled:Object.keys(s.filled).length,warn:s.warn.length,region:s.region&&s.region.txt,len:s.region&&s.region.len}))};});
let {ctx,page}=await mk({width:1366,height:900});
// ── c1 : liste + création
let o=await page.evaluate(()=>{const el=document.getElementById('hydro');const h3=[...el.querySelectorAll('h3')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,32));return {h3,btn:el.querySelector('[data-monew]')&&el.querySelector('[data-monew]').textContent.trim(),hint:/Aucun mode opératoire/.test(el.textContent),old:!!el.querySelector('details .pt-modop')};});
console.log('c1) onglet Hydro :',JSON.stringify(o));
const c1a=o.h3.some(t=>/2 ter · 📋 Modes opératoires/.test(t))&&/Créer un mode opératoire/.test(o.btn||'')&&o.hint&&o.old;
await page.click('#hydro [data-monew]');await page.waitForTimeout(300);
o=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),types:[...m.querySelectorAll('#moTypes .chip')].map(b=>b.textContent.trim()),on:(m.querySelector('#moTypes .chip.on')||{}).textContent,name:!!m.querySelector('#moName'),go:!!m.querySelector('#moGo')};});
console.log('c1) fenêtre :',JSON.stringify(o));
const c1b=o.show&&o.types.length===6&&o.types[0]==='Épreuve seule'&&o.types[1]==='Épreuve + rinçage'&&o.on==='Épreuve + rinçage'&&o.name&&o.go;
await page.click('#moTypes .chip[data-v="epreuve"]');await page.fill('#moName','Épreuve tronçon fictif');await page.click('#moGo');await page.waitForTimeout(500);
const K=await keys(page);console.log('clés :',JSON.stringify(K));
const V1=K['L1:vanne:20'],V2=K['L1:vanne:90'],P1=K['L1:purge:35'],D1=K['L1:vidange:50'],P2=K[Object.keys(K).find(k=>/^L2:purge:/.test(k))]; /* l'antenne part du té : sa purge est à ~29 m */
o=await ed(page);await shot(page,'1_depart');
console.log('c1) éditeur :',JSON.stringify({title:o.title,banner:o.banner,cards:o.cards.length,labels:o.labels,valves:o.valves,steps:o.steps,mo:await page.evaluate(()=>{const L=window.TRACE.hydro.of().modops;return L.map(m=>({name:m.name,type:m.type,n:m.steps.length,by:m.by}));})}));
C.c1=c1a&&c1b&&!!V1&&!!V2&&!!P1&&!!D1&&!!P2&&o.cards.length===1&&/État de départ/.test(o.title)&&/0 ouverte \/ 5/.test(o.title)&&/pas d'eau/.test(o.title)&&/État de départ : touche une vanne/.test(o.banner)&&o.labels.length>=7&&o.valves[V1]==='#c8382f'&&o.valves[V2]==='#c8382f'&&o.steps[0].type==='start'&&o.filled===0
  &&await page.evaluate(()=>{const L=window.TRACE.hydro.of().modops;return L.length===1&&L[0].name==='Épreuve tronçon fictif'&&L[0].type==='epreuve'&&/📋 Épreuve tronçon fictif/.test(document.querySelector('#moEd .moTitle').textContent);});
// ── c2 : ouvrir / fermer une vanne au doigt (état de départ)
await tapPt(page,V1);o=await ed(page);const open1=o.valves[V1]==='#fff'&&o.steps[0].set[V1]==='o'&&/1 ouverte \/ 5/.test(o.title);
await tapPt(page,V1);const o2=await ed(page);const closed1=o2.valves[V1]==='#c8382f'&&o2.steps[0].set[V1]==='f'&&/0 ouverte \/ 5/.test(o2.title);
console.log('c2) vanne au doigt :',JSON.stringify({open1,closed1,set:o2.steps[0].set}));C.c2=open1&&closed1;
// ── c3 : remplir depuis la vidange PK 50
await page.click('#moEd [data-addopen]');await page.waitForTimeout(200);
o=await page.evaluate(()=>[...document.querySelectorAll('#moEd .moAdd .moT')].map(b=>b.textContent.trim()));console.log('c3) menu ＋ :',JSON.stringify(o));const menu9=o.length===9&&/Remplir/.test(o[0])&&/Vidanger/.test(o[6]);
await page.click('#moEd [data-add="remplir"]');await page.waitForTimeout(300);o=await ed(page);
const pickSrc=o.pick==='src'&&/pick/.test(o.pickCls)&&/Touche le point de remplissage/.test(o.banner)&&o.cards.length===2&&o.cards[1].on&&/Touche le point de remplissage/.test(o.cards[1].txt);
await tapPt(page,V1); /* une vanne n'est pas un point de remplissage : refus, rien ne change */
const refus=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
await tapPt(page,D1);o=await ed(page);await shot(page,'3_remplir');
console.log('c3) remplir :',JSON.stringify({pickSrc,refus,pick:o.pick,step:o.steps[1],txt:o.cards[1].txt,warn:o.cards[1].warn,title:o.title,filled:o.filled,flow:o.flow,extra:o.extra,sim:o.sim[1]}));
const fill=o.steps[1].src===D1&&o.steps[1].water==='brute'&&o.pick===null&&/^Remplir jusqu'à V PK 20, V PK 90 · SST PK 39,2 \(≈ 109 m\) depuis vidange DN\d+ PK 50 \(Rue Fictive\) — eau brute\.$/.test(o.cards[1].txt)&&o.cards[1].warn.some(w=>/Ouvre une purge de la partie remplie/.test(w)&&/P PK 35/.test(w)&&/P PK 29,2/.test(w))&&o.filled>=3&&o.flow>=3&&o.extra.some(t=>/Remplissage · eau brute/.test(t))&&/eau : jusqu'à V PK 20, V PK 90/.test(o.title)&&o.sim[1].len===109;
await page.click('#moEd .moW[data-water="adoucie"]');await page.waitForTimeout(250);o=await ed(page);const adoucie=o.steps[1].water==='adoucie'&&/— eau adoucie\./.test(o.cards[1].txt);
C.c3=menu9&&pickSrc&&/remplissage part d'une vidange/.test(refus)&&fill&&adoucie;
// ── c4 : purger → pression (alerte purge ouverte) → fermer la purge à l'étape 3 → attendre → casser → vidanger
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="purger"]');await page.waitForTimeout(250);await tapPt(page,P1);o=await ed(page);
const purge=o.pick==='out'&&o.steps[2].outs.join()===P1&&o.steps[2].set[P1]==='o'&&/^Purger : ouvrir purge DN\d+ PK 35 \(Rue Fictive\) jusqu'à ce que l'eau sorte sans air, puis refermer\.$/.test(o.cards[2].txt)&&o.cards[2].chips.join()==='Ouvrir P PK 35'&&o.extra.some(t=>t==='Purger ici')&&o.cards[2].warn.length===0;
await page.click('#moEd [data-pickok]');await page.waitForTimeout(200);
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="pression"]');await page.waitForTimeout(250);o=await ed(page);
const pres1=o.steps[3].type==='pression'&&o.steps[3].bar===6&&o.steps[3].min===120&&/^Mettre en pression jusqu'à V PK 20, V PK 90 · SST PK 39,2 \(≈ 109 m\) à 6 bar, tout fermé, maintenir 120 min\.$/.test(o.cards[3].txt)&&o.cards[3].warn.some(w=>/purge DN\d+ PK 35 \(Rue Fictive\) est ouverte : la pression ne tiendra pas/.test(w));
await tapPt(page,P1); /* à l'étape 3 : on la referme sur le plan */o=await ed(page);await shot(page,'4_pression');
const pres2=o.steps[3].set[P1]==='f'&&o.cards[3].warn.length===0&&o.cards[3].chips.join()==='Fermer P PK 35';
await page.fill('#moEd input[data-num="bar"]','8');await page.dispatchEvent('#moEd input[data-num="bar"]','change');await page.waitForTimeout(250);o=await ed(page);const bar8=o.steps[3].bar===8&&/à 8 bar/.test(o.cards[3].txt);
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="attente"]');await page.waitForTimeout(250);
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="casser"]');await page.waitForTimeout(250);await tapPt(page,P1);await page.click('#moEd [data-pickok]');await page.waitForTimeout(200);
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="vidanger"]');await page.waitForTimeout(250);await tapPt(page,D1);await page.click('#moEd [data-pickok]');await page.waitForTimeout(200);o=await ed(page);await shot(page,'4_vidange');
console.log('c4) étapes :',JSON.stringify({purge,pres1,pres2,bar8,cards:o.cards.map(c=>c.txt),warns:o.cards.map(c=>c.warn),sim:o.sim}));
C.c4=purge&&pres1&&pres2&&bar8&&o.steps.length===7&&/^Attendre 24 h\.$/.test(o.cards[4].txt)&&/^Casser la pression : ouvrir doucement purge DN\d+ PK 35 \(Rue Fictive\)\.$/.test(o.cards[5].txt)&&/^Vidanger par vidange DN\d+ PK 50 \(Rue Fictive\) — jusqu'à V PK 20, V PK 90/.test(o.cards[6].txt)&&o.sim[5].filled>0&&o.sim[6].filled===0&&o.filled===0&&o.cards.every((c,i)=>i===1||i===6||c.warn.length===0);
// ── c5 : ordre, suppression, données, impression
await page.evaluate(()=>document.querySelector('#moEd .moCard[data-step="4"] [data-mv="1"]').click());await page.waitForTimeout(250);o=await ed(page);const moved=o.steps.map(s=>s.type).join('>');
await page.evaluate(()=>document.querySelector('#moEd .moCard[data-step="5"] [data-mv="-1"]').click());await page.waitForTimeout(250);o=await ed(page);const back=o.steps.map(s=>s.type).join('>');
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="note"]');await page.waitForTimeout(250);await page.fill('#moEd input[data-note]','prévenir l\'exploitant fictif');await page.dispatchEvent('#moEd input[data-note]','change');await page.waitForTimeout(150);
o=await ed(page);const note=o.steps.length===8&&o.steps[7].type==='note'&&o.cards[7].txt==='prévenir l\'exploitant fictif';
await page.evaluate(()=>document.querySelector('#moEd .moCard[data-step="7"] [data-del]').click());await page.waitForTimeout(250);o=await ed(page);
const data=await page.evaluate(()=>{const L=window.TRACE.hydro.of().modops;return {n:L.length,steps:L[0].steps.length,types:L[0].steps.map(s=>s.type).join('>')};});
const pr=await page.evaluate(()=>{let H='';window.open=()=>({document:{write:h=>{H=h;},close(){}}});document.querySelector('#moEd [data-print]').click();return {len:H.length,title:/Mode opératoire hydraulique/.test(H),name:/Épreuve tronçon fictif · Épreuve seule/.test(H),pages:(H.match(/<section /g)||[]).length,svg:(H.match(/<svg class="moSvg"/g)||[]).length,h2:(H.match(/<h2[^>]*>([^<]*)<\/h2>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')),site:/Mode op fictif/.test(H)};});
console.log('c5) ordre / impression :',JSON.stringify({moved,back,note,data,pr}));
C.c5=moved==='start>remplir>purger>pression>casser>attente>vidanger'&&back==='start>remplir>purger>pression>attente>casser>vidanger'&&note&&data.n===1&&data.steps===7&&data.types===back&&pr.len>5000&&pr.title&&pr.name&&pr.site&&pr.pages===7&&pr.svg===7&&pr.h2[0]==='État de départ (prérequis)'&&/^Étape 1 · Remplir$/.test(pr.h2[1])&&/^Étape 6 · Vidanger$/.test(pr.h2[6]);
// ── c6 : terrain — « ✓ Fait », liste Hydro, 📍 Points, DOE
await page.click('#moEd [data-mode="te"]');await page.waitForTimeout(250);o=await ed(page);
const te1=o.terrain&&o.sel===1&&/Terrain : suis les étapes/.test(o.banner)&&await page.evaluate(()=>document.querySelectorAll('#moEd [data-mark]').length===6&&!document.querySelector('#moEd [data-addopen]')&&!document.querySelector('#moEd .moTools'));
await page.click('#moEd .moCard[data-step="1"] [data-mark]');await page.waitForTimeout(300);o=await ed(page);await shot(page,'6_terrain');
const marks=await page.evaluate(()=>{const m=window.TRACE.ptseq.modop.marks();const rows=window.TRACE.reg.all('pteq').filter(r=>r.ctx==='modop');return {n:Object.keys(m).length,rows:rows.map(r=>({ctx:r.ctx,step:r.step,label:r.label,by:r.byName,prest:r.prest}))};});
const sid=await page.evaluate(()=>window.TRACE.hydro.of().modops[0].steps[1].id);
const te2=o.cards[1].done&&/✓ fait/.test(await txt(page,'#moEd .moCard[data-step="1"] .moDone'))&&/✓ Fait — Ethan L\./.test(await txt(page,'#moEd .moCard[data-step="1"] [data-mark]'))&&marks.n===1&&marks.rows.length===1&&marks.rows[0].step===sid&&/^📝 Remplir — Remplir jusqu'à/.test(marks.rows[0].label);
await page.click('#moEd [data-nav="1"]');await page.waitForTimeout(200);o=await ed(page);const nav=o.sel===2&&o.cards[2].on;
await page.click('#moEd [data-close]');await page.waitForTimeout(300);
o=await page.evaluate(()=>{const el=document.getElementById('hydro');const row=el.querySelector('.moList .moRowL');return {ed:!!document.getElementById('moEd'),row:row?row.textContent.replace(/\s+/g,' ').trim():null,btns:row?[...row.querySelectorAll('button')].map(b=>b.textContent.trim()):[]};});
const list=!o.ed&&/📋 Épreuve tronçon fictif · Épreuve seule · 6 étapes · 1 faite/.test(o.row)&&o.btns.join()==='Ouvrir,Terrain';
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='points';T.renderAll();});await page.waitForTimeout(300);
const pt=await page.evaluate(()=>{const el=document.getElementById('points');const b=el.querySelector('[data-moterrain]');return {h3:/📋 Mode opératoire hydraulique/.test(el.textContent),row:/Épreuve tronçon fictif · 1 \/ 6 étapes faite/.test(el.textContent.replace(/\s+/g,' ')),btn:b?b.textContent.trim():null};});
await page.click('#points [data-moterrain]');await page.waitForTimeout(300);o=await ed(page);const te3=o.terrain&&o.sel===2&&o.cards[1].done; /* s'ouvre sur la première étape pas encore faite */
await page.click('#moEd [data-close]');await page.waitForTimeout(200);
const doe=await page.evaluate(()=>{const h=window.TRACE.modop.doe();return {h3:/Modes opératoires hydrauliques/.test(h),h4:/Épreuve tronçon fictif — Épreuve seule/.test(h),li:(h.match(/<li>/g)||[]).length,fait:/— fait le .* par Ethan L\./.test(h)};});
console.log('c6) terrain :',JSON.stringify({te1,te2,nav,list,pt,te3,doe,marks}));
C.c6=te1&&te2&&nav&&list&&pt.h3&&pt.row&&pt.btn==='Suivre sur le plan'&&te3&&doe.h3&&doe.h4&&doe.li===6&&doe.fait;
// ── c7 : soudeur (sans le droit hydro) : 📍 Points → « Suivre sur le plan » ; l'éditeur s'ouvre côté Terrain, « Voir » au lieu de « Créer », toucher une vanne ne change rien, pas d'outils
await page.selectOption('#roleSel','karim');await page.waitForTimeout(400);await page.evaluate(()=>{const T=window.TRACE;T.state.tab='points';T.renderAll();});await page.waitForTimeout(300);
o=await page.evaluate(()=>{const el=document.getElementById('points');return {can:window.TRACE.acces.can('hydro'),monew:/data-monew/.test(window.TRACE.modop.list(window.TRACE.acces.can('hydro'))),btn:(el.querySelector('[data-moterrain]')||{}).textContent};});
await page.click('#points [data-moterrain]');await page.waitForTimeout(300);const before=await ed(page);await tapPt(page,V2);const after=await ed(page);
const tools=()=>page.evaluate(()=>!!document.querySelector('#moEd [data-addopen],#moEd [data-delmo],#moEd .moTools,#moEd .moForm'));const seg=()=>page.evaluate(()=>[...document.querySelectorAll('#moEd .moSeg button')].map(b=>b.textContent.trim()+(b.classList.contains('on')?'*':'')).join());
const t1=await tools(),s1=await seg();await page.click('#moEd [data-mode="ed"]');await page.waitForTimeout(250);await tapPt(page,V2);const voir=await ed(page);const t2=await tools(),s2=await seg();
console.log('c7) soudeur :',JSON.stringify({o,terrain:before.terrain,sel:before.sel,s1,t1,s2,t2,v2:[before.valves[V2],after.valves[V2],voir.valves[V2]],set:voir.steps[0].set[V2],marks:await page.evaluate(()=>document.querySelectorAll('#moEd [data-mark]').length)}));
C.c7=!o.can&&!o.monew&&/Suivre sur le plan/.test(o.btn||'')&&before.terrain&&before.sel===2&&s1==='Voir,Terrain*'&&!t1&&after.valves[V2]==='#c8382f'&&s2==='Voir*,Terrain'&&!t2&&voir.valves[V2]==='#c8382f'&&voir.steps[0].set[V2]==='f';
await page.click('#moEd [data-close]');await ctx.close();
// ── c8 : téléphone 390
({ctx,page}=await mk({width:390,height:844}));
await page.click('#hydro [data-monew]');await page.waitForTimeout(300);await page.click('#moGo');await page.waitForTimeout(500);
const K2=await keys(page);await tapPt(page,K2['L1:vanne:20']);
await page.click('#moEd [data-addopen]');await page.waitForTimeout(150);await page.click('#moEd [data-add="remplir"]');await page.waitForTimeout(250);await tapPt(page,K2['L1:vidange:50']);
o=await page.evaluate(()=>{const el=document.getElementById('moEd');const pw=el.querySelector('.moPlanWrap').getBoundingClientRect(),st=el.querySelector('.moSteps').getBoundingClientRect();const E=window.TRACE.modop.ed;return {sw:document.documentElement.scrollWidth,w:window.innerWidth,edw:el.scrollWidth,col:getComputedStyle(el.querySelector('.moBody')).flexDirection,planH:Math.round(pw.height),stepsBelow:st.top>=pw.bottom-1,src:E.mo.steps[1].src,open:E.mo.steps[0].set,cardW:Math.round(el.querySelector('.moCard').getBoundingClientRect().width),big:[...el.querySelectorAll('.moBig')].every(b=>b.getBoundingClientRect().height>=48)};});
await shot(page,'8_tel');console.log('c8) téléphone :',JSON.stringify(o));
C.c8=o.sw<=o.w+1&&o.edw<=o.w+1&&o.col==='column'&&o.planH>=300&&o.stepsBelow&&o.src===K2['L1:vidange:50']&&o.open[K2['L1:vanne:20']]==='o'&&o.cardW<=o.w-16&&o.big;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c9=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
