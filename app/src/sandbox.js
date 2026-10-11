// sandbox.js — BAC À SABLE (10/10, Ethan : « ça devient dur de tester sans créer des scénarios ; il faut des fausses données injectables et enlevables,
// jamais mélangées aux vraies »). Sur le VRAI logiciel, connecté en administrateur : un interrupteur crée un chantier de démonstration (« demo_caen »)
// et rend les personnages de démo (Karim B., Julien R., Ethan L., Sophie M.) sélectionnables dans « 👁 Voir l'appli comme » — en AGISSANT comme eux.
// Règle d'étanchéité : tout ce qui touche un chantier « demo_… » ou une personne « l:… » reste sur l'appareil (sync.js, saveNetPart, planning, pointages,
// fiches, registre). « Retirer le bac à sable » efface tout ça d'un coup ; les vraies données ne bougent jamais.
import BUILTIN from './sites.json'; /* chantiers de démonstration intégrés (Bain-de-Bretagne, Saint-Lô) : modèle du chantier bac à sable, même si Ethan les a masqués sur son appareil */
let A=null;
export function initSandbox(api){A=api;}
export const SB_SITE='demo_caen';
const KEY='trace:sandbox';const KV_SITE='trace:sandbox:site';
export const isSandboxOn=()=>{try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}};
export const isSandboxSite=id=>typeof id==='string'&&id.startsWith('demo_');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sandboxPersist(net){if(!net||!isSandboxSite(net.id))return;try{A.kv.set(KV_SITE,net);}catch(e){}}
export async function sandboxLoadSite(){if(!isSandboxOn())return null;try{const net=await A.kv.get(KV_SITE);if(net&&net.id&&net.lines){net.sandbox=true;return net;}}catch(e){}return null;}
/* le chantier de démo : copie du premier chantier de démonstration intégré (réseau réel, statuts semés), rebaptisé, étanche */
function makeSite(){const src=(BUILTIN&&(BUILTIN.bain||Object.values(BUILTIN).find(n=>n&&n.lines)))||null;if(!src)return null; /* copie du chantier de démo intégré : jamais un vrai chantier */
  const net=JSON.parse(JSON.stringify(src));const now=new Date().toISOString();const today=A.espace.today();
  net.id=SB_SITE;net.name='🧪 Démo — Caen Presqu\'île';net.sandbox=true;net.traceur=undefined;net.updated_at=now;delete net.handoff;delete net.sent;
  net.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan',horaires:'7 h 30 – 16 h 30, pause 12 h – 13 h',rassemblement:'base vie, rue de la Mer'};
  net.conv={msgs:[{id:'sb_m1',kind:'msg',by:'Ethan L.',text:'Bienvenue sur le chantier de démo — tout ce que tu fais ici reste sur ton appareil.',at:now},{id:'sb_t1',kind:'task',by:'Ethan L.',text:'Photos du DH tronçon 1 avant 15 h',task:{to:'tous',done:false},at:now}],seq:3};
  net.qse={docs:[]};net.admin={docs:[]};net.stock={zones:[],lots:[],livs:[{id:'sb_lv1',label:'Camion Renalia n° 3',bl:'BL-4471',date:today,status:'prevu',prevu:[{label:'Tube DN150',qty:20}]}],moves:[],takes:[]};
  net.missions={[today]:[{id:'sb_o1',type:'soud',label:'Souder le tronçon 1',h:6,who:['l:karim'],team:'A',by:'Ethan L.',at:now},{id:'sb_o2',type:'dech',label:'Décharger le camion de 10 h',h:2,who:[],by:'Ethan L.',at:now}]};
  return net;}
export async function sandboxOn(){if(isSandboxOn()&&A.sites()[SB_SITE]){A.toast('Le bac à sable est déjà en place');return false;}
  const net=makeSite();if(!net){A.toast('Aucun chantier de démonstration disponible pour servir de modèle');return false;}
  try{localStorage.setItem(KEY,'1');}catch(e){}A.state.sandbox=true;A.addSite(net);sandboxPersist(net);
  A.espace.seed(SB_SITE);
  try{A.qhs.trigger({topic:'scr06',date:A.espace.today(),sites:[SB_SITE],note:'séance de démonstration'});}catch(e){console.warn(e);}
  A.syncRoleSel();A.renderHome();A.toast('🧪 Bac à sable en place : chantier « Démo — Caen », Karim / Julien / Ethan L. placés, objectifs, livraison, quart d\'heure du jour');return true;}
