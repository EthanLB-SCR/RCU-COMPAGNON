// 14/10/2026 soir (lot Q) — quantités d'un tracé (src/qtrace.js), préremplissage des zones et répartition (src/qfill.js), panier by-pass derrière vannes SST
// (src/prix.js), dans Node, sans navigateur. Données 100 % FICTIVES (base de prix : test/fixture_prix.xlsx, fictive).
// 1) non-régression : traceQtyOf = l'ANCIEN calcul de traceQty (copie conforme de la base 14/10 soir, ci-dessous) sur d'anciens chantiers (DXF : els + joints ;
//    lignes de session : cond.A / cond.R.joints ; ligne sans éléments) ; un tracé du traceur jamais ouvert (cond + welds) = le même tracé ouvert (session) ;
// 2) contrat C1 / C2 / C4 / C8 : extrémités par type et DN (ends, sinon startType / endType ; alias « bypass »), purges / vidanges au DN de la branche, par tranche,
//    par zone + « hors zone » ; 3) préremplissage d'une zone ; reprise (lignes saisies à la main gardées) ; 4) répartition au plus fort reste ;
// 5) panier by-pass : composition par défaut (2 coudes + vannette + MO), même total que le classeur ; sans bloc by-pass : 4 soudures au prix de la zone.
// node test/qtrace_test.mjs → RESULTAT: TOUT VERT | ECHEC <clés>
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {traceQtyOf,splitLR,splitLR1,extAdd} from '../src/qtrace.js';
import {qOfTrace,qOfRef,fillZone,splitQ,snapDn,typeFor} from '../src/qfill.js';
import {parsePrixWorkbook,emptyEtude,calcEtude,panierRow,panierOf,BP_SST,foLookup,teamCost,cadOf,bpSw} from '../src/prix.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const C={};const log=(k,v,info)=>{C[k]=!!v;if(!v)console.log('ÉCHEC',k,info!==undefined?JSON.stringify(info).slice(0,1500):'');};
const J=x=>JSON.stringify(x);
/* ── l'ANCIEN traceQty (app.js, base 14/10 soir), à l'identique — seule l'entrée change : src (lignes) et sess (lignes de session ?) ── */
function traceQtyOld(src,sess){if(!src.length)return null;
  const by={};const g=dn=>by[dn]||(by[dn]={dn,soud:0,mlTr:0,mlTube:0,mlPipe:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,runs:[]});const ids=new Set(src.filter(Boolean).map(l=>l.id));
  const addRun=(dn,len,bar,n)=>{if(!(len>0.01)||!dn)return;g(dn).runs.push({len,bar:+bar||12,n:n||1});};
  const barresOf=runs=>{const B={};runs.forEach(r=>{const b=B[r.bar]=B[r.bar]||{full:0,rems:[]};for(let c=0;c<r.n;c++){const f=Math.floor(r.len/r.bar+1e-9);b.full+=f;const rem=r.len-r.bar*f;if(rem>0.05)b.rems.push(rem);}});
    let tot=0;Object.keys(B).forEach(k=>{const b=B[k];b.rems.sort((x,y)=>y-x);const bins=[];b.rems.forEach(r=>{let i=-1;for(let j=0;j<bins.length;j++)if(bins[j]+r<=+k+1e-9){i=j;break;}if(i<0)bins.push(r);else bins[i]+=r;});tot+=b.full+bins.length;});return tot;};
  src.forEach(l=>{if(!l)return;const els=Array.isArray(l.els)?l.els:[];const nC=l.single?1:2;const dnOf=i=>{for(let k=0;k<els.length;k++){const a=els[i-k],b=els[i+k];if(a&&+a.dn)return +a.dn;if(b&&+b.dn)return +b.dn;}return +l.dn||0;};
    els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);if(!dn)return;const r=g(dn);const len=+e.len||0;r.mlTr+=len;r.mlTube+=len*nC;if(e.kind==='pipe')r.mlPipe+=len*nC;else if(e.kind==='bend'||e.kind==='steelbend')r.coudes+=nC;else if(e.kind==='tee')r.tes+=nC;else if(e.kind==='reducer')r.red+=nC;else if(e.kind==='valve')r.vannes+=nC;else if(e.kind==='endcap')r.kits+=nC;});
    {let run=null;const endRun=()=>{if(run){addRun(run.dn,run.len,l.bar,nC);run=null;}};
      els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);const len=+e.len||0;
        if(e.kind==='pipe'&&dn){if(run&&run.dn===dn)run.len+=len;else{endRun();run={dn,len};}}else endRun();});endRun();}
    if(!els.length&&+l.dn&&+l.length){const r=g(+l.dn);r.mlTr+=+l.length;r.mlTube+=(+l.length)*nC;r.mlPipe+=(+l.length)*nC;addRun(+l.dn,+l.length,l.bar,nC);}
    if(l.parent&&ids.has(l.parent)){const d0=dnOf(0);if(d0)g(d0).piq+=nC;}
    if(sess&&l.cond){['A','R'].forEach(c=>{const C=l.cond[c];if(!C||!Array.isArray(C.joints))return;C.joints.forEach(j=>{const e=Array.isArray(C.els)?C.els[j.idx]:null;const dn=+(j.dn||(e&&e.dn)||dnOf(j.idx||0))||0;if(dn)g(dn).soud++;});});}
    else if(Array.isArray(l.joints))l.joints.forEach(j=>{const dn=dnOf(+j.idx||0);if(dn)g(dn).soud+=nC;});});
  const rows=Object.values(by).filter(r=>r.soud||r.mlTr).sort((x,y)=>y.dn-x.dn).map(r=>({dn:r.dn,barres:r.runs.length?barresOf(r.runs):Math.ceil(r.mlPipe/12-1e-9),mlTube:Math.round(r.mlTube*10)/10,mlTr:Math.round(r.mlTr*10)/10,soud:r.soud,coudes:r.coudes,tes:r.tes,piq:r.piq,red:r.red,vannes:r.vannes,kits:r.kits,src:'tracé'}));
  const T=k=>rows.reduce((x,r)=>x+(r[k]||0),0);return {rows,tot:{barres:T('barres'),mlTube:T('mlTube'),mlTr:Math.round(T('mlTr')*10)/10,soud:T('soud'),coudes:T('coudes'),tes:T('tes'),piq:T('piq'),red:T('red'),vannes:T('vannes'),kits:T('kits')}};}
