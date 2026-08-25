// Stockage pré-isolé — module pur (sans DOM) : lecture des BL fournisseurs (texte extrait du PDF),
// référentiel des lignes de stock (genre + DN), agrégats par zone et global.
// Formats reconnus sur les BL RÉELS d'Ethan (20/08/2026) : AXIOM TUBES (codes [R-200/315-12]),
// Renalia (refs C90-60/14, TS-139/25, DHEC-140), LOGSTOR/Kingspan (sections + « 168 / 250 mm 12 m »).
// La ZPU arrive en packing list SCANNÉE (pas de texte) → l'appli le dit et bascule sur la saisie catalogue.

const OD2DN=[[26.9,20],[33.7,25],[42.4,32],[48.3,40],[60.3,50],[76.1,65],[88.9,80],[114.3,100],[139.7,125],[168.3,150],[219.1,200],[273,250],[323.9,300],[355.6,350],[406.4,400],[457,450],[508,500]];
export function dnOfOd(od){od=+od;if(!isFinite(od))return null;let best=null,d=1e9;OD2DN.forEach(([o,dn])=>{const e=Math.abs(o-od);if(e<d){d=e;best=dn;}});return d<=Math.max(6,od*0.04)?best:null;}

// « pu » = la mousse comptée en UN seul produit A+B (demande Ethan 25/08 : A et B vont toujours ensemble, 1 dose par manchon).
// puA / puB / puKit restent lus (anciennes données, BL fournisseurs) mais retombent tous sur la même case de stock.
export const K_LABEL={pipe:'Barre',bend:'Coude',tee:'Té',reducer:'Réduction',sleeve:'Manchon',sleeveEnd:'Manchon fin de ligne',dhec:'Joint d\'extrémité (DHEC)',wall:'Passage de mur',kit:'Kit fin de ligne',pu:'Mousse PU (A+B)',puA:'Mousse PU (A+B)',puB:'Mousse PU (A+B)',puKit:'Mousse PU (A+B)',acc:'Accessoire'};
export const isPU=k=>k==='pu'||k==='puA'||k==='puB'||k==='puKit';
// libellé court d'une ligne de stock (uniforme quel que soit le fournisseur)
export function stockLabel(l){
  if(l.kind==='pipe')return `Barre ${l.len||12} m DN${l.dn}`;
  if(l.kind==='bend')return `Coude ${l.angle||90}° DN${l.dn}`;
  if(l.kind==='tee')return `Té ${l.dn}${l.dn2?'/'+l.dn2:''}`;
  if(l.kind==='reducer')return `Réduction ${l.dn}${l.dn2?'/'+l.dn2:''}`;
  if(l.kind==='sleeve')return l.dn?`Manchon DN${l.dn}${l.gaine?' · Ø'+l.gaine:''}`:`Manchon gaine Ø${l.gaine}`;
  if(l.kind==='sleeveEnd')return l.dn?`Manchon fin de ligne DN${l.dn}${l.gaine?' · Ø'+l.gaine:''}`:`Manchon FDL gaine Ø${l.gaine}`;
  if(l.kind==='dhec')return `DHEC Ø ${l.gaine||l.dn}`;
  if(l.kind==='wall')return `Passage de mur Ø ${l.gaine||l.dn}`;
  if(l.kind==='kit')return `Kit fin de ligne DN${l.dn}`;
  if(isPU(l.kind))return 'Mousse PU (A+B)'+(l.dn?' DN'+l.dn:'');
  return l.label||'Divers';
}
// clé d'agrégation : même genre + même DN (ou gaine) = même case de stock
export function stockKey(l){return [l.kind,l.dn||'',l.dn2||'',l.gaine||'',l.kind==='pipe'?(l.len||12):'',l.kind==='bend'?(l.angle||90):''].join(':');}

const num=s=>{const v=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isFinite(v)?v:null;};

