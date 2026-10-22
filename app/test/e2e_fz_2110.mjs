// 21/10 — COMPTAGE DES BARRES ET DES MANCHONS (Ethan : « les calculs du nombre de tubes dans Technique → Fourniture sortent un nombre de barres trop fort ; problème
// aussi dans le calcul des manchons : j'en compte 16 et 20 sont comptés… sur une réduction ça compte 4 manchons alors que c'est deux d'un DN et deux de l'autre »).
// Réseau FICTIF tracé dans le traceur : L1 DN150 avec un coude et une réduction DN150 → DN100 (morceaux coupés de part et d'autre), L2 DN80 de 26 m (12 + 12 + 2).
// Les attendus sont recalculés ICI, indépendamment de l'appli, depuis les pièces et les soudures du traceur :
//   barres = morceaux de tube (hors manchettes nues) rangés dans des barres de 12 m (plus grand d'abord, meilleure place) ; manchons = soudures au DN de la soudure
//   (deux soudures dans le même manchon = 1) ; mousse = 1 par manchon.
// c1 besoin Fourniture = attendus (barres < ancien comptage « 1 barre par morceau ») · c2 réduction : 1 manchon de chaque DN par conduite · c3 tracé initial figé
// à l'ANCIEN comptage → converti (pas de fausses modifs) · c4 récap du Stock = mêmes besoins · c5 posé : barres posées regroupées · zéro erreur console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Ligne fictive A',dn:150,bar:12,pts:[[0,50],[47,50],[47,95]],specials:[{id:'S1',m:23,type:'reducer',dn2:100}],parent:null},{id:'L2',name:'Ligne fictive B',dn:80,bar:12,pts:[[0,140],[26,140]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
// attendus depuis le traceur
const X=await page.evaluate(()=>{const B=window.MAQ.state.built;const out={tubes:{},welds:{},old:{},pieces:[]};
  Object.entries(B).forEach(([lid,b])=>['A','R'].forEach(c=>{const cd=b&&b[c];if(!cd)return;
    cd.pieces.forEach(p=>{if(p.kind!=='tube')return;out.pieces.push([lid,c,p.dn,+p.L.toFixed(3),!!p.manchette,!!p.nue]);if(!p.nue)(out.tubes[p.dn]=out.tubes[p.dn]||[]).push(p.L);if(!p.manchette&&!p.nue)out.old['pipe:'+p.dn]=(out.old['pipe:'+p.dn]||0)+1;});
    const seen=new Set();cd.welds.forEach(w=>{if(w.sleeve){if(seen.has(w.sleeve))return;seen.add(w.sleeve);}out.welds[w.dn]=(out.welds[w.dn]||0)+1;
      const pc=cd.pieces[w.i];const dOld=pc?(pc.dn||b.dn):0;out.old['sleeve:'+dOld]=(out.old['sleeve:'+dOld]||0)+1;out.old['pu:'+dOld]=(out.old['pu:'+dOld]||0)+1;});}));return out;});