const OLDK=['dn','barres','mlTube','mlTr','soud','coudes','tes','piq','red','vannes','kits','src'];
const sameOld=(n,o)=>{if(!n||!o)return n===o;const pick=r=>OLDK.map(k=>r[k]);const nr=n.rows.filter(r=>r.soud||r.mlTr);return J(nr.map(pick))===J(o.rows.map(pick))&&J(Object.keys(o.tot).map(k=>n.tot[k]))===J(Object.values(o.tot));};
// ── 1) anciens chantiers (sans les champs du contrat)
const mk=(id,els,joints,o)=>Object.assign({id,els,joints,length:els.reduce((s,e)=>s+e.len,0)},o||{});
const dxf=[mk('L1',[{kind:'endcap',dn:150,len:0.3},{kind:'pipe',dn:150,len:12},{kind:'pipe',dn:150,len:12},{kind:'bend',dn:150,len:0.6},{kind:'pipe',dn:150,len:7.5},{kind:'tee',dn:150,len:1.1},{kind:'reducer',dn:100,len:0.5},{kind:'pipe',dn:100,len:12},{kind:'valve',dn:100,len:0.4},{kind:'pipe',dn:100,len:3.2}],[{idx:0},{idx:1},{idx:2},{idx:3},{idx:4},{idx:5},{idx:6},{idx:7},{idx:8}]),
  mk('L2',[{kind:'pipe',dn:65,len:6.5},{kind:'steelbend',dn:65,len:0.3},{kind:'pipe',dn:65,len:11},{kind:'endcap',dn:65,len:0.2}],[{idx:0},{idx:1},{idx:2}],{parent:'L1'}),
  mk('L3',[{kind:'pipe',dn:80,len:5},{kind:'pipe',len:5},{kind:'pipe',dn:80,len:30}],[{idx:0},{idx:1}],{cond:'A',bar:6}),
  {id:'L4',dn:50,length:27.5,joints:[]},null];
