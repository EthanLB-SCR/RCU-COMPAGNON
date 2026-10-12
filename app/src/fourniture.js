// fourniture.js — FOURNITURE ET POSE (13/10/2026, Ethan : « un onglet pure fourniture, qui nous servira si on a de la fourniture et pose ; voir ce qui fera doublon
// avec l'onglet Stock ; le suivi du livré, du restant, s'il y a des modifs, les pièces qu'il faut en plus ; les pièces du tracé initial ; importer la commande de tubes
// (toutes les pièces) → comparatif permanent avec le tracé et les modifs, les pièces en plus, le reste à livrer ; entourer une zone du plan (une partie qu'on veut souder)
// → la liste de tout ce qu'il faut prévoir en livraison ou en commande ; un plan avec le planning des tronçons entourés, quels camions ça crée et à quelle date »).
//
// PARTAGE DES RÔLES (pas de double saisie) :
//   · STOCK = le PHYSIQUE : camions reçus, pointage, zones de déchargement, prélèvements à la soudure — inchangé.
//   · FOURNITURE = le SUIVI DE COMMANDE : besoin (tracé initial → actuel → pièces en plus), commandé (commande importée), livré / attendu (lus dans Stock),
//     reste à livrer, à commander ; zones à livrer (entourées sur le plan ou reprises du phasage) → camions datés. Un camion « annoncé » devient une livraison
//     PRÉVUE de Stock (même registre) : sa réception se pointe dans Stock (« 📦 Camion arrivé ») et remonte toute seule ici en « livré ».
// Données : NET.fourniture = {init:{need,lab,src,at,by}, cmds:[{id,name,ref,date,file,lines:[{key,kind,dn,dn2,angle,len,qty,label,raw}],at,by,upd,deleted}],
//   extra:[{id,key,kind,dn,dn2,angle,qty,label,why,at,by,upd,deleted}], zones:[{id,name,poly:[[x,y]…]|ph:<phase>,date,color,at,by,upd,deleted}], cfg:{délai, camion}}
//   — partie « fourniture » du chantier (site_set_part v7 : chef / bureau, fusion par id des commandes / pièces en plus / zones ; suppression douce).
import {matchKey,stockLabel,stockKey,parseBL,dnOfOd,isPU,zoneAgg} from './stock.js';
import {xlsxRows,pasteRows} from './commerce.js';
let A=null;
export function initFourniture(api){A=api;}

/* ---------- données ---------- */
export const FZ_CFG={delai:2,len:13.6,larg:2.4,haut:2.5,cu:24000};
const live=a=>(Array.isArray(a)?a:[]).filter(x=>x&&!x.deleted);
const nid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const nowIso=()=>new Date().toISOString();
const who=()=>(A.userName&&A.userName())||'';
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>isoD(new Date());
const dFR=d=>d?String(d).slice(8,10)+'/'+String(d).slice(5,7)+'/'+String(d).slice(0,4):'—';
const dCourt=d=>d?['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'][new Date(d+'T12:00:00').getDay()]+' '+String(d).slice(8,10)+'/'+String(d).slice(5,7):'à dater';
const q=n=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
export function fournOf(){const N=A&&A.net();if(!N||N.id==='__vide')return null;if(!N.fourniture||typeof N.fourniture!=='object')N.fourniture={v:1,cmds:[],extra:[],zones:[],cfg:{}};const F=N.fourniture;
  ['cmds','extra','zones'].forEach(k=>{if(!Array.isArray(F[k]))F[k]=[];});F.cfg=Object.assign({},FZ_CFG,F.cfg&&typeof F.cfg==='object'?F.cfg:{});return F;}
function save(){A.saveNet('fourniture');}
export const fzCanEdit=()=>!!(A&&(A.can('stock.edit')||A.can('phasage.edit')));
const esc=s=>A.esc(s);
const ZCOL=['#eb6834','#2f6fb3','#3aa655','#8e44ad','#c0392b','#d4a017','#16a085','#7f8c8d'];

/* ---------- pièces : clé de rapprochement (celle du Stock) et libellé ---------- */
const DNS=[20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500];
const DNSET=new Set(DNS);
const KORD={pipe:0,bend:1,steelbend:2,tee:3,reducer:4,valve:5,bypass:6,kit:7,sleeve:8,sleeveEnd:8,pu:9,dhec:10,wall:11,acc:20};
const slug=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0,60);
export const fKey=o=>o.kind==='acc'?'acc:'+slug(o.label||o.raw||''):matchKey(o);
const fKeyLot=l=>l.kind==='acc'?'acc:'+slug(l.label||''):matchKey(l);
export function fLabel(o){if(!o)return '';const k=o.kind;
  if(k==='pipe')return 'Barre DN'+(o.dn||'?');
  if(k==='valve')return 'Vanne DN'+(o.dn||'?');if(k==='bypass')return 'By-pass DN'+(o.dn||'?');if(k==='steelbend')return 'Courbe acier DN'+(o.dn||'?');
  if(k==='sleeve'||k==='sleeveEnd')return o.dn?'Manchon DN'+o.dn:'Manchon gaine Ø'+(o.gaine||'?');
  if(isPU(k))return 'Mousse PU (A+B)'+(o.dn?' DN'+o.dn:'');
  if(k==='acc')return o.label||'Accessoire';
  return stockLabel(o);}
function keyObj(k){const p=String(k).split(':');const kind=p[0];const o={kind,dn:+p[1]||undefined};if(kind==='bend')o.angle=+p[2]||90;if(kind==='tee'||kind==='reducer')o.dn2=+p[2]||undefined;if(kind==='sleeve'&&String(p[1]||'').startsWith('g')){o.dn=undefined;o.gaine=+String(p[1]).slice(1)||undefined;}return o;}
const keyLabel=(k,lab)=>String(k).startsWith('acc:')?(lab||k.slice(4)):fLabel(keyObj(k));
const rowSort=(a,b)=>{const A1=keyObj(a.k),B1=keyObj(b.k);return ((KORD[A1.kind]??15)-(KORD[B1.kind]??15))||((A1.dn||0)-(B1.dn||0))||((A1.dn2||A1.angle||0)-(B1.dn2||B1.angle||0))||String(a.label).localeCompare(String(b.label));};
// pièce à fournir pour un élément du calepinage (même règle que le Stock : une barre par élément « tube » hors manchettes, + vannes, by-pass, kits fin de ligne, courbes acier)
function pieceOfEl(l,e){if(!e)return null;const dn=+e.dn||+l.dn||0;const k=e.kind;
  if(k==='pipe')return e.manchette||e.nue?null:{kind:'pipe',dn,len:12};
  if(k==='bend')return {kind:'bend',dn,angle:Math.abs(+e.angle||90)};
  if(k==='steelbend')return {kind:'steelbend',dn,angle:Math.abs(+e.angle||90)};
  if(k==='tee')return {kind:'tee',dn,dn2:+e.dnb||undefined};
  if(k==='reducer')return {kind:'reducer',dn,dn2:+e.dn2||undefined};
  if(k==='valve')return {kind:'valve',dn};if(k==='bypass')return {kind:'bypass',dn};
  if(k==='endcap')return e.sub==='provisoire'?null:{kind:'kit',dn};
  return null;}
const sleeveOf=(l,e)=>{const dn=+((e&&e.dn)||l.dn)||0;return {kind:'sleeve',dn,gaine:(e&&e.casing)||A.gaineMM(dn)||undefined};};
/* besoin du tracé ACTUEL + ce qui est déjà posé ; inc = {el,j} pour se limiter à une zone */
export function fournNeeds(inc){const need={},lab={},posed={};const add=(m,o)=>{const k=fKey(o);m[k]=(m[k]||0)+1;if(!lab[k])lab[k]=fLabel(o);};
  Object.values((A.lines&&A.lines())||{}).forEach(l=>{['A','R'].forEach(c=>{const cd=l&&l.cond&&l.cond[c];if(!cd||!Array.isArray(cd.els))return;
    cd.els.forEach((e,i)=>{const o=pieceOfEl(l,e);if(!o)return;if(inc&&!inc.el(l,c,i,e))return;if(inc&&inc.mark)inc.mark(l.id+'|'+c+'|'+i);add(need,o);});
    const seen=new Set();(cd.joints||[]).forEach(j=>{const e=cd.els[j.idx];if(!e)return;if(inc&&!inc.j(l,c,j,e))return;
      const done=!(j.status==='a_souder'||j.status==='a_reprendre');if(done){const o=pieceOfEl(l,e);if(o)add(posed,o);}
      if(j.sleeveWith&&seen.has(j.weldId))return;if(j.sleeveWith)seen.add(j.sleeveWith);const sl=sleeveOf(l,e);add(need,sl);add(need,{kind:'pu',dn:sl.dn,gaine:sl.gaine});
      if(j.status==='manchonnee'){add(posed,sl);add(posed,{kind:'pu',dn:sl.dn,gaine:sl.gaine});}});});});
  return {need,lab,posed};}

/* ---------- zones : polygone entouré sur le plan, ou phase du phasage (tronçons par PK) ---------- */
let PTC=null; // points des pièces, le temps d'un calcul
function elPt(l,c,i){const key=l.id+'|'+c+'|e'+i;if(PTC&&PTC.has(key))return PTC.get(key);const cd=l.cond[c];const e=cd&&cd.els[i];const E=(e&&e.axis&&e.axis[0]&&e.axis[0].length)?e:(l.els&&l.els[i]);let p=null;if(E&&E.axis&&E.axis[0]&&E.axis[0].length){try{p=A.elMid(E);}catch(err){p=null;}}if(PTC)PTC.set(key,p);return p;}
function jPt(l,c,i){const key=l.id+'|'+c+'|j'+i;if(PTC&&PTC.has(key))return PTC.get(key);let p=null;try{p=A.jointPos(l,i,c);}catch(err){p=null;}if(PTC)PTC.set(key,p);return p;}
function pip(x,y,P){let ins=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi))ins=!ins;}return ins;}
const bboxOf=P=>P.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[1e12,1e12,-1e12,-1e12]);
const phaseOf=id=>{const P=A.phasageOf&&A.phasageOf();return P?P.phases.find(p=>p.id===id&&!p.deleted)||null:null;};
function zoneInc(z){if(z.ph){const ph=phaseOf(z.ph);if(!ph||!(ph.tr||[]).length)return null;const T=ph.tr;
    const inM=(l,m)=>{const L=A.phLen(l);return T.some(t=>t.line===l.id&&m>=t.m0-0.01&&(m<t.m1-0.01||(t.m1>=L-0.01&&m<=L+0.01)));};
    return {el:(l,c,i,e)=>inM(l,(e.m0+e.m1)/2),j:(l,c,j,e)=>inM(l,e.m1)};}
  const P=z.poly||[];if(P.length<3)return null;const bb=bboxOf(P);const inP=p=>!!p&&p.x>=bb[0]&&p.x<=bb[2]&&p.y>=bb[1]&&p.y<=bb[3]&&pip(p.x,p.y,P);
  return {el:(l,c,i)=>inP(elPt(l,c,i)),j:(l,c,j)=>inP(jPt(l,c,j.idx))};}
