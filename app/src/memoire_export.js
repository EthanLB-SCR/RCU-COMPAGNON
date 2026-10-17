// memoire_export.js — 16/10 soir (lot AM) : EXPORT DU MÉMOIRE AVEC DES TROUS. Ethan : « lors de l'export, dire « attention il y a des trous, télécharger quand même ? » ;
// si c'est validé, ne pas exporter avec les indications écrites en rouge mais enlever le paragraphe avec trous, en spécifiant que les paragraphes avec trous seront enlevés ».
// · memGate(a, base, ctx, quoi, go, wrap) : avant ⬇ PDF, ⬇ Word, 🖨 Imprimer, l'ancien .doc (quoi = pdf | word | print | doc) et le dossier de remise (.zip, quoi = zip)
//   avec le mémoire. Aucun trou rouge → go(null) tout de suite : rien ne change. Sinon une fenêtre « ⚠ Il reste N trous dans M paragraphes. Si tu télécharges quand
//   même, ces M paragraphes seront RETIRÉS du document (rien en rouge). » + la liste courte (n° et titre du bloc + début du texte) + [Télécharger sans ces paragraphes]
//   [Compléter d'abord]. Validé → go({sansTrous:true}) : le modèle du document (docModel de memoire2.js) laisse ces paragraphes de côté, sans toucher aux cases du
//   mémoire (bloc vide → absent, numéros et sommaire recalculés) ; o.retires = paragraphes retirés, repris par le message de fin. Les trous facultatifs vides ne
//   comptent pas (déjà absents de l'export). « Compléter d'abord » : ferme et va au 1er trou de l'aperçu (5 · Mémoire), sinon ouvre « 📝 Tout compléter ».
// · wrap (version consultée) : f => affWithVirtual(version, f), fourni par l'appelant — le modèle est calculé sous la version consultée, avant et après la fenêtre.
// · amCss() : la feuille du lot (style#css-lot-am) — fenêtre des trous, et documents administratifs (plusieurs RIB, RC + décennale en un document : docsoblig.js).
import {memLibHoleParas,memLibFirstHole,memLibAct} from './memoire2.js';
let A=null;export function mxInit(api){A=api;setTimeout(hook,0);}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pl=(n,s,p)=>n+' '+(n>1?(p||s+'s'):s);
const cut=(t,n)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,'')+'…':t;};
const say=t=>{try{if(A&&A.toast)A.toast(t);}catch(e){}};
const VERB={pdf:['télécharges','Télécharger'],word:['télécharges','Télécharger'],doc:['télécharges','Télécharger'],print:['imprimes','Imprimer'],zip:['fais le dossier de remise','Télécharger']};
/* les paragraphes à trous (tests : window.TRACE.memExport.holes) */
export function memHoles(a,base,ctx,wrap){try{return (wrap||(f=>f()))(()=>memLibHoleParas(a,base,ctx))||[];}catch(e){console.warn(e);return [];}}
export function memGate(a,base,ctx,quoi,go,wrap){const W=wrap||(f=>f());hook();const H=memHoles(a,base,ctx,W);
  if(!H.length)return W(()=>go(null)); /* sans trou : comme avant */
  if(!A||!A.openModal)return W(()=>go({sansTrous:true,retires:0}));
  amCss();const N=H.reduce((n,x)=>n+x.holes,0),M=H.length;const V=VERB[quoi]||VERB.pdf;const MAX=8;
  const hl=t=>esc(t).replace(/\[À COMPLÉTER : [^\]]*\]?/g,m=>`<i class="mx-h">${m}</i>`); /* le trou en rouge dans le début du texte (texte déjà échappé) */
  const li=x=>`<li data-pid="${esc(x.pid)}"><b>${esc(x.num)} ${esc(x.bloc||'(sans titre)')}</b>${x.titre?' › '+esc(x.titre):''}<span class="mx-n">${esc(pl(x.holes,'trou'))}</span><small>${hl(cut(x.txt,96))||'(paragraphe sans texte)'}</small></li>`;
  A.openModal(`<h3 style="margin-top:0" id="mx-h">⚠ Il reste ${esc(pl(N,'trou'))} dans ${esc(pl(M,'paragraphe'))}</h3>
    <div class="mx-why" id="mx-why">Si tu ${V[0]} quand même, ${M>1?'ces <b>'+M+' paragraphes</b> seront <b>RETIRÉS</b>':'ce <b>paragraphe</b> sera <b>RETIRÉ</b>'} du ${quoi==='zip'?'mémoire':'document'} (rien en rouge)${quoi==='zip'?' ; le reste du dossier ne change pas':''}. Les cases cochées du mémoire ne bougent pas.</div>
    <ul class="mx-list" id="mx-list">${H.slice(0,MAX).map(li).join('')}</ul>${H.length>MAX?`<div class="mx-more">… et ${esc(pl(H.length-MAX,'autre paragraphe','autres paragraphes'))}</div>`:''}
    <div class="actions"><button class="btn primary block" id="mx-go">${V[1]} sans ${M>1?'ces paragraphes':'ce paragraphe'}</button><button class="btn block" id="mx-fill">✎ Compléter d'abord</button></div>`);
  const g=id=>document.getElementById(id);
  g('mx-go').onclick=()=>{A.closeModal();const o={sansTrous:true,retires:0};W(()=>go(o));};
  g('mx-fill').onclick=()=>{A.closeModal();fillFirst(a,ctx);};}