let n=traceQtyOf({lines:dxf,sess:false,meta:dxf.filter(Boolean)}),o=traceQtyOld(dxf,false);
log('c1a_dxf',sameOld(n,o)&&n.rows.length===o.rows.length&&J(n.ext)==='{}'&&!n.byTranche&&!n.byZone&&n.tot.purges===0&&n.tot.vidanges===0,{n,o});
console.log('1a) ancien chantier DXF :',J(o.tot));
const sessL=[{id:'S1',els:[{kind:'pipe',dn:200,len:12},{kind:'bend',dn:200,len:0.8},{kind:'pipe',dn:200,len:9}],cond:{A:{els:[{kind:'pipe',dn:200},{kind:'bend',dn:200},{kind:'pipe',dn:200}],joints:[{idx:0},{idx:1,dn:200}]},R:{els:[{kind:'pipe',dn:200},{kind:'bend',dn:200},{kind:'pipe',dn:200}],joints:[{idx:0},{idx:1},{idx:2}]}}},
  {id:'S2',parent:'S1',single:'A',els:[{kind:'pipe',dn:80,len:4}],cond:{A:{els:[{kind:'pipe',dn:80}],joints:[{idx:0}]}}}];
n=traceQtyOf({lines:sessL,sess:true,meta:[]});o=traceQtyOld(sessL,true);log('c1b_session',sameOld(n,o),{n,o});
log('c1c_vide',traceQtyOf({lines:[],sess:false})===null&&traceQtyOld([],false)===null);
// ── un tracé du TRACEUR (format remis par bridge.js) : jamais ouvert (cond + welds) = ouvert (session, comme setupTraceurLine)
const T=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});
const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i}));
const TL=(id,els,o)=>Object.assign({id,name:id,dn:els[0].dn,bar:12,traceur:true,cond:{A:{els,welds:weldsOf(els),length:0},R:{els:els.map(e=>Object.assign({},e)),welds:weldsOf(els),length:0}}},o||{});
const PU=(dnb)=>T('tee',150,0.9,{vert:'up',pvKind:'purge',dnb}),VI=(dn,dnb)=>T('tee',dn,0.8,{vert:'down',pvKind:'vidange',dnb});
const tr=[
  TL('L1',[T('endpoint',150,0),T('pipe',150,12),PU(25),T('pipe',150,12),T('tee',150,1.1),T('pipe',150,10),PU(25),T('pipe',150,6),T('reducer',100,0.5),T('pipe',100,12),T('endcap',100,0.3)],{startType:'chaufferie',endType:'kit',ends:{start:{type:'chaufferie',dn:150},end:{type:'kit',dn:100}}}),
  TL('L2',[T('pipe',80,12),T('bend',80,0.4),T('pipe',80,8),T('endpoint',80,0)],{parent:'L1',parentM:24,startType:null,endType:'sousstation',ends:{start:null,end:{type:'sousstation',dn:80}}}),
  TL('L3',[T('pipe',65,12),T('pipe',65,3),T('bypass',65,0.6)],{parent:'L1',parentM:36,startType:null,endType:'bypass_extrusion',ends:{start:null,end:{type:'bypass_extrusion',dn:65}}}),
  TL('L4',[T('endpoint',100,0),T('pipe',100,12),VI(100,40),T('pipe',100,12),T('valve',100,0.4),T('pipe',100,5),T('bypass',100,0.6)],{startType:'pec',endType:'bypass_regard',ends:{start:{type:'pec',dn:100},end:{type:'bypass_regard',dn:100}}}),
  TL('L5',[T('pipe',50,12),T('pipe',50,2),T('endcap',50,0.3)],{parent:'L4',parentM:12,startType:null,endType:'fondbombe_regard',ends:{start:null,end:{type:'fondbombe_regard',dn:50}}}),
  TL('L6',[T('endpoint',80,0),T('pipe',80,12),PU(32),T('pipe',80,4),T('endpoint',80,0)],{startType:'insertion',endType:'attente_chaufferie',tranche:'option',option:1,ends:{start:{type:'insertion',dn:80},end:{type:'attente_chaufferie',dn:80}}}),
  TL('L7',[T('endpoint',65,0),T('pipe',65,12),T('pipe',65,12),T('endpoint',65,0)],{startType:'attente',endType:'sousstation',tranche:'option',option:1}), /* sans ends : startType / endType + DN des bouts */
  TL('L8',[T('endpoint',50,0),T('pipe',50,9),T('bypass',50,0.5)],{startType:'sousstation',endType:'bypass'})]; /* ancienne valeur « bypass » = by-pass nu en regard */