export function zDate(z){if(z.date)return z.date;if(z.ph){const ph=phaseOf(z.ph);const D=ph&&ph.dates;return (D&&D.so&&D.so[0])||(D&&D.tr&&D.tr[0])||null;}return null;}
function minusWorkDays(d,n){if(!d)return null;const x=new Date(d+'T12:00:00');if(!isFinite(x))return null;let k=0,g=0;while(k<(+n||0)&&g++<60){x.setDate(x.getDate()-1);const wd=x.getDay();if(wd===0||wd===6)continue;let hol=null;try{hol=A.holidays&&A.holidays(x.getFullYear());}catch(e){hol=null;}if(hol&&hol.has&&hol.has(isoD(x)))continue;k++;}return isoD(x);}

/* ---------- camions : semi plateau 13,6 m (barres de 12 m), largeur 2,40 m, hauteur de chargement 2,50 m, 24 t — hypothèses éditables ---------- */
const OD={20:26.9,25:33.7,32:42.4,40:48.3,50:60.3,65:76.1,80:88.9,100:114.3,125:139.7,150:168.3,200:219.1,250:273,300:323.9,350:355.6,400:406.4,450:457,500:508};
const WT={20:2.6,25:2.6,32:2.6,40:2.6,50:2.9,65:2.9,80:3.2,100:3.6,125:3.6,150:4,200:4.5,250:5,300:5.6,350:5.6,400:6.3,450:6.3,500:6.3};
export function kgm(dn){dn=+dn||100;const od=OD[dn]||dn*1.1,t=WT[dn]||4;const D=(A.gaineMM&&A.gaineMM(dn))||Math.round(od*1.8);const tc=Math.max(3,0.0102*D+0.7);
  return Math.PI*(od-t)*t*0.00785+Math.PI*(D-tc)*tc*0.00095+Math.PI/4*Math.max(0,(D-2*tc)**2-od**2)*0.00006;} // acier + gaine PEHD + mousse PUR (estimation)
export function barsPerTruck(dn,cfg){cfg=cfg||FZ_CFG;const D=(A.gaineMM&&A.gaineMM(+dn))||200;const vol=Math.max(1,Math.floor(cfg.larg*1000/D))*Math.max(1,Math.floor(cfg.haut*1000/D));const w=Math.floor(cfg.cu/(kgm(dn)*12));return Math.max(1,Math.min(vol,w));}
const BIG=new Set(['pipe','bend','steelbend','tee','reducer','valve','bypass','kit']);
export function packTrucks(items,cfg){cfg=cfg||FZ_CFG;const T=[];let cur=null;const nt=()=>{cur={fill:0,kg:0,lines:[]};T.push(cur);return cur;};const put=(t,it,n)=>{const ex=t.lines.find(x=>x.k===it.k);if(ex)ex.qty+=n;else t.lines.push({k:it.k,label:it.label,qty:n,aCmd:0});};
  const big=items.filter(i=>BIG.has(keyObj(i.k).kind)).sort((a,b)=>((keyObj(a.k).kind==='pipe'?0:1)-(keyObj(b.k).kind==='pipe'?0:1))||((keyObj(b.k).dn||0)-(keyObj(a.k).dn||0)));
  const small=items.filter(i=>!BIG.has(keyObj(i.k).kind));
  big.forEach(it=>{const o=keyObj(it.k);const cap=barsPerTruck(o.dn||100,cfg);const pipe=o.kind==='pipe';const f1=(pipe?1:0.3)/cap;const w1=kgm(o.dn||100)*(pipe?12:3);let n=it.qty,guard=0;
    while(n>0&&guard++<500){if(!cur)nt();let k=Math.min(n,Math.floor((1-cur.fill+1e-9)/f1),Math.floor((cfg.cu-cur.kg+1e-6)/w1));if(k<=0){if(!cur.lines.length)k=Math.min(n,1);else{nt();continue;}}cur.fill+=k*f1;cur.kg+=k*w1;put(cur,it,k);n-=k;}});
  if(small.length){const t=T[0]||nt();t.petit=!big.length;small.forEach(it=>put(t,it,it.qty));}
  // part « à commander » (hors commande) rapportée sur les camions, au prorata des lignes
  items.forEach(it=>{let left=it.aCmd||0;for(let i=T.length-1;i>=0&&left>0;i--){const x=T[i].lines.find(y=>y.k===it.k);if(!x)continue;const t=Math.min(left,x.qty);x.aCmd+=t;left-=t;}});
  T.forEach(t=>{t.fill=Math.min(1,t.fill);t.lines.sort((a,b)=>rowSort(a,b));});return T;}
const truckTxt=t=>{const by={};t.lines.forEach(x=>{const o=keyObj(x.k);const g=o.kind==='pipe'?'Barres DN'+o.dn:o.kind==='bend'||o.kind==='steelbend'?'Coudes':o.kind==='tee'?'Tés':o.kind==='reducer'?'Réductions':o.kind==='valve'||o.kind==='bypass'?'Vannes':o.kind==='kit'?'Kits FDL':o.kind==='sleeve'||o.kind==='sleeveEnd'?'Manchons':isPU(o.kind)?'Mousse PU':'Divers';by[g]=(by[g]||0)+x.qty;});return Object.entries(by).map(([g,n])=>g+' ×'+n).join(' · ');};

/* ---------- le calcul : comparatif par référence, zones (dans l'ordre des dates) et camions ---------- */
export function fzCompute(){const F=fournOf();if(!F)return null;PTC=new Map();try{
  const cur=fournNeeds();const init=F.init&&F.init.need?F.init.need:cur.need;const lab=Object.assign({},(F.init&&F.init.lab)||{},cur.lab);
  const extra={};live(F.extra).forEach(x=>{const k=x.key||fKey(x);extra[k]=(extra[k]||0)+(+x.qty||0);if(!lab[k])lab[k]=x.label||fLabel(x);});
  const cmd={};live(F.cmds).forEach(c=>(c.lines||[]).forEach(x=>{if(!(+x.qty>0))return;const k=x.key||fKey(x);cmd[k]=(cmd[k]||0)+(+x.qty);if(!lab[k])lab[k]=x.label||fLabel(x);}));
  const s=A.stockOf&&A.stockOf();const liv={},att={},stk={};
  if(s){s.lots.forEach(l=>{const k=fKeyLot(l);if(l.pend)att[k]=(att[k]||0)+(+l.qty||0);else liv[k]=(liv[k]||0)+(+l.qty||0);if(!lab[k])lab[k]=l.label||k;});
    [...s.zones.map(z=>z.id),null].forEach(zid=>zoneAgg(s,zid).forEach(a=>{if(!a.kind)return;const k=fKeyLot(a);stk[k]=(stk[k]||0)+Math.max(0,a.reste||0);}));}
  const keys=new Set([...Object.keys(init),...Object.keys(cur.need),...Object.keys(extra),...Object.keys(cmd),...Object.keys(liv),...Object.keys(att)]);
  const rows=[...keys].map(k=>{const ini=init[k]||0,act=cur.need[k]||0,plus=extra[k]||0,besoin=act+plus,cde=cmd[k]||0,lv=liv[k]||0,at=att[k]||0;const couvert=Math.max(cde,lv);
    return {k,label:keyLabel(k,lab[k]),ini,act,mod:act-ini,plus,besoin,cde,liv:lv,att:at,stock:stk[k]||0,pose:Math.min(besoin,cur.posed[k]||0),resteLiv:Math.max(0,cde-lv),aCmd:Math.max(0,besoin-couvert),surplus:Math.max(0,couvert-besoin)};})
   .filter(r=>r.ini||r.act||r.plus||r.cde||r.liv||r.att).sort(rowSort);
  const sum=f=>rows.reduce((t,r)=>t+(+r[f]||0),0);
  const tot={besoin:sum('besoin'),ini:sum('ini'),act:sum('act'),plus:sum('plus'),cde:sum('cde'),liv:sum('liv'),att:sum('att'),resteLiv:sum('resteLiv'),aCmd:sum('aCmd'),surplus:sum('surplus'),pose:sum('pose'),
    modP:rows.reduce((t,r)=>t+Math.max(0,r.mod),0),modM:rows.reduce((t,r)=>t+Math.max(0,-r.mod),0),nACmd:rows.filter(r=>r.aCmd>0).length,nSurplus:rows.filter(r=>r.surplus>0).length};
  // ---- zones : allocation chronologique — camions annoncés pour la zone, puis stock du chantier, puis camions annoncés sans zone, puis le reste de la commande, puis à commander
  const ZL=live(F.zones).map((z,i)=>({z,i,date:zDate(z),inc:zoneInc(z)})).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.i-b.i);
  const zIds=new Set(ZL.map(x=>x.z.id));
  const pStock=Object.assign({},stk),pAtt={},pAttZ={};
  if(s)s.lots.filter(l=>l.pend).forEach(l=>{const v=s.livs.find(x=>x.id===l.liv);const k=fKeyLot(l);const zk=v&&v.fz&&zIds.has(v.fz)?v.fz:null;if(zk){const m=pAttZ[zk]||(pAttZ[zk]={});m[k]=(m[k]||0)+(+l.qty||0);}else pAtt[k]=(pAtt[k]||0)+(+l.qty||0);});
  const pOrder={};keys.forEach(k=>{pOrder[k]=Math.max(0,(cmd[k]||0)-(liv[k]||0)-(att[k]||0));});
  const take=(pool,k,n)=>{const h=Math.max(0,pool[k]||0);const t=Math.min(h,n);pool[k]=h-t;return t;};
  let remZones=0;const owner=new Map(); /* une pièce dans deux zones = comptée deux fois : on le signale */
  const zones=ZL.map(({z,i,date,inc})=>{let ov=0;if(inc)inc.mark=k=>{const o=owner.get(k);if(o&&o!==z.id)ov++;else owner.set(k,z.id);};const r=inc?fournNeeds(inc):{need:{},lab:{},posed:{}};const lines=[];
    Object.keys(r.need).forEach(k=>{const nd=r.need[k];const po=Math.min(nd,r.posed[k]||0);const rem=nd-po;let n=rem;
      const dz=take(pAttZ[z.id]||{},k,n);n-=dz;const st=take(pStock,k,n);n-=st;const ag=take(pAtt,k,n);n-=ag;const oc=take(pOrder,k,n);n-=oc;
      lines.push({k,label:keyLabel(k,r.lab[k]||lab[k]),need:nd,posed:po,rem,annZ:dz,stock:st,ann:ag,order:oc,aCmd:n,aLivrer:oc+n});});
    Object.entries(pAttZ[z.id]||{}).forEach(([k,qq])=>{if(qq>0)pAtt[k]=(pAtt[k]||0)+qq;});delete pAttZ[z.id];
    lines.sort(rowSort);const livd=date?minusWorkDays(date,F.cfg.delai):null;
    const announced=s?s.livs.filter(v=>v.fz===z.id):[];
    const T=packTrucks(lines.filter(x=>x.aLivrer>0).map(x=>({k:x.k,label:x.label,qty:x.aLivrer,aCmd:x.aCmd})),F.cfg).map((t,j)=>Object.assign(t,{n:announced.length+j+1,date:livd,zone:z.id,id:z.id+'#'+(announced.length+j+1)}));
    const zt={need:0,rem:0,posed:0,annZ:0,stock:0,ann:0,order:0,aCmd:0,aLivrer:0};lines.forEach(x=>Object.keys(zt).forEach(f=>{zt[f]+=x[f]||0;}));remZones+=zt.rem;
    return {z,color:z.color||ZCOL[i%ZCOL.length],date,livd,lines,trucks:T,announced,tot:zt,ok:!!inc,overlap:ov,late:!!(livd&&livd<today()&&T.length)};});
  const hors=Math.max(0,(tot.act-Math.min(tot.act,sum('pose')))-remZones);
  // ---- planning des camions : annoncés (Stock) + proposés, par date
  const trucks=[];zones.forEach(Z=>{Z.announced.forEach(v=>trucks.push({kind:'ann',v,Z,date:v.date||null,n:v.fzn||0,status:v.status==='prevu'?'annoncé':'livré'}));Z.trucks.forEach(t=>trucks.push({kind:'prop',t,Z,date:t.date,n:t.n,status:'à annoncer'}));});
  trucks.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||String(a.Z.z.name).localeCompare(String(b.Z.z.name))||a.n-b.n);
  return {F,rows,tot,zones,trucks,hors,cfg:F.cfg,lab};}finally{PTC=null;}}

