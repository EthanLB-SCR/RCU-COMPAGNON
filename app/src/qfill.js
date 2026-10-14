// qfill.js — DES QUANTITÉS AUX ZONES DU CHIFFRAGE (14/10/2026 soir, lot Q), fonctions PURES (testées dans Node) : préremplir une zone (étude) avec tout ce qui se
// compte dans un tracé — soudures et ml par DN, purges, vidanges, sous-stations, raccordements, by-pass, fonds bombés, extrusions — et répartir des quantités GLOBALES
// (étude fournisseur, saisie, tracé sans zones) sur plusieurs zones au plus fort reste (totaux conservés).
// Unités (paniers du classeur) : SST, purges, vidanges, by-pass, fonds bombés = à la PAIRE (aller + retour) → 1 par bout de ligne / par té vertical ; raccordements =
// à l'unité, une unité couvrant l'aller et le retour (panier PEC : vanne PEC ×2, selle ×2) → 1 par bout aussi ; extrusion by-pass = 1 pièce par bout ;
// kits fin de ligne : pas de ligne de prix dans le moteur → compte affiché (bouts et kits, aller + retour).
// Une ligne venue du tracé porte qk = son type d'extrémité (C1) : « Reprendre les quantités » remplace ces lignes-là, garde celles saisies à la main, et garde le
// type choisi à la main sur une ligne venue du tracé (même extrémité, même DN).
import {sstTypes,raccTypes,panierDNs,isoDiam} from './prix.js';
import {endType,endLabel,extAdd,pvOf,splitLR,splitLR1} from './qtrace.js';
const num=v=>v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0);
const has=v=>v!==undefined&&v!==null&&v!=='';
const nbf=x=>(+x||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
const dnList=D=>Object.keys(D||{}).map(Number).filter(d=>num(D[d])>0).sort((a,b)=>b-a);
const dnTxt=D=>dnList(D).map(d=>'DN '+d+' × '+nbf(D[d])).join(', ');
/* les quantités d'un tracé (traceQty, ou une de ses tranches / zones) → quantités à poser dans une zone */
export function qOfTrace(q){q=q||{};const R=q.rows||[];return {rows:R.filter(r=>num(r.dn)&&(num(r.soud)||num(r.mlTr))).map(r=>({dn:num(r.dn),soud:num(r.soud),ml:num(r.mlTr)})),pv:{purges:pvOf(R,'purges'),vidanges:pvOf(R,'vidanges')},ext:extAdd(q.ext||{},{}),kits:num((q.tot||{}).kits)};}
/* les quantités de référence d'une affaire (a.quantites) → idem ; pv / ext / kits seulement si la référence vient d'un tracé */
export function qOfRef(qr){qr=qr||{};const o={rows:(qr.rows||[]).filter(r=>num(r.dn)&&(num(r.soud)||num(r.ml))).map(r=>Object.assign({dn:num(r.dn),soud:num(r.soud),ml:num(r.ml)},has(r.nAnt)?{nAnt:num(r.nAnt)}:{}))};
  if(qr.pv&&typeof qr.pv==='object')o.pv={purges:Object.assign({},qr.pv.purges||{}),vidanges:Object.assign({},qr.pv.vidanges||{})};if(qr.ext&&typeof qr.ext==='object')o.ext=extAdd(qr.ext,{});if(has(qr.kits))o.kits=num(qr.kits);return o;}
export const hasCounts=Q=>!!(Q&&(Q.pv||Q.ext));
/* DN d'un panier : le DN s'il existe dans le classeur, sinon le plus proche au-dessus, sinon le plus grand en dessous */
export function snapDn(base,pid,dn){const L=(base?panierDNs(base,pid):[]).slice().sort((a,b)=>a-b);dn=num(dn);if(!L.length||L.includes(dn))return dn;const up=L.find(d=>d>dn);return up!==undefined?up:L[L.length-1];}
/* le type de panier d'une extrémité (C1) */
export function typeFor(base,k){const S=base?sstTypes(base):[],RC=base?raccTypes(base):[];const rc=(id,re)=>(RC.find(t=>t.id===id)||RC.find(t=>re.test(t.id+' '+t.name.toLowerCase()))||{}).id||'';
  switch(k){case 'sousstation':return {arr:'sst',type:(S.find(t=>t.id==='sst_vannes_bs_pn25')||S[0]||{}).id||''};
    case 'bypass_regard':return {arr:'sst',type:'bypass_seul'};case 'fondbombe_regard':return {arr:'sst',type:'fonds_bombes'};
    case 'pec':return {arr:'racc',type:rc('racc_piquage_en_charge',/piquage|\bpec\b/)};case 'insertion':return {arr:'racc',type:rc('racc_insertion_de_tes',/insertion/)};
    case 'attente':case 'attente_chaufferie':return {arr:'racc',type:rc('racc_attente',/attente/)};
    case 'chaufferie':return {arr:'racc',type:(RC.find(t=>/chauff/i.test(t.id+' '+t.name))||{}).id||''};
    case 'bypass_extrusion':return {arr:'extrusion'};default:return null;}}
/* Ø de gaine (Ø PEHD de l'extrusion) d'un DN : table FO_Isolation de la base (isolation de la zone), ramené à une ligne du bloc EXTRUSION */
export function extrusionDn(base,dn,iso){const E=(base&&base.op&&base.op.extrusion)||null;if(!E||!(E.rows||[]).length)return null;const L=E.rows.map(r=>r.dnPehd).filter(Boolean).sort((a,b)=>a-b);
  const d=num(isoDiam(base,dn,iso||'Iso 1'));if(!d)return null;if(L.includes(d))return d;const up=L.find(x=>x>=d);return up!==undefined?up:L[L.length-1];}
const extrusionType=base=>{const T=((base&&base.op&&base.op.extrusion)||{}).types||[];return T.find(t=>/by-?pass/i.test(t))||'By-pass';};
/* PRÉREMPLIR UNE ZONE. z = zone complète (fullEtude), modifiée en place ; Q = qOfTrace / qOfRef ; opts.dn : remplacer la table des DN (soudures, ml ; « dont antennes »,
   cases et cadence retouchée gardées). Rend {notes, warn, info} pour le message et le bandeau de la zone. */
export function fillZone(z,Q,base,opts){opts=opts||{};const notes=[],warn=[];Q=Q||{rows:[]};const prevPv=((z.qtInfo||{}).pv)||{};const info={};
  if(opts.dn){const old=z.dn||[];z.dn=(Q.rows||[]).filter(r=>num(r.dn)&&(num(r.soud)||num(r.ml))).sort((a,b)=>a.dn-b.dn).map(r=>{const p=old.find(x=>num(x.dn)===num(r.dn))||{};const o={dn:num(r.dn),soud:num(r.soud),ml:num(r.ml)};
    if(p.antenne)o.antenne=true;if(p.feeder)o.feeder=true;const nA=has(r.nAnt)?r.nAnt:(has(p.nAnt)?p.nAnt:null);if(nA!==null)o.nAnt=Math.min(o.soud,num(nA));if(has(p.cad))o.cad=p.cad;return o;});
    notes.push(z.dn.length+' DN · '+nbf(z.dn.reduce((s,r)=>s+r.soud,0))+' soudures · '+nbf(z.dn.reduce((s,r)=>s+r.ml,0))+' ml');}
  if(Q.pv){info.pv={};[['purges','purge','purges','de purges'],['vidanges',(z.vidanges||{}).type==='aspiration'?'vid_asp':'vid_grav','vidanges','de vidanges']].forEach(([k,pid,lab,unit])=>{const D=Q.pv[k]||{};const L=dnList(D);const tot=L.reduce((s,d)=>s+num(D[d]),0);info.pv[k]=tot;
      const cur=Object.assign({},z[k]||{});if(!tot){if(num(cur.paires)&&num(cur.paires)===num(prevPv[k])){cur.paires=0;z[k]=cur;}return;} /* plus rien au tracé : on retire ce que le tracé avait mis, pas une saisie à la main */
      const main=L.slice().sort((a,b)=>num(D[b])-num(D[a])||b-a)[0];const dn=snapDn(base,pid,main);cur.dn=dn;cur.paires=tot;z[k]=cur;
      notes.push(tot+' paire'+(tot>1?'s ':' ')+unit+' DN '+dn);if(L.length>1)warn.push(lab+' à plusieurs DN ('+dnTxt(D)+') : comptées au DN '+dn+' (une zone n\'a qu\'un DN de '+(k==='purges'?'purge':'vidange')+')');
      if(dn!==main)warn.push(lab+' DN '+main+' : pas de panier à ce DN dans la base → DN '+dn);});}
  if(Q.ext){const E=Q.ext;const iso=(z.chantier||{}).iso||'Iso 1';const prev={sst:z.sst||[],racc:z.racc||[],extrusion:z.extrusion||[]};const gen={sst:[],racc:[],extrusion:[]};
    const keep=(arr,qk,dn,def)=>{const o=prev[arr].find(x=>x&&x.qk===qk&&num(x.qdn!==undefined?x.qdn:x.dn)===num(dn));return o&&o.type&&o.type!==def?o:null;}; /* type choisi à la main sur une ligne venue du tracé : gardé */
    Object.keys(E).forEach(k0=>{const k=endType(k0);const D=E[k0]||{};const T=typeFor(base,k);if(!T)return;
      dnList(D).forEach(dn=>{const n=num(D[dn]);if(T.arr==='extrusion'){const d=extrusionDn(base,dn,iso);if(!d){warn.push('by-pass extrusion DN '+dn+' × '+n+' : pas d\'extrusion (ou de Ø de gaine) dans la base — à chiffrer à la main');return;}
          const old=keep('extrusion',k,dn,extrusionType(base));gen.extrusion.push({dn:d,type:old?old.type:extrusionType(base),paires:n,qk:k,qdn:dn});return;}
        const old=keep(T.arr,k,dn,T.type);const o={dn,type:old?old.type:T.type,paires:n,qk:k};if(T.arr==='sst'&&old&&old.bypass)o.bypass=true;gen[T.arr].push(o);
        if(!o.type)warn.push(endLabel(k)+' DN '+dn+' × '+n+' : pas de panier de raccordement « chaufferie » dans la base — type à choisir dans la zone');});});
    ['sst','racc','extrusion'].forEach(arr=>{z[arr]=prev[arr].filter(x=>!(x&&x.qk)).concat(gen[arr]);});
    const nS=gen.sst.filter(x=>x.qk==='sousstation').reduce((s,x)=>s+x.paires,0),nR=gen.racc.reduce((s,x)=>s+x.paires,0),nB=gen.sst.filter(x=>x.qk!=='sousstation').reduce((s,x)=>s+x.paires,0),nX=gen.extrusion.reduce((s,x)=>s+x.paires,0);
    if(nS)notes.push(nS+' sous-station'+(nS>1?'s':''));if(nR)notes.push(nR+' raccordement'+(nR>1?'s':''));if(nB)notes.push(nB+' by-pass / fond'+(nB>1?'s':'')+' bombé'+(nB>1?'s':'')+' en regard');if(nX)notes.push(nX+' by-pass extrusion');
    const kit=E.kit||{};const nK=dnList(kit).reduce((s,d)=>s+num(kit[d]),0);if(nK||num(Q.kits))info.kits={bouts:nK,kits:num(Q.kits),dn:Object.assign({},kit)};
    const prov=E.provisoire||{};if(dnList(prov).length)info.provisoire=Object.assign({},prov);}
  if(Q.pv||Q.ext)z.qtInfo=Object.assign({},info,{at:new Date().toISOString()});
  return {notes,warn,info};}
/* RÉPARTIR des quantités globales sur N zones. keys = {mode:'pct', pct:[…]} | {mode:'ml', ml:[{dn:ml}, …]} ; opts.others = 'prorata' | 'z1'.
   Par DN : soudures (entières) et ml (au dixième) au plus fort reste — totaux conservés ; « dont antennes » idem (jamais plus que les soudures de la zone).
   Autres comptages (purges, vidanges, extrémités, kits) : au prorata de la part de chaque zone (plus fort reste), ou tous dans la zone 1. */
export function splitQ(Q,keys,opts){opts=opts||{};keys=keys||{mode:'pct',pct:[50,50]};const N=keys.mode==='ml'?(keys.ml||[]).length:(keys.pct||[]).length;if(!N)return [];
  const eq=Array.from({length:N},()=>1);const pct=keys.mode==='ml'?null:keys.pct.map(num);
  const wDn=dn=>{if(pct)return pct.some(x=>x>0)?pct:eq;const w=keys.ml.map(m=>num((m||{})[dn]));return w.some(x=>x>0)?w:eq;};
  const wAll=pct?(pct.some(x=>x>0)?pct:eq):(()=>{const w=keys.ml.map(m=>Object.values(m||{}).reduce((s,x)=>s+num(x),0));return w.some(x=>x>0)?w:eq;})();
  const out=Array.from({length:N},()=>({rows:[]}));
  (Q.rows||[]).forEach(r=>{const w=wDn(r.dn);const S=splitLR(r.soud,w),M=splitLR1(r.ml,w);const A=has(r.nAnt)?splitLR(r.nAnt,w):null;
    out.forEach((o,i)=>{if(!S[i]&&!M[i])return;const x={dn:r.dn,soud:S[i],ml:M[i]};if(A)x.nAnt=Math.min(S[i],A[i]);o.rows.push(x);});});
  const share=n=>opts.others==='z1'?out.map((o,i)=>i===0?num(n):0):splitLR(n,wAll);
  const splitD=D=>{const R=out.map(()=>({}));Object.keys(D||{}).forEach(dn=>{share(D[dn]).forEach((v,i)=>{if(v)R[i][dn]=v;});});return R;};
  if(Q.pv){const P=splitD(Q.pv.purges),V=splitD(Q.pv.vidanges);out.forEach((o,i)=>{o.pv={purges:P[i],vidanges:V[i]};});}
  if(Q.ext){const X=out.map(()=>({}));Object.keys(Q.ext).forEach(t=>{splitD(Q.ext[t]).forEach((D,i)=>{if(Object.keys(D).length)X[i][t]=D;});});out.forEach((o,i)=>{o.ext=X[i];});}
  if(has(Q.kits)){const K=share(Q.kits);out.forEach((o,i)=>{o.kits=K[i];});}
  return out;}