const zones=[{id:'z1',nom:'Zone Nord',lines:['L1','L2','L3','L8']},{id:'z2',nom:'Zone Sud',lines:['L4','L5','L6']}]; /* L7 hors zone */
const setup=L=>{const line={id:L.id,parent:L.parent||null,single:null,traceur:true,dn:L.dn,cond:{}};['A','R'].forEach(c=>{const cd=L.cond[c];const els=cd.els.map(e=>Object.assign({},e,{pvKind:undefined}));line.cond[c]={els,joints:(cd.welds||[]).map((w,k)=>({idx:w.idx!==undefined?w.idx:k,dn:w.dn})).filter(j=>j.idx>=0&&j.idx<els.length)};});line.els=(line.cond.A||line.cond.R).els;return line;}; /* comme setupTraceurLine : pvKind perdu, vert = nature */
const raw=traceQtyOf({lines:tr,sess:false,meta:tr,zones}),ses=traceQtyOf({lines:tr.map(setup),sess:true,meta:tr,zones});const old=traceQtyOld(tr.map(setup),true);
log('c1d_jamais_ouvert_egal_ouvert',J(raw)===J(ses)&&sameOld(ses,old)&&raw.tot.soud===old.tot.soud&&raw.tot.soud>0,{raw:raw.tot,ses:ses.tot,old:old.tot});
log('c1e_ancien_brut_vide',traceQtyOld(tr,false).rows.length===0); /* avant : un tracé jamais ouvert donnait 0 */
console.log('1d) tracé du traceur :',J(raw.tot));
// ── 2) contrat
const X=raw.ext;console.log('2) extrémités :',J(X));
log('c2a_ext',J(X.chaufferie)==='{"150":1}'&&J(X.kit)==='{"100":1}'&&J(X.sousstation)==='{"50":1,"65":1,"80":1}'&&J(X.bypass_extrusion)==='{"65":1}'&&J(X.pec)==='{"100":1}'&&J(X.bypass_regard)==='{"50":1,"100":1}'
  &&J(X.fondbombe_regard)==='{"50":1}'&&J(X.insertion)==='{"80":1}'&&J(X.attente_chaufferie)==='{"80":1}'&&J(X.attente)==='{"65":1}'&&!X.bypass&&!X.libre,X);
