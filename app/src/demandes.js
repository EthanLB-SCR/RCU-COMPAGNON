// demandes.js — 31/10 (lot CC) : COMMANDES V1 SANS MAGASIN — demandes de matériel et suivi des remises. Ethan (scope V1 du 30/10) : « commandes (demandes + suivi
// des remises, sans magasin) ». Module branché sur l'espace (modules.js), option de palier « demandes » (Labo par défaut).
// CHOIX : un « mode sans magasin » du parcours existant, pas un 2e système — même registre que le magasin (« magdem », id « <clé personne>|<id> »), mêmes champs
// (byKey, byName, at, statut, lignes [{ref, label, qte, remis}], imputation {type:'chantier', id, label}, note, urgent, histo), avec circuit:'achat' : la demande ne
// passe pas par le dépôt (AUCUN stock, AUCUN inventaire, AUCUN mouvement magmvt) ; l'encadrement la commande chez un fournisseur et la fait livrer / remettre.
// Le Magasin (magasin.js, magasin2.js) laisse ces demandes de côté (dems() : circuit ≠ achat) : le jour où il est allumé, elles sont déjà dans son registre.
//  · Compagnon (Moi) → « Mes demandes » : nouvelle demande POUR UN CHANTIER — articles de la liste de son métier si le pack magasin en fournit une, sinon texte libre ;
//    quantité (gros + / −) ; ⚡ urgent ; photo facultative ; note — puis le suivi des états, avec notification (À savoir + pastille) à chaque changement.
//  · Encadrement (conducteur, bureau : droit « Planning » ou « Affaires : modifier » ; référent magasin ; administrateur) : Pilotage → Achats & comptes →
//    « Demandes de matériel » (sans l'onglet Pilotage : Compagnon → Mes demandes → « Demandes à traiter ») : « Commandé » (fournisseur, date prévue, bon de commande
//    pré-rempli de commandes.js), « Livré / remis » (date, à qui, en partie), « Refusé » (motif), « Clore sans le reste ».
// Statuts : envoyee → commandee → remise (livrée en partie) → cloturee (livrée) ; refusee ; annulee (par le demandeur tant qu'elle est envoyée).
// SERVEUR : règles inchangées (registre_set, sql/retours_19-10vh.sql : la personne crée / annule SA demande, encadrement / bureau / magasin écrivent le reste) — aucun SQL.
// Aucune lecture nouvelle (incident du 30/10) : magdem / magcat sont chargés au démarrage (module magasin) et suivis par le rafraîchissement léger de l'appli ; avant une
// décision de l'encadrement, une relecture INCRÉMENTALE (regRefresh : seulement les lignes changées depuis la dernière) pour ne pas écraser une annulation.
import {regAll,regGet,regSet,regLoad,regLoaded,regPending,regRefresh} from './reg.js';
import {espaceToday,espacePlanning,espacePlannedSites} from './espace.js';
import {cmdAll,cmdNextNum,cmdState,cmdTotal,BC_ETATS} from './commandes.js';
import {affAll} from './affaires.js';
/* ── outils ── */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r3=x=>Math.round((+x||0)*1000)/1000;
const nf=n=>r3(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
const eur=n=>(Math.round((+n||0)*100)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const pad=n=>String(n).padStart(2,'0');
const isoNow=()=>new Date().toISOString();
const auj=()=>{try{const t=espaceToday();if(/^\d{4}-\d{2}-\d{2}$/.test(String(t)))return t;}catch(e){}const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const fDate=s=>{if(!s)return '';const d=new Date(String(s).length<=10?s+'T12:00:00':s);if(isNaN(d))return String(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+(d.getFullYear()!==new Date().getFullYear()?'/'+d.getFullYear():'');};
const fDT=s=>{const d=new Date(s);return isNaN(d)?'':fDate(s)+' '+pad(d.getHours())+'h'+pad(d.getMinutes());};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const offline=()=>typeof navigator!=='undefined'&&navigator.onLine===false;
const LS=(k,v)=>{try{if(v===undefined){const s=localStorage.getItem(k);return s?JSON.parse(s):null;}if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}return null;};
const num=v=>{const x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:null;};
const safeUrl=u=>/^(https?:|data:image\/|blob:)/i.test(String(u||''))?String(u):''; /* une adresse de photo venue du registre ne s'ouvre que si c'est une image ou un lien web */
const nom=(p,ctx)=>ctx&&ctx.nomC?ctx.nomC(p):((p.prenom||'')+' '+(p.nom||'')).trim();
const persNom=(key,ctx)=>{const p=((ctx&&ctx.people)||[]).find(x=>x.id===key);return p?nom(p,ctx):'';};
const isLocal=key=>!String(key||'').includes('@'); /* personnages de démo (clé sans @) : rien ne part au serveur, comme les notes de frais */
/* ── droits (écran) — l'écriture reste réglée par le serveur (registre_set) ── */
const canAsk=me=>!!me&&me.active!==false&&me.poste!=='visiteur'&&me.type!=='visiteur';
export const demCanHandle=ctx=>!!(ctx&&(ctx.can('planning.edit')||ctx.can('affaires.edit')||ctx.can('mag.manage'))); /* conducteur, bureau, direction, référent magasin, administrateur (a tout) */
const canBC=ctx=>!!(ctx.can('planning.edit')||ctx.can('affaires.edit')); /* même règle que les bons de commande (espace.js cmdCtx) */
const hasPilotage=ctx=>!!(ctx.can('planning.edit')||ctx.can('pointage.validate')||ctx.can('qse.manage')); /* même règle que l'onglet Pilotage (app.js okX) */
/* relecture légère des demandes (lignes changées seulement) avant une décision ; jamais plus de 4 s d'attente (serveur lent ou coupé : on décide sur la copie de l'appareil) */
const fresh=()=>offline()?Promise.resolve(0):Promise.race([regRefresh(['magdem']).catch(()=>0),new Promise(r=>setTimeout(()=>r(0),4000))]);
const RO=ctx=>{if(ctx.viewing&&ctx.viewing()){ctx.toast('👁 Lecture seule : rien n\'est modifié à la place de cette personne.');return true;}return false;};
/* ── données ── */
const ST={envoyee:['Envoyée','#1c3d6b','#e8f1fc'],commandee:['Commandée','#7a5200','#fff3d6'],remise:['Livrée en partie','#5a3fb8','#efeafd'],cloturee:['Livrée','#15673a','#e6f5ec'],refusee:['Refusée','#a01212','#fdecec'],annulee:['Annulée','#55524c','#efeee9']};
const ACTIFS=['envoyee','commandee','remise'];
const stOf=d=>d.statut==='cloturee'&&d.clos?['Terminée','#55524c','#efeee9']:(ST[d.statut]||[String(d.statut||'?'),'#55524c','#efeee9']);
export const demAll=()=>regAll('magdem').filter(d=>d&&d.byKey&&d.statut&&d.circuit==='achat');
const servi=l=>+l.remis||0;
const reste=l=>Math.max(0,r3((+l.qte||0)-servi(l)));
const resteTot=d=>r3((d.lignes||[]).reduce((x,l)=>x+reste(l),0));
const enAttente=id=>regPending().some(w=>w.kind==='magdem'&&w.id===id);
const siteLab=d=>{const i=d.imputation||{};return i.label||i.id||'chantier ?';};
const siteId=d=>(d.imputation||{}).id||'';
const byAt=(a,b)=>(b.urgent?1:0)-(a.urgent?1:0)||String(a.at).localeCompare(String(b.at)); /* comme le magasin : les urgentes, puis la plus ancienne */
const byPrevue=(a,b)=>String((a.commande||{}).prevue||'9999').localeCompare(String((b.commande||{}).prevue||'9999'))||String(a.at).localeCompare(String(b.at));
function cat(){const r=regGet('magcat','catalogue');const o={};if(r)Object.keys(r).forEach(k=>{const a=r[k];if(a&&typeof a==='object'&&!Array.isArray(a)&&a.ref)o[a.ref]=a;});return o;}
const conf=()=>regGet('magcat','config')||{};
/* poste de l'appli → métier(s) des listes du pack (même table que magasin.js) */
const METIERS={soudeur:['soudeur'],tuyauteur:['tuyauteur'],manchonneur:['manchonneur'],chauffeur_engin:['pelleur'],chef:['chef'],conducteur:['chef'],activites_specifiques:['soudeur','tuyauteur','manchonneur']};
function listesPour(me){const mine=METIERS[me.poste]||[];const L=(conf().listes||[]).filter(x=>x&&Array.isArray(x.lignes)&&x.lignes.length);
  const rang=x=>{const p=x.pour||[];if(p.some(m=>mine.includes(m)))return 0;if(p.includes('tous'))return 1;return 2;};
  return L.map((x,i)=>Object.assign({},x,{rang:rang(x),i})).filter(x=>x.rang<2).sort((a,b)=>a.rang-b.rang||a.i-b.i);} /* sa liste et celles « pour tous » */
const resume=d=>{const L=d.lignes||[];if(!L.length)return d.note?String(d.note).slice(0,70):'Demande libre';const f=L[0];return (f.label||f.ref||'?')+' × '+nf(f.qte)+(L.length>1?' · +'+(L.length-1)+' autre'+(L.length>2?'s':''):'');};
const suivi=d=>{const c=d.commande||{};if(d.statut==='commandee')return 'chez '+(c.fournisseur||'?')+(c.prevue?' · prévue le '+fDate(c.prevue):'');
  if(d.statut==='remise'||d.statut==='cloturee'){const r=(d.remises||[]).slice(-1)[0];return r?'remis le '+fDate(r.date||r.at)+(r.qui?' · '+r.qui:''):(d.clos?'le reste ne viendra pas':'');}
  if(d.statut==='refusee')return d.motifRefus||'';return '';};
/* ── état de l'écran (par appareil) ── */
const S={v:'list',cur:null,step:1,open:{},sel:{},draft:null,dkey:'',busy:false,gcur:null,form:null,fsite:'',fini:false,mfini:false,lib:'',libq:'1'};
const FRESH=new Set(); /* demandes montrées « nouveau » pendant cette session */
/* ── notifications : ce que le demandeur n'a pas encore vu (par appareil : nombre de lignes d'historique vues) ── */
const vuKey=me=>'trace:dem:vu:'+me.id;
const VU=me=>LS(vuKey(me))||{};
const nH=d=>(d.histo||[]).length||1;
const nouveau=(d,vu)=>nH(d)>(+vu[d.id]||1);
function markSeen(me,L){const vu=VU(me);let ch=false;L.forEach(d=>{if(nouveau(d,vu)){vu[d.id]=nH(d);ch=true;}});if(ch)LS(vuKey(me),vu);}
/* ── brouillon de la demande (gardé sur le téléphone) ── */
function draft(me){if(!S.draft||S.dkey!==me.id){S.dkey=me.id;const o=LS('trace:dem:draft:'+me.id)||{};const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  S.draft={lignes:obj(o.lignes),labels:obj(o.labels),unites:obj(o.unites),site:o.site||LS('trace:dem:site:'+me.id)||'',urgent:!!o.urgent,note:o.note||'',photos:Array.isArray(o.photos)?o.photos.filter(p=>p&&safeUrl(p.u)):[]};}
  return S.draft;}
const saveDraft=me=>LS('trace:dem:draft:'+me.id,S.draft);
const nbArt=D=>Object.keys(D.lignes).filter(r=>+D.lignes[r]>0).length;
/* chantier du jour (planning) pour pré-remplir ; ses chantiers de la semaine en tête de liste */
function siteDuJour(me){try{const P=espacePlanning()||{};const t=auj();let ids=null;Object.keys(P).forEach(w=>{const a=(((P[w]||{}).aff)||{})[me.id];if(a&&Array.isArray(a[t])&&a[t].length)ids=a[t];});return ids?String(ids[0]):'';}catch(e){return '';}}
function sitesDe(me,ctx){const all=ctx.sites||[];let set=null;try{set=me._acc?espacePlannedSites(me._acc):null;}catch(e){set=null;}const mine=set?all.filter(s=>set.has(s.id)):[];return {mine,autres:all.filter(s=>!mine.includes(s))};}
/* ── CSS du lot (injectée une fois, index.html n'est pas touché) : demandes (dm-) et compte chantier (cc-) ── */
const CSS=`.dm-root,.cc-root{min-width:0}
.dm-root .btn{white-space:normal}
.dm-root .dm-big{width:100%;min-height:56px;font-size:16px;font-weight:700;margin:4px 0 10px}
.dm-root .dm-big.sec{min-height:48px;font-weight:600}
.dm-st{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap;vertical-align:middle}
.dm-st.dm-urg{color:#b8560f;background:#fff3d6}
.dm-new{flex:none;font-size:11px;font-weight:800;color:#fff;background:#e8501c;border-radius:999px;padding:2px 8px}
.dm-root .dm-row .tx small .dm-st{margin-top:3px}
.dm-li{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);flex-wrap:wrap}.dm-li:first-child{border-top:0}
.dm-lt{flex:1 1 150px;min-width:0}.dm-lt b{display:block;font-size:15px;overflow-wrap:anywhere}.dm-lt small{display:block;font-size:12.5px;color:var(--ink2);overflow-wrap:anywhere;margin-top:1px}
.dm-step{display:flex;align-items:center;gap:6px;flex:none;margin-left:auto}
.dm-root .dm-step button{width:52px;height:52px;min-height:52px;border-radius:14px;border:2px solid var(--line);background:var(--surface);font-size:26px;font-weight:800;display:grid;place-items:center;text-align:center;padding:0;line-height:1;color:var(--ink)}
.dm-root .dm-step button.pl{background:var(--ink);color:#fff;border-color:var(--ink)}
.dm-root .dm-step button:disabled{opacity:.4}
.dm-step .n{min-width:34px;text-align:center;font-size:20px;font-weight:800}.dm-step .n.z{color:var(--muted);font-weight:600}
.dm-szs{display:flex;flex-wrap:wrap;gap:8px;width:100%}
.dm-root .dm-sz{min-width:58px;min-height:52px;padding:0 12px;border-radius:12px;border:2px solid var(--line);background:var(--surface);font-size:17px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:4px;color:var(--ink)}
.dm-root .dm-sz.has{background:#eef4fc;border-color:#9ec5f4}.dm-root .dm-sz.on{border-color:var(--ink);box-shadow:0 0 0 2px var(--ink)}.dm-sz i{font-style:normal;font-size:12.5px;font-weight:700;color:#1c3d6b}
.dm-selrow{display:flex;align-items:center;gap:10px;width:100%;padding-top:6px}.dm-selrow>span{font-weight:700;font-size:15px}
.dm-root .dm-tg{display:flex;align-items:center;gap:8px;width:100%;min-height:52px;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-weight:700;font-size:15px;margin:6px 0 0;text-align:left;color:var(--ink)}
.dm-tg>span:first-child{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}.dm-tg .dm-tgn{flex:0 1 auto;min-width:0;margin-left:auto;font-size:12.5px;font-weight:600;color:var(--ink2);text-align:right;overflow-wrap:anywhere}
.dm-root .dm-tg.on{border-color:#b8560f;background:#fff3d6}
.dm-sec{padding:0 4px}
.dm-lh{display:flex;align-items:baseline;gap:8px;margin:16px 0 4px;flex-wrap:wrap}.dm-lh b{font-size:16px}.dm-lh span{font-size:12px;color:var(--muted)}
.dm-libre{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:8px;align-items:end}.dm-libre>div{min-width:0}
.dm-root .dm-libre .btn{grid-column:1/-1;min-height:52px;font-size:16px;font-weight:700}
.dm-root input.f,.dm-root select.f,.dm-root textarea.f{width:100%;max-width:100%;min-width:0;min-height:48px;font-size:16px;margin:0;box-sizing:border-box}
.dm-root textarea.f{min-height:84px}
.dm-root label.f{display:block;margin:12px 0 4px;min-height:0}
.dm-bar{position:sticky;bottom:8px;z-index:5;display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:8px 10px;margin-top:12px;box-shadow:0 -4px 18px rgba(0,0,0,.10)}
.dm-root .dm-bar .btn{min-height:52px;font-size:16px;font-weight:700;padding:0 18px;flex:none}
.dm-bn{font-size:15px}.dm-bn b{font-size:20px}
.dm-phs{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 4px}.dm-ph{position:relative;display:block}.dm-ph img{width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--line);display:block;background:var(--plane)}
.dm-root .dm-ph button{position:absolute;top:-10px;right:-10px;width:36px;height:36px;min-height:36px;border-radius:50%;padding:0;border:1px solid var(--line);background:var(--surface);font-size:16px;font-weight:800;color:#a01212}
.dm-pha{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.dm-root .dm-pha .btn{flex:1 1 140px;min-height:48px;font-size:15px;cursor:pointer}
.dm-note{background:var(--plane,#f3f1ec);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13.5px;overflow-wrap:anywhere;white-space:pre-wrap}
.dm-info{background:#f6f4ef;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13.5px;overflow-wrap:anywhere;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dm-root .dm-info .btn{min-height:36px}
.dm-info>div+div{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)}
.dm-histo{margin-top:12px;font-size:12.5px;color:var(--ink2)}.dm-histo div{padding:2px 0;overflow-wrap:anywhere}
.dm-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.dm-root .dm-acts .btn{flex:1 1 160px;min-height:52px;font-size:15px;font-weight:700}
.dm-root .btn.danger{color:#a01212;border-color:#f0b9b4}
.dm-chk{display:flex;align-items:center;gap:10px;font-size:14px;margin:12px 0 4px;cursor:pointer}.dm-root .dm-chk input{width:24px;height:24px;min-height:24px;flex:none;margin:0}
.dm-tw{overflow:auto;margin:8px 0}
table.dm-tab{width:100%;border-collapse:collapse}table.dm-tab td,table.dm-tab th{padding:6px 6px;border-bottom:1px solid var(--line);vertical-align:top;font-size:13px}table.dm-tab td.num,table.dm-tab th.num{text-align:right;white-space:nowrap}table.dm-tab td.txt,table.dm-tab th.txt{text-align:left;white-space:normal;overflow-wrap:break-word;word-break:normal}table.dm-tab td.txt:first-child{min-width:110px}
table.dm-tab .dim{font-size:11px;color:var(--muted)}
.dm-vide{display:block;padding:6px 2px 10px}
.dm-q{flex:none;margin-left:auto;text-align:right;min-width:56px}.dm-q b{display:block;font-size:20px;font-weight:800;line-height:1.1}.dm-q b.ok{color:#15673a}.dm-q small{display:block;font-size:11.5px;color:var(--ink2)}
.dm-pin{display:flex;align-items:center;gap:8px;margin-left:auto;flex:none}.dm-pin small{font-size:12px;color:var(--ink2)}.dm-root .dm-pin input.f{width:96px;min-height:48px;font-size:20px;font-weight:700;text-align:center;padding:4px}
.dm-card h3{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dm-form{border:2px solid var(--ink);margin-top:12px}
.dm-kp{margin:6px 0 4px}
.dm-root .dm-fold,.cc-root .dm-fold{display:flex;width:100%;min-height:44px;align-items:center;justify-content:space-between;gap:8px;border:0;border-top:1px solid var(--line);background:none;font:inherit;font-weight:700;padding:8px 2px;margin-top:8px;color:var(--ink);text-align:left}
.dm-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.cc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0 6px}
.cc-tile{background:var(--page,#f6f4ef);border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:0}
.cc-tile b{display:block;font-size:20px;line-height:1.15;letter-spacing:-.02em;overflow-wrap:anywhere}.cc-tile small{display:block;font-size:11.5px;color:var(--ink2);line-height:1.25;margin-top:3px}
.cc-tile.tot{background:#2b2828;border-color:#2b2828;color:#fff}.cc-tile.tot small{color:#ece8e2}
.cc-per{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}.cc-root .cc-per .chip{min-height:40px;cursor:pointer;font-size:13px}
.cc-nav{display:inline-flex;align-items:center;gap:4px}.cc-nav b{min-width:112px;text-align:center;font-size:13.5px}.cc-root .cc-nav .chip{min-width:40px;justify-content:center}
.cc-tw{overflow:auto;margin:4px 0}
table.cc-tab{width:100%;border-collapse:collapse}table.cc-tab td,table.cc-tab th{padding:6px 6px;border-bottom:1px solid var(--line);vertical-align:top;font-size:13px}
table.cc-tab th{text-align:left;font-size:12px;color:var(--ink2);font-weight:700;white-space:normal}table.cc-tab td.num,table.cc-tab th.num{text-align:right;white-space:nowrap}table.cc-tab td.txt,table.cc-tab th.txt{text-align:left;white-space:normal;overflow-wrap:break-word;word-break:normal;hyphens:manual}table.cc-tab td.txt:first-child{min-width:84px}table.cc-tab td.num .dim{white-space:normal}
table.cc-tab tr.off td{color:var(--muted)}table.cc-tab tr.tot td{font-weight:800;border-top:2px solid var(--line);border-bottom:0}table.cc-tab .dim{font-size:11px;color:var(--muted)}
.cc-pho{display:none}
.cc-root .cc-lnk{white-space:nowrap;border:0;background:none;padding:0;font:inherit;font-weight:700;color:#1c3d6b;text-decoration:underline;cursor:pointer;min-height:34px;text-align:left}
.cc-warn{color:#7a5200}
.cc-acts{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.cc-root .cc-acts .btn{min-height:44px;flex:0 1 auto}
.cc-root input.cc-q{width:100%;min-height:48px;font-size:16px;box-sizing:border-box;margin:4px 0 8px}
.cc-card h3{margin-bottom:4px}
@media (max-width:480px){.cc-pho{display:block;margin-top:3px}.cc-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.cc-tile b{font-size:17px}table.cc-tab .ph,table.dm-tab .ph{display:none}.cc-nav b{min-width:96px}}`;
export function cssLotCC(){if(typeof document==='undefined'||document.getElementById('css-lot-cc'))return;try{const s=document.createElement('style');s.id='css-lot-cc';s.textContent=CSS;document.head.appendChild(s);}catch(e){}}
const wrap=h=>`<div class="dm-root">${h}</div>`;
const stLab=d=>{const s=stOf(d);return `<span class="dm-st" style="color:${s[1]};background:${s[2]}">${esc(s[0])}</span>`;};
const kpi=(v,l,k)=>`<div class="eq-kpi ${k||''}"><b>${v}</b><small>${esc(l)}</small></div>`;
const topScroll=()=>{try{window.scrollTo(0,0);setTimeout(()=>{const hb=document.getElementById('homeBody');if(hb)hb.scrollTop=0;},0);}catch(e){}};
const stepHTML=(key,D,lab)=>{const q=+D.lignes[key]||0;return `<div class="dm-step"><button class="mo" data-act="x" data-v="dem|dec|${esc(key)}" aria-label="Moins" ${q?'':'disabled'}>−</button><span class="n${q?'':' z'}">${nf(q)}</span><button class="pl" data-act="x" data-v="dem|inc|${esc(key)}" data-l="${esc(lab||'')}" aria-label="Plus">+</button></div>`;};
const photosHTML=(L,rm)=>{const P=(L||[]).map((p,i)=>({u:safeUrl(typeof p==='string'?p:p&&p.u),i})).filter(p=>p.u);return P.length?`<div class="dm-phs">${P.map(p=>`<span class="dm-ph"><a href="${esc(p.u)}" target="_blank" rel="noopener"><img src="${esc(p.u)}" alt="photo"></a>${rm?`<button type="button" data-act="x" data-v="dem|phrm|${p.i}" aria-label="Retirer la photo">✕</button>`:''}</span>`).join('')}</div>`:'';};
const HLAB={envoyee:'Envoyée',commandee:'Commandée',remise:'Livrée en partie',cloturee:'Livrée',refusee:'Refusée',annulee:'Annulée'};
const histoHTML=d=>(d.histo||[]).length?`<div class="dm-histo">${d.histo.map(h=>`<div>${esc(fDT(h.at))} · <b>${esc(HLAB[h.statut]||h.statut)}</b>${h.by?' · '+esc(h.by):''}${h.note?' — '+esc(h.note):''}</div>`).join('')}</div>`:'';
const remisesHTML=d=>(d.remises||[]).length?`<div class="dm-info" style="display:block">${d.remises.map(r=>`<div>📦 Remis le <b>${esc(fDate(r.date||r.at))}</b>${r.qui?' · '+esc(r.qui):''}${(r.lignes||[]).length?' : '+esc(r.lignes.map(l=>(l.label||l.ref||'?')+' × '+nf(l.qte)).join(', ')):r.partiel?' (une partie)':''}${r.note?' — '+esc(r.note):''}</div>`).join('')}</div>`:'';
function rowDem(d,gest,fresh){return `<button class="ac-row dm-row" data-act="x" data-v="dem|${gest?'gopen':'open'}|${esc(d.id)}"><span class="ic" style="background:${stOf(d)[2]}">📦</span><span class="tx"><b>${gest?esc(d.byName||'?')+' · ':''}${esc(resume(d))}</b><small>🏗 ${esc(siteLab(d))} · ${esc(fDate(d.at))}${d.urgent?' · ⚡ urgent':''}${enAttente(d.id)?' · ⏳ pas encore partie':''}</small><small>${stLab(d)}${suivi(d)?' '+esc(suivi(d)):''}</small></span>${fresh?'<span class="dm-new">nouveau</span>':''}<span class="chev">›</span></button>`;}
/* ══════════ DEMANDEUR : Compagnon (Moi) → Mes demandes ══════════ */
function vDem(me,ctx){cssLotCC();if(!regLoaded('magdem')&&!S.loadAsked){S.loadAsked=true;regLoad(['magdem']).then(()=>ctx.render()).catch(()=>{});} /* filet : déjà chargé au démarrage (module magasin) — une seule fois sinon */
  if(!canAsk(me))return wrap(`<h2 class="vt">Mes demandes</h2><div class="card"><div class="eq-s">Les demandes de matériel sont réservées aux comptes SCR.</div></div>`);
  if(S.v==='file'&&demCanHandle(ctx))return wrap(vFile(me,ctx,true));
  if(S.v==='new')return wrap(S.step===2?vNew2(me,ctx):vNew1(me,ctx));
  if(S.v==='fiche'){const d=regGet('magdem',S.cur);if(d&&d.byKey===me.id&&d.circuit==='achat')return wrap(vFiche(me,ctx,d));S.v='list';}
  return wrap(vListe(me,ctx));}
function vListe(me,ctx){const L=demAll().filter(d=>d.byKey===me.id).sort((a,b)=>String(b.at).localeCompare(String(a.at)));const vu=VU(me);L.forEach(d=>{if(nouveau(d,vu))FRESH.add(d.id);});markSeen(me,L);
  const cours=L.filter(d=>ACTIFS.includes(d.statut)),fini=L.filter(d=>!ACTIFS.includes(d.statut));const nT=demCanHandle(ctx)&&!hasPilotage(ctx)?demAll().filter(d=>d.statut==='envoyee').length:-1;
  return `<div class="dm-head"><h2 class="vt">Mes demandes <span class="hint">· matériel pour un chantier, commandé par l'encadrement</span></h2></div>
    <button class="btn primary dm-big" data-act="x" data-v="dem|new|">＋ Nouvelle demande</button>
    ${nT>=0?`<button class="btn dm-big sec" data-act="x" data-v="dem|file|">📋 Demandes à traiter${nT?' ('+nT+')':''}</button>`:''}
    <div class="ac-h"><b>En cours</b><span>${cours.length||''}</span></div>${cours.map(d=>rowDem(d,false,FRESH.has(d.id))).join('')||'<div class="eq-s dm-vide">Aucune demande en cours.</div>'}
    ${fini.length?`<button class="dm-fold" data-act="x" data-v="dem|mfini|"><span>${S.mfini?'▾':'▸'} Livrées · refusées · annulées</span><span class="hint">${fini.length}</span></button>${S.mfini?fini.slice(0,30).map(d=>rowDem(d,false,FRESH.has(d.id))).join(''):''}`:''}
    <p class="hint">Tu demandes, ton conducteur ou le bureau commande et te fait livrer : tu suis ici chaque étape (commandée, livrée, en partie, refusée). Hors réseau, la demande reste sur le téléphone et part toute seule au retour du réseau.</p>`;}
function vFiche(me,ctx,d){FRESH.delete(d.id);const c=d.commande||{};
  const lignes=(d.lignes||[]).map(l=>`<div class="dm-li"><div class="dm-lt"><b>${esc(l.label||l.ref)}</b><small>demandé ${nf(l.qte)}${l.unite?' '+esc(l.unite):''}${servi(l)?' · remis '+nf(servi(l)):''}</small></div><div class="dm-q">${!reste(l)?'<b class="ok">✓</b><small>remis</small>':servi(l)&&ACTIFS.includes(d.statut)?`<b>${nf(reste(l))}</b><small>à venir</small>`:`<b>${nf(l.qte)}</b><small>${esc(l.unite||'demandé')}</small>`}</div></div>`).join('');
  const box=d.statut==='commandee'?`<div class="okbox">🛒 Commandée${c.fournisseur?' chez '+esc(c.fournisseur):''}${c.prevue?' · livraison prévue le <b>'+esc(fDate(c.prevue))+'</b>':''}${c.note?' — '+esc(c.note):''}</div>`
    :d.statut==='remise'?`<div class="okbox">📦 Livrée en partie : le reste suit${c.prevue?' (prévu le '+esc(fDate(c.prevue))+')':''}.</div>`
    :d.statut==='cloturee'?`<div class="okbox">✅ ${d.clos?'Terminée (le reste ne viendra pas)':'Livrée'}.</div>`
    :d.statut==='refusee'?`<div class="warnbox">Refusée : ${esc(d.motifRefus||'')}</div>`
    :d.statut==='envoyee'?'<div class="eq-s">Envoyée : ton conducteur ou le bureau va la traiter.</div>':'';
  return `<button class="ac-back" data-act="x" data-v="dem|list|">‹ Mes demandes</button>
    <div class="card dm-card"><h3>Demande du ${esc(fDate(d.at))} ${stLab(d)}${d.urgent?' <span class="dm-st dm-urg">⚡ urgent</span>':''}</h3>
    <div class="eq-s">🏗 ${esc(siteLab(d))}</div>
    ${enAttente(d.id)?`<div class="warnbox">⏳ Pas encore reçue par le serveur : elle part toute seule (sans réseau, dès son retour).</div>`:''}
    ${box}${remisesHTML(d)}
    <div>${lignes||'<div class="eq-s">Aucun article (demande libre : voir la note).</div>'}</div>
    ${photosHTML(d.photos)}${d.note?`<div class="dm-note">📝 ${esc(d.note)}</div>`:''}${histoHTML(d)}
    ${d.statut==='envoyee'?`<button class="btn danger dm-big" style="margin-top:12px" data-act="x" data-v="dem|cancel|${esc(d.id)}">Annuler la demande</button><div class="hint">Possible tant qu'elle n'est pas commandée.</div>`:''}</div>`;}
/* nouvelle demande — étape 1 : les articles (sa liste du pack, texte libre) ; étape 2 : chantier, urgent, photo, note, envoyer */
function ligneHTML(l,key,D,C){
  if(Array.isArray(l.variantes)&&l.variantes.length){const V=l.variantes.filter(v=>!(C[v.ref]&&C[v.ref].actif===false));if(!V.length)return '';
    const lv=v=>l.label+' — '+v.libelle;const sel=V.some(v=>v.ref===S.sel[key])?S.sel[key]:null;const tot=V.reduce((x,v)=>x+(+D.lignes[v.ref]||0),0);
    return `<div class="dm-li"><div class="dm-lt"><b>${esc(l.label)}</b><small>${esc(l.choix||'taille')} : touche pour choisir${tot?' · '+nf(tot)+' choisi'+(tot>1?'s':''):''}</small></div>
      <div class="dm-szs">${V.map(v=>{const q=+D.lignes[v.ref]||0;return `<button class="dm-sz${sel===v.ref?' on':''}${q?' has':''}" data-act="x" data-v="dem|sz|${esc(key)}|${esc(v.ref)}" data-l="${esc(lv(v))}">${esc(v.libelle)}${q?`<i>×${nf(q)}</i>`:''}</button>`;}).join('')}</div>
      ${sel?`<div class="dm-selrow"><span>${esc((V.find(v=>v.ref===sel)||{}).libelle)}</span>${stepHTML(sel,D,lv(V.find(v=>v.ref===sel)))}</div>`:''}</div>`;}
  if(!l.ref||(C[l.ref]&&C[l.ref].actif===false))return '';const a=C[l.ref];
  return `<div class="dm-li"><div class="dm-lt"><b>${esc(l.label)}</b><small>${esc(l.unite||(a&&a.unite)||'u')}${l.choix?' · précise '+esc(l.choix)+' dans la note':''}</small></div>${stepHTML(l.ref,D,l.label)}</div>`;}
function sectionsHTML(x,D,C){const secs=[];x.lignes.forEach((l,j)=>{const s=l.section||'';let g=secs.find(y=>y.s===s);if(!g){g={s,L:[]};secs.push(g);}g.L.push([l,j]);});
  return secs.map((g,k)=>{const key=x.id+'§'+k;const isOpen=S.open[key]!==undefined?S.open[key]:(x.first&&k===0);const refs=g.L.flatMap(([l])=>l.variantes&&l.variantes.length?l.variantes.map(v=>v.ref):[l.ref]);const n=refs.filter(r=>r&&+D.lignes[r]>0).length;
    return `<button class="dm-tg" data-act="x" data-v="dem|tog|${esc(key)}" aria-expanded="${isOpen?'true':'false'}"><span>${isOpen?'▾':'▸'} ${esc(g.s||x.titre)}</span><span class="dm-tgn">${g.L.length} article${g.L.length>1?'s':''}${n?' · <b>'+n+' choisi'+(n>1?'s':'')+'</b>':''}</span></button>
      ${isOpen?`<div class="dm-sec">${g.L.map(([l,j])=>ligneHTML(l,x.id+':'+j,D,C)).join('')}</div>`:''}`;}).join('');}
const libres=D=>Object.keys(D.labels).filter(k=>k.startsWith('L:')&&+D.lignes[k]>0);
function vNew1(me,ctx){const D=draft(me);const C=cat();const L=listesPour(me);const n=nbArt(D);if(L.length)L[0].first=true;
  const bloc=x=>`<div class="dm-lh"><b>📋 ${esc(x.titre)}</b><span>${x.rang===0?'ta liste':'pour tous'}</span></div>${sectionsHTML(x,D,C)}`;const LB=libres(D);
  return `<button class="ac-back" data-act="x" data-v="dem|list|">‹ Mes demandes</button>
    <h2 class="vt">Nouvelle demande <span class="hint">· 1/2 : ce qu'il te faut</span></h2>
    ${offline()?`<div class="warnbox">📵 Pas de réseau : ta demande sera gardée sur le téléphone et partira toute seule au retour du réseau.</div>`:''}
    ${L.map(bloc).join('')}
    <div class="dm-lh"><b>✏️ ${L.length?'Autre chose':'Ce qu\'il te faut'}</b><span>texte libre</span></div>
    <div class="card"><div class="dm-libre"><div><label class="f" for="dm-lib">Article</label><input class="f" id="dm-lib" data-xin="dem|lib" placeholder="ex. disques à tronçonner 125" value="${esc(S.lib)}" autocomplete="off" enterkeyhint="done"></div><div><label class="f" for="dm-libq">Quantité</label><input class="f" id="dm-libq" data-xin="dem|libq" type="number" inputmode="decimal" min="0" step="any" value="${esc(S.libq)}"></div><button class="btn" data-act="x" data-v="dem|libadd|">＋ Ajouter à ma demande</button></div>
      ${LB.map(k=>`<div class="dm-li"><div class="dm-lt"><b>${esc(D.labels[k])}</b><small>texte libre</small></div>${stepHTML(k,D,D.labels[k])}</div>`).join('')}</div>
    ${L.length?'':`<div class="hint">Pas de liste de ton métier pour l'instant : écris ce qu'il te faut, un article à la fois.</div>`}
    <div class="dm-bar"><span class="dm-bn"><b>${n}</b> article${n>1?'s':''}</span><button class="btn primary" data-act="x" data-v="dem|step|2">Suivant ›</button></div>`;}
function vNew2(me,ctx){const D=draft(me);const C=cat();const keys=Object.keys(D.lignes).filter(r=>+D.lignes[r]>0);const SD=sitesDe(me,ctx);if(!D.site){D.site=siteDuJour(me)||(SD.mine[0]||{}).id||'';if(D.site)saveDraft(me);}
  const all=SD.mine.concat(SD.autres);const opt=s=>`<option value="${esc(s.id)}" ${D.site===s.id?'selected':''}>${esc(s.name||s.id)}</option>`;
  return `<button class="ac-back" data-act="x" data-v="dem|step|1">‹ Articles</button>
    <h2 class="vt">Ma demande <span class="hint">· 2/2 : pour quel chantier</span></h2>
    <div class="card">${keys.length?keys.map(k=>`<div class="dm-li"><div class="dm-lt"><b>${esc(D.labels[k]||(C[k]&&C[k].label)||k)}</b><small>${esc(D.unites[k]||(C[k]&&C[k].unite)||(k.startsWith('L:')?'texte libre':''))}</small></div>${stepHTML(k,D,D.labels[k])}</div>`).join(''):`<div class="eq-s">Aucun article : écris ce qu'il te faut dans la note (ou reviens à « ‹ Articles »).</div>`}</div>
    <div class="card"><label class="f" for="dm-site" style="margin-top:0"><b>Pour quel chantier ?</b></label>
      <select class="f" id="dm-site" data-xin="dem|site"><option value="">— choisis le chantier —</option>${SD.mine.length?`<optgroup label="Mes chantiers">${SD.mine.map(opt).join('')}</optgroup><optgroup label="Autres chantiers">${SD.autres.map(opt).join('')}</optgroup>`:all.map(opt).join('')}${D.site&&!all.some(s=>s.id===D.site)?`<option value="${esc(D.site)}" selected>${esc(D.site)}</option>`:''}</select>
      <button class="dm-tg${D.urgent?' on':''}" data-act="x" data-v="dem|urgent|" aria-pressed="${D.urgent?'true':'false'}"><span>⚡ C'est urgent</span><span class="dm-tgn">${D.urgent?'oui : traitée en premier':'facultatif'}</span></button>
      <label class="f">Photo <span class="dim">(facultatif : l'article, l'étiquette, la pièce cassée…)</span></label>
      ${photosHTML(D.photos,true)}${S.busy?'<div class="hint">⏳ photo en cours d\'envoi…</div>':''}
      ${D.photos.length<3?`<div class="dm-pha"><label class="btn">📷 Prendre une photo<input type="file" accept="image/*" capture="environment" data-xin="dem|photo" style="display:none"></label><label class="btn">🖼 Choisir une photo<input type="file" accept="image/*" data-xin="dem|photo" style="display:none"></label></div>`:''}
      <label class="f" for="dm-note">Note <span class="dim">(facultatif)</span></label>
      <textarea class="f" id="dm-note" rows="3" data-xin="dem|note" placeholder="Taille, référence, où le livrer…">${esc(D.note||'')}</textarea></div>
    <button class="btn primary dm-big" data-act="x" data-v="dem|send|">📤 Envoyer la demande</button>
    <p class="hint">${offline()?'📵 Pas de réseau : la demande est gardée sur le téléphone et partira toute seule.':'Hors réseau, la demande est gardée sur le téléphone et part toute seule au retour du réseau.'}</p>`;}
function send(me,ctx){if(RO(ctx))return;const D=draft(me);const C=cat();const keys=Object.keys(D.lignes).filter(r=>+D.lignes[r]>0);const note=String(D.note||'').trim();
  if(!keys.length&&!note){ctx.toast('Ajoute au moins un article, ou écris ta demande dans la note.');S.step=keys.length?2:1;ctx.render();return;}
  const s=(ctx.sites||[]).find(x=>x.id===D.site);if(!D.site){ctx.toast('Choisis le chantier.');S.step=2;ctx.render();return;}
  if(S.busy){ctx.toast('Attends la fin de l\'envoi de la photo.');return;}
  const at=isoNow();const id=me.id+'|'+uid();const by=nom(me,ctx);
  const lignes=keys.map(k=>{const lib=k.startsWith('L:');return {ref:lib?null:k,label:D.labels[k]||(C[k]&&C[k].label)||k,qte:r3(D.lignes[k]),unite:D.unites[k]||(C[k]&&C[k].unite)||null,remis:0};});
  regSet('magdem',id,Object.assign({byKey:me.id,byName:by,at,statut:'envoyee',circuit:'achat',lignes,imputation:{type:'chantier',id:D.site,label:s?s.name:D.site},note,histo:[{at,by,statut:'envoyee'}]},D.urgent?{urgent:true}:{},D.photos.length?{photos:D.photos.map(p=>p.local?{u:p.u,local:true}:p.u)}:{}),{quiet:true,local:isLocal(me.id)});
  const vu=VU(me);vu[id]=1;LS(vuKey(me),vu);LS('trace:dem:site:'+me.id,D.site);
  S.draft=null;LS('trace:dem:draft:'+me.id,null);S.v='list';S.cur=null;S.step=1;S.sel={};S.lib='';S.libq='1';topScroll();
  ctx.toast(offline()?'✓ Demande gardée sur le téléphone : elle partira au retour du réseau':'✓ Demande envoyée à l\'encadrement');ctx.render();}
async function cancel(id,me,ctx){if(RO(ctx))return;let d=regGet('magdem',id);if(!d||d.byKey!==me.id)return;
  try{await fresh();}catch(e){}d=regGet('magdem',id); /* l'état du serveur d'abord (relecture légère) : l'encadrement a peut-être déjà commandé */
  if(!d||d.statut!=='envoyee'){ctx.toast('Trop tard : la demande est déjà prise en charge. Vois avec ton conducteur.');ctx.render();return;}
  if(typeof confirm==='function'&&!confirm('Annuler cette demande ?'))return;const at=isoNow();const H=(d.histo||[]).concat([{at,by:nom(me,ctx),statut:'annulee'}]);
  regSet('magdem',id,{statut:'annulee',histo:H},{quiet:true,local:isLocal(me.id)});const vu=VU(me);vu[id]=H.length;LS(vuKey(me),vu);ctx.toast('Demande annulée');ctx.render();}
/* photo : compressée, envoyée au stockage (lien dans la demande) ; sans réseau, une petite copie reste dans la demande */
async function addPhoto(el,me,ctx){const f=el.files&&el.files[0];el.value='';if(!f)return;if(RO(ctx))return;const D=draft(me);if(D.photos.length>=3){ctx.toast('3 photos au plus');return;}
  const A=ctx.api||{};S.busy=true;ctx.render();let u=null,local=false;
  try{const big=A.compressPhoto?await A.compressPhoto(f,1280,.7):null;
    if(big){try{u=A.sync&&A.sync.uploadPhoto?await A.sync.uploadPhoto(D.site||'demandes','demande-'+String(me.id).replace(/[^A-Za-z0-9]/g,'').slice(0,40),big):null;}catch(e){u=null;}
      if(!u){const small=await A.compressPhoto(f,640,.55);u=small||null;local=true;}}}
  catch(e){console.warn('demande : photo',e);u=null;}
  finally{S.busy=false;}
  if(u&&safeUrl(u)){D.photos.push(local?{u,local:true}:{u});saveDraft(me);ctx.toast(local?'Photo gardée dans la demande (pas de réseau)':'Photo ajoutée');}else ctx.toast('Photo illisible : non ajoutée');ctx.render();}
/* ══════════ ENCADREMENT : Pilotage → Demandes de matériel ══════════ */
function vFile(me,ctx,inMoi){if(S.gcur){const d=regGet('magdem',S.gcur);if(d&&d.circuit==='achat')return vGest(me,ctx,d,inMoi);S.gcur=null;S.form=null;}
  const all=demAll();const sites=[...new Map(all.filter(d=>ACTIFS.includes(d.statut)&&siteId(d)).map(d=>[siteId(d),siteLab(d)])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'fr'));
  if(S.fsite&&!sites.some(([k])=>k===S.fsite))S.fsite='';const D=S.fsite?all.filter(d=>siteId(d)===S.fsite):all;
  const env=D.filter(d=>d.statut==='envoyee').sort(byAt),cmd=D.filter(d=>d.statut==='commandee').sort(byPrevue),part=D.filter(d=>d.statut==='remise').sort(byAt),fin=D.filter(d=>!ACTIFS.includes(d.statut)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const nU=env.filter(d=>d.urgent).length;const late=cmd.filter(d=>d.commande&&d.commande.prevue&&d.commande.prevue<auj()).length;
  const sec=(t,L,vide)=>`<div class="ac-h"><b>${t}</b><span>${L.length||''}</span></div>${L.map(d=>rowDem(d,true)).join('')||`<div class="eq-s dm-vide">${vide}</div>`}`;
  return `${inMoi?'<button class="ac-back" data-act="x" data-v="dem|list|">‹ Mes demandes</button>':''}<h2 class="vt">Demandes de matériel <span class="hint">· sans magasin : tu commandes, tu fais livrer</span></h2>
    <div class="eq-kpis dm-kp">${kpi(env.length,'à traiter',env.length?'warn':'ok')}${kpi(nU,'urgentes',nU?'bad':'')}${kpi(cmd.length,'commandées'+(late?' · '+late+' en retard':''),late?'bad':'')}${kpi(part.length,'livrées en partie')}</div>
    ${sites.length>1||S.fsite?`<select class="f" data-xin="dem|fsite" aria-label="Chantier"><option value="">Tous les chantiers</option>${sites.map(([k,l])=>`<option value="${esc(k)}"${S.fsite===k?' selected':''}>${esc(l)}</option>`).join('')}</select>`:''}
    ${sec('À traiter',env,'Rien de nouveau.')}${sec('Commandées · en attente de livraison',cmd,'Aucune.')}${part.length?sec('Livrées en partie · le reste à venir',part,''):''}
    ${fin.length?`<button class="dm-fold" data-act="x" data-v="dem|fini|"><span>${S.fini?'▾':'▸'} Livrées · refusées · annulées</span><span class="hint">${fin.length}</span></button>${S.fini?fin.slice(0,40).map(d=>rowDem(d,true)).join(''):''}`:''}
    <p class="hint">Les demandes arrivent des téléphones (Compagnon → Mes demandes). « Commandé » : fournisseur, date prévue et, si tu veux, un bon de commande pré-rempli (Achats → Bons de commande). « Livré / remis » : date, à qui, en partie si tout n'est pas là. Aucun stock n'est tenu ici.</p>`;}
const bcEtat=c=>((BC_ETATS.find(e=>e[0]===c.etat)||[])[1])||c.etat||'';
function vGest(me,ctx,d,inMoi){const c=d.commande||{};const bc=c.bc?regGet('commande',c.bc):null;const st=d.statut;
  const rows=(d.lignes||[]).map(l=>`<tr><td class="txt">${esc(l.label||l.ref)}${l.ref&&!/^X-/.test(l.ref)?`<div class="dim">${esc(l.ref)}</div>`:''}</td><td class="num">${nf(l.qte)}${l.unite?' '+esc(l.unite):''}</td><td class="num">${servi(l)?nf(servi(l)):'—'}</td><td class="num"><b>${reste(l)?nf(reste(l)):'✓'}</b></td></tr>`).join('');
  const B=(k,t,cls)=>`<button class="btn ${cls||''}" data-act="x" data-v="dem|${k}|${esc(d.id)}">${t}</button>`;
  const acts=st==='envoyee'?B('cmd','🛒 Commandé','primary')+B('liv','📦 Livré / remis','')+B('refus','Refuser','danger'):st==='commandee'?B('liv','📦 Livré / remis','primary')+B('refus','Refuser','danger'):st==='remise'?B('liv','📦 Livré / remis (le reste)','primary')+B('cmd','🛒 Commander le reste','')+B('clore','Clore sans le reste',''):'';
  return `<button class="ac-back" data-act="x" data-v="dem|gback|">‹ Demandes</button>
    <div class="card dm-card"><h3>${esc(d.byName||d.byKey)} ${stLab(d)}${d.urgent?' <span class="dm-st dm-urg">⚡ urgent</span>':''}</h3>
    <div class="eq-s">Demandée le ${esc(fDT(d.at))} · 🏗 ${esc(siteLab(d))}</div>
    ${enAttente(d.id)?`<div class="warnbox">⏳ Pas encore partie au serveur (elle part toute seule).</div>`:''}
    ${c.fournisseur?`<div class="dm-info">🛒 Commandée chez <b>${esc(c.fournisseur)}</b>${c.at?' le '+esc(fDate(c.at)):''}${c.by?' par '+esc(c.by):''}${c.prevue?' · livraison prévue le <b>'+esc(fDate(c.prevue))+'</b>':''}${c.note?' · '+esc(c.note):''}</div>`:''}
    ${bc?`<div class="dm-info">🧾 Bon de commande <b>${esc(bc.num)}</b> · ${esc(bcEtat(bc))} · ${esc(eur(cmdTotal(bc)))} HT${canBC(ctx)&&hasPilotage(ctx)?` <button class="btn sm" data-act="x" data-v="dem|bc|${esc(bc.num)}">Ouvrir le bon</button>`:''}</div>`:c.bc?`<div class="dm-info">🧾 Bon de commande ${esc(c.bc)}</div>`:''}
    ${st==='refusee'?`<div class="warnbox">Refusée : ${esc(d.motifRefus||'')}</div>`:''}${remisesHTML(d)}
    ${rows?`<div class="dm-tw"><table class="dm-tab"><tr><th class="txt">Article</th><th class="num">Demandé</th><th class="num">Remis</th><th class="num">Reste</th></tr>${rows}</table></div>`:'<div class="eq-s">Demande libre : voir la note.</div>'}
    ${photosHTML(d.photos)}${d.note?`<div class="dm-note">📝 ${esc(d.note)}</div>`:''}
    ${acts?`<div class="dm-acts">${acts}</div>`:''}${S.form&&S.form.id===d.id?formHTML(me,ctx,d):''}${histoHTML(d)}</div>`;}
function formHTML(me,ctx,d){const F=S.form;const ok=(k,t)=>`<div class="dm-acts"><button class="btn primary" data-act="x" data-v="dem|${k}|${esc(d.id)}">${t}</button><button class="btn" data-act="x" data-v="dem|formx|">Annuler</button></div>`;
  if(F.k==='cmd'){const fours=[...new Set(cmdAll().map(c=>String(c.fournisseur||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).slice(0,80);
    return `<div class="card dm-form"><h3>🛒 Commandé</h3>
      <label class="f" for="dm-four">Fournisseur</label><input class="f" id="dm-four" data-xin="dem|f|four" list="dm-fours" value="${esc(F.four||'')}" placeholder="Nom du fournisseur" autocomplete="off"><datalist id="dm-fours">${fours.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
      <label class="f" for="dm-prevue">Livraison prévue le <span class="dim">(facultatif)</span></label><input class="f" id="dm-prevue" type="date" data-xin="dem|f|prevue" value="${esc(F.prevue||'')}">
      ${canBC(ctx)?`<label class="dm-chk"><input type="checkbox" data-xin="dem|f|bc" ${F.bc?'checked':''}> Créer le bon de commande pré-rempli (brouillon : chantier, fournisseur, articles — les prix se complètent dans Bons de commande)</label>`:''}
      <label class="f" for="dm-fnote">Mot pour le demandeur <span class="dim">(facultatif)</span></label><input class="f" id="dm-fnote" data-xin="dem|f|note" value="${esc(F.note||'')}" placeholder="ex. livré directement sur le chantier">
      ${ok('cmdok','✓ Enregistrer « Commandé »')}</div>`;}
  if(F.k==='liv'){const L=d.lignes||[];const people=((ctx.people||[]).filter(p=>p&&p.active!==false&&p.id!==d.byKey)).slice().sort((a,b)=>nom(a,ctx).localeCompare(nom(b,ctx),'fr'));
    return `<div class="card dm-form"><h3>📦 Livré / remis</h3>
      <label class="f" for="dm-ldate">Date</label><input class="f" id="dm-ldate" type="date" data-xin="dem|f|date" value="${esc(F.date||auj())}">
      <label class="f" for="dm-qui">Remis à</label><select class="f" id="dm-qui" data-xin="dem|f|qui"><option value="${esc(d.byKey)}"${F.qui===d.byKey?' selected':''}>${esc(d.byName||d.byKey)} (le demandeur)</option><option value="__chantier"${F.qui==='__chantier'?' selected':''}>Déposé sur le chantier</option>${people.map(p=>`<option value="${esc(p.id)}"${F.qui===p.id?' selected':''}>${esc(nom(p,ctx))}</option>`).join('')}</select>
      ${L.length?`<label class="f">Quantités remises maintenant</label>${L.map((l,i)=>reste(l)?`<div class="dm-li"><div class="dm-lt"><b>${esc(l.label||l.ref)}</b><small>reste ${nf(reste(l))}${l.unite?' '+esc(l.unite):''}</small></div><div class="dm-pin"><input class="f" type="number" inputmode="decimal" min="0" max="${reste(l)}" step="any" data-xin="dem|f|q|${i}" value="${esc(F.q&&F.q[i]!=null?F.q[i]:reste(l))}" aria-label="Quantité remise : ${esc(l.label||l.ref)}"></div></div>`:'').join('')}`
        :`<label class="dm-chk"><input type="checkbox" data-xin="dem|f|part" ${F.part?'checked':''}> Une partie seulement : le reste suit</label>`}
      <label class="f" for="dm-lnote">Note <span class="dim">(facultatif)</span></label><input class="f" id="dm-lnote" data-xin="dem|f|note" value="${esc(F.note||'')}" placeholder="ex. BL n°…, laissé dans le bungalow">
      ${ok('livok','✓ Enregistrer la remise')}<div class="hint">Tout n'est pas là ? Mets les quantités remises : ce qui manque attend sur la demande (« livrée en partie ») et le demandeur est prévenu.</div></div>`;}
  if(F.k==='refus')return `<div class="card dm-form"><h3>Refuser la demande</h3><label class="f" for="dm-motif">Motif du refus <span class="dim">(obligatoire, le demandeur le verra)</span></label><textarea class="f" id="dm-motif" rows="2" data-xin="dem|f|motif">${esc(F.motif||'')}</textarea>${ok('refusok','Confirmer le refus')}</div>`;
  return '';}
/* lit les champs du cadre ouvert (au cas où un champ n'a pas encore déclenché son évènement) */
function readForm(){const F=S.form;if(!F||typeof document==='undefined')return;document.querySelectorAll('#eq-app [data-xin^="dem|f|"]').forEach(el=>setF(el.dataset.xin.slice(6),el));}
function setF(k,el){const F=S.form;if(!F)return;if(k==='bc'||k==='part'){F[k]=!!el.checked;return;}if(k.startsWith('q|')){F.q=F.q||[];F.q[+k.slice(2)]=el.value;return;}F[k]=el.value;}
async function majDem(id,fn,ctx,me){if(S.busy)return;S.busy=true;try{try{await fresh();}catch(e){} /* relecture LÉGÈRE (lignes changées) : une annulation du demandeur passe avant */
    const d=regGet('magdem',id);if(!d||d.circuit!=='achat'){ctx.render();return;}const r=fn(d);if(!r){ctx.render();return;}
    const at=isoNow(),by=nom(me,ctx);const H=(d.histo||[]).concat((r.histo||[]).map(h=>Object.assign({at,by},h)));regSet('magdem',id,Object.assign({},r.patch,{histo:H}),{quiet:true,local:isLocal(d.byKey)});
    S.form=null;if(r.toast)ctx.toast(r.toast);}finally{S.busy=false;}ctx.render();}
const gone=(d,ctx,ok)=>{if(ok.includes(d.statut))return false;ctx.toast(d.statut==='annulee'?'Annulée par le demandeur entre-temps.':'La demande a changé entre-temps ('+stOf(d)[0].toLowerCase()+').');return true;};
function commander(id,me,ctx){readForm();const F=S.form||{};const four=String(F.four||'').trim();if(!four){ctx.toast('Le fournisseur');return;}const prevue=/^\d{4}-\d{2}-\d{2}$/.test(String(F.prevue||''))?F.prevue:null;const note=String(F.note||'').trim();const mkBC=!!F.bc&&canBC(ctx);
  majDem(id,d=>{if(gone(d,ctx,['envoyee','remise']))return null;let bcNum=null;
    if(mkBC){bcNum=cmdNextNum();const sid=siteId(d);const affs=affAll().filter(a=>a&&!a.deleted&&(a.sites||[]).includes(sid));const L=(d.lignes||[]).filter(l=>reste(l)>0);
      regSet('commande',bcNum,{num:bcNum,etat:'brouillon',site:sid||null,affaire:affs.length===1?affs[0].num:null,fournisseur:four,objet:'Demande de matériel · '+(d.byName||'')+' · '+fDate(d.at),livraison:prevue,
        lignes:L.length?L.map(l=>({designation:l.label||l.ref||'',qte:reste(l),unite:l.unite||'u',pu:''})):[{designation:String(d.note||'Demande de matériel').slice(0,140),qte:1,unite:'u',pu:''}],
        notes:[d.note?'Note du demandeur : '+d.note:'',d.urgent?'⚡ urgent':''].filter(Boolean).join(' — ')||null,demande:d.id,by:(ctx.api&&ctx.api.userName?ctx.api.userName():nom(me,ctx)),at:isoNow()},{local:isLocal(d.byKey)});}
    return {patch:{statut:'commandee',commande:{fournisseur:four,prevue,note:note||null,bc:bcNum||((d.commande||{}).bc)||null,at:isoNow(),by:nom(me,ctx)}},histo:[{statut:'commandee',note:'chez '+four+(prevue?' · prévue le '+fDate(prevue):'')+(bcNum?' · '+bcNum:'')+(note?' — '+note:'')}],
      toast:'Commandée chez '+four+(bcNum?' · bon '+bcNum+' créé (brouillon : complète les prix)':'')+' — le demandeur est prévenu'};},ctx,me);}
function livrer(id,me,ctx){readForm();const F=S.form||{};const date=/^\d{4}-\d{2}-\d{2}$/.test(String(F.date||''))?F.date:auj();const qk=F.qui||'';const note=String(F.note||'').trim();
  majDem(id,d=>{if(gone(d,ctx,['envoyee','commandee','remise']))return null;const quiN=qk==='__chantier'?'déposé sur le chantier':(persNom(qk,ctx)||(qk===d.byKey||!qk?d.byName:qk)||'');
    const L=d.lignes||[];let out=[],lignes=L,rq=0;
    if(L.length){lignes=L.map((l,i)=>{const v=F.q&&F.q[i]!=null?(String(F.q[i]).trim()===''?0:num(F.q[i])):reste(l); /* champ vidé = rien de remis pour cet article */const q=Math.max(0,Math.min(reste(l),v===null?0:v));if(q>0)out.push({ref:l.ref||null,label:l.label||l.ref||'',qte:r3(q)});return Object.assign({},l,{remis:r3(servi(l)+q)});});
      if(!out.length){ctx.toast('Mets au moins une quantité remise.');return null;}rq=r3(lignes.reduce((x,l)=>x+reste(l),0));}
    else rq=F.part?1:0;
    const statut=rq>0?'remise':'cloturee';
    return {patch:{statut,lignes,remises:(d.remises||[]).concat([{at:isoNow(),date,by:nom(me,ctx),qui:quiN,quiKey:qk||d.byKey,lignes:out,partiel:rq>0||undefined,note:note||undefined}]),retirePar:quiN,retireAt:isoNow()},
      histo:[{statut,note:'remis le '+fDate(date)+(quiN?' · '+quiN:'')+(rq>0?' — le reste suit':'')+(note?' — '+note:'')}],toast:rq>0?'Remise en partie enregistrée : ce qui manque attend sur la demande':'Livrée : le demandeur est prévenu'};},ctx,me);}
/* ══════════ clics et champs ══════════ */
const WRITE=new Set(['inc','dec','sz','libadd','urgent','phrm','send','cancel','cmdok','livok','refusok','clore']);
const MGR=new Set(['file','gopen','gback','cmd','liv','refus','formx','cmdok','livok','refusok','clore','bc','fini']);
function act(v,el,me,ctx){const i=String(v).indexOf('|');const k=i<0?v:v.slice(0,i);const arg=i<0?'':v.slice(i+1); /* l'identifiant d'une demande contient lui-même un « | » */
  if(WRITE.has(k)&&RO(ctx))return;if(MGR.has(k)&&!demCanHandle(ctx)){ctx.toast('Réservé à l\'encadrement (conducteur, bureau)');return;}
  switch(k){
    case 'new':S.v='new';S.step=1;topScroll();break;
    case 'list':S.v='list';S.cur=null;S.step=1;S.gcur=null;S.form=null;break;
    case 'open':S.v='fiche';S.cur=arg;topScroll();break;
    case 'mfini':S.mfini=!S.mfini;break;
    case 'step':S.step=+arg===2?2:1;topScroll();break;
    case 'tog':S.open[arg]=!(el&&el.getAttribute&&el.getAttribute('aria-expanded')==='true');break;
    case 'inc':case 'dec':{const D=draft(me);const q=Math.max(0,r3((+D.lignes[arg]||0)+(k==='inc'?1:-1)));if(q)D.lignes[arg]=q;else{delete D.lignes[arg];if(arg.startsWith('L:')){delete D.labels[arg];delete D.unites[arg];}}if(q&&!D.labels[arg])D.labels[arg]=(el&&el.dataset&&el.dataset.l)||((cat()[arg]||{}).label)||arg;saveDraft(me);break;}
    case 'sz':{const j=arg.indexOf('|');const key=arg.slice(0,j),ref=arg.slice(j+1);const D=draft(me);S.sel[key]=ref;if(!(+D.lignes[ref])){D.lignes[ref]=1;D.labels[ref]=(el&&el.dataset&&el.dataset.l)||((cat()[ref]||{}).label)||ref;saveDraft(me);}break;}
    case 'libadd':{const g=id=>{const x=typeof document!=='undefined'&&document.getElementById(id);return x?x.value:'';};const lib=String(g('dm-lib')||S.lib||'').trim().slice(0,140);const q=num(g('dm-libq')||S.libq);
      if(!lib){ctx.toast('Écris l\'article (ex. disques à tronçonner 125).');return;}if(!(q>0)){ctx.toast('La quantité');return;}const D=draft(me);const key='L:'+uid();D.lignes[key]=r3(q);D.labels[key]=lib;saveDraft(me);S.lib='';S.libq='1';ctx.toast('✓ Ajouté : '+lib+' × '+nf(q));break;}
    case 'urgent':{const D=draft(me);D.urgent=!D.urgent;saveDraft(me);break;}
    case 'phrm':{const D=draft(me);D.photos.splice(+arg,1);saveDraft(me);break;}
    case 'send':send(me,ctx);return;
    case 'cancel':cancel(arg,me,ctx);return;
    /* encadrement */
    case 'file':S.v='file';S.gcur=null;S.form=null;topScroll();break;
    case 'fini':S.fini=!S.fini;break;
    case 'gopen':S.gcur=arg;S.form=null;topScroll();break;
    case 'gback':S.gcur=null;S.form=null;break;
    case 'cmd':{const d=regGet('magdem',arg);if(!d)break;const c=d.commande||{};S.form={id:arg,k:'cmd',four:c.fournisseur||'',prevue:c.prevue||'',bc:canBC(ctx)&&!c.bc,note:''};break;}
    case 'liv':{const d=regGet('magdem',arg);if(!d)break;S.form={id:arg,k:'liv',date:auj(),qui:d.byKey,q:(d.lignes||[]).map(reste),note:'',part:false};break;}
    case 'refus':S.form={id:arg,k:'refus',motif:''};break;
    case 'formx':S.form=null;break;
    case 'cmdok':commander(arg,me,ctx);return;
    case 'livok':livrer(arg,me,ctx);return;
    case 'refusok':{readForm();const m=String((S.form||{}).motif||'').trim();if(!m){ctx.toast('Le motif du refus est obligatoire.');return;}
      majDem(arg,d=>gone(d,ctx,['envoyee','commandee'])?null:{patch:{statut:'refusee',motifRefus:m},histo:[{statut:'refusee',note:m}],toast:'Demande refusée : le demandeur voit le motif'},ctx,me);return;}
    case 'clore':if(typeof confirm==='function'&&!confirm('Clore la demande ? Le reste ne sera pas livré.'))return;
      majDem(arg,d=>gone(d,ctx,['remise'])?null:{patch:{statut:'cloturee',clos:true},histo:[{statut:'cloturee',note:'le reste ne viendra pas ('+nf(resteTot(d))+')'}],toast:'Demande close'},ctx,me);return;
    case 'bc':{const cs=cmdState();if(ctx.go)ctx.go('cmd');cs.cur=arg;cs.tab='cmdfiche';break;}
    default:return;}
  ctx.render();if(k==='cmd'||k==='liv'||k==='refus')setTimeout(()=>{try{const f=document.querySelector('#eq-app .dm-form');if(f&&f.scrollIntoView)f.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}},30);} /* le cadre ouvert vient sous les yeux (téléphone) */
function input(champ,el,me,ctx,type){const i=String(champ).indexOf('|');const k=i<0?champ:champ.slice(0,i);const arg=i<0?'':champ.slice(i+1);
  switch(k){
    case 'lib':S.lib=el.value;return;
    case 'libq':S.libq=el.value;return;
    case 'note':{const D=draft(me);D.note=el.value;saveDraft(me);return;}
    case 'site':if(type!=='change')return;{const D=draft(me);D.site=el.value;saveDraft(me);}return;
    case 'photo':if(type!=='change')return;addPhoto(el,me,ctx);return;
    case 'fsite':if(type!=='change')return;S.fsite=el.value;ctx.render();return;
    case 'f':setF(arg,el);return;
    default:return;}}
/* ══════════ « À faire » / « À savoir » ══════════ */
function goFile(ctx){S.gcur=null;S.form=null;if(hasPilotage(ctx)&&ctx.go){ctx.go('x:dem:file');return;}S.v='file';if(ctx.sub)ctx.sub('dem');}
function tasks(me,ctx){const L=[];if(!canAsk(me))return L;const D=demAll();
  const mine=D.filter(d=>d.byKey===me.id);const vu=VU(me);const nw=mine.filter(d=>nouveau(d,vu)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  if(nw.length){const d=nw[0];const one=nw.length===1;const s=stOf(d)[0].toLowerCase();
    L.push({act:false,sev:nw.some(x=>x.statut==='refusee')?'bad':nw.every(x=>x.statut==='cloturee')?'ok':'warn',ic:'📦',kl:'Mes demandes',kv:one?s+(suivi(d)?' · '+suivi(d):''):nw.length+' demandes ont avancé',t:one?'Ta demande est '+s:nw.length+' demandes ont avancé',s:one?resume(d):nw.slice(0,2).map(resume).join(' · '),
      go:()=>{if(one){S.v='fiche';S.cur=d.id;}else S.v='list';if(ctx.sub)ctx.sub('dem');}});}
  if(demCanHandle(ctx)){const T=D.filter(d=>d.statut==='envoyee').sort(byAt);if(T.length){const nU=T.filter(d=>d.urgent).length;
      L.push({act:true,sev:nU?'bad':'warn',ic:'📦',t:T.length+' demande'+(T.length>1?'s':'')+' de matériel à traiter'+(nU?' (dont '+nU+' urgente'+(nU>1?'s':'')+')':''),s:T.slice(0,3).map(d=>(d.byName||'?')+' · '+siteLab(d)+(d.urgent?' ⚡':'')).join(' · '),when:nU?'⚡ urgent':'',kl:'Demandes de matériel',kv:T.length+' à traiter',go:()=>goFile(ctx)});}
    const late=D.filter(d=>d.statut==='commandee'&&d.commande&&d.commande.prevue&&d.commande.prevue<auj());
    if(late.length)L.push({act:false,sev:'warn',ic:'📦',kl:'Livraisons en retard',kv:late.length+' demande'+(late.length>1?'s':'')+' commandée'+(late.length>1?'s':''),t:late.length+' livraison'+(late.length>1?'s':'')+' en retard',s:late.slice(0,3).map(d=>siteLab(d)+' · '+((d.commande||{}).fournisseur||'')).join(' · '),go:()=>goFile(ctx)});}
  return L;}
/* tests / outillage */
const testApi=()=>({state:S,all:demAll,vu:me=>VU(me)});
export default {id:'dem',feat:'demandes',hub:'expl',
  moiSubs:(me,ctx)=>{try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.demandes)window.TRACE.demandes=testApi();}catch(e){}if(!canAsk(me))return [];const vu=VU(me);const n=demAll().filter(d=>d.byKey===me.id&&nouveau(d,vu)).length;
    /* 31/10 (Ethan : « Magasin et Mes demandes, c'est la même chose ? ») : UNE tuile « Mes demandes ». Module Magasin pris → c'est celle du Magasin (le dépôt prépare,
       remet, commande ce qui manque) ; cette tuile-ci ne reste que s'il reste ici une demande en cours (la sienne, ou à traiter pour l'encadrement), sous « Achats en cours ». */
    let mag=false;try{mag=!!(ctx&&ctx.api&&ctx.api.feat&&ctx.api.feat('magasin'));}catch(e){mag=false;}
    if(mag){const EN=d=>d.statut==='envoyee'||d.statut==='commandee'||d.statut==='remise';let h=false;try{h=demCanHandle(ctx);}catch(e){h=false;}
      if(!demAll().some(d=>EN(d)&&(d.byKey===me.id||h)))return [];return [['dem','Achats en cours',n,false]];}
    return [['dem','Mes demandes',n,false]];},
  view:(sub,me,ctx)=>sub==='dem'?vDem(me,ctx):null,
  xview:(key,me,ctx)=>{cssLotCC();if(key!=='file')return null;if(!demCanHandle(ctx))return wrap('<div class="card"><div class="eq-s">Réservé à l\'encadrement (conducteur, bureau).</div></div>');return wrap(vFile(me,ctx,false));},
  hubRows:(tab,me,ctx)=>{if(tab!=='achats'||!demCanHandle(ctx))return [];const D=demAll();const n=D.filter(d=>d.statut==='envoyee').length,nU=D.filter(d=>d.statut==='envoyee'&&d.urgent).length,nc=D.filter(d=>d.statut==='commandee'||d.statut==='remise').length;
    return [ctx.row('Demandes de matériel','Les demandes des équipes pour leurs chantiers : commander, livrer, refuser — sans magasin'+(nc?' · '+nc+' en attente de livraison':''),'📦','#fff3d6','x:dem:file',n||null,nU?'bad':'')];},
  tasks,act,input};
