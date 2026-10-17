/* zonesch.js — 16/10 (lot TA, contrat K4) : ZONES DU TRACEUR ↔ ZONES DU CHIFFRAGE de l'affaire.
   Ethan (16/10) : « les zones c'est bien mais ça n'a pas reconnu les zones que j'avais déjà créées dans le tableau de chiffrage, les deux doivent être reliés ».
   · Traceur ouvert depuis une affaire (contexte « aff:<n°> ») : les zones du chiffrage de l'affaire sont lues sur l'appareil (registre « affaire » de l'appli, miroir
     IndexedDB trace:reg:affaire — même origine, hors connexion aussi) et montrées dans « ▦ Zones » ; « ＋ Créer une zone de chiffrage » propose aussi
     « mettre ces lignes dans une zone déjà créée dans le chiffrage : [Zone A ▾] ».
   · Une zone tracée garde l'id de sa zone du chiffrage : zone.ch (enregistré avec le tracé : site.traceur.zones[].ch). Lien : par cet id, sinon par le lien posé par
     l'appli (zone du chiffrage z.qt = {site, kind:'zone', ref:<id de la zone tracée>}), sinon par le nom — une zone du chiffrage ne sert qu'à UNE zone tracée.
   · Le nom d'une zone du chiffrage n'est jamais changé par le traceur ; une zone tracée nouvelle prend un nom libre (pas celui d'une zone du chiffrage existante).
   · Côté appli : src/qzones.js (« Créer les zones du chiffrage depuis le tracé » met à jour les zones liées au lieu d'en créer de nouvelles). */
import {kv} from '../src/kv.js';
let A=null,T1=null;let CH=null,CHat=0,CHst='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const S=()=>A.state;const etude=()=>!!A&&String(A.CTX||'').startsWith('aff:');const AFF=()=>etude()?String(A.CTX).slice(4):'';
const zNum=z=>parseInt(String(z.id).replace(/\D/g,''),10)||1;
const lecture=z=>!!(z&&(z.source==='quantites'||z.fromPoints));
/* zones du chiffrage de l'affaire (miroir de l'appareil) → [{id, nom, qt}] ; état : '' (lu) | 'absente' (affaire pas sur cet appareil) | 'illisible' */
export async function loadCh(force){if(!etude())return [];if(CH&&!force&&Date.now()-CHat<8000)return CH;
  try{const R=await kv.get('trace:reg:affaire');const row=R&&R[AFF()];const d=row&&row.data;if(!d||d.deleted){CH=[];CHst='absente';}else{CH=(((d.chiffrage||{}).etudes)||[]).filter(z=>z&&z.id&&!lecture(z)).map(z=>({id:String(z.id),nom:String(z.nom||z.id),qt:z.qt||null}));CHst='';}}
  catch(e){CH=CH||[];CHst='illisible';}
  CHat=Date.now();refresh();return CH;}
export const chZones=()=>CH||[];
/* appariement global : zone tracée → zone du chiffrage (par id, puis lien de l'appli, puis nom), chaque zone du chiffrage au plus une fois */
export function links(){const out=new Map();const L=CH||[];const used=new Set();const Z=S().zones||[];const sid=S().siteRef&&S().siteRef.id;
  const pass=(f,by)=>Z.forEach(tz=>{if(out.has(tz.id))return;const z=L.find(c=>!used.has(c.id)&&f(c,tz));if(z){used.add(z.id);out.set(tz.id,{z,by});}});
  pass((c,tz)=>tz.ch&&c.id===tz.ch,'id');if(sid)pass((c,tz)=>c.qt&&c.qt.kind==='zone'&&c.qt.site===sid&&String(c.qt.ref)===String(tz.id),'lien');pass((c,tz)=>key(c.nom)===key(tz.nom),'nom');return out;}
const tracedOf=chId=>{const lk=links();return (S().zones||[]).find(z=>{const x=lk.get(z.id);return x&&x.z.id===chId;})||null;};
// nom libre pour une zone tracée NOUVELLE (pas celui d'une zone du chiffrage existante : elle s'y relierait par le nom)
export function freeName(nom){if(!etude()||!CH||!CH.length)return nom;const taken=new Set((CH||[]).map(c=>key(c.nom)).concat((S().zones||[]).map(z=>key(z.nom))));if(!taken.has(key(nom)))return nom;let n=parseInt(String(nom).replace(/\D/g,''),10)||1;let t;do{t='Zone '+(++n);}while(taken.has(key(t)));return t;}
/* repère dans la liste des zones tracées */
export function tagHTML(tz){if(!etude()||!CH)return '';const x=links().get(tz.id);if(!x)return `<small class="zx-tag zx-new" title="sera créée dans le chiffrage (« Créer les zones du chiffrage depuis le tracé », onglet Quantités de l'affaire)">nouvelle</small>`;
  return `<small class="zx-tag" title="reliée à la zone « ${esc(x.z.nom)} » du chiffrage de l'affaire ${esc(AFF())} (${x.by==='id'?'même zone':x.by==='lien'?'créée depuis ce tracé':'même nom'})">↔ ${x.z.nom===tz.nom?'chiffrage':'« '+esc(x.z.nom)+' »'}</small>`;}
