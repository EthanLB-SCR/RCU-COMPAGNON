// hydro.js — onglet Hydraulique : sectorisation en tronçons, linéaires, volumes, extrémités (by-pass / kits fin de ligne)
// Module pur (aucune dépendance, aucun accès DOM) : testé en node (test/hydro_test.mjs).
// Entrées normalisées par l'appli :
//   lines : [{id,name,length,nCond,els:[{id,kind,dn,m0,m1,len}],parent,parentM,startKind,endKind,endWelds:[{weldId,status,cond}]}]
//   opts  : {prest:{epreuve,rincage,passivation,remplissage}, params:{vitesse,debit,skidW,skidL}, cuts:[{line,m}], fillAt:{line,m}|null}

export const DN_INT={20:.0217,25:.0285,32:.0372,40:.0431,50:.0545,65:.0703,80:.0825,100:.1071,125:.1325,150:.1603,200:.2101,250:.263,300:.3127,350:.3444,400:.3938}; // Ø intérieur (m) — tubes P235GH réseaux de chaleur
export const areaDN=dn=>{const d=DN_INT[dn]||Math.max(.01,(+dn||100)/1000*.95);return Math.PI*d*d/4;}; // section d'eau (m²)
export const needsFlow=p=>!!(p&&(p.rincage||p.passivation||p.remplissage)); // circulation requise → by-pass aux extrémités
export const anyPrest=p=>!!(p&&(p.epreuve||p.rincage||p.passivation||p.remplissage));
export const HYDRO_DEFAULTS={vitesse:1,debit:30,skidW:3,skidL:8}; // paramètres réglables (l'utilisateur peut les changer dans l'onglet)
export const PREST_LABEL={epreuve:'Épreuve hydraulique',rincage:'Rinçage dynamique',passivation:'Passivation',remplissage:'Remplissage définitif (eau adoucie)'};
const WELDED=s=>s==='soudee'||s==='controlee'||s==='manchonnee';