const pack=(lens,bar)=>{let n=0;const cut=[];lens.forEach(L=>{if(L>=bar-0.005)n+=Math.ceil(L/bar-0.005);else cut.push(L);});cut.sort((a,b)=>b-a);const rest=[];cut.forEach(L=>{let k=-1;for(let i=0;i<rest.length;i++)if(rest[i]>=L-0.005&&(k<0||rest[i]<rest[k]))k=i;if(k<0){rest.push(bar-L);n++;}else rest[k]-=L;});return n;};
const EXP={};Object.entries(X.tubes).forEach(([dn,L])=>{EXP['pipe:'+dn]=pack(L,12);});Object.entries(X.welds).forEach(([dn,n])=>{EXP['sleeve:'+dn]=n;EXP['pu:'+dn]=n;});
console.log('pièces du traceur :',JSON.stringify(X.pieces));console.log('attendu :',JSON.stringify(EXP),'· ancien comptage :',JSON.stringify(X.old));
await page.click('#bSave');await wait(200);await page.fill('#svName','Comptage fictif');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const NEED=()=>page.evaluate(()=>{const r=window.TRACE.fourniture.needs();const o={};Object.entries(r.need).forEach(([k,v])=>{if(/^(pipe|sleeve|pu):/.test(k))o[k]=v;});return o;});
// ── 1) besoin de l'onglet Fourniture
let n1=await NEED();const keys=Object.keys(EXP);
C.c1=keys.every(k=>n1[k]===EXP[k])&&Object.keys(n1).filter(k=>/^pipe:/.test(k)).every(k=>k in EXP)&&n1['pipe:150']<=X.old['pipe:150']&&n1['pipe:80']<X.old['pipe:80'];
console.log('1) besoin Fourniture :',JSON.stringify(n1));
// ── 2) réduction : manchons de chaque côté au bon DN (le traceur dit le DN à la soudure)
C.c2=(n1['sleeve:100']||0)===EXP['sleeve:100']&&(n1['sleeve:150']||0)===EXP['sleeve:150']&&EXP['sleeve:100']>0&&X.old['sleeve:150']-EXP['sleeve:150']===2;
console.log('2) manchons : DN150',n1['sleeve:150'],'(ancien',X.old['sleeve:150'],') · DN100',n1['sleeve:100'],'(ancien',X.old['sleeve:100']||0,')');
// ── 3) tracé initial figé avant le 21/10 (ancien comptage, sans v) → converti : pas de fausses modifs
let r3=await page.evaluate(async(old)=>{const T=window.TRACE;document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,200));document.querySelector('#tabbar [data-tab="fourniture"]').click();await new Promise(r=>setTimeout(r,400));
  const F=T.fourniture.of();const need=Object.assign({},F.init.need);Object.keys(need).forEach(k=>{if(/^(pipe|sleeve|pu):/.test(k))delete need[k];});Object.assign(need,old);F.init={need,lab:F.init.lab,src:'trace',at:'2026-10-14T08:00:00Z',by:'test'};
  const X2=T.fourniture.compute();const by={};X2.rows.forEach(r=>{by[r.k]={ini:r.ini,act:r.act,mod:r.mod};});document.querySelector('#tabbar [data-tab="fourniture"]').click();await new Promise(r=>setTimeout(r,300));
  return {by,conv:X2.initConv,txt:/converti au comptage du 21\/10/.test(document.getElementById('fourniture').textContent),v:F.init.v||null};},X.old);
C.c3=r3.conv===true&&r3.txt&&Object.entries(r3.by).filter(([k])=>/^(pipe|sleeve|pu):/.test(k)).every(([k,v])=>v.mod===0&&v.ini===v.act);
console.log('3) initial converti :',JSON.stringify(r3));
// ── 4) récap du Stock : mêmes besoins
let r4=await page.evaluate(()=>{const r=window.TRACE.stk.needs();const o={};Object.entries(r.need).forEach(([k,v])=>{if(/^(pipe|sleeve|pu):/.test(k))o[k]=v;});return o;});
C.c4=keys.every(k=>r4[k]===EXP[k]);console.log('4) récap Stock :',JSON.stringify(r4));
// ── 5) posé : on soude toute la ligne B (DN80) → barres posées = besoin de la ligne B regroupé (pas un par morceau)
let r5=await page.evaluate(()=>{const T=window.TRACE;const l=T.net.lines.find?T.net.lines.find(x=>x.name==='Ligne fictive B'):Object.values(T.state.lines).find(x=>x.name==='Ligne fictive B');const L=T.state.lines[l.id];
  ['A','R'].forEach(c=>(L.cond[c].joints||[]).forEach(j=>{j.status='soudee';}));const p=T.fourniture.needs().posed;const s2=T.stk.posed();return {f:p['pipe:80']||0,s:s2['pipe:80']||0};});
C.c5=r5.f===EXP['pipe:80']&&r5.s===EXP['pipe:80'];console.log('5) posé ligne B :',JSON.stringify(r5),'attendu',EXP['pipe:80']);
C.c6=logs.length===0;
console.log(JSON.stringify(C));console.log(Object.values(C).every(Boolean)?'RESULTAT: TOUT VERT':'RESULTAT: ECHEC '+Object.keys(C).filter(k=>!C[k]).join(','));console.log(JSON.stringify(logs));
await browser.close();