// ---------- lecture d'un BL (texte ligne par ligne) ----------
export function parseBL(text){
  const raw=(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!raw.length)return {fmt:null,lines:[],others:[],empty:true};
  const out=[];const others=[];let fmt=null;
  const push=(o,r)=>{o.raw=r;o.qty=o.qty==null?1:o.qty;o.label=o.label||stockLabel(o);out.push(o);};

  // --- AXIOM TUBES : [R-200/315-12] … 16 Unités ---
  const AX=/\[([A-Z]{1,3})-([0-9/]+?)(?:-(\d+))?\]\s*(.*?)(?:\s+(\d+(?:[.,]\d+)?)\s*Unit)/i;
  raw.forEach(r=>{const m=r.match(AX);if(!m)return;fmt='axiom';
    const [,code,nums,suf,desc,q]=m;const parts=nums.split('/').map(Number);const qty=num(q);
    if(code==='R')push({kind:'pipe',dn:parts[0],gaine:parts[1],len:+suf||12,qty},r);
    else if(code==='K'){const a=r.match(/Coude\s*(\d+)/i);push({kind:'bend',dn:parts[0],angle:a?+a[1]:(+String(nums).split('/')[1]||90),qty},r);}
    else if(code==='TW'||code==='T')push({kind:'tee',dn:parts[0],dn2:parts[1],qty},r);
    else if(code==='NT')push({kind:'sleeve',dn:parts[0],gaine:parts[1],qty},r);
    else if(code==='NK')push({kind:'sleeveEnd',dn:parts[0],gaine:parts[1],qty},r);
    else if(code==='P')push({kind:'wall',gaine:parts[0],qty},r);
    else if(code==='E')push({kind:'dhec',gaine:parts[0],qty},r);
    else if(code==='Z')push({kind:'reducer',dn:parts[0],dn2:parts[1],qty},r);
    else push({kind:'acc',label:desc||code,qty},r);});
  if(fmt)return {fmt,lines:out,others};

  // --- Renalia : C90-60/14  COUDE 90° 60/140 1X1 M+  Pièce  4,00  4,00 ---
  const RN=/^([A-Z]{1,5}\d*[-/][0-9/]+)\s+(.+?)\s+Pi[èe]ce\s+([\d\s,.]+?)(?:\s+([\d\s,.]+))?$/;
  raw.forEach(r=>{const m=r.match(RN);if(!m)return;fmt='renalia';
    const [,ref,desc,q1,q2]=m;const qty=num(q2)!=null?num(q2):num(q1);
    let mm;
    if((mm=desc.match(/COUDE\s*(\d+)\s*°?\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i)))push({kind:'bend',angle:+mm[1],dn:dnOfOd(mm[2]),gaine:+mm[3],qty},r);
    else if((mm=desc.match(/TE\s*A\s*SAUT\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i)))push({kind:'tee',dn:dnOfOd(mm[1]),gaine:+mm[2],dn2:dnOfOd(mm[3]),qty},r);
    else if((mm=desc.match(/DHEC\s*Ø?\s*(\d+)/i)))push({kind:'dhec',gaine:+mm[1],qty},r);
    else if((mm=desc.match(/MANCHON.*?(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i)))push({kind:'sleeve',dn:dnOfOd(mm[1]),gaine:+mm[2],qty},r);
    else if((mm=desc.match(/(?:TUBE|CONDUITE|BARRE).*?(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i)))push({kind:'pipe',dn:dnOfOd(mm[1]),gaine:+mm[2],len:12,qty},r);
    else if((mm=desc.match(/REDUCTION.*?(\d+(?:[.,]\d+)?)\s*\/\s*(\d+).*?(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i)))push({kind:'reducer',dn:dnOfOd(mm[1]),dn2:dnOfOd(mm[3]),qty},r);
    else push({kind:'acc',label:desc,qty},r);});
  if(fmt)return {fmt,lines:out,others};

  // --- LOGSTOR / Kingspan : sections + « 168 / 250 mm 12 m … 20000168112641 … 6 6 » ---
  let sec='';let sawL=false;
  raw.forEach(r=>{
    const s=r.replace(/^\d{1,6}\s+/,'');
    if(/^(Tube|Coude|SX-WPJoint|Accessoires|T[ée]|R[ée]duction)\b/i.test(r)&&!/\d{8}/.test(r)){sec=r.split(/\s/)[0].toLowerCase();return;}
    if(/^Pallet|^Std-pallet|^Wooden|^Pochette/i.test(r)||/^Pallet/i.test(s)){return;} // emballage / consommable mousse : ignoré du stock pièces
    const art=r.match(/\b(\d{10,14})\b/);if(!art)return;sawL=true;
    const qs=r.match(/(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/);const qty=qs?num(qs[2]):null;const q1=qs?num(qs[1]):null;
    let mm;
    if((mm=s.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)\s*mm\s+(\d+)\s*m\b/)))push({kind:'pipe',dn:dnOfOd(mm[1]),gaine:+mm[2],len:+mm[3],qty:qty??q1},r);
    else if((mm=s.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)\s*mm\s+(\d+)\s*DEG/i)))push({kind:'bend',dn:dnOfOd(mm[1]),gaine:+mm[2],angle:+mm[3],qty:qty??q1},r);
    else if(sec==='sx-wpjoint'&&(mm=s.match(/^(\d+)\s*mm\s+(\d+)\s*mm/)))push({kind:'sleeve',gaine:+mm[1],qty:qty??q1},r);
    else if(sec==='sx-wpjoint'||sec==='accessoires')push({kind:'acc',label:s.replace(/\s+\d{10,14}.*/,''),qty:qty??q1},r);
    else others.push(r);});
  if(sawL)return {fmt:'logstor',lines:out,others};

  return {fmt:null,lines:[],others:raw.slice(0,40)};
}