/* « Compléter d'abord » : au 1er trou de l'aperçu (5 · Mémoire) ; ailleurs (7 · Offre…) la fenêtre « 📝 Tout compléter » */
function fillFirst(a,ctx){if(memLibFirstHole())return;if(ctx&&ctx.canEdit){try{memLibAct('mlbtc','','','',a,ctx);return;}catch(e){console.warn(e);}}say('Les trous se complètent dans 5 · Mémoire (en rouge)');}
function hook(){try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.memExport)window.TRACE.memExport={holes:(a,ctx)=>memHoles(a,undefined,ctx||null)};}catch(e){}} /* tests */
/* ═════════ CSS du lot AM ═════════ */
export function amCss(){if(typeof document==='undefined'||document.getElementById('css-lot-am'))return;const st=document.createElement('style');st.id='css-lot-am';
  st.textContent=`/* 16/10 soir (lot AM) : export du mémoire avec des trous ; plusieurs RIB ; RC + décennale en un seul document */
.mx-why{background:#fff4d6;border:1px solid #f0c76a;color:#6e4a00;border-radius:10px;padding:8px 10px;font-size:13.5px;line-height:1.4;margin:0 0 8px;overflow-wrap:anywhere}.mx-why b{font-weight:800}
.mx-list{list-style:none;margin:0 0 4px;padding:0;max-height:min(44vh,360px);overflow:auto;border:1px solid var(--line,#e3e0da);border-radius:10px;background:var(--surface,#fff)}
.mx-list li{padding:7px 10px;border-top:1px solid var(--line,#e3e0da);font-size:13px;line-height:1.3;overflow-wrap:anywhere}.mx-list li:first-child{border-top:0}.mx-list small{display:block;color:var(--ink2,#666);font-size:12px;margin-top:2px}
.mx-n{display:inline-block;font-size:11px;font-weight:600;border-radius:6px;padding:0 6px;margin-left:6px;background:#fdecea;color:#c62828;white-space:nowrap}.mx-list .mx-h{color:#c62828}.mx-more{font-size:12px;color:var(--ink2,#666);margin:2px 0 0 2px}
.am-both{display:flex;gap:10px;align-items:flex-start;margin:10px 0 2px;padding:8px 10px;border:1px solid #bcd3f2;background:#eef4fd;border-radius:10px;font-size:13.5px;line-height:1.3;min-height:44px;box-sizing:border-box;cursor:pointer}
.am-both input{width:22px;height:22px;flex:none;margin:1px 0 0}.am-both b{font-weight:700}.am-both small{display:block;color:#3b4f6b;font-size:12px;margin-top:3px;overflow-wrap:anywhere}
.dob-erow.am-fol{border-style:dashed;background:#fbfcfe}.dob-st.am-same{max-width:50%}.am-pair{display:inline-block;font-size:11.5px;font-weight:600;border-radius:6px;padding:1px 7px;background:#e8f0fb;color:#1f6fd0;margin-top:3px}
.am-rib-hint{font-size:12px;color:var(--ink2,#666);margin:6px 0 0}
@media (max-width:520px){.dob-st.am-same{max-width:46%}}`;
  document.head.appendChild(st);}
