// dpgfwb.js — ATELIER DPGF (13/10/2026 soir). Ethan : « pour la DPGF ça m'a l'air compliqué : comme dans Lecture, tu me lis le DPGF Excel de base, mais on
// travaille dessus directement, même option que la lecture (l'envoyer sur un autre écran) ; en gros tous nos coûts d'un côté, le DPGF de l'autre ; dire
// cette dépense-là dans telle cellule, cette dépense-là divisée par la quantité de telle cellule du DPGF = le PU de telle cellule ».
// · à gauche « Nos coûts » : les postes de chaque zone, les paniers, les installations (prix de VENTE), avec ce qui est déjà placé et le reste ;
// · à droite le DPGF du client, présenté comme la feuille Excel (n° de ligne Excel, n°, désignation, unité, quantité, PU, montant) ;
// · on touche un coût puis une ligne : « Placer » — une part du coût (%), divisée par la quantité de CETTE ligne (PU = montant ÷ quantité) ou de N'IMPORTE
//   QUELLE autre ligne (un taux par unité : « installations ÷ ml du réseau » ajouté au PU de chaque ligne de tube) ;
// · ce qui n'est placé nulle part se ventile au ml sur les lignes cochées « reste au ml » (règle existante) ; « Appliquer » écrit les PU, l'export
//   réécrit le fichier Excel du client ; ⤢ plein écran, ⧉ autre écran (fenêtre à glisser sur le 2e écran, comme la Lecture).
// Données : a.dpgf.map[i].srcs = [{key, pct, per}] (per = n° de la ligne dont la QUANTITÉ divise ; absent = la ligne elle-même) — même structure qu'avant, étendue.
let H=null;export function initDpgfWb(h){H=h;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=x=>nb(x)+' €';const num=v=>v===''||v===null||v===undefined?0:(isFinite(+v)?+v:0);
const DW={sel:null,filt:'reste',full:false,line:null,popup:null,mode:'compo',zone:0,csel:null,pick:{}}; /* 13/10 nuit : mode « prix composés » (défaut) ou « coûts à placer » */
export const dwState=()=>DW;
const grpOf=k=>{const p=String(k).split('|');return p[0]==='i'?'inst':'z'+p[1];};
const shortLab=l=>String(l||'').replace(/^.*? › /,'');
const qtyTxt=l=>nb(l.qte,String(l.qte).includes('.')?2:0)+(l.u?' '+l.u:'');
const pctOf=s=>s.pct===undefined||s.pct===''||s.pct===null?100:num(s.pct);
/* ── la carte ── */
export function dpgfWorkbenchHTML(a,canEdit){const D=a.dpgf||{};const L=D.lignes||[];if(!L.length)return '';const T=H.translate(a);
  if(!T.S.C.v2)return `<div class="card"><h3>Atelier DPGF</h3><div class="eq-s">Avec le chiffrage complet (zones, postes, paniers), tes coûts se placent ici ligne par ligne. En attendant : « Répartir » puis ajustement ligne par ligne.</div></div>`;
  const ro=!canEdit;const used=T.usedAmt||{};const opts=T.S.opts;const sel=opts.find(o=>o.key===DW.sel)?DW.sel:null;if(!sel)DW.sel=null;
  const groups=[];opts.forEach(o=>{const g=grpOf(o.key);let G=groups.find(x=>x.g===g);if(!G){G={g,nom:g==='inst'?'🏗 Installations':String(o.label).split(' › ')[0],items:[]};groups.push(G);}G.items.push(o);});
  const costBtn=o=>{const u=used[o.key]||0;const rest=Math.max(0,o.vente-u);const pc=o.vente?Math.min(100,u/o.vente*100):0;const over=u>o.vente+1;
    return `<button class="cm-dwc${o.key===sel?' on':''}${rest<1&&!over?' done':''}${over?' over':''}" data-act="af" data-v="dwsel|${encodeURIComponent(o.key)}" title="${esc(o.label)}"><span class="t">${esc(shortLab(o.label))}</span><span class="m">${eur(o.vente)}</span><span class="bar"><i style="width:${pc.toFixed(1)}%"></i></span><small>${over?'⚠ placé à '+nb(pc,0)+' %':rest<1?'✓ tout placé':'reste '+eur(rest)}</small></button>`;};
  const left=groups.map(G=>{const items=G.items.filter(o=>DW.filt!=='reste'||o.vente-(used[o.key]||0)>=1||o.key===sel);if(!items.length)return '';return `<div class="cm-dwg"><div class="cm-dwgh">${esc(G.nom)}</div>${items.map(costBtn).join('')}</div>`;}).join('')||'<div class="eq-s">Tout est placé ✓</div>';
  const popupOn=popupLive();
  const selO=sel?opts.find(o=>o.key===sel):null;
  return `<div class="card cm-dw${DW.full?' full':''}" id="cm-dw">
    <div class="cm-dwh"><h3>Atelier DPGF <span class="hint">· nos coûts → les lignes du client</span></h3><span class="eq-acts" style="margin:0"><button class="btn sm" data-act="af" data-v="dwfull|" title="${DW.full?'Quitter le plein écran':'Plein écran'}">${DW.full?'✕ Quitter':'⤢ Plein écran'}</button><button class="btn sm" data-act="af" data-v="dwpop|" title="Ouvrir le DPGF dans une fenêtre à glisser sur ton 2e écran">⧉ Autre écran</button>${ro?'':`<button class="btn sm primary" data-act="af" data-v="dpapply|">→ Appliquer les PU</button>`}${D.kept?`<button class="btn sm" data-act="af" data-v="dpxlsx|">⬇ Excel du client</button>`:''}</span></div>
    <div class="ac-stats cm-dws"><div class="ac-stat or"><b>${eur(T.vente)}</b><small>prix de vente à placer</small></div><div class="ac-stat ${T.assigned>T.vente+1?'bad':''}"><b>${eur(T.assigned)}</b><small>placé sur des lignes</small></div><div class="ac-stat ${T.reste>1&&!T.mlLines?'warn':''}"><b>${eur(T.reste)}</b><small>reste → au ml sur ${T.mlLines} ligne${T.mlLines>1?'s':''}</small></div><div class="ac-stat"><b>${T.perLine.filter(x=>x.pu>0).length} / ${T.perLine.length}</b><small>lignes avec un PU</small></div></div>
    <div class="eq-filtres cm-dwmode" style="margin:0 0 6px"><button class="chip${DW.mode==='compo'?' active':''}" data-act="af" data-v="dwmode|compo" title="Prix au ml / à l'unité des postes de chaque zone, regroupés, puis pointés ligne par ligne">🧮 Prix composés · pointage</button><button class="chip${DW.mode!=='compo'?' active':''}" data-act="af" data-v="dwmode|couts" title="Placer une part d'un coût sur une ligne">Coûts à placer</button></div>
    ${DW.mode==='compo'?compoBand(T):selO?`<div class="cm-dwsel">👉 <b>${esc(selO.label)}</b> · ${eur(selO.vente)} · reste ${eur(Math.max(0,selO.vente-(used[selO.key]||0)))} — touche une ligne du DPGF pour le placer <button class="btn sm" data-act="af" data-v="dwsel|">✕</button></div>`:`<div class="cm-dwsel idle">① Touche un coût à gauche · ② touche la ligne du DPGF qui le reçoit (une part, divisée par la quantité de la ligne ou d'une autre).</div>`}
    <div class="cm-dwb"><div class="cm-dwl">${DW.mode==='compo'?compoLeft(a,T,ro):`<div class="eq-filtres" style="margin:0 0 4px"><button class="chip${DW.filt==='reste'?' active':''}" data-act="af" data-v="dwfilt|reste">À placer</button><button class="chip${DW.filt!=='reste'?' active':''}" data-act="af" data-v="dwfilt|tout">Tout</button></div>${left}`}</div>
      <div class="cm-dwr">${popupOn?`<div class="cm-lpopph"><div style="font-size:34px">⧉</div><b>Le DPGF est ouvert dans l'autre fenêtre</b><span class="hint">Glisse-la sur ton 2e écran : touche un coût ici, puis la ligne là-bas.</span><button class="btn sm" data-act="af" data-v="dwpopclose|">↩ Ramener ici</button></div>`:gridHTML(a,T,ro)}</div></div>
    <div class="hint" style="margin-top:6px">Une ligne cochée « reste » reçoit sa part de ce qui n'est placé nulle part, au prorata de sa quantité. « Appliquer les PU » écrit le bordereau (le total tombe sur le prix de vente) ; tu peux ensuite retoucher un PU à la main dans le bordereau.</div></div>`;}
/* ── 13/10 nuit (Ethan : « un espace qui aide à remplir le DPGF, avec les prix au ml de chaque poste par zone ; pouvoir grouper deux postes, trois, tous les postes ;
   prix ventilé au ml, à l'unité, vraiment très flexible ; puis en fonction des lignes du DPGF c'est du pointage : j'ai 500 ml de DN 400, je veux 3 postes noyés dans
   mon prix au ml, je les relie, ça calcule le prix au ml ; sur cette ligne il y a 220 ml, j'en pointe 220, ça me dit qu'il reste 280 ml à pointer à ce prix ») ── */
const COLS=['#1f6fd0','#15803d','#9333ea','#b45309','#0e7490','#be123c','#4d7c0f','#7c3aed','#c2410c','#0f766e'];
const zonesOf=T=>{const C=T.S.C;const Z=(C.etudes||[]).map((e,i)=>({k:'z'+i,ei:i,nom:e.z.nom||'Zone '+(i+1),ml:e.r.ml||0}));if(C.inst)Z.push({k:'inst',ei:-1,nom:'🏗 Installations',ml:C.ml||0});return Z;};
const optsOfZone=(T,Z)=>T.S.opts.filter(o=>Z.ei<0?/^i\|/.test(o.key):new RegExp('^[pb]\\|'+Z.ei+'\\|').test(o.key));
const cOf=(T,id)=>(T.compo||[]).find(c=>c.id===id)||null;
const unitTxt=c=>c.mode==='u'?(c.unitLabel||'u'):'ml';
function compoBand(T){const c=cOf(T,DW.csel);if(!c)return `<div class="cm-dwsel idle">① Coche les postes d'une zone → « 🔗 Regrouper » (un prix au ml ou à l'unité) · ② touche un prix composé · ③ touche la ligne du DPGF et pointe la quantité.</div>`;
  return `<div class="cm-dwsel"><span class="cm-cdot" style="background:${esc(c.color||'#1f6fd0')}"></span><b>${esc(c.nom)}</b> · ${nb(c.unit,2)} € / ${esc(unitTxt(c))} · reste <b>${nb(c.reste,2)} ${esc(unitTxt(c))}</b> sur ${nb(c.base,2)} — touche une ligne du DPGF pour pointer <button class="btn sm" data-act="af" data-v="dwcsel|">✕</button></div>`;}
function compoLeft(a,T,ro){const Z=zonesOf(T);if(!Z.length)return '<div class="eq-s">Pas de zone dans le chiffrage.</div>';const zi=Math.min(DW.zone,Z.length-1);const z=Z[zi];const opts=optsOfZone(T,z);const comp=T.compo||[];const inC=k=>comp.filter(c=>(c.keys||[]).includes(k));
  const zchips=`<div class="eq-filtres" style="margin:0 0 4px">${Z.map((x,i)=>`<button class="chip${i===zi?' active':''}" data-act="af" data-v="dwzone|${i}">${esc(x.nom)}</button>`).join('')}</div>`;
  const rows=opts.map(o=>{const cs=inC(o.key);const on=!!DW.pick[o.key];return `<tr class="${on?'on':''}"><td>${ro?'':`<label class="cm-dwpk"><input type="checkbox" data-act="af" data-v="dwpick|${encodeURIComponent(o.key)}" ${on?'checked':''}></label>`}</td><td>${esc(String(o.label).replace(/^.*? › /,''))}${cs.map(c=>`<span class="cm-cdot" title="${esc(c.nom)}" style="background:${esc(c.color||'#1f6fd0')}"></span>`).join('')}</td><td class="num">${nb(o.vente)}</td><td class="num">${z.ml?nb(o.vente/z.ml,2):'—'}</td></tr>`;}).join('');
  const nPick=Object.keys(DW.pick).filter(k=>DW.pick[k]&&opts.some(o=>o.key===k)).length;
  const tab=`<div style="overflow:auto"><table class="rc af-tab cm-dwpt"><tr><th></th><th>Poste · ${esc(z.nom)}</th><th class="num">Vente €</th><th class="num">€ / ml${z.ml?' <small>('+nb(z.ml)+' ml)</small>':''}</th></tr>${rows||'<tr><td colspan="4" class="dim">Rien de chiffré dans cette zone.</td></tr>'}</table></div>
    ${ro?'':`<div class="eq-acts" style="margin:4px 0 8px;flex-wrap:wrap"><button class="btn sm primary" data-act="af" data-v="dwgroup|" ${nPick?'':'disabled'}>🔗 Regrouper la sélection${nPick?' ('+nPick+')':''}</button><button class="btn sm" data-act="af" data-v="dwall|" title="Tous les postes de la zone (pas encore regroupés) dans un seul prix au ml">Tous les postes → un prix au ml</button>${nPick?`<button class="btn sm" data-act="af" data-v="dwpickclr|">✕ sélection</button>`:''}</div>`}`;
  const list=comp.length?comp.map(c=>`<div class="cm-cc${c.id===DW.csel?' on':''}${c.reste<-0.01?' over':Math.abs(c.reste)<0.01?' done':''}"><button class="cm-ccb" data-act="af" data-v="dwcsel|${esc(c.id)}" title="Pointer ce prix sur les lignes du DPGF"><span class="cm-cdot" style="background:${esc(c.color||'#1f6fd0')}"></span><b>${esc(c.nom)}</b><span class="m">${nb(c.unit,2)} € / ${esc(unitTxt(c))}</span><small>${(c.keys||[]).length} poste${(c.keys||[]).length>1?'s':''} · ${eur(c.tot)} · pointé ${nb(c.pointe,2)} / ${nb(c.base,2)} ${esc(unitTxt(c))} · ${c.reste<-0.01?'⚠ trop pointé de '+nb(-c.reste,2):Math.abs(c.reste)<0.01?'✓ tout pointé':'reste '+nb(c.reste,2)}</small></button>${ro?'':`<span class="cm-cca"><button class="lnk" data-act="af" data-v="dwcedit|${esc(c.id)}" title="Nom, ml / unité, quantité">✎</button><button class="lnk" data-act="af" data-v="dwcrm|${esc(c.id)}" title="Retirer ce prix (et ses pointages)" style="color:#9b2c22">✕</button></span>`}</div>`).join(''):'<div class="eq-s">Aucun prix composé : coche des postes puis « 🔗 Regrouper ».</div>';
  return zchips+tab+`<div class="eq-lab">Prix composés · ${comp.length}</div>${list}`;}
/* la feuille du client (aussi rendue dans la 2e fenêtre) */
function gridHTML(a,T,ro){const D=a.dpgf||{};const L=D.lignes||[];const map=D.map||{};const opts=T.S.opts;const sel=DW.sel;
  const rows=L.map((l,i)=>{if(l.section)return `<tr class="cm-dwsec"><td class="xr">${l.row||''}</td><td>${esc(l.n||'')}</td><td colspan="6">${esc(l.des)}</td></tr>`;const x=T.perLine.find(p=>p.i===i)||{};const srcs=(map[i]&&map[i].srcs)||[];
    const chips=srcs.map((s,j)=>{const o=opts.find(z=>z.key===s.key);const per=s.per!==undefined&&s.per!==null&&s.per!==''&&+s.per!==i?L[+s.per]:null;return `<span class="cm-dwchip" title="${esc(o?o.label:s.key)}">${esc(o?shortLab(o.label):'(coût disparu)')} · ${nb(pctOf(s))} %${per?' ÷ '+esc(per.n||('ligne '+(+s.per+1)))+' ('+esc(qtyTxt(per))+')':''}${ro?'':` <button class="lnk" data-act="af" data-v="dwrm|${i}|${j}" title="Retirer">✕</button>`}</span>`;}).join('');
    const pchips=((map[i]&&map[i].pts)||[]).map((p0,j)=>{const c=(T.compo||[]).find(z=>z.id===p0.c);return `<span class="cm-dwchip cm-dwpchip" title="${esc(c?c.nom:'')}"><span class="cm-cdot" style="background:${esc(c?c.color:'#999')}"></span>${esc(c?c.nom:'(prix retiré)')} · ${nb(p0.q,2)} ${esc(c?unitTxt(c):'')}${c?' × '+nb(c.unit,2)+' €':''}${ro?'':` <button class="lnk" data-act="af" data-v="dwptrm|${i}|${j}" title="Retirer le pointage">✕</button>`}</span>`;}).join('');
    return `<tr class="cm-dwrow${sel||DW.csel?' target':''}${DW.line===i?' on':''}" data-act="af" data-v="dwline|${i}"><td class="xr">${l.row||''}</td><td><b>${esc(l.n||'')}</b></td><td class="des">${esc(l.des)}${chips||pchips?`<div class="cm-dwchips">${pchips}${chips}</div>`:''}</td><td>${esc(l.u||'')}</td><td class="num">${nb(l.qte,String(l.qte).includes('.')?2:0)}</td><td class="num"><b>${x.pu?nb(x.pu,2):'—'}</b></td><td class="num">${x.total?eur(x.total):''}${x.resteMl?`<div class="dim" style="font-size:10.5px">dont reste ${eur(x.resteMl)}</div>`:''}</td><td><label class="ch-sw${x.ml?' on':''}" title="Reçoit sa part du reste (coûts placés nulle part), au prorata de sa quantité"><input type="checkbox" data-afdm="${i}|ml|ml" ${x.ml?'checked':''} ${ro?'disabled':''}><i></i><span>reste</span></label></td></tr>`;}).join('');
  return `<div class="cm-dwx"><table class="cm-dwt"><tr><th class="xr">Excel</th><th>N°</th><th>Désignation</th><th>U</th><th class="num">Qté</th><th class="num">PU proposé</th><th class="num">Montant</th><th>Reste</th></tr>${rows}<tr class="tot"><td></td><td></td><td>Total</td><td></td><td></td><td></td><td class="num"><b>${eur(T.perLine.reduce((s,x)=>s+(x.total||0),0))}</b></td><td></td></tr></table></div>`;}
/* ── actions ── */
export function dpgfWbAct(k,arg,arg2,a,ctx){const canEdit=ctx.canEdit;const render=()=>{if(ctx.render)ctx.render();refreshPopup(ctx);};
  switch(k){
    case 'dwsel':DW.sel=arg?decodeURIComponent(arg):null; /* la clé d'un coût contient des « | » : encodée dans data-v */if(DW.sel)DW.line=null;render();return true;
    case 'dwfilt':DW.filt=arg;render();return true;
    case 'dwfull':DW.full=!DW.full;render();return true;
    case 'dwpop':openPopup(a,ctx);render();return true;
    case 'dwpopclose':{const P=DW.popup;DW.popup=null;try{P&&P.w&&P.w.close();}catch(e){}render();return true;}
    case 'dwline':{const i=+arg;if(DW.mode==='compo'&&DW.csel){if(!canEdit){A().toast&&A().toast('Lecture seule');return true;}pointDialog(a,i,ctx,document);return true;}if(!DW.sel){DW.line=DW.line===i?null:i;render();return true;}if(!canEdit){A().toast&&A().toast('Lecture seule');return true;}placeDialog(a,i,ctx,document);return true;}
    case 'dwmode':DW.mode=arg==='couts'?'couts':'compo';DW.csel=null;DW.sel=null;render();return true;
    case 'dwzone':DW.zone=+arg||0;render();return true;
    case 'dwpick':{const k=decodeURIComponent(arg||'');DW.pick[k]=!DW.pick[k];render();return true;}
    case 'dwpickclr':DW.pick={};render();return true;
    case 'dwcsel':DW.csel=arg||null;DW.sel=null;render();return true;
    case 'dwgroup':case 'dwall':{if(!canEdit)return true;const T=H.translate(a);const Z=zonesOf(T);const z=Z[Math.min(DW.zone,Z.length-1)];if(!z)return true;const opts=optsOfZone(T,z);const comp=T.compo||[];
      const keys=k==='dwall'?opts.filter(o=>o.vente>0&&!comp.some(c=>(c.keys||[]).includes(o.key))).map(o=>o.key):opts.filter(o=>DW.pick[o.key]).map(o=>o.key);if(!keys.length){A().toast&&A().toast(k==='dwall'?'Tous les postes de la zone sont déjà regroupés':'Coche au moins un poste');return true;}
      compoDialog(a,ctx,{keys,zone:z,nom:z.nom+(k==='dwall'?' · tous les postes':' · '+keys.length+' poste'+(keys.length>1?'s':'')),mode:'ml',base:Math.round((z.ml||0)*100)/100||1},null,document);return true;}
    case 'dwcedit':{if(!canEdit)return true;const T=H.translate(a);const c=cOf(T,arg);if(c)compoDialog(a,ctx,c,c.id,document);return true;}
    case 'dwcrm':{if(!canEdit)return true;const D=Object.assign({},a.dpgf||{});const c=(D.compo||[]).find(x=>x.id===arg);if(!c)return true;const n=Object.values(D.map||{}).reduce((x,m)=>x+((m&&m.pts)||[]).filter(p=>p.c===arg).length,0);if(!confirm('Retirer le prix « '+(c.nom||'')+' »'+(n?' et ses '+n+' pointage(s)':'')+' ?'))return true;
      D.compo=(D.compo||[]).filter(x=>x.id!==arg);D.map=Object.fromEntries(Object.entries(D.map||{}).map(([i,m])=>[i,Object.assign({},m,{pts:((m&&m.pts)||[]).filter(p=>p.c!==arg)})]));if(DW.csel===arg)DW.csel=null;H.affSet(a.num,{dpgf:D});render();return true;}
    case 'dwptrm':{if(!canEdit)return true;const D=Object.assign({},a.dpgf||{});D.map=Object.assign({},D.map||{});const m=Object.assign({},D.map[arg]||{});m.pts=(m.pts||[]).filter((p,j)=>j!==+arg2);D.map[arg]=m;H.affSet(a.num,{dpgf:D});render();return true;}
    case 'dwrm':{if(!canEdit)return true;const D=Object.assign({},a.dpgf||{});D.map=Object.assign({},D.map||{});const m=Object.assign({},D.map[arg]||{});m.srcs=(m.srcs||[]).filter((s,j)=>j!==+arg2);D.map[arg]=m;H.affSet(a.num,{dpgf:D});render();return true;}}
  return false;}
const A=()=>H.A||{};
/* « Placer » : une part du coût, divisée par la quantité de cette ligne ou d'une autre — dans la fenêtre où l'on a touché la ligne */
function placeDialog(a,i,ctx,doc){const D=a.dpgf||{};const L=D.lignes||[];const l=L[i];if(!l||l.section)return;const T=H.translate(a);const o=T.S.opts.find(x=>x.key===DW.sel);if(!o)return;
  const used=(T.usedAmt||{})[o.key]||0;const rest=Math.max(0,o.vente-used);const pct0=o.vente?Math.max(0,Math.min(100,Math.round(rest/o.vente*1000)/10)):100;
  const lines=L.map((x,j)=>({x,j})).filter(({x})=>!x.section&&+x.qte>0);
  const old=doc.getElementById('cm-dwplace');if(old)old.remove();
  const box=doc.createElement('div');box.id='cm-dwplace';box.className='cm-dwplace';
  box.innerHTML=`<div class="box"><h3 style="margin-top:0">Placer un coût sur une ligne</h3>
    <div class="cm-dwpl"><span>Coût</span><b>${esc(o.label)}</b><small>${eur(o.vente)} · déjà placé ${eur(used)} · reste ${eur(rest)}</small></div>
    <div class="cm-dwpl"><span>Ligne</span><b>${esc(l.n||'')} ${esc(l.des)}</b><small>${esc(qtyTxt(l))}${l.row?' · ligne Excel '+l.row:''}</small></div>
    <label class="f">Part du coût (%)</label><input class="f" type="number" min="0" max="100" step="0.1" id="dwp-pct" value="${pct0}">
    <label class="f">Diviser par la quantité de</label><select class="f" id="dwp-per"><option value="">cette ligne (${esc(qtyTxt(l))}) → PU = montant ÷ ${esc(qtyTxt(l))}</option>${lines.filter(({j})=>j!==i).map(({x,j})=>`<option value="${j}">${esc(x.n||'')} ${esc(String(x.des).slice(0,60))} (${esc(qtyTxt(x))})</option>`).join('')}</select>
    <div class="cm-dwprev" id="dwp-prev"></div>
    <div class="actions"><button class="btn primary block" id="dwp-ok">Placer</button><button class="btn block" id="dwp-no">Annuler</button></div></div>`;
  doc.body.appendChild(box);
  const g=id=>box.querySelector('#'+id);const prev=()=>{const p=num(g('dwp-pct').value)/100;const per=g('dwp-per').value;const base=o.vente*p;const den=per!==''?num((L[+per]||{}).qte):num(l.qte);const rate=den?base/den:0;const amt=per!==''?rate*num(l.qte):base;
    g('dwp-prev').innerHTML=`→ <b>+${nb(rate,2)} €${l.u?' / '+esc(l.u):''}</b> au PU de cette ligne · ${eur(amt)} sur la ligne${per!==''?` <span class="dim">(${eur(base)} ÷ ${esc(qtyTxt(L[+per]))} = ${nb(rate,2)} €, × ${esc(qtyTxt(l))})</span>`:''}`;};
  g('dwp-pct').oninput=prev;g('dwp-per').onchange=prev;prev();
  const close=()=>{box.remove();};g('dwp-no').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});
  g('dwp-ok').onclick=()=>{const pct=num(g('dwp-pct').value);if(!(pct>0)){g('dwp-prev').innerHTML='<b style="color:#9b2c22">Part à 0 % : rien à placer.</b>';return;}const per=g('dwp-per').value;
    const a2=H.affGet(a.num)||a;const D2=Object.assign({},a2.dpgf||{});D2.map=Object.assign({},D2.map||{});const m=Object.assign({},D2.map[i]||{});const s={key:o.key,pct:Math.round(pct*10)/10};if(per!=='')s.per=+per;m.srcs=(m.srcs||[]).concat([s]);D2.map[i]=m;H.affSet(a.num,{dpgf:D2});
    close();const T2=H.translate(H.affGet(a.num)||a2);const left=Math.max(0,o.vente-((T2.usedAmt||{})[o.key]||0));if(left<1)DW.sel=null;
    if(A().toast)A().toast('Placé sur '+(l.n||'la ligne')+(left>=1?' — reste '+eur(left)+' à placer':' — coût entièrement placé ✓'));if(ctx.render)ctx.render();refreshPopup(ctx);};
  setTimeout(()=>{try{g('dwp-pct').focus();g('dwp-pct').select();}catch(e){}},30);}
/* prix composé : nom, au ml ou à l'unité (et laquelle), quantité de base */
function compoDialog(a,ctx,c0,editId,doc){const T=H.translate(a);const S=T.S;const tot=(c0.keys||[]).reduce((x,k)=>x+S.amount(k),0);const old=doc.getElementById('cm-dwplace');if(old)old.remove();
  const box=doc.createElement('div');box.id='cm-dwplace';box.className='cm-dwplace';
  box.innerHTML=`<div class="box"><h3 style="margin-top:0">${editId?'Modifier le prix composé':'Nouveau prix composé'}</h3>
    <div class="cm-dwpl"><span>Postes</span><b>${(c0.keys||[]).map(k=>esc(String((S.opts.find(o=>o.key===k)||{label:k}).label).replace(/^.*? › /,''))).join(' + ')}</b><small>${eur(tot)} de prix de vente</small></div>
    <label class="f">Nom</label><input class="f" id="dwc-nom" value="${esc(c0.nom||'')}">
    <label class="f">Prix</label><select class="f" id="dwc-mode"><option value="ml"${c0.mode!=='u'?' selected':''}>au ml</option><option value="u"${c0.mode==='u'?' selected':''}>à l'unité</option></select>
    <div id="dwc-ul" ${c0.mode==='u'?'':'hidden'}><label class="f">Unité (ce que l'on compte)</label><input class="f" id="dwc-unit" value="${esc(c0.unitLabel||'u')}" placeholder="u, ens., paire, vanne…"></div>
    <label class="f">Quantité de base <small class="dim">(le prix = montant ÷ cette quantité)</small></label><input class="f" type="number" min="0" step="any" id="dwc-base" value="${esc(c0.base||'')}">
    <div class="cm-dwprev" id="dwc-prev"></div>
    <div class="actions"><button class="btn primary block" id="dwc-ok">${editId?'Enregistrer':'Créer le prix'}</button><button class="btn block" id="dwc-no">Annuler</button></div></div>`;
  doc.body.appendChild(box);const g=id=>box.querySelector('#'+id);const prev=()=>{const b=num(g('dwc-base').value);const m=g('dwc-mode').value;g('dwc-ul').hidden=m!=='u';g('dwc-prev').innerHTML=b?`→ <b>${nb(tot/b,2)} € / ${esc(m==='u'?(g('dwc-unit').value||'u'):'ml')}</b> (${eur(tot)} ÷ ${nb(b,2)})`:'<b style="color:#9b2c22">Quantité de base à renseigner.</b>';};
  ['dwc-base','dwc-mode','dwc-unit'].forEach(id=>{g(id).oninput=prev;g(id).onchange=prev;});prev();const close=()=>box.remove();g('dwc-no').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});
  g('dwc-ok').onclick=()=>{const base=num(g('dwc-base').value);if(!(base>0)){prev();return;}const a2=H.affGet(a.num)||a;const D=Object.assign({},a2.dpgf||{});const L0=(D.compo||[]).slice();
    const o={nom:String(g('dwc-nom').value||'').trim()||'Prix composé',mode:g('dwc-mode').value==='u'?'u':'ml',unitLabel:g('dwc-mode').value==='u'?(String(g('dwc-unit').value||'').trim()||'u'):undefined,base:Math.round(base*1000)/1000};
    if(editId){D.compo=L0.map(x=>x.id===editId?Object.assign({},x,o):x);}else{const id='C'+Date.now().toString(36);D.compo=L0.concat([Object.assign({id,keys:c0.keys.slice(),zone:c0.zone?c0.zone.k:'',color:COLS[L0.length%COLS.length]},o)]);DW.csel=id;DW.pick={};}
    H.affSet(a.num,{dpgf:D});close();if(A().toast)A().toast(editId?'Prix modifié':'Prix « '+o.nom+' » créé — touche maintenant une ligne du DPGF pour pointer');if(ctx.render)ctx.render();refreshPopup(ctx);};
  setTimeout(()=>{try{g('dwc-base').focus();}catch(e){}},30);}
