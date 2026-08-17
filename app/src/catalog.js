// Catalogue → cotes des pièces. Seule source de dimensions du moteur (fournisseur / DN / série). Tout ce qui manque au catalogue est signalé (missing) et prend une valeur par défaut explicite.
import CATALOGUE from './catalogue.json';
import DB from './db.json';
const num=v=>{if(v===undefined||v===null)return null;if(Array.isArray(v))return num(v[0]);const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null;};
const OD={20:26.9,25:33.7,32:42.4,40:48.3,50:60.3,65:76.1,80:88.9,100:114.3,125:139.7,150:168.3,200:219.1,250:273,300:323.9,350:355.6,400:406.4,450:457,500:508,600:610};
const KEY={AXIOM:'axiom',RENALIA:'renalia',ZPU:'renalia',LOGSTOR:'logstor',INPAL:'inpal'};
export function catalogFor(supplier,serie){
  const sup=String(supplier||'AXIOM').toUpperCase();const key=KEY[sup]||'axiom';const C=CATALOGUE.suppliers[key]||CATALOGUE.suppliers.axiom;const S=+serie||1;const missing=[];
  const miss=(what,dflt)=>{if(!missing.includes(what))missing.push(what);return dflt;};
  const casingTable=DB.casing[sup==='RENALIA'?'ZPU':sup]||DB.casing.AXIOM;
  const casing=dn=>{const t=casingTable[String(dn)];if(t){const v=Array.isArray(t)?(t[S-1]||t[0]):t;if(v)return v/1000;}const p=C.pipes&&C.pipes[String(dn)];if(p){const v=p.casing_s1||(p.casings&&p.casings[S-1])||(p.casing_series&&p.casing_series[String(S)]);if(v)return v/1000;}return miss('gaine DN'+dn,0.2);};
  const od=dn=>{const p=C.pipes&&C.pipes[String(dn)];return ((p&&num(p.dext))||OD[dn]||100)/1000;};
  const barLengths=dn=>{const p=C.pipes&&C.pipes[String(dn)];if(p&&p.lengths&&p.lengths.length)return p.lengths.slice().sort((a,b)=>a-b);return miss('longueurs de barre DN'+dn,[6,12]);};
  const bareEnds=dn=>{const p=C.pipes&&C.pipes[String(dn)];if(p&&p.bare_ends_mm)return p.bare_ends_mm/1000;return miss('bouts nus',0.15);};
  const bend=dn=>{const b0=C.bends&&C.bends[String(dn)];const b=Array.isArray(b0)?b0[0]:b0;if(!b)return miss('coude DN'+dn,{legs:[1,1],legsLong:null,R:3*od(dn),anyAngle:true,std:[90,45],ref:'coude '+dn});
    const legs=b.legs_mm?b.legs_mm.map(v=>v/1000):b.legs_90_m?b.legs_90_m.slice():[1,1];const legsLong=b.legs_long_mm?b.legs_long_mm.map(v=>v/1000):null;
    const R=b.radius_mm?b.radius_mm/1000:(/2,5|2\.5/.test(b.angles||'')?2.5:3)*od(dn);const anyAngle=/XX|tout angle|autres|sur demande|0[–-]90/i.test(b.angles||'')||key==='axiom'||key==='renalia';const std=[90,45].concat(/15/.test(b.angles||'')?[15,30,60,75]:[]);
    return {legs,legsLong,R,anyAngle,std,ref:b.ref||('coude '+dn),legs45:b.legs_45_mm?b.legs_45_mm.map(v=>v/1000):null};};
  const teeTypes=()=>Object.keys(C.tees||{}).filter(k=>Object.keys(C.tees[k]).some(x=>x!=='note'));
  const tee=(dn,dnb,type)=>{const T=C.tees||{};const types=teeTypes();const t=type&&T[type]?type:(types.find(k=>/droit|TP/i.test(k))||types[0]);const tab=t?T[t]:null;if(!tab)return miss('té DN'+dn,{L:1,B:1,H:0,ref:'té '+dn+'/'+dnb,type:t||'té'});
    const keys=[dn+'/'+dnb,String(dn),dn+'/'+dn];let e=null,exact=true;for(const k of keys){if(tab[k]){e=tab[k];break;}}if(!e){exact=false;const cand=Object.keys(tab).filter(k=>k.startsWith(dn+'/')).map(k=>[k,+k.split('/')[1]]).sort((a,b)=>Math.abs(a[1]-dnb)-Math.abs(b[1]-dnb));if(cand.length)e=tab[cand[0][0]];}
    if(!e)return miss('té DN'+dn+'/'+dnb+' ('+t+')',{L:1,B:1,H:0,ref:'té '+dn+'/'+dnb,type:t});const o=Array.isArray(e)?e[0]:e;
    // même DN principal, autre DN de branche : les cotes L/B sont celles de la ligne du catalogue, la référence est réécrite avec le vrai DN de branche (le catalogue transcrit ne liste qu'une branche par DN)
    let ref=o.ref||('té '+dn+'/'+dnb);if(!exact&&/\/\d+\s*$/.test(ref))ref=ref.replace(/\/\d+\s*$/,'/'+dnb);else if(!exact&&/-\s*\d+\s*$/.test(ref))ref=ref+'/'+dnb;
    return {L:(o.L_mm?o.L_mm/1000:o.L_m||1),B:(o.B_mm?o.B_mm/1000:o.B_m||o.l_m||1),H:(o.H_mm?o.H_mm/1000:o.H_m||0),ref,type:t,exact};};
  const reducer=(dn1,dn2)=>{const R=C.reducers||{};const hi=Math.max(dn1,dn2),lo=Math.min(dn1,dn2);const e=R[hi+'/'+lo]||R[dn1+'/'+dn2];if(e)return {L:e.L_mm?e.L_mm/1000:e.L_m||1,ref:e.ref||('réduction '+hi+'/'+lo)};if(R.all)return {L:R.all.L_m||1,ref:'réduction '+hi+'/'+lo};return miss('réduction '+hi+'/'+lo,{L:1,ref:'réduction '+hi+'/'+lo});};
  const valve=dn=>{const V=C.valves||{};const e0=V[String(dn)];const e=Array.isArray(e0)?e0[0]:e0;if(!e)return miss('vanne DN'+dn,{L:1.5,H:0.4,ref:'vanne '+dn});return {L:e.L_mm?e.L_mm/1000:e.L_m||1.5,H:e.H_mm?e.H_mm/1000:0,ref:e.ref||('vanne '+dn)};};
  const jointTypes=()=>Object.keys(C.joints||{});
  const joint=(dn,type)=>{const J=C.joints||{};const t=type&&J[type]?type:jointTypes()[0];const e=t&&J[t]?J[t][String(dn)]:null;if(!e)return miss('manchon DN'+dn,{L:0.6,ref:'manchon '+dn,type:t||'manchon'});return {L:e.L_mm?e.L_mm/1000:0.6,d:e.sleeve_d?e.sleeve_d/1000:null,ref:e.ref||('manchon '+dn),type:t};};
  const endcap=dn=>({L:0.3,ref:'bouchon '+dn});
  const dns=()=>Object.keys(C.pipes||{}).map(Number).filter(n=>n>=20&&n<=600).sort((a,b)=>a-b);
  return {key,name:C.name,source:C.source,serie:S,notes:C.notes||[],dns,casing,od,barLengths,bareEnds,bend,tee,teeTypes,reducer,valve,joint,jointTypes,endcap,missing};
}