/* ---------- tracé initial figé (1re ouverture) : le marché s'il porte le détail par pièce, sinon le tracé du jour ---------- */
function ensureInit(F){if(F.init&&F.init.need)return;const L=Object.keys((A.lines&&A.lines())||{});if(!L.length)return;const M=A.marche&&A.marche();
  if(M&&M.need&&typeof M.need==='object')F.init={need:Object.assign({},M.need),lab:Object.assign({},M.needLab||{}),src:'marche',at:M.at||nowIso(),by:M.by||who()};
  else{const r=fournNeeds();F.init={need:r.need,lab:r.lab,src:'trace',at:nowIso(),by:who()};}
  if(fzCanEdit())save();}

/* ---------- rendu de l'onglet ---------- */
const stat=(v,l,cls)=>`<div class="ac-stat${cls?' '+cls:''}"><b>${v}</b><small>${l}</small></div>`;
const num=v=>{const x=parseFloat(String(v??'').replace(/\s/g,'').replace(',','.'));return isFinite(x)?x:null;};
function miniPlan(R,opt){opt=opt||{};const L=Object.values((A.lines&&A.lines())||{});let bb=null;const grow=(x,y)=>{if(!isFinite(x)||!isFinite(y))return;if(!bb)bb=[x,y,x,y];else{bb[0]=Math.min(bb[0],x);bb[1]=Math.min(bb[1],y);bb[2]=Math.max(bb[2],x);bb[3]=Math.max(bb[3],y);}};
  L.forEach(l=>(l.pts||[]).forEach(p=>grow(p.x,p.y)));R.zones.forEach(Z=>(Z.z.poly||[]).forEach(p=>grow(p[0],p[1])));if(!bb)return '<div class="hint">Aucun réseau sur ce chantier.</div>';
  const pad=Math.max(8,(bb[2]-bb[0])*0.04);const vb=[bb[0]-pad,bb[1]-pad,(bb[2]-bb[0])+2*pad,(bb[3]-bb[1])+2*pad];const sw=Math.max(vb[2],vb[3])/260;
  const net=L.map(l=>(l.pts||[]).length>1?`<polyline points="${l.pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}"/>`:'').join('');
  let zs='',labs='';R.zones.forEach((Z,i)=>{const col=Z.color;let cx=null,cy=null;
    if(Z.z.poly&&Z.z.poly.length>2){zs+=`<polygon points="${Z.z.poly.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-width="${sw*1.6}" stroke-dasharray="${sw*5} ${sw*3}" data-fzz="${esc(Z.z.id)}" style="cursor:pointer"/>`;const b=bboxOf(Z.z.poly);cx=(b[0]+b[2])/2;cy=b[1];}
    else if(Z.z.ph){const ph=phaseOf(Z.z.ph);(ph&&ph.tr||[]).forEach(t=>{const l=A.lines()[t.line];if(!l)return;const pts=[];for(let s2=0;s2<=24;s2++){const m=t.m0+(t.m1-t.m0)*s2/24;let p=null;try{p=A.posAtChainage(l,m);}catch(e){p=null;}if(p)pts.push(p);}if(pts.length>1){zs+=`<polyline points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${sw*5}" stroke-linecap="round" opacity=".8" data-fzz="${esc(Z.z.id)}" style="cursor:pointer"/>`;if(cx===null){const p=pts[Math.floor(pts.length/2)];cx=p.x;cy=p.y;}}});}
    if(cx!==null){const nT=Z.trucks.length+Z.announced.length;const t=`${Z.z.name} · ${Z.date?dFR(Z.date).slice(0,5):'sans date'}${nT?' · 🚚'+nT:''}`;const fs=sw*8.5;labs+=`<g transform="translate(${cx.toFixed(1)} ${(cy-sw*5).toFixed(1)})" style="pointer-events:none"><rect x="${-t.length*fs*0.31}" y="${-fs*1.25}" width="${t.length*fs*0.62}" height="${fs*1.55}" rx="${fs*0.77}" fill="${col}"/><text y="${-fs*0.12}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(t)}</text></g>`;}});
  return `<svg viewBox="${vb.map(v=>v.toFixed(1)).join(' ')}" class="fz-mini" style="width:100%;max-height:${opt.h||300}px;background:#f4f3ee;border-radius:10px;display:block"><g fill="none" stroke="#9a968b" stroke-width="${sw*1.4}" stroke-linecap="round" stroke-linejoin="round">${net}</g>${zs}${labs}</svg>`;}