/* pointer une quantité d'un prix composé sur une ligne du DPGF */
function pointDialog(a,i,ctx,doc){const D=a.dpgf||{};const L=D.lignes||[];const l=L[i];if(!l||l.section)return;const T=H.translate(a);const c=cOf(T,DW.csel);if(!c)return;
  const q0=Math.max(0,Math.min(num(l.qte),c.reste>0?c.reste:num(l.qte)));const old=doc.getElementById('cm-dwplace');if(old)old.remove();
  const box=doc.createElement('div');box.id='cm-dwplace';box.className='cm-dwplace';
  box.innerHTML=`<div class="box"><h3 style="margin-top:0">Pointer un prix sur une ligne</h3>
    <div class="cm-dwpl"><span>Prix</span><b><span class="cm-cdot" style="background:${esc(c.color||'#1f6fd0')}"></span>${esc(c.nom)}</b><small>${nb(c.unit,2)} € / ${esc(unitTxt(c))} · pointé ${nb(c.pointe,2)} sur ${nb(c.base,2)} · reste ${nb(c.reste,2)} ${esc(unitTxt(c))}</small></div>
    <div class="cm-dwpl"><span>Ligne</span><b>${esc(l.n||'')} ${esc(l.des)}</b><small>${esc(qtyTxt(l))}${l.row?' · ligne Excel '+l.row:''}</small></div>
    <label class="f">Quantité pointée (${esc(unitTxt(c))})</label><input class="f" type="number" min="0" step="any" id="dwq-q" value="${Math.round(q0*1000)/1000}">
    <div class="cm-dwprev" id="dwq-prev"></div>
    <div class="actions"><button class="btn primary block" id="dwq-ok">Pointer</button><button class="btn block" id="dwq-no">Annuler</button></div></div>`;
  doc.body.appendChild(box);const g=id=>box.querySelector('#'+id);const prev=()=>{const q=num(g('dwq-q').value);const amt=q*c.unit;const r=c.reste-q;g('dwq-prev').innerHTML=`→ <b>${eur(amt)}</b> sur la ligne${num(l.qte)?' · <b>+'+nb(amt/num(l.qte),2)+' €'+(l.u?' / '+esc(l.u):'')+'</b> au PU':''} · ${r<-0.01?`<b style="color:#9b2c22">dépasse de ${nb(-r,2)} ${esc(unitTxt(c))}</b>`:Math.abs(r)<0.01?'<b style="color:#15673a">✓ tout est pointé</b>':`reste <b>${nb(r,2)} ${esc(unitTxt(c))}</b> à pointer à ${nb(c.unit,2)} €`}`;};
  g('dwq-q').oninput=prev;prev();const close=()=>box.remove();g('dwq-no').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close();});
  g('dwq-ok').onclick=()=>{const q=num(g('dwq-q').value);if(!(q>0)){g('dwq-prev').innerHTML='<b style="color:#9b2c22">Quantité à 0 : rien à pointer.</b>';return;}const a2=H.affGet(a.num)||a;const D2=Object.assign({},a2.dpgf||{});D2.map=Object.assign({},D2.map||{});const m=Object.assign({},D2.map[i]||{});m.pts=(m.pts||[]).concat([{c:c.id,q:Math.round(q*1000)/1000}]);D2.map[i]=m;H.affSet(a.num,{dpgf:D2});
    close();const T2=H.translate(H.affGet(a.num)||a2);const c2=cOf(T2,c.id);if(c2&&Math.abs(c2.reste)<0.01)DW.csel=null;if(A().toast)A().toast('Pointé sur '+(l.n||'la ligne')+(c2?(Math.abs(c2.reste)<0.01?' — « '+c2.nom+' » entièrement pointé ✓':' — reste '+nb(c2.reste,2)+' '+unitTxt(c2)+' à pointer'):''));if(ctx.render)ctx.render();refreshPopup(ctx);};
  setTimeout(()=>{try{g('dwq-q').focus();g('dwq-q').select();}catch(e){}},30);}