const row=(q,dn)=>q.rows.find(r=>r.dn===dn)||{};
log('c2b_purges',row(raw,25).purges===2&&row(raw,32).purges===1&&row(raw,40).vidanges===1&&raw.tot.purges===3&&raw.tot.vidanges===1&&row(raw,25).soud===0&&row(raw,25).mlTr===0&&row(raw,150).purges===0,raw.rows);
log('c2c_tranches',raw.byTranche&&J(Object.keys(raw.byTranche))==='["ferme","option 1"]'&&raw.byTranche.ferme.tot.soud+raw.byTranche['option 1'].tot.soud===raw.tot.soud
  &&J(raw.byTranche['option 1'].ext)===J({insertion:{80:1},attente_chaufferie:{80:1},attente:{65:1},sousstation:{65:1}})&&raw.byTranche['option 1'].tot.purges===1,raw.byTranche&&Object.keys(raw.byTranche));
log('c2d_zones',raw.byZone&&raw.byZone.length===3&&raw.byZone[0].nom==='Zone Nord'&&J(raw.byZone[0].lines)==='["L1","L2","L3","L8"]'&&raw.byZone[2].id==='_hors'&&raw.byZone[2].nom==='Hors zone'&&J(raw.byZone[2].lines)==='["L7"]'
  &&raw.byZone.reduce((s,z)=>s+z.tot.soud,0)===raw.tot.soud&&raw.byZone[0].tot.purges===2&&raw.byZone[1].tot.vidanges===1&&raw.byZone[1].tot.purges===1&&J(raw.byZone[0].ext.sousstation)==='{"50":1,"80":1}',raw.byZone&&raw.byZone.map(z=>[z.id,z.lines,z.tot.soud]));
log('c2e_sans_option_sans_zone',(()=>{const q=traceQtyOf({lines:tr.slice(0,5),sess:false,meta:tr});return !q.byTranche&&!q.byZone;})());
log('c2f_lr',J(splitLR(10,[1,1,1]))==='[4,3,3]'&&J(splitLR(7,[50,30,20]))==='[4,2,1]'&&splitLR(101,[1,2,3,4]).reduce((s,x)=>s+x,0)===101&&J(splitLR1(10.1,[1,1]))==='[5.1,5]'&&J(splitLR(5,[0,0]))==='[3,2]'&&J(extAdd({a:{50:1}},{a:{50:2,65:1}}))==='{"a":{"50":3,"65":1}}');
// ── 3) préremplissage d'une zone (base fictive)
const buf=fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'));const base=await parsePrixWorkbook(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),{name:'fixture_prix.xlsx'});
const z1=emptyEtude('Zone Nord');const Q1=qOfTrace(raw.byZone[0]);const rep=fillZone(z1,Q1,base,{dn:true});console.log('3) zone Nord :',J({dn:z1.dn,purges:z1.purges,sst:z1.sst,racc:z1.racc,extrusion:z1.extrusion,qtInfo:z1.qtInfo,rep}));
log('c3a_zone',z1.dn.map(r=>r.dn+':'+r.soud+'/'+r.ml).join()===Q1.rows.slice().sort((a,b)=>a.dn-b.dn).map(r=>r.dn+':'+r.soud+'/'+r.ml).join()&&z1.purges.dn===25&&z1.purges.paires===2
  &&J(z1.sst.map(s=>s.type+':'+s.dn+':'+s.paires))===J(['sst_vannes_bs_pn25:80:1','sst_vannes_bs_pn25:50:1','bypass_seul:50:1'])&&J(z1.racc.map(s=>s.type+':'+s.dn+':'+s.qk))===J([':150:chaufferie'])&&rep.warn.some(w=>/chaufferie/.test(w))
  &&z1.extrusion.length===1&&z1.extrusion[0].type==='By-pass'&&z1.extrusion[0].dn===140&&z1.extrusion[0].paires===1&&z1.qtInfo.kits.bouts===1,{z1:z1.extrusion,warn:rep.warn});