export function buildHydro(lines,{prest={},params={},cuts=[],fills=null,fillAt=null}={}){
  const FILLS=(fills&&fills.length?fills:(fillAt?[fillAt]:[])).filter(f=>f&&f.line); // plusieurs zones de remplissage (au moins une par tronçon en pratique)
  const P={...HYDRO_DEFAULTS,...(params||{})};const flow=needsFlow(prest);
  const byId={};lines.forEach(l=>byId[l.id]=l);
  // 1) coupes valides (sur une ligne existante, pas au ras d'un bout), détection vanne à ± son emprise
  const cl=[];(cuts||[]).forEach(c=>{const l=byId[c.line];if(!l)return;const m=Math.max(0,Math.min(l.length,+c.m||0));if(m<.5||m>l.length-.5)return;
    const el=(l.els||[]).find(e=>e.kind==='valve'&&m>=e.m0-.3&&m<=e.m1+.3);cl.push({line:c.line,m,idx:cl.length,valve:el?el.id:null});});
  const cutsBy={};cl.forEach(c=>{(cutsBy[c.line]=cutsBy[c.line]||[]).push(c);});Object.values(cutsBy).forEach(a=>a.sort((x,y)=>x.m-y.m));
  // 2) sous-segments par ligne
  const segs=[];const segOf={};
  lines.forEach(l=>{const cs=cutsBy[l.id]||[];const ms=[0,...cs.map(c=>c.m),l.length];const arr=[];
    for(let i=0;i<ms.length-1;i++){const s={line:l.id,m0:ms[i],m1:ms[i+1],cut0:i>0?cs[i-1]:null,cut1:i<cs.length?cs[i]:null,si:segs.length};segs.push(s);arr.push(s);}segOf[l.id]=arr;});
  const segAt=(lineId,m)=>{const arr=segOf[lineId]||[];const l=byId[lineId];return arr.find(s=>m>=s.m0-1e-6&&(m<s.m1||s.m1>=l.length-1e-6))||arr[arr.length-1]||null;};
  // 3) composantes connexes : l'antenne est reliée à son parent au chaînage parentM
  const uf=segs.map((_,i)=>i);const find=i=>{while(uf[i]!==i){uf[i]=uf[uf[i]];i=uf[i];}return i;};const uni=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)uf[rb]=ra;};
  lines.forEach(l=>{if(!l.parent||!byId[l.parent])return;const ps=segAt(l.parent,Math.max(0,Math.min(byId[l.parent].length,+l.parentM||0)));const s0=(segOf[l.id]||[])[0];if(ps&&s0)uni(ps.si,s0.si);});
  const fillSegs=FILLS.map(f=>byId[f.line]?{f,seg:segAt(f.line,+f.m||0)}:null).filter(x=>x&&x.seg);
  // 4) tronçons = composantes
  const comp={};segs.forEach(s=>{const r=find(s.si);(comp[r]=comp[r]||[]).push(s);});
  const lineOrder={};lines.forEach((l,i)=>lineOrder[l.id]=i);
  const troncons=Object.values(comp).map(ss=>{ss.sort((a,b)=>(lineOrder[a.line]-lineOrder[b.line])||(a.m0-b.m0));return ss;})
    .sort((A,B)=>(lineOrder[A[0].line]-lineOrder[B[0].line])||(A[0].m0-B[0].m0))
    .map((ss,ti)=>{
      let lenA=0,vol=0,dnMax=0;const dns={};const lineIds=[];
      ss.forEach(s=>{const l=byId[s.line];if(!lineIds.includes(s.line))lineIds.push(s.line);lenA+=s.m1-s.m0;
        (l.els||[]).forEach(e=>{const a=Math.max(s.m0,e.m0),b=Math.min(s.m1,e.m1);if(b-a<=1e-4||e.kind==='teeout'||e.kind==='endpoint')return;
          vol+=areaDN(e.dn)*(b-a)*(l.nCond||2);dns[e.dn]=(dns[e.dn]||0)+(b-a);if(+e.dn>dnMax)dnMax=+e.dn;});});
      // extrémités du tronçon : départs de racine, bouts de ligne, côtés de coupe
      const ends=[];
      ss.forEach(s=>{const l=byId[s.line];
        if(s.m0<=1e-6){if(!l.parent||!byId[l.parent]){const alr=l.startKind==='endpoint'?'racc':null;ends.push({line:s.line,m:0,type:'start',label:alr?'raccordement ('+(l.name||l.id)+')':'départ '+(l.name||l.id),already:alr,welded:null});}} // raccordement = piquage sur le réseau existant / la chaufferie — PAS une sous-station
        else ends.push({line:s.line,m:s.m0,type:'cut',cut:s.cut0.idx,label:s.cut0.valve?'vanne '+s.cut0.valve:'coupe '+(s.cut0.idx+1),valve:!!s.cut0.valve,already:null,welded:null});
        if(s.m1>=l.length-1e-6){const alr=l.endKind==='bypass'?'bp':l.endKind==='endpoint'?'sst':null; // sst = sous-station de bâtiment au bout de l'antenne (bouclée chez elle)
          const w=(l.endWelds||[]).filter(x=>WELDED(x.status));
          ends.push({line:s.line,m:l.length,type:'tip',label:alr==='sst'?'SST ('+(l.name||l.id)+')':'bout '+(l.name||l.id),already:alr,endcap:l.endKind==='endcap',welded:l.endKind==='endcap'&&w.length?w:null});}
        else ends.push({line:s.line,m:s.m1,type:'cut',cut:s.cut1.idx,label:s.cut1.valve?'vanne '+s.cut1.valve:'coupe '+(s.cut1.idx+1),valve:!!s.cut1.valve,already:null,welded:null});});
      const myFills=fillSegs.filter(x=>ss.includes(x.seg));const hasFill=myFills.length>0;
      ends.forEach(en=>{const l=byId[en.line];const single=(l.nCond||2)<2;
        if(myFills.some(x=>en.line===x.f.line&&Math.abs(en.m-(+x.f.m||0))<=12)){en.need='none';en.fill=true;return;} // le skid branché là boucle cette extrémité
        if(en.already==='bp'){en.need='none';return;} // un by-pass déjà posé au bout : bouclé
        // 'sst' : en sous-station aussi il faut poser le by-pass (on ne boucle pas à travers l'échangeur) — précision Ethan 20/08
        // 'racc' (raccordement au réseau existant) : PAS encore soudé pendant l'épreuve → extrémité ouverte, à boucher (épreuve) ou à boucler (circulation)
        if(en.type==='cut'&&en.valve){en.need='none';return;} // coupe sur vanne : elle reste fermée
        en.need=single?(flow?'EVAC':'KFL'):(flow?'BP':'KFL');});
      const debit=prest.rincage?areaDN(dnMax)*P.vitesse*3600:0; // rinçage ≥ vitesse dans le plus gros DN du tronçon
      const minutes=P.debit>0?vol/P.debit*60:0; // remplissage au débit de la borne
      const dnsArr=Object.entries(dns).map(([dn,ln])=>[+dn,ln]).sort((a,b)=>b[1]-a[1]);
      // pompe de rinçage : débit cible (v dans le plus gros DN) + HMT estimée — rinçage PAR PASSES (une branche à la fois),
      // la pompe voit la classe de DN la plus défavorable à la vitesse cible (Darcy, λ Blasius, eau froide), aller+retour, +20 % singularités, +3 m de garde
      let pump=null;if(prest.rincage&&debit>0){const v=P.vitesse;let dH=0;
        dnsArr.forEach(([dn,ln])=>{const D=DN_INT[dn]||Math.max(.01,dn/1000*.95);const Re=v*D/1e-6;const lam=Re>4000?0.316/Math.pow(Re,0.25):64/Math.max(Re,1);const hh=lam*(ln/D)*v*v/(2*9.81);if(hh>dH)dH=hh;});
        const hmt=Math.ceil(dH*2*1.2+3);pump={q:Math.ceil(debit),hmt,dp:+(hmt/10.2).toFixed(1)};}
      const needFill=anyPrest(prest)&&!hasFill; // toute prestation demande de l'eau : il faut une zone de remplissage par tronçon
      return {idx:ti,segs:ss.map(s=>({line:s.line,m0:s.m0,m1:s.m1})),lines:lineIds,lenA,vol,dns:dnsArr,dnMax,ends,hasFill,nFills:myFills.length,needFill,debit,minutes,pump};});
  // 5) alertes (bouchon déjà soudé là où il aurait fallu un by-pass) + totaux
  const alerts=[];troncons.forEach(t=>t.ends.forEach(en=>{if(en.need==='BP'&&en.welded)alerts.push({t:t.idx,line:en.line,welds:en.welded.map(w=>w.weldId),label:en.label});}));
  const count=k=>troncons.reduce((s,t)=>s+t.ends.filter(e=>e.need===k).length,0);
  return {flow,prest,params:P,cuts:cl,troncons,alerts,
    totals:{lenA:troncons.reduce((s,t)=>s+t.lenA,0),vol:troncons.reduce((s,t)=>s+t.vol,0),nBP:count('BP'),nKFL:count('KFL'),nEvac:count('EVAC'),nAlert:alerts.length,noFill:troncons.filter(t=>t.needFill).length}};
}
// opérations du calendrier prévisionnel (pastilles posées librement, répétables, dans l'ordre voulu)
export const CAL_OPS={brut:{label:'Remplissage eau brute',short:'Eau brute',color:'#7d94b8',ico:'💧'},epreuve:{label:'Épreuve hydraulique',short:'Épreuve',color:'#eb6834',ico:'🧪'},rincage:{label:'Rinçage dynamique',short:'Rinçage',color:'#1c6fd6',ico:'🌊'},vidange:{label:'Vidange eau brute',short:'Vidange',color:'#8f8d86',ico:'🕳'},adoucie:{label:'Remplissage eau adoucie',short:'Eau adoucie',color:'#0ca30c',ico:'🚰'},passivation:{label:'Passivation',short:'Passivation',color:'#8a2be2',ico:'⚗️'},autre:{label:'Autre opération',short:'Autre',color:'#b8860b',ico:'📌'}};