// ---------- agrégats ----------
// stock = {zones:[{id,name,...}],lots:[{id,zone,key,label,kind,dn,dn2,gaine,len,angle,qty}],takes:[{zone,key,qty,...}]}
export function zoneAgg(stock,zoneId){const m=new Map();
  (stock.lots||[]).filter(l=>l.zone===zoneId).forEach(l=>{const cur=m.get(l.key)||{key:l.key,label:l.label,kind:l.kind,dn:l.dn,dn2:l.dn2,gaine:l.gaine,len:l.len,angle:l.angle,qty:0,pend:0,taken:0};
    if(l.pend)cur.pend+=l.qty;else cur.qty+=l.qty;m.set(l.key,cur);}); // pend = camion PRÉVU : attendu, pas encore en stock (validation au pointage)
  (stock.takes||[]).filter(t=>t.zone===zoneId).forEach(t=>{ // le prélèvement porte la clé de RAPPROCHEMENT (matchKey) : on impute au lot correspondant
    let cur=m.get(t.key)||[...m.values()].find(v=>matchKey(v)===t.key||(t.key.startsWith('sleeve:')&&(v.kind==='sleeve'||v.kind==='sleeveEnd')&&matchKey(v).startsWith('sleeve:')&&(matchKey(v)===t.key||!v.dn))||(/^pu(:|$)/.test(t.key)&&isPU(v.kind)&&(matchKey(v)==='pu:'||t.key==='pu')));
    if(cur)cur.taken+=t.qty||1;else m.set('take:'+t.key,{key:t.key,label:t.label||t.key,qty:0,taken:t.qty||1});});
  m.forEach(v=>{v.reste=v.qty-v.taken;});return [...m.values()];}
export function globalAgg(stock){const m=new Map();
  (stock.zones||[]).forEach(z=>zoneAgg(stock,z.id).forEach(a=>{const cur=m.get(a.key)||{...a,qty:0,pend:0,taken:0,reste:0};cur.qty+=a.qty;cur.pend+=a.pend||0;cur.taken+=a.taken;cur.reste+=a.reste;m.set(a.key,cur);}));
  return [...m.values()];}
// statut RÉEL d'une zone : du stock validé → ok (verte) ; seulement des lots attendus → prévue (hachurée) ; sinon son statut posé
export function zoneStatusOf(stock,z){const lots=(stock.lots||[]).filter(l=>l.zone===z.id);if(lots.some(l=>!l.pend))return 'ok';if(lots.some(l=>l.pend))return 'prevu';return z.status||'ok';}
// stock restant global sous forme {key:reste} — pour la projection « posable avec le stock » et le choix de zone à la soudure
export function remainMap(stock){const m={};globalAgg(stock).forEach(a=>{m[a.key]=a.reste;});return m;}
// clé de RAPPROCHEMENT réseau ↔ stock (sans la gaine : le réseau raisonne en DN, certains BL manchons en gaine)
export function matchKey(o){const std=a=>{a=Math.abs(+a||90);return [15,30,45,60,75,90].reduce((p,c)=>Math.abs(c-a)<Math.abs(p-a)?c:p,90);};
  if(o.kind==='pipe')return 'pipe:'+o.dn;
  if(o.kind==='bend')return 'bend:'+o.dn+':'+std(o.angle);
  if(o.kind==='tee')return 'tee:'+o.dn+':'+(o.dn2||'');
  if(o.kind==='reducer')return 'reducer:'+o.dn+':'+(o.dn2||'');
  if(o.kind==='sleeve'||o.kind==='sleeveEnd')return 'sleeve:'+(o.dn||'g'+(o.gaine||''));
  if(isPU(o.kind))return 'pu:'+(o.dn||''); // A, B et pochettes = une case par DN (retour Ethan : les mousses sont par DN) ; 'pu:' = ancien ajout sans DN
  return o.kind+':'+(o.dn||o.gaine||'');}
export function remainByMatch(stock){const m={};globalAgg(stock).forEach(a=>{const k=matchKey(a);m[k]=(m[k]||0)+(a.reste||0);});return m;}