const z2=emptyEtude('Zone Sud');fillZone(z2,qOfTrace(raw.byZone[1]),base,{dn:true});
log('c3b_racc',J(z2.racc.map(s=>s.type+':'+s.dn+':'+s.paires))===J(['racc_piquage_en_charge:100:1','racc_insertion_de_tes:80:1','racc_attente:80:1'])&&z2.vidanges.dn===40&&z2.vidanges.paires===1&&z2.purges.dn===32&&z2.purges.paires===1
  &&J(z2.sst.map(s=>s.type+':'+s.dn))===J(['bypass_seul:100','fonds_bombes:50']),{racc:z2.racc,sst:z2.sst,v:z2.vidanges});
// reprise : ligne à la main gardée, type choisi à la main gardé, purges retirées seulement si c'était le tracé
z2.sst.push({dn:65,type:'sst_vannes_bs_pn40',paires:3});z2.racc[0].type='racc_attente';z2.purges.purgeurAuto=true;
const lessPurge=JSON.parse(J(raw.byZone[1]));lessPurge.rows.forEach(r=>{r.purges=0;});fillZone(z2,qOfTrace(lessPurge),base,{dn:true});
log('c3c_reprise',z2.sst.some(s=>!s.qk&&s.type==='sst_vannes_bs_pn40'&&s.paires===3)&&z2.racc.find(s=>s.qk==='pec').type==='racc_attente'&&z2.purges.paires===0&&z2.purges.purgeurAuto===true&&z2.sst.filter(s=>s.qk).length===2,{sst:z2.sst,racc:z2.racc,p:z2.purges});
log('c3d_snap',snapDn(base,'purge',24)===25&&snapDn(base,'purge',150)===100&&typeFor(base,'chaufferie').type===''&&typeFor(base,'attente_chaufferie').type==='racc_attente');
// ── 4) répartition (référence globale : étude fournisseur / saisie / tracé sans zones)
const Qg={rows:[{dn:200,soud:101,ml:250.5,nAnt:7},{dn:100,soud:33,ml:80}],pv:{purges:{25:5},vidanges:{40:2}},ext:{sousstation:{80:3},pec:{100:1}},kits:4};
const S3=splitQ(Qg,{mode:'pct',pct:[1,1,1]},{others:'prorata'});
const sum=(L,f)=>L.reduce((s,q)=>s+f(q),0);const rowsOf=(q,dn)=>(q.rows.find(r=>r.dn===dn)||{soud:0,ml:0});
log('c4a_pct',S3.length===3&&sum(S3,q=>rowsOf(q,200).soud)===101&&Math.abs(sum(S3,q=>rowsOf(q,200).ml)-250.5)<1e-9&&sum(S3,q=>rowsOf(q,100).soud)===33&&J(S3.map(q=>rowsOf(q,200).soud))==='[34,34,33]'
  &&sum(S3,q=>(q.pv.purges[25]||0))===5&&sum(S3,q=>((q.ext.sousstation||{})[80]||0))===3&&sum(S3,q=>q.kits)===4&&S3.every(q=>(q.rows.find(r=>r.dn===200)||{}).nAnt<=rowsOf(q,200).soud),S3);