/* ── 2e fenêtre (comme la Lecture) : la feuille du client, à glisser sur le 2e écran ── */
const popupLive=()=>!!(DW.popup&&DW.popup.w&&!DW.popup.w.closed);
function openPopup(a,ctx){if(popupLive()){try{DW.popup.w.focus();}catch(e){}refreshPopup(ctx);return;}
  const W=Math.round(Math.min(1300,(screen.availWidth||1300)*0.9)),Hh=Math.round((screen.availHeight||900)*0.92);const w=window.open('','trace_dpgf','popup=yes,width='+W+',height='+Hh);
  if(!w){if(A().toast)A().toast('Fenêtre bloquée par le navigateur : autorise les fenêtres surgissantes (pop-up) pour ce site');return;}
  const doc=w.document;doc.open();doc.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DPGF</title></head><body class="cm-win"></body></html>');doc.close();
  document.querySelectorAll('style,link[rel="stylesheet"]').forEach(s=>{try{doc.head.appendChild(doc.importNode(s,true));}catch(e){}});
  doc.body.innerHTML=`<div class="cm-wbar"><b>TRACÉ · DPGF</b><span class="hint cm-whint" id="dwp-hint"></span><button class="btn sm" data-w="back" title="Fermer cette fenêtre">↩ Ramener dans l'appli</button></div><div class="cm-whost cm-dw" id="dwp-host" style="overflow:auto;padding:8px"></div>`;
  DW.popup={w,num:a.num,ctx};
  doc.querySelector('[data-w="back"]').onclick=()=>{try{w.close();}catch(e){}};
  doc.getElementById('dwp-host').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-v]');if(!t)return;const [k,x,y]=String(t.dataset.v).split('|');const a2=H.affGet(DW.popup.num);if(!a2)return;
    if(k==='dwline'){e.preventDefault();if(DW.mode==='compo'&&DW.csel){if(ctx.canEdit)pointDialog(a2,+x,ctx,doc);return;}if(!DW.sel){DW.line=DW.line===+x?null:+x;refreshPopup(ctx);if(ctx.render)ctx.render();return;}if(!ctx.canEdit)return;placeDialog(a2,+x,ctx,doc);}
    else if(k==='dwrm'||k==='dwptrm'){e.preventDefault();e.stopPropagation();dpgfWbAct(k,x,y,a2,ctx);}});
  doc.getElementById('dwp-host').addEventListener('change',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.afdm!==undefined&&H.mlToggle){H.mlToggle(DW.popup.num,+t.dataset.afdm.split('|')[0],t.checked);if(ctx.render)ctx.render();refreshPopup(ctx);}});
  w.addEventListener('pagehide',()=>{if(DW.popup&&DW.popup.w===w){DW.popup=null;setTimeout(()=>{if(ctx.render)ctx.render();},60);}});
  refreshPopup(ctx);}
export function refreshPopup(ctx){if(!popupLive())return;const a=H.affGet(DW.popup.num);if(!a)return;const doc=DW.popup.w.document;const host=doc.getElementById('dwp-host');if(!host)return;const T=H.translate(a);
  const o=T.S.opts.find(x=>x.key===DW.sel);const c=DW.mode==='compo'?cOf(T,DW.csel):null;const hint=doc.getElementById('dwp-hint');if(hint)hint.textContent=c?'👉 '+c.nom+' · '+nb(c.unit,2)+' € / '+unitTxt(c)+' · reste '+nb(c.reste,2)+' — touche la ligne où pointer':o?'👉 '+o.label+' — touche la ligne qui le reçoit':'Touche un prix (ou un coût) dans l\'appli, puis la ligne ici.';
  const sx=host.scrollLeft,sy=host.scrollTop;host.innerHTML=gridHTML(a,T,!(DW.popup.ctx&&DW.popup.ctx.canEdit));host.scrollLeft=sx;host.scrollTop=sy;doc.title=(a.num||'')+' — DPGF';}
