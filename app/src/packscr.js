// packscr.js — 14/10 nuit : IMPORT DU « PACK SCR » (données privées) — administrateur seulement.
// Le site et le dépôt sont publics : aucune donnée réelle de SCR n'est dans le code. Le contenu réel (catalogue du magasin, documents d'accueil et livrets,
// chartes et inventaires véhicules, bibliothèque du mémoire technique, paramètres de l'ancien tableau de chiffrage) arrive par CE fichier JSON privé,
// rangé sur le PC d'Ethan (RCU-COMPAGNON\prive\, ignoré par git), importé ici et stocké dans le registre (serveur).
// Format : {format:'trace-pack-scr', version, magasin:{catalogue,formulaires,dotations}, accueil:{documents,livrets,passeport,textes},
//          vehicule:{reception,entretien,textes}, memoire:{blocs,style}, chiffrageV1:{taux,…}} — chaque partie est facultative.
import acc from './accueil_rh.js';
import veh from './reception.js';
import mag from './magasin.js';
import {memoirePack} from './memoire2.js';
import {v1Pack} from './affaires.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PARTS=()=>[acc&&acc.pack,veh&&veh.pack,mag&&mag.pack,memoirePack,v1Pack].filter(p=>p&&p.key&&p.import);
const ST={pack:null,name:'',size:0,err:'',sel:{},busy:false,res:null};
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' Mo':Math.max(1,Math.round(n/1024))+' Ko';
const partSize=p=>{try{return JSON.stringify(p).length;}catch(e){return 0;}};
function view(me,ctx){
  if(!me.admin)return `<h2 class="vt">Pack SCR</h2><div class="card"><div class="eq-s">Réservé à l'administrateur.</div></div>`;
  const ro=ctx.viewing();const P=ST.pack;const parts=PARTS();
  const found=P?parts.filter(p=>P[p.key]!==undefined&&P[p.key]!==null):[];
  return `<h2 class="vt">Pack SCR <span class="hint">· données privées de l'entreprise</span></h2>
  <div class="card"><h3>Pourquoi un pack</h3><div class="eq-s">Le site de l'appli est public : rien de confidentiel n'est dans son code. Le catalogue du magasin, les documents d'accueil, les chartes et inventaires véhicules, la bibliothèque du mémoire technique et les paramètres de l'ancien tableau de chiffrage arrivent par ce fichier privé (<b>RCU-COMPAGNON\\prive\\pack_scr_….json</b> sur ton PC, jamais envoyé sur GitHub). Il est importé ici, une fois, puis vit sur le serveur. Réimporter met à jour sans doublon (les signatures et le stock gardent leur historique).</div></div>
  <div class="card"><h3>1 · Choisir le fichier</h3>${ro?'<div class="eq-s">Lecture seule (« voir comme »).</div>':`<label class="btn primary" style="display:inline-flex;align-items:center;gap:6px">📂 Choisir le pack (.json)<input type="file" accept=".json,application/json" data-xin="pack|file" style="display:none"></label>`}
    ${ST.name?`<div class="hint" style="margin-top:6px">${esc(ST.name)} · ${kb(ST.size)}${P&&P.version?' · version '+esc(P.version):''}</div>`:''}${ST.err?`<div class="warnbox" style="margin-top:6px">${esc(ST.err)}</div>`:''}</div>
  ${P?`<div class="card"><h3>2 · Ce qui sera importé</h3>${found.length?found.map(p=>`<label class="ac-row" style="cursor:pointer"><span class="tx"><b><input type="checkbox" data-xin="pack|sel" data-k="${esc(p.key)}" ${ST.sel[p.key]!==false?'checked':''} ${ro||ST.busy?'disabled':''}> ${esc(p.label||p.key)}</b><small>partie « ${esc(p.key)} » · ${kb(partSize(P[p.key]))}</small></span></label>`).join(''):'<div class="eq-s">Aucune partie reconnue dans ce fichier (attendu : magasin, accueil, vehicule, memoire, chiffrageV1).</div>'}
    ${found.length&&!ro?`<div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="x" data-v="pack|go" ${ST.busy?'disabled':''}>${ST.busy?'Import en cours…':'⬆ Importer'}</button><button class="btn" data-act="x" data-v="pack|clear" ${ST.busy?'disabled':''}>Annuler</button></div>`:''}</div>`:''}
  ${ST.res?`<div class="card"><h3>Résultat</h3>${ST.res.map(r=>`<div class="${r.ok?'okbox':'warnbox'}" style="margin:4px 0"><b>${esc(r.label)}</b> — ${esc(r.msg)}</div>`).join('')}<div class="hint" style="margin-top:6px">Les écritures partent au serveur (file d'attente si le réseau manque). Pense au SQL du 14/10 (registres magasin et véhicules), sinon elles restent en attente sur cet appareil.</div></div>`:''}`;}
async function go(me,ctx){if(!ST.pack||ST.busy)return;ST.busy=true;ST.res=null;ctx.render();const out=[];
  for(const p of PARTS()){const part=ST.pack[p.key];if(part===undefined||part===null||ST.sel[p.key]===false)continue;
    try{const msg=await p.import(part,ctx);out.push({ok:true,label:p.label||p.key,msg:String(msg||'importé')});}catch(e){console.warn('pack',p.key,e);out.push({ok:false,label:p.label||p.key,msg:'échec : '+(e&&e.message||e)});}}
  ST.busy=false;ST.res=out;ctx.toast(out.every(r=>r.ok)?'Pack importé ('+out.length+' partie'+(out.length>1?'s':'')+')':'Pack importé avec des erreurs — voir le résultat');ctx.render();}
export default {id:'pack',hub:'entreprise',
  hubRows(tab,me,ctx){if(tab!=='entreprise'||!me.admin)return [];return [ctx.row('Pack SCR (données privées)','Importer le fichier privé : magasin, documents d\'accueil, véhicules, mémoire technique, paramètres de chiffrage','📦','#ececea','x:pack:imp')];},
  xview(k,me,ctx){return view(me,ctx);},
  act(v,el,me,ctx){if(!me.admin||ctx.viewing())return;const [a,b]=String(v).split('|');
    if(a==='clear'){ST.pack=null;ST.name='';ST.size=0;ST.err='';ST.res=null;ST.sel={};ctx.render();return;}
    if(a==='go'){go(me,ctx);return;}},
  input(f,el,me,ctx,type){if(f==='sel'){if(type==='change'&&el.dataset.k)ST.sel[el.dataset.k]=!!el.checked;return;}if(f!=='file'||type!=='change'||!me.admin||ctx.viewing())return;const file=el.files&&el.files[0];el.value='';if(!file)return;
    ST.name=file.name;ST.size=file.size;ST.err='';ST.res=null;ST.pack=null;ST.sel={};
    const r=new FileReader();r.onload=()=>{try{const P=JSON.parse(String(r.result||''));if(!P||typeof P!=='object'||Array.isArray(P))throw new Error('ce fichier n\'est pas un pack SCR');ST.pack=P;}catch(e){ST.err='Fichier illisible : '+(e&&e.message||e);}ctx.render();};
    r.onerror=()=>{ST.err='Lecture du fichier impossible';ctx.render();};r.readAsText(file);}};