/* section « Zones du chiffrage » sous la liste des zones tracées */
export function listHTML(){if(!etude())return '';if(!CH)return `<div class="muted zx-sec">Zones du chiffrage : lecture…</div>`;
  if(CHst==='absente')return `<div class="note info zx-sec">Affaire ${esc(AFF())} pas sur cet appareil : ouvre-la une fois dans l'appli pour voir les zones déjà créées dans son chiffrage.</div>`;
  const ids=multi();const lk=links();const used=new Map();lk.forEach((x,tid)=>used.set(x.z.id,tid));
  return `<div class="zx-sec"><h4 style="margin-top:8px">Zones du chiffrage de l'affaire ${esc(AFF())} (${CH.length})</h4>${CH.length?CH.map(c=>{const tid=used.get(c.id);const tz=tid?(S().zones||[]).find(z=>z.id===tid):null;
    return `<div class="t1-zone zx-ch" data-zx="sel" data-ch="${esc(c.id)}"><span class="zx-ic">${tz?'↔':'○'}</span><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(c.nom)}</b><small>${tz?`tracée : ${tz.lines.length} l.`:'pas encore de lignes'}</small>${ids.length?`<button class="btn sm" data-zx="put" data-ch="${esc(c.id)}" title="mettre les ${ids.length} ligne(s) sélectionnée(s) dans « ${esc(c.nom)} »">＋ sélection</button>`:''}</div>`;}).join('')
    :'<div class="muted">Aucune zone dans le chiffrage de l\'affaire (onglet Chiffrage) : les zones créées ici y seront ajoutées par « Créer les zones du chiffrage depuis le tracé ».</div>'}</div>`;}
const multi=()=>{const s=S().sel;return s&&s.kind==='lines'?s.ids.filter(id=>S().lines.some(l=>l.id===id)):[];};
/* sous « ＋ Créer une zone de chiffrage » (sélection de lignes) */
export function pickHTML(ids){if(!etude()||!CH||!CH.length||!ids||!ids.length)return '';
  return `<div class="t1-row zx-pick"><span class="muted" style="flex-basis:100%;font-size:12px">ou mettre ces lignes dans une zone déjà créée dans le chiffrage :</span><select class="f" data-zx="pick" data-ids="${esc(ids.join(','))}" style="flex:1;min-width:0">${CH.map(c=>`<option value="${esc(c.id)}">${esc(c.nom)}${tracedOf(c.id)?' (déjà tracée)':''}</option>`).join('')}</select><button class="btn" data-zx="putSel" data-ids="${esc(ids.join(','))}">Mettre dans cette zone</button></div>`;}
/* les lignes ids → zone tracée reliée à la zone du chiffrage chId (créée au besoin, avec zone.ch) — UNE étape */
export function putIn(ids,chId){const c=(CH||[]).find(x=>x.id===chId);ids=(ids||[]).filter(id=>S().lines.some(l=>l.id===id));if(!c||!ids.length)return null;T1.hist.flush();const st=S();
  let tz=tracedOf(chId);if(!tz){const n=Math.max(0,...st.zones.map(zNum))+1;tz={id:'z'+n,nom:c.nom,lines:[],ch:c.id};st.zones.push(tz);}else if(!tz.ch)tz.ch=c.id;
  st.zones.forEach(z=>{z.lines=z.lines.filter(id=>!ids.includes(id));});tz.lines=tz.lines.concat(ids);
  const of=ids.length===1?`« ${(st.lines.find(l=>l.id===ids[0])||{}).name||ids[0]} »`:`${ids.length} lignes`;T1.hist.label(`${of} dans « ${c.nom} » (zone du chiffrage)`);A.rebuild();
  A.flash(`${of} dans « ${c.nom} » — zone du chiffrage de l'affaire ${AFF()} (reliée)`);return tz;}
// zones envoyées au chantier (bridge.js) : chaque zone tracée reliée porte l'id de sa zone du chiffrage
export function forBridge(Z){if(!etude()||!CH)return Z;const lk=links();return (Z||[]).map(z=>{const x=lk.get(z.id);return x&&!z.ch?Object.assign({},z,{ch:x.z.id}):z;});}
function refresh(){if(!A)return;try{A.render();A.renderPanel();}catch(e){}}
const CSS=`.zx-tag{display:inline-block;border-radius:999px;padding:0 6px;font-size:10.5px;font-weight:700;background:#e6f5ec;color:#15673a;white-space:nowrap}.zx-tag.zx-new{background:#fff3d6;color:#7a5200}
.zx-ch{cursor:default}.zx-ch .zx-ic{width:16px;text-align:center;color:#15673a;font-weight:700}.zx-pick select.f{max-width:100%}`;
export function init(api){A=api;T1=api.T1;if(!document.getElementById('css-lot-ta-z')){const s=document.createElement('style');s.id='css-lot-ta-z';s.textContent=CSS;document.head.appendChild(s);}
  if(!etude())return;loadCh(true);
  const zb=document.getElementById('t1Zones');if(zb)zb.addEventListener('click',()=>{loadCh();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadCh(true);}); // retour depuis l'appli (autre onglet) : zones du chiffrage relues
  ['#panel','#t1Float'].forEach(s=>{const el=document.querySelector(s);if(!el)return;
    el.addEventListener('click',e=>{const b=e.target.closest('[data-zx]');if(!b||b.tagName==='SELECT')return;const k=b.dataset.zx;
      if(k==='put'){e.stopPropagation();putIn(multi(),b.dataset.ch);}
      else if(k==='putSel'){const sel=b.parentElement.querySelector('[data-zx="pick"]');putIn(String(b.dataset.ids||'').split(',').filter(Boolean),sel&&sel.value);}});});
  Promise.resolve().then(()=>{if(window.MAQ)window.MAQ.zonesCh={load:loadCh,list:chZones,links:()=>[...links()].map(([t,x])=>({tz:t,ch:x.z.id,by:x.by})),putIn,freeName};});}