const Sml=splitQ(Qg,{mode:'ml',ml:[{200:200,100:0},{200:50.5,100:80}]},{others:'z1'});
log('c4b_ml',J(Sml.map(q=>rowsOf(q,200).ml))==='[200,50.5]'&&J(Sml.map(q=>rowsOf(q,200).soud))==='[81,20]'&&J(Sml.map(q=>rowsOf(q,100).soud))==='[0,33]'&&Sml[0].pv.purges[25]===5&&!Sml[1].pv.purges[25]&&Sml[0].kits===4&&Sml[1].kits===0,Sml);
log('c4c_ref',J(qOfRef({rows:[{dn:100,soud:10,ml:50,nAnt:''}],pv:{purges:{25:1}},ext:{kit:{50:2}},kits:4}))===J({rows:[{dn:100,soud:10,ml:50}],pv:{purges:{25:1},vidanges:{}},ext:{kit:{50:2}},kits:4})&&!qOfRef({rows:[]}).pv);
// ── 5) panier by-pass derrière vannes SST
const moneyBp=b=>{const r=panierRow(b,BP_SST,50);return r?{tot:Math.round(r.total*100)/100,mo:Math.round(r.moAmount*100)/100,fo:r.fo.map(f=>f.label+':'+f.qty+'×'+Math.round(f.pu*100)/100),miss:r.missing.length}:null;};
const b0=moneyBp(base);const bNoBlk=JSON.parse(J(base));bNoBlk.op.blocks=bNoBlk.op.blocks.filter(b=>!/^BY-PASS - FONDS/i.test(b.title));const b1=moneyBp(bNoBlk);
console.log('5) by-pass : classeur décomposé',J(b0),'· classeur non décomposable',J(b1));
const coude50=foLookup(base,'FO_Accessoires_Acier',50,9);
log('c5a_compo_total_garde',b0&&b1&&b1.tot===b0.tot&&b1.mo===b0.mo&&b1.fo.length===3&&b1.fo[0]==='Coude acier nu à souder 90° DN 50:2×'+coude50 /* lot P : libellé « coude acier nu » (Ethan) */&&/^Vannette 15\/21 \(dans l'écart\):1×0$/.test(b1.fo[1])&&/écart au total/.test(b1.fo[2])&&b1.miss===0,{b0,b1});
const bVan=JSON.parse(J(bNoBlk));bVan.fo.tables.FO_Divers={cols:['Désignation','Prix'],rows:[{'Désignation':'Vannette laiton 15/21','Prix':12}]};const b2=moneyBp(bVan);
log('c5b_vannette_trouvee',b2&&b2.tot===b0.tot&&/^Vannette 15\/21 \(Vannette laiton 15\/21\):1×12$/.test(b2.fo[1]),b2);
const bNone=JSON.parse(J(base));delete bNone.op.bypass;bNone.op.blocks=bNone.op.blocks.filter(b=>!/^BY-PASS - FONDS/i.test(b.title));const P3=panierOf(bNone,BP_SST);const b3=moneyBp(bNone);
const cad=cadOf(bNone,50);const hW=4*(bNone.mo.hJour||10)/cad.soud['S+T'];
log('c5c_sans_bloc',P3&&P3.def&&P3.rows.map(r=>r.dn).join()==='20,25,32,40,50,65,80,100'&&b3.fo.length===2&&b3.miss===1&&Math.abs(b3.mo-hW*teamCost(bNone,'S+T').h)<0.01&&bpSw(bNone,50)&&!bpSw(base,50),{b3,hW});
const zb=emptyEtude('Z');zb.dn=[{dn:50,soud:10,ml:40}];zb.sst=[{dn:50,type:'sst_vannes_bs_pn25',paires:2,bypass:true}];const Rb=calcEtude(zb,bNone);const sb=Rb.detail.sst.rows[0];const pS=Rb.detail.prix.soud(50);
log('c5d_soudures_zone',Math.abs(panierRow(bNone,BP_SST,50,{soud:Rb.detail.prix.W}).moAmount-4*pS)<0.01&&Math.abs(sb.bypass-(4*pS+coude50*2))<0.01&&sb.missing.some(m=>/vannette/i.test(m.why)),{bypass:sb.bypass,pS,coude50,miss:sb.missing});
const Rc=calcEtude(Object.assign(emptyEtude('Z'),{sst:[{dn:600,type:'bypass_seul',paires:1}],racc:[{dn:600,type:'racc_attente',paires:1},{dn:80,type:'',paires:1},{dn:80,type:'racc_attente',paires:2}]}),base);
log('c5e_signales',Rc.detail.sst.rows[0].missing.length===1&&Rc.detail.racc.rows.length===2&&Rc.detail.racc.rows[0].missing.length===1&&Rc.detail.racc.rows[1].idx===2&&Rc.detail.racc.rows[1].missing.length===0,Rc.detail.racc.rows);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