export function renderFourniture(){const el=document.getElementById('fourniture');if(!el||!A)return;const N=A.net();
  if(!N||N.id==='__vide'){el.innerHTML='<h2 class="vt">Fourniture</h2><div class="card muted">Aucun chantier.</div>';return;}
  const F=fournOf();ensureInit(F);const R=fzCompute();const ed=fzCanEdit();const UI=A.state.fournUI||(A.state.fournUI={});const open=(k,d)=>((UI[k]===undefined?d:UI[k])?'open':'');const T=R.tot;
  const cmds=live(F.cmds);const fil=UI.fil||'all';
  const initTxt=F.init?`Tracé initial : ${F.init.src==='marche'?'tracé marché':'tracé'} du ${dFR(String(F.init.at||'').slice(0,10))}`:'Tracé initial : pas encore figé';
  const FIL=[['all','Tout'],['ecart','Écarts'],['acmd','À commander'],['reste','Reste à livrer']];
  const rows=R.rows.filter(r=>fil==='all'||(fil==='ecart'&&(r.mod||r.plus||r.aCmd||r.surplus))||(fil==='acmd'&&r.aCmd>0)||(fil==='reste'&&r.resteLiv>0));
  const cell=(v,c)=>`<td class="num"${c?` style="${c}"`:''}>${v?q(v):'<span class="dim">—</span>'}</td>`;
  const row=r=>`<tr${r.aCmd>0?' style="background:#fdecec"':r.surplus>0?' style="background:#fff8e6"':''}><td>${esc(r.label)}</td>${cell(r.ini)}<td class="num">${r.mod?`<b style="color:${r.mod>0?'#b3541e':'#2f6fb3'}">${r.mod>0?'+':''}${q(r.mod)}</b>`:'<span class="dim">—</span>'}</td>${cell(r.plus)}<td class="num"><b>${q(r.besoin)}</b></td>${cell(r.cde)}${cell(r.liv)}${cell(r.att,'color:#7a5200')}<td class="num"><b>${r.resteLiv?q(r.resteLiv):'—'}</b></td><td class="num">${r.aCmd?`<b style="color:#c0392b">${q(r.aCmd)}</b>`:r.surplus?`<span style="color:#8a6d1f">+${q(r.surplus)}</span>`:'<span style="color:#15803d">✓</span>'}</td></tr>`;
  const cmdRow=c=>{const n=(c.lines||[]).reduce((t,x)=>t+(+x.qty||0),0);return `<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${esc(c.name||'Commande')}</b>${c.ref?' <span class="dim">· n° '+esc(c.ref)+'</span>':''}</span><span class="eq-s">${c.date?dFR(c.date)+' · ':''}${(c.lines||[]).length} ligne${(c.lines||[]).length>1?'s':''} · ${q(n)} pièces${c.file?' · '+esc(c.file):''}</span></span>${ed?`<span class="eq-acts" style="margin:0"><button class="btn sm" data-fa="cmd" data-v="${esc(c.id)}">Ouvrir</button></span>`:''}</div>`;};
  const zRow=Z=>{const t=Z.tot;const nT=Z.trucks.length;return `<div class="eq-row fz-zrow" data-fa="zone" data-v="${esc(Z.z.id)}" style="cursor:pointer;border-left:4px solid ${Z.color};padding-left:8px"><span class="eq-grow"><span class="eq-t"><b>${esc(Z.z.name)}</b> <span class="dim">· ${Z.z.ph?'phase du phasage':'zone entourée'}</span></span><span class="eq-s">${Z.date?'début '+dCourt(Z.date):'<span style="color:#7a5200">sans date</span>'}${Z.ok?` · ${q(t.rem)} pièce${t.rem>1?'s':''} à poser · sur chantier ${q(t.stock)} · annoncé ${q(t.annZ+t.ann)} · <b>à faire livrer ${q(t.aLivrer)}</b>${t.aCmd?` · <b style="color:#c0392b">à commander ${q(t.aCmd)}</b>`:''}`:' · <span style="color:#c0392b">phase supprimée ou vide</span>'}</span><span class="eq-s">${nT?`🚚 ${nT} camion${nT>1?'s':''} à annoncer · livraison ${dCourt(Z.livd)}${Z.late?' <b style="color:#c0392b">(en retard)</b>':''}`:t.aLivrer?'':'✓ couvert'}${Z.announced.length?` · ${Z.announced.length} annoncé${Z.announced.length>1?'s':''} dans Stock`:''}</span>${Z.overlap?`<span class="eq-s" style="color:#9b2c22">⚠ ${Z.overlap} pièce${Z.overlap>1?'s':''} déjà dans une zone plus tôt : comptée${Z.overlap>1?'s':''} deux fois — redessine pour éviter le chevauchement</span>`:''}</span><span class="chev">›</span></div>`;};
  const wkOf=d=>{if(!d)return 'à dater';const t=new Date(d+'T12:00:00');const u=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()));const dn=u.getUTCDay()||7;u.setUTCDate(u.getUTCDate()+4-dn);const y0=new Date(Date.UTC(u.getUTCFullYear(),0,1));return 'Semaine '+Math.ceil((((u-y0)/864e5)+1)/7);};
  const truckCard=x=>{const late=x.kind==='prop'&&x.Z.late;if(x.kind==='ann'){const v=x.v;const n=(v.prevu||[]).reduce((t,y)=>t+(+y.qty||0),0);return `<div class="eq-row" style="border-left:4px solid ${x.Z.color};padding-left:8px"><span class="eq-grow"><span class="eq-t"><b>${dCourt(x.date)}</b> · ${esc(x.Z.z.name)} · ${esc(v.label)}</span><span class="eq-s">${q(n)} pièces · <span class="hyChip" style="font-size:10.5px;border-color:${v.status==='prevu'?'#c9a227':'#9fd49f'}">${v.status==='prevu'?'annoncé dans Stock':'livré'}</span></span></span></div>`;}
    const t=x.t;return `<div class="eq-row" style="border-left:4px solid ${x.Z.color};padding-left:8px${late?';background:#fdecec':''}"><span class="eq-grow"><span class="eq-t"><b>${dCourt(x.date)}</b> · ${esc(x.Z.z.name)} · camion ${t.n}${t.petit?' (petites fournitures)':' · '+Math.round(t.fill*100)+' % · '+q(t.kg/1000)+' t'}${late?' <b style="color:#c0392b">en retard</b>':''}</span><span class="eq-s">${esc(truckTxt(t))}${t.lines.some(y=>y.aCmd)?' · <b style="color:#c0392b">dont à commander</b>':''}</span></span>${ed?`<span class="eq-acts" style="margin:0"><button class="btn sm" data-fa="ann" data-v="${esc(t.id)}">→ Stock</button></span>`:''}</div>`;};
  const truckList=()=>{let cur=null,out='';R.trucks.forEach(x=>{const w=wkOf(x.date);if(w!==cur){cur=w;out+=`<div class="eq-s" style="margin:8px 0 2px;font-weight:700;color:var(--ink2)">${w}</div>`;}out+=truckCard(x);});return out;};
  const extra=live(F.extra);
  const capRows=DNS.filter(dn=>R.rows.some(r=>keyObj(r.k).dn===dn&&keyObj(r.k).kind==='pipe')).map(dn=>`<tr><td>DN${dn}</td><td class="num">${(A.gaineMM&&A.gaineMM(dn))||'—'}</td><td class="num">${q(kgm(dn))}</td><td class="num"><b>${barsPerTruck(dn,F.cfg)}</b></td></tr>`).join('');
  el.innerHTML=`<h2 class="vt">Fourniture — commande, livré, reste</h2>
   <div class="ac-stats" style="margin-bottom:8px">${stat(q(T.besoin),'besoin (pièces)')}${stat(q(T.cde),'commandé')}${stat(q(T.liv),'livré')}${stat(q(T.resteLiv),'reste à livrer',T.resteLiv?'or':'')}${stat(q(T.aCmd),'à commander',!cmds.length?'':T.aCmd?'bad':'ok')}${stat(q(T.surplus),'surplus')}</div>
   <div class="hint" style="margin:-2px 0 8px">${esc(initTxt)} · modifs <b>+${q(T.modP)} / −${q(T.modM)}</b> pièces · ${q(T.plus)} en plus${T.att?` · ${q(T.att)} attendues (camions annoncés)`:''}. Livré et attendu viennent de l'onglet <b>Stock</b> (réceptions pointées) — rien à ressaisir.</div>
   ${!cmds.length?`<div class="warnbox" style="margin:0 0 8px">Pas encore de commande importée : tout le besoin apparaît « à commander ». Importe la commande fournisseur pour le comparatif.</div>`:T.aCmd?`<div class="err" style="margin:0 0 8px">⚠ <b>À commander</b> (besoin au-delà de la commande) : ${R.rows.filter(r=>r.aCmd>0).slice(0,6).map(r=>esc(r.label)+' ('+q(r.aCmd)+')').join(' · ')}${T.nACmd>6?' …':''}</div>`:cmds.length?'<div class="okbox" style="margin:0 0 8px">✓ La commande couvre le besoin actuel (tracé + modifs + pièces en plus).</div>':''}
   <details class="card" data-fzui="cmd" ${open('cmd',!cmds.length)}><summary style="cursor:pointer;font-size:13.5px"><b>Commande fournisseur</b> <span class="dim" style="font-size:12px">${cmds.length?cmds.length+' commande'+(cmds.length>1?'s':'')+' · '+q(T.cde)+' pièces':'aucune — importe-la pour le comparatif'}</span></summary>
    ${cmds.length?`<div class="eq-list" style="margin-top:6px">${cmds.map(cmdRow).join('')}</div>`:'<div class="hint" style="margin-top:6px">La commande de tubes (accusé de réception du fournisseur, Excel, CSV ou PDF) : toutes les pièces, lues ligne par ligne et vérifiées avant d\'entrer.</div>'}
    ${ed?`<div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-fa="cmd" data-v="">📥 Importer une commande</button></div>`:''}</details>
   <details class="card" data-fzui="cmp" ${open('cmp',true)}><summary style="cursor:pointer;font-size:13.5px"><b>Comparatif tracé ↔ commande ↔ livré</b> <span class="dim" style="font-size:12px">${R.rows.length} référence${R.rows.length>1?'s':''}${T.nACmd?' · '+T.nACmd+' à commander':''}${T.nSurplus?' · '+T.nSurplus+' en surplus':''}</span></summary>
    <div class="chips" style="margin:6px 0">${FIL.map(([k,t])=>`<button class="chip${fil===k?' on':''}" data-fa="fil" data-v="${k}">${t}</button>`).join('')}</div>
    <div style="overflow:auto"><table class="rc fz-cmp" style="margin:0"><tr><th>Référence</th><th title="tracé initial figé">initial</th><th title="tracé actuel − initial">modifs</th><th title="pièces en plus (casse, chutes, réserve…)">en plus</th><th title="tracé actuel + en plus">besoin</th><th>commandé</th><th title="reçu (Stock)">livré</th><th title="camions annoncés, pas encore pointés">attendu</th><th title="commandé − livré">reste à livrer</th><th title="besoin − (commandé ou livré) / surplus">à cder</th></tr>${rows.map(row).join('')||'<tr><td colspan="10" class="dim">Rien à afficher pour ce filtre.</td></tr>'}
     <tr class="tot"><td>Total</td><td class="num">${q(T.ini)}</td><td class="num">${T.modP||T.modM?'+'+q(T.modP)+'/−'+q(T.modM):'—'}</td><td class="num">${q(T.plus)}</td><td class="num">${q(T.besoin)}</td><td class="num">${q(T.cde)}</td><td class="num">${q(T.liv)}</td><td class="num">${q(T.att)}</td><td class="num">${q(T.resteLiv)}</td><td class="num">${T.aCmd?q(T.aCmd):'✓'}</td></tr></table></div>
    <div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-fa="csv" data-v="cmp">⬇ CSV du comparatif</button>${ed?`<button class="btn sm" data-fa="refige" data-v="">Re-figer le tracé initial</button>`:''}</div></details>
   <details class="card" data-fzui="zones" ${open('zones',true)}><summary style="cursor:pointer;font-size:13.5px"><b>Zones à livrer · planning</b> <span class="dim" style="font-size:12px">${R.zones.length?R.zones.length+' zone'+(R.zones.length>1?'s':'')+' · '+R.trucks.filter(x=>x.kind==='prop').length+' camion(s) à annoncer':'entoure une partie du plan'}</span></summary>
    <div style="margin-top:6px">${miniPlan(R)}</div>
    ${ed?`<div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-fa="lasso" data-v="">⭕ Entourer une zone sur le plan</button><button class="btn" data-fa="phases" data-v="">📅 Reprendre les phases du phasage</button></div>`:''}
    ${R.zones.length?`<div class="eq-list" style="margin-top:8px">${R.zones.map(zRow).join('')}</div>${R.hors?`<div class="hint" style="margin-top:4px">Reste du réseau hors zones : ${q(R.hors)} pièce${R.hors>1?'s':''} à poser.</div>`:''}`:'<div class="hint" style="margin-top:6px">Entoure sur le plan la partie que tu veux souder (ou reprends les phases du phasage) : la liste de tout ce qu\'il faut avoir sur place sort toute seule — ce qui est déjà sur le chantier, ce qui est annoncé, ce qu\'il faut faire livrer sur la commande et ce qu\'il faut commander — avec les camions et leur date.</div>'}</details>
   <details class="card" data-fzui="trucks" ${open('trucks',true)}><summary style="cursor:pointer;font-size:13.5px"><b>Camions · planning des livraisons</b> <span class="dim" style="font-size:12px">${R.trucks.length?R.trucks.length+' camion'+(R.trucks.length>1?'s':''):'aucun'}</span></summary>
    ${R.trucks.length?`<div class="eq-list fz-trucks">${truckList()}</div><div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-fa="csv" data-v="trucks">⬇ CSV des camions</button></div><div class="hint" style="margin-top:4px">Date de livraison = début de la zone − ${F.cfg.delai} jour${F.cfg.delai>1?'s':''} ouvré${F.cfg.delai>1?'s':''}. « → Stock » annonce le camion dans l'onglet Stock (livraison prévue) : le pointage à l'arrivée se fait là-bas et remonte ici en « livré ».</div>`:'<div class="hint" style="margin-top:6px">Les camions se calculent à partir des zones datées.</div>'}</details>
   <details class="card" data-fzui="extra" ${open('extra',false)}><summary style="cursor:pointer;font-size:13.5px"><b>Pièces en plus</b> <span class="dim" style="font-size:12px">${extra.length?q(T.plus)+' pièce'+(T.plus>1?'s':'')+' · '+extra.length+' ligne'+(extra.length>1?'s':''):'casse, chutes, réserve, modif terrain'}</span></summary>
    ${extra.length?`<div class="eq-list" style="margin-top:6px">${extra.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${q(x.qty)} × ${esc(x.label||fLabel(x))}</b></span><span class="eq-s">${esc(x.why||'')}${x.by?' · '+esc(x.by):''}${x.at?' · '+dFR(String(x.at).slice(0,10)):''}</span></span>${ed?`<span class="eq-acts" style="margin:0"><button class="btn sm" data-fa="xdel" data-v="${esc(x.id)}" style="color:#9b2c22">✕</button></span>`:''}</div>`).join('')}</div>`:''}
    ${ed?`<div class="eq-acts" style="margin-top:8px"><button class="btn" data-fa="xadd" data-v="">＋ Ajouter des pièces en plus</button></div>`:''}</details>
   <details class="card" data-fzui="cfg" ${open('cfg',false)}><summary style="cursor:pointer;font-size:13px;color:var(--ink2)">Hypothèses · délai et camions</summary>
    <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${[['delai','Délai (jours ouvrés avant le début)',1],['len','Plateau (m)',0.1],['larg','Largeur (m)',0.05],['haut','Hauteur de chargement (m)',0.05],['cu','Charge utile (kg)',100]].map(([k,l,st])=>`<label style="flex:1;min-width:120px"><span class="f" style="display:block;font-size:11.5px">${l}</span><input class="f" type="number" step="${st}" data-fzcfg="${k}" value="${F.cfg[k]}" ${ed?'':'disabled'}></label>`).join('')}</div>
    ${capRows?`<div style="overflow:auto"><table class="rc" style="margin-top:6px"><tr><th>Barres 12 m</th><th>gaine (mm)</th><th>kg/m (estim.)</th><th>par camion</th></tr>${capRows}</table></div>`:''}
    <div class="hint" style="margin-top:4px">Barres de 12 m rangées sur le plateau (largeur ÷ Ø gaine) × (hauteur ÷ Ø gaine), limitées par la charge utile (poids estimé acier + mousse + gaine). Une pièce de forme compte pour 0,3 barre de son DN ; manchons, mousse et petites fournitures voyagent avec le premier camion de la zone. Ordres de grandeur pour planifier — le fournisseur confirme.</div></details>`;
  el.querySelectorAll('details[data-fzui]').forEach(d=>d.addEventListener('toggle',()=>{UI[d.dataset.fzui]=d.open;}));
  el.onclick=e=>{const b=e.target.closest('[data-fa]');if(!b||!el.contains(b))return;fzAct(b.dataset.fa,b.dataset.v||'',R);};
  el.onchange=e=>{const t=e.target;if(t&&t.dataset&&t.dataset.fzcfg){if(!fzCanEdit())return;const v=num(t.value);if(v===null||v<0)return;F.cfg[t.dataset.fzcfg]=t.dataset.fzcfg==='delai'?Math.round(v):v;save();renderFourniture();}};}

/* ---------- actions ---------- */
function fzAct(k,v,R){const F=fournOf();if(!F)return;const UI=A.state.fournUI||(A.state.fournUI={});
  if(k==='fil'){UI.fil=v||'all';renderFourniture();return;}
  if(k==='zone'){openZone(v);return;}
  if(k==='csv'){if(v==='cmp'){const rows=[['Référence','Initial','Modifs','En plus','Besoin','Commandé','Livré','Attendu','Reste à livrer','À commander','Surplus','Posé']];R.rows.forEach(r=>rows.push([r.label,r.ini,r.mod,r.plus,r.besoin,r.cde,r.liv,r.att,r.resteLiv,r.aCmd,r.surplus,r.pose]));A.dlCSV((A.net().name||'chantier')+' - fourniture comparatif.csv',rows);}
    else if(v==='trucks'){const rows=[['Livraison','Zone','Camion','Statut','Contenu','Remplissage %','Poids t','Dont à commander']];R.trucks.forEach(x=>{if(x.kind==='ann')rows.push([x.date||'',x.Z.z.name,x.v.label,x.status,(x.v.prevu||[]).map(y=>y.qty+' × '+y.label).join(' + '),'','','']);else rows.push([x.date||'',x.Z.z.name,'Camion '+x.t.n,'à annoncer',x.t.lines.map(y=>y.qty+' × '+y.label).join(' + '),x.t.petit?'':Math.round(x.t.fill*100),x.t.petit?'':(x.t.kg/1000).toFixed(1).replace('.',','),x.t.lines.filter(y=>y.aCmd).map(y=>y.aCmd+' × '+y.label).join(' + ')]);});A.dlCSV((A.net().name||'chantier')+' - camions.csv',rows);}
    else if(v.startsWith('z:')){const Z=R.zones.find(x=>x.z.id===v.slice(2));if(!Z)return;const rows=[['Référence','Besoin zone','Déjà posé','Reste à poser','Sur chantier','Annoncé','À faire livrer (commande)','À commander']];Z.lines.forEach(x=>rows.push([x.label,x.need,x.posed,x.rem,x.stock,x.annZ+x.ann,x.order,x.aCmd]));A.dlCSV((A.net().name||'chantier')+' - '+Z.z.name+' - à livrer.csv',rows);}
    return;}
  if(!fzCanEdit()){A.toast('Réservé au chef / bureau');return;}
  if(k==='cmd'){openCmd(v||null);return;}
  if(k==='xadd'){openExtra();return;}
  if(k==='xdel'){const x=F.extra.find(y=>y.id===v);if(!x||!confirm('Retirer « '+(x.label||'')+' » des pièces en plus ?'))return;x.deleted=true;x.upd=nowIso();save();renderFourniture();return;}
  if(k==='lasso'){fzStartPose();return;}
  if(k==='phases'){const P=A.phasageOf&&A.phasageOf();const phs=P?P.phases.filter(p=>!p.deleted&&p.level==='exe'&&(p.tr||[]).length):[];if(!phs.length){A.toast('Aucune phase d\'exécution au phasage');return;}let n=0;phs.forEach(ph=>{if(live(F.zones).some(z=>z.ph===ph.id))return;F.zones.push({id:nid('FZ'),name:ph.name||ph.id,ph:ph.id,at:nowIso(),by:who(),upd:nowIso()});n++;});if(n){save();}renderFourniture();A.toast(n?'✓ '+n+' phase'+(n>1?'s':'')+' reprise'+(n>1?'s':'')+' en zones de livraison':'Les phases sont déjà reprises');return;}
  if(k==='refige'){if(!confirm('Re-figer le tracé initial sur le tracé ACTUEL ?\nLes modifs repartent de zéro (l\'ancien initial est gardé dans l\'historique).'))return;const r=fournNeeds();const prev=F.init?(F.init.prev||[]).concat([{at:F.init.at,by:F.init.by,src:F.init.src}]).slice(-5):[];F.init={need:r.need,lab:r.lab,src:'trace',at:nowIso(),by:who(),prev};save();renderFourniture();A.toast('Tracé initial re-figé');return;}
  if(k==='ann'){const [zid,n]=String(v).split('#');const Z=R.zones.find(x=>x.z.id===zid);const t=Z&&Z.trucks.find(x=>String(x.n)===n);if(!t)return;openAnnounce(Z,[t]);return;}}

/* ---------- zone : la liste à prévoir, les camions, la date ---------- */
function openZone(id){const R=fzCompute();const Z=R&&R.zones.find(x=>x.z.id===id);if(!Z)return;const ed=fzCanEdit();const z=Z.z;const t=Z.tot;
  const line=x=>`<tr${x.aCmd?' style="background:#fdecec"':''}><td>${esc(x.label)}</td><td class="num">${q(x.rem)}${x.posed?`<div class="dim" style="font-size:10px">${q(x.posed)} posé${x.posed>1?'s':''}</div>`:''}</td><td class="num">${x.stock?q(x.stock):'—'}</td><td class="num">${x.annZ+x.ann?q(x.annZ+x.ann):'—'}</td><td class="num"><b>${x.order?q(x.order):'—'}</b></td><td class="num">${x.aCmd?`<b style="color:#c0392b">${q(x.aCmd)}</b>`:'—'}</td></tr>`;
  A.openModal(`<h3 style="margin:0 0 2px"><span style="color:${Z.color}">●</span> ${esc(z.name)}</h3><div class="hint" style="margin-bottom:6px">${z.ph?'Phase du phasage (tronçons par PK)':'Zone entourée sur le plan'} · ${Z.date?'début '+dCourt(Z.date):'sans date'}${Z.livd?' · livraison au plus tard '+dCourt(Z.livd):''}</div>
    ${ed?`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:140px"><label class="f">Nom</label><input class="f" id="fz-name" value="${esc(z.name)}"></div><div style="flex:0 0 150px"><label class="f">Début (soudage)</label><input class="f" type="date" id="fz-date" value="${esc(z.date||Z.date||'')}"></div></div>${z.ph?'<div class="hint">Sans date ici, celle du phasage (soudage) fait foi.</div>':''}`:''}
    <div class="ac-stats" style="margin:8px 0">${stat(q(t.rem),'à poser')}${stat(q(t.stock),'sur chantier')}${stat(q(t.annZ+t.ann),'annoncé')}${stat(q(t.order),'à faire livrer',t.order?'or':'')}${stat(q(t.aCmd),'à commander',t.aCmd?'bad':'ok')}${stat(Z.trucks.length,'camion(s)')}</div>
    ${Z.overlap?`<div class="err" style="margin:0 0 6px">⚠ ${Z.overlap} pièce${Z.overlap>1?'s':''} de cette zone ${Z.overlap>1?'sont':'est'} aussi dans une zone plus tôt (chevauchement) : comptée${Z.overlap>1?'s':''} deux fois.</div>`:''}
    ${Z.ok?`<div style="overflow:auto;max-height:38vh"><table class="rc"><tr><th>Référence</th><th>reste à poser</th><th>sur chantier</th><th>annoncé</th><th title="sur la commande, pas encore livré ni annoncé">à faire livrer</th><th title="au-delà de la commande">à commander</th></tr>${Z.lines.map(line).join('')||'<tr><td colspan="6" class="dim">Aucune pièce dans cette zone.</td></tr>'}</table></div>`:'<div class="err">La phase de cette zone n\'existe plus (ou n\'a pas de tronçon) : supprime la zone ou entoure-la sur le plan.</div>'}
    ${Z.trucks.length?`<div style="margin-top:8px"><b style="font-size:13px">Camions à prévoir</b>${Z.trucks.map(tk=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>Camion ${tk.n}</b> · ${dCourt(tk.date)}${tk.petit?' · petites fournitures':' · '+Math.round(tk.fill*100)+' % · '+q(tk.kg/1000)+' t'}</span><span class="eq-s">${esc(truckTxt(tk))}${tk.lines.some(y=>y.aCmd)?' · <b style="color:#c0392b">dont à commander : '+esc(tk.lines.filter(y=>y.aCmd).map(y=>y.aCmd+' × '+y.label).join(', '))+'</b>':''}</span></span></div>`).join('')}</div>`:''}
    ${Z.announced.length?`<div class="hint" style="margin-top:6px">Déjà annoncé${Z.announced.length>1?'s':''} dans Stock : ${Z.announced.map(v=>esc(v.label)+' ('+(v.status==='prevu'?'attendu '+dCourt(v.date):'livré')+')').join(' · ')}</div>`:''}
    <div class="actions" style="margin-top:8px">${ed?`<button class="btn primary block" id="fz-save">Enregistrer</button>`:''}${ed&&Z.trucks.length?`<button class="btn block" id="fz-ann">🚚 Annoncer ${Z.trucks.length>1?'les '+Z.trucks.length+' camions':'le camion'} dans Stock</button>`:''}<button class="btn block" id="fz-plan">📍 Voir sur le plan</button><button class="btn block" id="fz-csv">⬇ CSV de la liste</button>${ed?`<button class="btn block" id="fz-del" style="color:#9b2c22">Supprimer la zone</button>`:''}<button class="btn block" data-close>Fermer</button></div>`);
  const g=i=>document.getElementById(i);
  if(g('fz-save'))g('fz-save').onclick=()=>{const F=fournOf();const zz=F.zones.find(x=>x.id===id);if(!zz)return;zz.name=(g('fz-name').value||'').trim()||zz.name;const d=g('fz-date').value||'';const phD=zz.ph?zDate(Object.assign({},zz,{date:null})):null;zz.date=d&&d!==phD?d:(zz.ph?null:(d||null)); /* phase : la date du phasage fait foi tant qu'on ne la change pas */zz.upd=nowIso();save();A.closeModal();renderFourniture();A.renderPlan();A.toast('Zone enregistrée');};
  if(g('fz-ann'))g('fz-ann').onclick=()=>{A.closeModal();openAnnounce(Z,Z.trucks);};
  if(g('fz-plan'))g('fz-plan').onclick=()=>{A.closeModal();A.state.tab='plan';A.renderAll();let p=null;if(z.poly&&z.poly.length){const b=bboxOf(z.poly);p={x:(b[0]+b[2])/2,y:(b[1]+b[3])/2};}else if(z.ph){const ph=phaseOf(z.ph);const t0=ph&&ph.tr&&ph.tr[0];const l=t0&&A.lines()[t0.line];if(l){try{p=A.posAtChainage(l,(t0.m0+t0.m1)/2);}catch(e){p=null;}}}if(p)A.centerOn(p.x,p.y);};
  if(g('fz-csv'))g('fz-csv').onclick=()=>fzAct('csv','z:'+id,R);
  if(g('fz-del'))g('fz-del').onclick=()=>{if(!confirm('Supprimer la zone « '+z.name+' » ?\nLes camions déjà annoncés restent dans Stock.'))return;const F=fournOf();const zz=F.zones.find(x=>x.id===id);if(zz){zz.deleted=true;zz.upd=nowIso();}save();A.closeModal();renderFourniture();A.renderPlan();};}