export async function sandboxReset(){if(!isSandboxOn())return sandboxOn();await sandboxOff(false);return sandboxOn();}
export async function sandboxOff(reload){A.espace.clear();
  try{A.reg.purge('qhs',(id,d)=>Array.isArray(d.sites)&&d.sites.length&&d.sites.every(x=>isSandboxSite(x)));A.reg.purge('qhsig',(id,d)=>!String(id.split('|')[1]||'').includes('@'));A.reg.purge('docsig',(id,d)=>!String(id.split('|')[1]||'').includes('@'));}catch(e){console.warn(e);}
  if(A.currentSiteId()===SB_SITE)A.goHome();A.removeSite(SB_SITE);try{await A.kv.del(KV_SITE);}catch(e){}
  try{localStorage.removeItem(KEY);}catch(e){}A.state.sandbox=false;if(String(A.state.userId).length&&!String(A.state.userId).startsWith('acc:')&&A.state.userId!=='__me'&&A.state.profile)A.state.userId='__me';
  A.syncRoleSel();A.renderHome();A.toast('Bac à sable retiré : plus aucune donnée de test sur cet appareil');if(reload!==false)setTimeout(()=>location.reload(),600);return true;}
export function sandboxAct(k){if(k==='on')return sandboxOn();if(k==='reset')return sandboxReset();if(k==='off')return sandboxOff(true);}
export function sandboxHTML(){const on=isSandboxOn();const has=!!(A.sites()||{})[SB_SITE];
  return `<div class="card" style="border-color:${on?'#eb6834':'var(--line)'}"><h3 style="margin:0 0 4px">🧪 Bac à sable — données de test <span class="hint">${on?'· en place':'· éteint'}</span></h3>
    <div class="hint" style="margin:0 0 8px">Pour tester le vrai logiciel sans fabriquer des données à la main : un chantier de démonstration, des personnages de démo que tu pilotes vraiment (ils agissent, signent, pointent), un scénario prêt. <b>Rien de tout ça ne part au serveur</b> : tes collègues ne le voient pas, et « Retirer » efface tout d'un coup.</div>
    <div class="kv" style="font-size:12.5px;margin-bottom:8px"><span>📍 chantier « 🧪 Démo — Caen Presqu'île »${has?' (en place)':''}</span><span>👥 Karim B. (soudeur, équipe A), Julien R. (manchonneur, équipe B), Ethan L. (chef), Sophie M. (bureau)</span><span>📅 placés sur la démo toute la semaine</span><span>🎯 2 objectifs du jour · 🚚 livraison du jour · 💬 message + tâche · ⛑️ quart d'heure « Incendie » déclenché</span><span>⏱ Karim pointé au travail depuis 7 h 30</span></div>
    <div class="hint" style="margin-bottom:8px">Ensuite : « 👁 Voir l'appli comme » → groupe <b>Bac à sable</b> → Karim B. : tu es Karim (accueil, chantier démo, accueil chantier, quart d'heure, pointage…). Reviens sur ton compte pour valider ses pointages, poser des objectifs, faire un contrôle chantier.</div>
    <div class="actions" style="display:flex;gap:6px;flex-wrap:wrap">${on?`<button class="btn" data-sbx="reset">↻ Rejouer le scénario</button><button class="btn" data-sbx="off" style="color:#d03b3b">🗑 Retirer le bac à sable</button>`:`<button class="btn primary" data-sbx="on">🧪 Mettre en place le bac à sable</button>`}</div></div>`;}
export function sandboxBind(el){if(!el)return;el.querySelectorAll('[data-sbx]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await sandboxAct(b.dataset.sbx);}finally{b.disabled=false;}if(A.renderAdmin)A.renderAdmin();});}
