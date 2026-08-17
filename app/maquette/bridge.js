// Passerelle traceur → TRACÉ : le réseau tracé (deux conduites par ligne, pièces catalogue, soudures) devient un chantier au format « sites » de l'appli.
// Les numéros de soudure sont stables d'un enregistrement à l'autre (appariement ligne / conduite / PK avec la version précédente) pour que les statuts et photos survivent aux retouches.
const KIND={tube:'pipe',bend:'bend',tee:'tee',valve:'valve',reducer:'reducer',endcap:'endcap',endpoint:'endpoint',bypassEnd:'bypass',teeBranch:'teeout'};
const KLABEL={pipe:'barre',bend:'coude',tee:'té',valve:'vanne',reducer:'réduction',endcap:'fin de ligne',endpoint:'raccordement',bypass:'by-pass',teeout:'sortie de té'};
const r3=v=>+(+v||0).toFixed(3);
export function siteFromTraceur({id,name,supplier,serie,lines,built,rules,bg,prev,barDefault}){
  // numéros de soudure : on reprend ceux de la version précédente quand une soudure est retrouvée (même ligne, même conduite, PK à ± 0,35 m), sinon un numéro neuf
  const used=new Set();let next=1;const prevW=(prev&&prev.welds)||[];prevW.forEach(w=>{const n=+String(w.weldId||'').replace(/\D/g,'');if(n>=next)next=n+1;});
  const lost=[];const idFor=(line,cond,m)=>{const cand=prevW.filter(w=>w.line===line&&w.cond===cond&&!used.has(w.weldId)&&Math.abs(w.m-m)<0.35).sort((a,b)=>Math.abs(a.m-m)-Math.abs(b.m-m))[0];if(cand){used.add(cand.weldId);return cand.weldId;}let s;do{s='S-'+String(next++).padStart(4,'0');}while(used.has(s));used.add(s);return s;};
  const outLines=[];lines.forEach(l=>{const B=built[l.id];if(!B||!B.A||!B.R)return;const cond={};
    ['A','R'].forEach(c=>{const cd=B[c];const els=cd.pieces.map(p=>{const kind=KIND[p.kind]||p.kind;const axis=p.path.map(q=>[r3(q[0]),r3(q[1])]);return {id:p.id,kind,kindLabel:KLABEL[kind]||kind,dn:p.dn,dn2:p.dn2,casing:Math.round((p.casing||0.2)*1000),len:r3(p.L),m0:r3(p.m0),m1:r3(p.m1),angle:p.angle,plane:p.plane,axis:[axis],from:axis[0],to:axis[axis.length-1],cut:!!p.cut,std:!!p.std,manchette:!!p.manchette,ref:p.ref,sub:p.sub,vert:p.vert,dnb:p.dnb,teeType:p.teeType,saut:!!p.saut,under:!!p.under,photo:p.photo||undefined,branch:p.branch?p.branch.map(q=>[r3(q[0]),r3(q[1])]):undefined,err:p.err||undefined,resid:p.resid,fcWhere:p.fcWhere,legIn:p.legIn,legOut:p.legOut};});
      const welds=[];cd.welds.forEach(w=>{let idx=w.i;if(w.bypass){const U=cd.pieces.findIndex(p=>p.kind==='bypassEnd');if(U<0)return;const ap=cd.pieces[U].apex||[w.x,w.y];els.splice(U+1,0,{id:'U-liaison',kind:'bypass',kindLabel:'jonction du by-pass (aller ↔ retour)',dn:w.dn,casing:els[U].casing,len:0,m0:els[U].m1,m1:els[U].m1,axis:[[[r3(ap[0]),r3(ap[1])],[r3(ap[0]),r3(ap[1])]]],from:[r3(ap[0]),r3(ap[1])],to:[r3(ap[0]),r3(ap[1])],link:true});idx=U;}
        welds.push({idx,weldId:idFor(l.id,c,w.m),m:r3(w.m),x:r3(w.x),y:r3(w.y),dev:+(w.dev||0).toFixed(2),fc:!!w.fc,dn:w.dn,teeOut:!!w.teeOut,bypass:!!w.bypass,between:w.between});});
      cond[c]={els,welds,length:r3(cd.length),notes:cd.notes.map(n=>({kind:n.kind,txt:n.txt,m:r3(n.m||0)}))};});
    outLines.push({id:l.id,name:l.name,parent:l.parent?l.parent.line:null,parentM:l.parent?r3(l.parent.m):null,dn:l.dn,bar:l.bar||barDefault,inv:!!l.inv,traceur:true,cond,axis:l.pts.map(q=>[r3(q[0]),r3(q[1])]),e:r3(B.e),endType:l.endType||'kit',startType:l.parent?null:(l.startType||'sousstation')});});
  prevW.forEach(w=>{if(!used.has(w.weldId)&&w.status&&w.status!=='a_souder')lost.push(w);});
  // emprise : fond de plan s'il y en a un, sinon les lignes + marge
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;outLines.forEach(L=>L.axis.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}));if(bg&&bg.bbox){x0=Math.min(x0,bg.bbox[0]);y0=Math.min(y0,bg.bbox[1]);x1=Math.max(x1,bg.bbox[2]);y1=Math.max(y1,bg.bbox[3]);}if(x0>x1){x0=0;y0=0;x1=100;y1=100;}
  const nW=outLines.reduce((s,L)=>s+L.cond.A.welds.length+L.cond.R.welds.length,0);const totL=outLines.reduce((s,L)=>s+L.cond.A.length,0);
  const site={id,name,supplier,serie,source:'traceur',method:'Réseau tracé à la main dans le traceur (sommets → pièces catalogue selon les règles)',crs:bg&&bg.name?('repère du plan '+bg.name):'repère libre (m)',
    sheetType:bg&&bg.drawing?'vector':'plain',drawing:bg&&bg.drawing?bg.drawing:null,image:bg&&bg.image&&bg.image.src?{src:bg.image.src,x:r3(bg.image.x),y:r3(bg.image.y),w:r3(bg.image.w),h:r3(bg.image.h),pw:bg.image.pw,ph:bg.image.ph,opacity:bg.opacity===undefined?.5:bg.opacity,name:bg.name||''}:null,w:Math.ceil(x1+20),h:Math.ceil(y1+20),bbox:[x0,y0,x1,y1],
    lines:outLines,warnings:[],report:{source:'traceur',lines:outLines.length,welds:nW,length:r3(totL),lost:lost.map(w=>w.weldId)},
    traceur:{v:1,lines:JSON.parse(JSON.stringify(lines)),rules,bgName:bg?bg.name:null,bgOpacity:bg?bg.opacity:undefined,bgOrigin:bg&&bg.origin?bg.origin:null,bgLayers:bg&&bg.netLayers?bg.netLayers:null,savedAt:new Date().toISOString()},created:new Date().toISOString()};
  return {site,lost,nW};
}
// soudures d'un chantier existant (pour l'appariement) : [{line,cond,m,weldId,status}]
export function weldsOfSite(site,remoteWelds){const st={};(remoteWelds||[]).forEach(r=>{st[r.weld_id]=r.status;});const out=[];(site.lines||[]).forEach(L=>{if(!L.cond)return;['A','R'].forEach(c=>{const cd=L.cond[c];if(!cd)return;(cd.welds||[]).forEach(w=>out.push({line:L.id,cond:c,m:w.m,weldId:w.weldId,status:st[w.weldId]||'a_souder'}));});});return out;}