/* annoncer des camions dans Stock = des livraisons PRÉVUES (lots attendus) — la zone de déchargement se choisit maintenant ou à l'arrivée */
function openAnnounce(Z,T){const s=A.stockOf();if(!s){A.toast('Aucun chantier');return;}
  A.openModal(`<h3 style="margin-top:0">🚚 Annoncer dans Stock — ${esc(Z.z.name)}</h3><div class="hint" style="margin-bottom:6px">${T.length} camion${T.length>1?'s':''} : ${T.map(t=>'n° '+t.n+' le '+dCourt(t.date)).join(' · ')}. Ils deviennent des livraisons <b>prévues</b> dans l'onglet Stock ; le pointage à l'arrivée (photo, réel vs prévu) se fait là-bas.</div>
    <label class="f">Zone de déchargement</label><select class="f" id="fz-anz"><option value="">À choisir à l'arrivée du camion</option>${s.zones.map(z=>`<option value="${esc(z.id)}">${esc(z.name)}</option>`).join('')}</select>
    ${T.some(t=>t.lines.some(y=>y.aCmd))?'<div class="warnbox">Une partie n\'est pas sur la commande (« à commander ») : commande-la avant d\'annoncer la livraison.</div>':''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="fz-anok">Annoncer</button><button class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('fz-anok').onclick=()=>{const zone=document.getElementById('fz-anz').value||null;const at=nowIso();let n=0;
    T.forEach(t=>{const liv={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),label:'Camion '+Z.z.name+' n° '+t.n,bl:'',at,date:t.date||today(),dateHist:[],by:who(),status:'prevu',prevu:t.lines.map(x=>({label:x.label,qty:x.qty})),fz:Z.z.id,fzn:t.n,src:'fourniture'};s.livs.push(liv);
      t.lines.forEach((x,i)=>{const o=keyObj(x.k);if(o.kind==='pipe')o.len=12;if((o.kind==='sleeve'||o.kind==='pu')&&o.dn&&!o.gaine){const gm=A.gaineMM&&A.gaineMM(o.dn);if(gm)o.gaine=gm;}if(o.kind==='acc')o.label=x.label;const label=o.kind==='acc'?x.label:stockLabel(Object.assign({},o));s.lots.push({id:liv.id+':'+i,liv:liv.id,zone,pend:true,key:stockKey(o),label,kind:o.kind,dn:o.dn,dn2:o.dn2,gaine:o.gaine,len:o.len,angle:o.angle,qty:x.qty});});n++;});
    A.saveStock();A.closeModal();renderFourniture();A.toast('✓ '+n+' camion'+(n>1?'s':'')+' annoncé'+(n>1?'s':'')+' dans Stock (attendu'+(n>1?'s':'')+')');};}

/* ---------- import de la commande : Excel (.xlsx), CSV, collage depuis Excel, PDF (texte) — toujours relu avant d'entrer ---------- */
const NORM=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ').trim();
const KIND_RE=[['sleeveEnd',/manchon.*(fin de ligne|fdl|extremit)/],['sleeve',/manchon|\bjoint\b|sx-?wp|wpjoint|electro ?soud|thermo ?retract/],['pu',/mousse|\bpu\b|polyurethane|\bpur\b/],['dhec',/\bdhec\b/],['wall',/passage de mur|traversee de mur|passe ?mur/],['kit',/kit (de )?fin de ligne|kit fdl|fin de ligne|embout/],['bypass',/by-?pass/],['valve',/vanne|robinet/],['reducer',/reduc/],['tee',/\bte\b|\btes\b|\bt a saut\b|piquage|derivation|\bt droit\b|\btee\b/],['steelbend',/courbe acier|coude acier/],['bend',/coude|\bcourbe\b/],['pipe',/\btubes?\b|\bbarres?\b|conduite|tuyau|longueur droite/]];
const AXC={r:'pipe',k:'bend',tw:'tee',t:'tee',nt:'sleeve',nk:'sleeveEnd',p:'wall',e:'dhec',z:'reducer'};
export function parseOrderText(txt){const t=' '+NORM(txt).replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,' ')+' ';if(t.trim().length<2)return null;const o={};
  const ax=t.match(/\[?\b(r|k|tw|t|nt|nk|p|e|z)-(\d{2,3})(?:\/(\d{2,3}))?(?:\/(\d{2,3}))?(?:-(\d{1,2}))?\]?/);
  if(ax&&DNSET.has(+ax[2])){o.kind=AXC[ax[1]];o.dn=+ax[2];if(o.kind==='bend')o.angle=+ax[3]&&+ax[3]<=90?+ax[3]:90;if(o.kind==='tee'||o.kind==='reducer')o.dn2=+ax[3]||undefined;if(o.kind==='pipe'&&ax[5])o.len=+ax[5];}
  if(!o.kind){const f=KIND_RE.find(([,re])=>re.test(t));if(f)o.kind=f[0];}
  if(!o.dn){const dn=[...t.matchAll(/\bdn\s*(\d{2,3})(?:\s*(?:x|\/|-)\s*(?:dn\s*)?(\d{2,3}))?/g)];if(dn.length){o.dn=+dn[0][1];if(dn[0][2]&&DNSET.has(+dn[0][2]))o.dn2=+dn[0][2];else if(dn[1])o.dn2=+dn[1][1];}}
  if(!o.dn){const pr=[...t.matchAll(/(\d{2,3}(?:\.\d)?)\s*\/\s*(\d{2,4})/g)].map(m=>{const a=+m[1];const d=dnOfOd(a);return d&&Math.abs((OD[d]||0)-a)<=3?d:(DNSET.has(a)?a:null);}).filter(Boolean);if(pr.length){o.dn=pr[0];if(pr[1])o.dn2=pr[1];}}
  if(!o.dn&&o.kind){const m=t.match(/\b(\d{2,3})\s*mm\b/);if(m){const d=dnOfOd(+m[1]);if(d)o.dn=d;}}
  if(o.kind==='bend'||o.kind==='steelbend'){const a=t.match(/(\d{1,2})\s*(?:°|deg)/)||t.match(/coude\s*(\d{2})\b/);if(a&&+a[1]>0&&+a[1]<=90)o.angle=+a[1];if(!o.angle)o.angle=90;}
  if(o.kind==='pipe'){const L=t.match(/\b(6|12|16)\s*(?:m|ml|metres?)\b(?!\s*\d)/);if(L&&!o.len)o.len=+L[1];}
  if(!o.kind&&!o.dn)return null;if(!o.kind)o.kind='acc';if(o.kind==='acc')o.label=String(txt||'').replace(/\s+/g,' ').trim().slice(0,80);
  return o;}
function lineOf(o,qty,raw,unit){const x=Object.assign({},o,{qty:+qty||0,raw:String(raw||'').slice(0,140)});if(x.kind==='pipe'&&/^(m|ml|metres?|m\.?l\.?)$/i.test(String(unit||'').trim())&&x.qty){x.ml=x.qty;x.qty=Math.ceil(x.qty/(x.len||12));}x.label=x.kind==='acc'?(x.label||x.raw):fLabel(x);x.key=fKey(x);return x;}
/* lignes d'un tableau (Excel / CSV / collage) : en-tête reconnu (désignation, quantité, unité, DN, référence) ; sinon chaque ligne lue comme un texte */
export function parseOrderRows(rows){const L=[],bad=[];const low=r=>r.map(c=>NORM(c));let hi=rows.findIndex(r=>{const l=low(r);return l.some(c=>/designation|libelle|description|article|produit/.test(c))&&l.some(c=>/^qt|quantit|^qte/.test(c));});
  if(hi>=0){const H=low(rows[hi]);const f=re=>H.findIndex(c=>re.test(c));const iD=f(/designation|libelle|description|produit/)>=0?f(/designation|libelle|description|produit/):f(/article/);const iQ=f(/^qt|quantit|^qte/);const iU=f(/^u(nite)?s?\.?$|^unit/);const iDN=f(/^dn$|^diam|^ø/);const iR=f(/^ref|^code|^article/);
    rows.slice(hi+1).forEach(r=>{const des=[iR>=0&&iR!==iD?r[iR]:'',r[iD],iDN>=0?('DN'+String(r[iDN]||'').replace(/^dn\s*/i,'')):''].filter(Boolean).join(' ');if(!String(r[iD]||'').trim())return;if(/^total|^sous-total/i.test(NORM(r[iD])))return;const qty=num(r[iQ]);const o=parseOrderText(des);if(!o||qty===null){bad.push(r.filter(Boolean).join(' · '));return;}L.push(lineOf(o,qty,des,iU>=0?r[iU]:''));});return {lines:L,bad,mode:'tableau'};}
  rows.forEach(r=>{const txt=r.join(' ');const res=parseOrderLine(txt);if(res)L.push(res);else if(txt.trim())bad.push(txt.trim());});return {lines:L,bad,mode:'texte'};}
/* une ligne de texte (PDF, collage libre) : la quantité = le dernier nombre de la ligne (« 24 », « 24 pcs », « 96 ml ») */
function trailingQty(t){const tok=t.split(' ');let i=tok.length-1;const grp=[];let unit='';const isNum=x=>/^\d+(?:[.,]\d+)?$/.test(x);const isUnit=x=>/^(u|un|pcs?|pi[eè]ces?|unit[ée]s?|ml|m|barres?|ens|lots?)\.?$/i.test(x);
  while(i>=0){const x=tok[i];if(isNum(x)){grp.unshift({n:num(x),dec:/[.,]\d/.test(x),i});i--;continue;}if(!unit&&isUnit(x)){unit=x.replace('.','');grp.unshift({unit:true,i});i--;continue;}if(/^(€|eur|ht|ttc)$/i.test(x)&&grp.length){i--;continue;}break;}
  const nums=grp.filter(g=>!g.unit);if(!nums.length)return null;let pick=null;const ui=grp.findIndex(g=>g.unit);
  if(ui>0&&!grp[ui-1].unit&&grp.slice(ui+1).every(g=>g.dec))pick=grp[ui-1];else unit='';
  if(!pick)pick=nums.length>=2&&nums.slice(1).some(g=>g.dec)?nums[0]:nums[nums.length-1];
  return {qty:pick.n,unit,head:tok.slice(0,grp[0].i).join(' ').trim()};}
export function parseOrderLine(txt){const t=String(txt||'').replace(/\s+/g,' ').trim();if(!t)return null;const Q=trailingQty(t);if(!Q||!Q.head||!(Q.qty>0))return null;
  const o=parseOrderText(Q.head);if(!o||o.kind==='acc')return null; /* texte libre : une pièce reconnue (mot-clé ou code fournisseur), sinon « non reconnue » */return lineOf(o,Q.qty,Q.head,Q.unit);}
function parsePdfText(txt){const R=parseBL(txt);if(R&&R.fmt&&R.lines.length)return {lines:R.lines.map(l=>{const o={kind:l.kind,dn:l.dn,dn2:l.dn2,angle:l.angle,len:l.len,gaine:l.gaine,label:l.label};return lineOf(o,l.qty,l.raw||l.label,'');}),bad:R.others||[],mode:'BL '+R.fmt.toUpperCase()};
  const L=[],bad=[];String(txt||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(s=>{const r=parseOrderLine(s);if(r)L.push(r);else if(/\d/.test(s)&&/[a-z]{4}/i.test(s))bad.push(s);});return {lines:L,bad:bad.slice(0,40),mode:'texte'};}
async function pdfText(f){const lib=await A.loadPdfJs();const doc=await lib.getDocument({data:await f.arrayBuffer()}).promise;let txt='';
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();const rows=new Map();tc.items.forEach(it=>{const y=Math.round(it.transform[5]/3)*3;if(!rows.has(y))rows.set(y,[]);rows.get(y).push({x:it.transform[4],s:it.str});});
    [...rows.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,items])=>{txt+=items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ')+'\n';});}return txt;}
const KINDS=[['pipe','Barre (12 m)'],['bend','Coude'],['tee','Té'],['reducer','Réduction'],['valve','Vanne'],['kit','Kit fin de ligne'],['sleeve','Manchon'],['pu','Mousse PU (A+B)'],['steelbend','Courbe acier'],['bypass','By-pass'],['dhec','DHEC'],['wall','Passage de mur'],['acc','Autre / accessoire']];
const kindSel=(v,attr)=>`<select class="f" ${attr} style="padding:4px 6px;font-size:12px">${KINDS.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select>`;
const dnSel=(v,attr,blank)=>`<select class="f" ${attr} style="padding:4px 6px;font-size:12px">${blank?'<option value="">—</option>':''}${DNS.map(d=>`<option${+v===d?' selected':''}>${d}</option>`).join('')}</select>`;
function openCmd(id){const F=fournOf();const src=id?F.cmds.find(c=>c.id===id):null;const st={name:src?src.name:'Commande '+(live(F.cmds).length+1),ref:src?src.ref||'':'',date:src?src.date||'':today(),file:src?src.file||'':'',lines:src?(src.lines||[]).map(x=>Object.assign({},x)):[],bad:[],info:'',mode:'file'};
  const keep=()=>{const g=i=>document.getElementById(i);if(g('fc-name'))st.name=g('fc-name').value;if(g('fc-ref'))st.ref=g('fc-ref').value;if(g('fc-date'))st.date=g('fc-date').value;};
  const fix=x=>{x.label=x.kind==='acc'?(x.label||x.raw||'Accessoire'):fLabel(x);x.key=fKey(x);return x;};
  const rd=()=>{keep();const n=st.lines.reduce((t,x)=>t+(+x.qty||0),0);
    A.openModal(`<h3 style="margin-top:0">${src?'Commande':'Importer une commande'}</h3>
     <div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:140px"><label class="f">Nom</label><input class="f" id="fc-name" value="${esc(st.name)}"></div><div style="flex:0 0 120px"><label class="f">N° de commande</label><input class="f" id="fc-ref" value="${esc(st.ref)}"></div><div style="flex:0 0 150px"><label class="f">Date</label><input class="f" type="date" id="fc-date" value="${esc(st.date)}"></div></div>
     <div class="seg" style="display:flex;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;margin:8px 0">${[['file','Fichier'],['paste','Coller'],['add','Saisir']].map(([k,t])=>`<div data-fcm="${k}" style="flex:1;text-align:center;padding:7px 4px;font-size:12px;font-weight:700;cursor:pointer;${st.mode===k?'background:var(--ink);color:#fff':''}">${t}</div>`).join('')}</div>
     ${st.mode==='file'?`<label class="f">Commande / accusé de réception (Excel .xlsx, CSV, PDF avec texte)</label><input class="f" type="file" id="fc-file" accept=".xlsx,.csv,.txt,.pdf,application/pdf,text/csv">`:st.mode==='paste'?`<label class="f">Colle les lignes copiées depuis Excel (avec l'en-tête : désignation, quantité…)</label><textarea class="f" id="fc-paste" style="min-height:90px" placeholder="Désignation	Qté	Unité&#10;Tube acier pré-isolé DN100 12 m	24	u"></textarea><button class="btn sm" id="fc-read" style="margin-top:4px">Lire</button>`:`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Pièce</label>${kindSel('pipe','id="fc-k"')}</div><div><label class="f">DN</label>${dnSel(100,'id="fc-dn"')}</div><div><label class="f">DN 2 / angle</label><input class="f" id="fc-x" style="width:70px" placeholder="—"></div><div><label class="f">Qté</label><input class="f" id="fc-q" type="number" value="12" style="width:70px"></div><button class="btn" id="fc-add">Ajouter</button></div>`}
     ${st.info?`<div class="hint" style="margin-top:4px">${st.info}</div>`:''}
     <div style="margin-top:8px;overflow:auto;max-height:36vh">${st.lines.length?`<table class="rc"><tr><th>Ligne lue</th><th>Pièce</th><th>DN</th><th>DN2 / °</th><th>Qté</th><th></th></tr>${st.lines.map((x,i)=>`<tr><td style="font-size:11px;max-width:180px">${esc(x.raw||x.label)}${x.ml?`<div class="dim">${q(x.ml)} ml → ${q(x.qty)} barres</div>`:''}</td><td>${kindSel(x.kind,`data-fck="${i}"`)}</td><td>${x.kind==='acc'?'—':dnSel(x.dn,`data-fcd="${i}"`,true)}</td><td>${x.kind==='bend'||x.kind==='steelbend'?`<input class="f" data-fcx="${i}" value="${x.angle||90}" style="width:52px;padding:4px">`:x.kind==='tee'||x.kind==='reducer'?dnSel(x.dn2,`data-fcx="${i}"`,true):'—'}</td><td><input class="f" type="number" data-fcq="${i}" value="${x.qty}" style="width:66px;padding:4px"></td><td><button class="btn sm" data-fcdel="${i}" style="color:#9b2c22">✕</button></td></tr>`).join('')}</table>`:'<div class="dim" style="font-size:12px">Aucune ligne pour l\'instant.</div>'}</div>
     ${st.bad.length?`<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;color:#7a5200">${st.bad.length} ligne${st.bad.length>1?'s':''} non reconnue${st.bad.length>1?'s':''} (à saisir si ce sont des pièces)</summary><div class="dim" style="font-size:11px;line-height:1.5">${st.bad.slice(0,30).map(esc).join('<br>')}</div></details>`:''}
     <div class="hint" style="margin-top:4px">${st.lines.length} ligne${st.lines.length>1?'s':''} · ${q(n)} pièces. Vérifie chaque ligne : jamais d'import aveugle.</div>
     <div class="actions" style="margin-top:8px"><button class="btn primary block" id="fc-ok">Enregistrer la commande</button>${src?'<button class="btn block" id="fc-del" style="color:#9b2c22">Supprimer cette commande</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
    const M=document.getElementById('modal');M.querySelectorAll('[data-fcm]').forEach(b=>b.onclick=()=>{st.mode=b.dataset.fcm;rd();});
    const fi=document.getElementById('fc-file');if(fi)fi.onchange=async()=>{const f=fi.files[0];if(!f)return;st.file=f.name;st.info='Lecture de '+esc(f.name)+'…';rd();
      try{let R;if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){const txt=await pdfText(f);R=parsePdfText(txt);if(!txt.trim())st.info='<b style="color:#8a1f1f">PDF sans texte (scanné)</b> : saisis les lignes ou demande l\'Excel au fournisseur.';}
        else if(/\.xlsx$/i.test(f.name)){R=parseOrderRows(await xlsxRows(f,{grid:true}));}else{R=parseOrderRows(pasteRows(await f.text()));}
        if(R){R.lines.forEach(x=>st.lines.push(x));st.bad=R.bad||[];if(!st.info||/Lecture/.test(st.info))st.info=`<b>${R.lines.length}</b> ligne${R.lines.length>1?'s':''} reconnue${R.lines.length>1?'s':''} (${esc(R.mode)})${R.bad&&R.bad.length?' · '+R.bad.length+' non reconnue'+(R.bad.length>1?'s':''):''} — vérifie les pièces, DN et quantités.`;}}
      catch(err){console.warn(err);st.info='<b style="color:#8a1f1f">Fichier illisible ici</b> ('+esc(err.message||err)+') — colle les lignes depuis Excel.';}rd();};
    const pr=document.getElementById('fc-read');if(pr)pr.onclick=()=>{const R=parseOrderRows(pasteRows(document.getElementById('fc-paste').value));R.lines.forEach(x=>st.lines.push(x));st.bad=R.bad;st.info=`<b>${R.lines.length}</b> ligne${R.lines.length>1?'s':''} reconnue${R.lines.length>1?'s':''}${R.bad.length?' · '+R.bad.length+' non reconnue'+(R.bad.length>1?'s':''):''}.`;rd();};
    const ad=document.getElementById('fc-add');if(ad)ad.onclick=()=>{const k=document.getElementById('fc-k').value;const x={kind:k,dn:k==='acc'?undefined:+document.getElementById('fc-dn').value,qty:Math.max(1,+document.getElementById('fc-q').value||1)};const v2=+document.getElementById('fc-x').value||0;if(k==='bend'||k==='steelbend')x.angle=v2&&v2<=90?v2:90;if((k==='tee'||k==='reducer')&&DNSET.has(v2))x.dn2=v2;if(k==='acc')x.label=prompt('Désignation de l\'accessoire ?')||'Accessoire';fix(x);x.raw=x.label;st.lines.push(x);rd();};
    M.querySelectorAll('[data-fck]').forEach(s2=>s2.onchange=()=>{const x=st.lines[+s2.dataset.fck];x.kind=s2.value;if(x.kind==='acc'){x.label=x.label||x.raw;}fix(x);rd();});
    M.querySelectorAll('[data-fcd]').forEach(s2=>s2.onchange=()=>{const x=st.lines[+s2.dataset.fcd];x.dn=+s2.value||undefined;fix(x);});
    M.querySelectorAll('[data-fcx]').forEach(s2=>s2.onchange=()=>{const x=st.lines[+s2.dataset.fcx];const v2=+s2.value||0;if(x.kind==='bend'||x.kind==='steelbend')x.angle=v2&&v2<=90?v2:90;else x.dn2=v2||undefined;fix(x);});
    M.querySelectorAll('[data-fcq]').forEach(s2=>s2.onchange=()=>{st.lines[+s2.dataset.fcq].qty=Math.max(0,+s2.value||0);});
    M.querySelectorAll('[data-fcdel]').forEach(b=>b.onclick=()=>{st.lines.splice(+b.dataset.fcdel,1);rd();});
    document.getElementById('fc-ok').onclick=()=>{keep();const lines=st.lines.filter(x=>+x.qty>0).map(x=>{fix(x);return {key:x.key,kind:x.kind,dn:x.dn,dn2:x.dn2,angle:x.angle,len:x.len,gaine:x.gaine,qty:+x.qty,label:x.label,raw:x.raw||'',ml:x.ml};});
      if(!lines.length){A.toast('Aucune ligne');return;}const F2=fournOf();const at=nowIso();
      if(src){const c=F2.cmds.find(x=>x.id===src.id);if(c)Object.assign(c,{name:st.name,ref:st.ref,date:st.date,file:st.file,lines,upd:at});}
      else F2.cmds.push({id:nid('FC'),name:st.name||'Commande',ref:st.ref,date:st.date,file:st.file,lines,at,by:who(),upd:at});
      save();A.closeModal();(A.state.fournUI||(A.state.fournUI={})).cmd=true;renderFourniture();A.toast('✓ Commande enregistrée : '+lines.length+' ligne'+(lines.length>1?'s':''));};
    const dl=document.getElementById('fc-del');if(dl)dl.onclick=()=>{if(!confirm('Supprimer la commande « '+src.name+' » ?'))return;const F2=fournOf();const c=F2.cmds.find(x=>x.id===src.id);if(c){c.deleted=true;c.upd=nowIso();}save();A.closeModal();renderFourniture();};};
  rd();}
function openExtra(){A.openModal(`<h3 style="margin-top:0">Pièces en plus</h3><div class="hint" style="margin-bottom:6px">Ce qu'il faut en plus du tracé : casse, chutes, coupes ratées, réserve, modif terrain pas encore dessinée. Ajouté au besoin du comparatif.</div>
   <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Pièce</label>${kindSel('pipe','id="fx-k"')}</div><div><label class="f">DN</label>${dnSel(100,'id="fx-dn"')}</div><div><label class="f">DN 2 / angle</label><input class="f" id="fx-x" style="width:70px" placeholder="—"></div><div><label class="f">Qté</label><input class="f" id="fx-q" type="number" value="1" style="width:70px"></div></div>
   <label class="f">Motif</label><select class="f" id="fx-why">${['Casse / pièce abîmée','Chutes et coupes','Réserve chantier','Modif terrain (pas encore au tracé)','Autre'].map(x=>`<option>${x}</option>`).join('')}</select><input class="f" id="fx-note" placeholder="Précision (option)" style="margin-top:6px">
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="fx-ok">Ajouter</button><button class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('fx-ok').onclick=()=>{const k=document.getElementById('fx-k').value;const x={kind:k,dn:k==='acc'?undefined:+document.getElementById('fx-dn').value,qty:Math.max(1,+document.getElementById('fx-q').value||1)};const v2=+document.getElementById('fx-x').value||0;if(k==='bend'||k==='steelbend')x.angle=v2&&v2<=90?v2:90;if((k==='tee'||k==='reducer')&&DNSET.has(v2))x.dn2=v2;
    const note=(document.getElementById('fx-note').value||'').trim();if(k==='acc')x.label=note||'Accessoire';x.label=k==='acc'?x.label:fLabel(x);x.key=fKey(x);const F=fournOf();const at=nowIso();F.extra.push(Object.assign({id:nid('FX'),why:document.getElementById('fx-why').value+(note&&k!=='acc'?' — '+note:''),at,by:who(),upd:at},x));save();A.closeModal();(A.state.fournUI||(A.state.fournUI={})).extra=true;renderFourniture();A.toast('Ajouté au besoin');};}

/* ---------- entourer une zone sur le plan : un point par toucher, « Fermer » (ou toucher le 1er point) ---------- */
export function fzStartPose(){if(!fzCanEdit()){A.toast('Réservé au chef / bureau');return;}if(!Object.keys(A.lines()||{}).length){A.toast('Aucun réseau dans ce chantier');return;}A.endOtherPoses&&A.endOtherPoses();A.state.fzPose={pts:[]};A.state.tab='plan';A.renderAll();updateFzBar();A.toast('Touche le plan autour de la partie à livrer : un point à chaque toucher');}
export function fzEndPose(back){A.state.fzPose=null;updateFzBar();if(back!==false){A.state.tab='fourniture';A.renderAll();}else A.renderPlan();}
export function updateFzBar(){const bar=document.getElementById('fzBar');if(!bar)return;const p=A.state.fzPose;bar.style.display=p?'flex':'none';if(!p)return;const n=p.pts.length;
  document.getElementById('fzMsg').textContent=n<3?`⭕ Entoure la zone : ${n} point${n>1?'s':''} (il en faut 3 au moins) — zoome / déplace entre deux points`:`⭕ ${n} points — « Fermer » (ou touche le 1er point) pour terminer`;
  document.getElementById('fzOk').style.display=n>=3?'':'none';document.getElementById('fzUndo').style.display=n?'':'none';}
export function fzTap(wx,wy){const p=A.state.fzPose;if(!p)return;const k=A.state.view.k||1;if(p.pts.length>=3){const f=p.pts[0];if(Math.hypot(f[0]-wx,f[1]-wy)*k<16){fzClose();return;}}p.pts.push([+wx.toFixed(2),+wy.toFixed(2)]);updateFzBar();A.renderPlan();}
export function fzUndo(){const p=A.state.fzPose;if(!p||!p.pts.length)return;p.pts.pop();updateFzBar();A.renderPlan();}
export function fzClose(){const p=A.state.fzPose;if(!p||p.pts.length<3)return;const poly=p.pts.slice();A.state.fzPose=null;updateFzBar();A.renderPlan();const F=fournOf();const n=live(F.zones).length+1;
  const mon=(()=>{const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));return isoD(d);})();
  A.openModal(`<h3 style="margin-top:0">⭕ Nouvelle zone à livrer</h3><label class="f">Nom</label><input class="f" id="fzn-name" value="Zone ${String.fromCharCode(64+Math.min(26,n))}"><label class="f">Début du soudage (sert à dater les camions)</label><input class="f" type="date" id="fzn-date" value="${mon}">
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="fzn-ok">Créer la zone</button><button class="btn block" id="fzn-x">Annuler</button></div>`);
  document.getElementById('fzn-x').onclick=()=>{A.closeModal();};
  document.getElementById('fzn-ok').onclick=()=>{const F2=fournOf();const at=nowIso();const z={id:nid('FZ'),name:(document.getElementById('fzn-name').value||'').trim()||'Zone '+n,poly,date:document.getElementById('fzn-date').value||null,at,by:who(),upd:at};F2.zones.push(z);save();A.closeModal();A.state.tab='fourniture';const UI=A.state.fournUI||(A.state.fournUI={});UI.zones=true;A.renderAll();openZone(z.id);};}
/* calque du plan : zones entourées (pointillés) + la zone en cours de tracé */
export function renderFzOverlay(g){if(!g||!A)return;const k=A.state.view.k||1;const N=A.net();let out='';const show=!A.state.show||A.state.show.fourn!==false;
  const F=N&&N.id!=='__vide'&&N.fourniture?fournOf():null;
  if(F&&show)live(F.zones).forEach((z,i)=>{if(!(z.poly&&z.poly.length>2))return;const col=z.color||ZCOL[i%ZCOL.length];const d=zDate(z);
    out+=`<polygon points="${z.poly.map(p=>p[0]+','+p[1]).join(' ')}" fill="${col}" fill-opacity=".08" stroke="${col}" stroke-width="${2/k}" stroke-dasharray="${8/k} ${5/k}" style="pointer-events:none"/>`;const b=bboxOf(z.poly);const t=z.name+(d?' · '+dFR(d).slice(0,5):'');const w=t.length*6.2+14;
    out+=`<g transform="translate(${(b[0]+b[2])/2} ${b[1]}) scale(${1/k})" style="pointer-events:none"><rect x="${-w/2}" y="-22" width="${w}" height="16" rx="8" fill="${col}" opacity=".92"/><text y="-10.5" font-size="10" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">📦 ${A.esc(t)}</text></g>`;});
  const p=A.state.fzPose;if(p&&p.pts.length){const P=p.pts;out+=`<polyline points="${P.map(x=>x[0]+','+x[1]).join(' ')}${P.length>2?' '+P[0][0]+','+P[0][1]:''}" fill="rgba(235,104,52,.10)" stroke="#eb6834" stroke-width="${2.4/k}" stroke-dasharray="${P.length>2?'0':(6/k)+' '+(4/k)}" style="pointer-events:none"/>`+P.map((x,i)=>`<circle cx="${x[0]}" cy="${x[1]}" r="${(i===0?8:5)/k}" fill="${i===0?'#eb6834':'#fff'}" stroke="#eb6834" stroke-width="${2/k}" style="pointer-events:none"/>`).join('');}
  g.innerHTML=out;}
