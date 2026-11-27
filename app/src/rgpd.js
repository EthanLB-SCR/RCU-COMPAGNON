// rgpd.js — 26/11/2026 : « 🔒 Tes données dans Tracé » (information des salariés et intérimaires, RGPD art. 13 ; Code du travail L1222-4) + téléchargement de
// « mes données » (droit d'accès / portabilité). Aucune donnée réelle ici : le nom de l'entreprise, le référent RGPD et la région d'hébergement viennent de
// Administrateur → Entreprise (réglage partagé « entreprise ») ; sans réglage, des formulations neutres.
// Appelé par espace.js : rgpdHTML(ctx), rgpdExport(ctx). ctx = {ent, me:{id,nom,email,poste,type}, mes:{pointages,positions,fiche}, data:()=>objet exporté}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rgpdHTML(ctx){
  const E=(ctx&&ctx.ent)||{},R=E.rgpd||{};const ent=E.name?esc(E.name):'l\'entreprise';const Ent=E.name?esc(E.name):'L\'entreprise';
  const contact=R.nom?`<b>${esc(R.nom)}</b>${R.email?` — <a href="mailto:${esc(R.email)}">${esc(R.email)}</a>`:''}, référent RGPD`:'le référent RGPD de l\'entreprise (ou ton responsable, la RH)';
  const heb=R.heberg?` (${esc(R.heberg)})`:'';const M=(ctx&&ctx.mes)||{};
  const chiffres=M.pointages?`<div class="hint" style="margin:6px 0 0">Sur ce téléphone en ce moment : ${M.pointages} jour${M.pointages>1?'s':''} de pointage${M.positions?`, dont ${M.positions} avec une position`:''}.</div>`:'';
  const sec=(ic,t,body,open)=>`<details class="rgpdSec"${open?' open':''} style="border:1px solid var(--line,#e2e1dc);border-radius:12px;padding:8px 12px;margin:8px 0"><summary style="cursor:pointer;font-weight:700;min-height:32px;display:flex;align-items:center;gap:6px">${ic} ${t}</summary><div style="margin-top:6px;line-height:1.45">${body}</div></details>`;
  const ul=L=>`<ul style="margin:4px 0 0 18px;padding:0">${L.map(x=>`<li style="margin:3px 0">${x}</li>`).join('')}</ul>`;
  return `<div class="rgpdPage">
  <h3 style="margin:0 0 4px">🔒 Tes données personnelles</h3>
  <div class="eq-s">Tracé est l'outil de travail de ${ent} : chantiers, pointage, planning, sécurité, RH. Voici ce qu'il garde sur toi, pourquoi, qui le voit et combien de temps.</div>
  ${sec('📋','Ce que Tracé garde sur toi',ul([
    'Ton compte : nom, prénom, e-mail, poste, type de contrat (salarié, intérimaire), ton avatar.',
    'Tes pointages : début et fin de journée, pauses, trajets entre chantiers, chantier du jour.',
    '📍 Ta <b>position, seulement au moment où tu pointes</b> (début et fin de journée, départ et arrivée d\'un trajet), <b>arrondie à 100 m environ</b>. Jamais de suivi en continu. Si tu refuses la localisation, le pointage marche quand même.',
    'Ton travail : soudures et étapes que tu déclares (avec leurs photos), problèmes signalés, signatures (quart d\'heure sécurité, documents).',
    'Ton dossier RH, saisi par la RH : contrat, habilitations, formations, absences et congés, compteurs d\'heures, navettes et grands déplacements, contraventions (pour désigner le conducteur), mutuelle.',
    'Les véhicules qui te sont confiés : états des lieux, kilométrages.',
    'Les accidents et presque-accidents que tu déclares ou qui te concernent.',
    'Ton contact d\'urgence (c\'est toi qui le remplis).'])+chiffres,true)}
  ${sec('🎯','Pourquoi',ul([
    'Organiser les chantiers et le planning.',
    'Tracer la qualité des soudures, comme l\'exigent les clients : qui a soudé, quand, avec quelle photo.',
    'Compter ton temps de travail et préparer ta paie (navettes, grands déplacements).',
    'Ta sécurité : accidents, quart d\'heure sécurité, habilitations à jour.',
    'Gérer les véhicules et répondre aux obligations légales (désignation du conducteur, registre du personnel, déclaration d\'accident).',
    'La position au pointage sert à confirmer le chantier du pointage et à compter les kilomètres d\'un trajet entre chantiers. <b>Elle ne sert pas à te suivre.</b>']))}
  ${sec('👀','Qui voit quoi',ul([
    '<b>Toi</b> : tout ce qui te concerne.',
    '<b>L\'encadrement et le bureau</b> (chefs de chantier, conducteurs, bureau) : tes pointages, ton travail et ta fiche, dont ton contact d\'urgence en cas d\'accident.',
    '<b>La RH et la direction</b> : ton dossier RH.',
    '<b>Tes collègues</b> : ton nom, ton poste, ton avatar et ton téléphone (annuaire).',
    '<b>Les clients et visiteurs</b> : le plan et l\'avancement de leur chantier, jamais tes données personnelles.',
    'Rien n\'est vendu ni utilisé pour de la publicité.']))}
  ${sec('⏳','Combien de temps',ul([
    'Position prise au pointage : <b>2 mois</b>.',
    'Pointages et navettes : le temps de la paie, puis archivés le temps des recours possibles (1 à 3 ans).',
    'Dossier RH : pendant ton contrat, puis le temps prévu par la loi (5 ans pour le registre du personnel).',
    'Déclarations d\'accident : 5 ans.',
    'Traçabilité des soudures (ton nom sur la soudure) : le temps des garanties de l\'ouvrage livré au client.',
    `Durées fixées par ${ent} d'après le référentiel de la CNIL sur les données RH.`]))}
  ${sec('🏢','Où sont tes données',ul([
    `Sur ce téléphone (pour marcher sans réseau) et chez Supabase, l'hébergeur de Tracé${heb}, avec une sauvegarde chaque jour.`,
    'L\'assistant 💬 : quand tu lui écris, ton message et ton poste partent chez Anthropic (États-Unis) pour produire la réponse, sous contrat (clauses types de l\'Union européenne). Tracé ne garde pas la conversation : elle reste sur ton téléphone. <b>N\'y mets pas d\'information de santé ni sur un collègue.</b>']))}
  ${sec('✋','Tes droits',ul([
    'Voir tes données (bouton ci-dessous), les faire corriger, les faire effacer quand la loi le permet, demander d\'en limiter l\'usage, t\'opposer à un usage pour un motif sérieux.',
    `Pour tout ça : ${contact}.`,
    'Pas satisfait de la réponse : tu peux faire une réclamation à la CNIL (cnil.fr).']),true)}
  <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="btn primary" data-act="rgpdexport" style="min-height:48px;flex:1 1 220px">⬇ Télécharger mes données</button>${ctx&&ctx.modal?'<button type="button" class="btn" data-close style="min-height:48px;flex:1 1 120px">Fermer</button>':''}</div>
  <div class="hint" style="margin-top:8px">${Ent} a aussi une note RGPD générale (paie, mutuelle…) dans tes documents. Cette page explique ce que fait Tracé.</div>
  </div>`;}
/* téléchargement : un fichier JSON lisible (ce que l'appareil a de la personne) — rien n'est envoyé ailleurs */
export function rgpdExport(ctx){try{const data=ctx.data();const txt=JSON.stringify(data,null,2);const d=new Date();const p2=n=>String(n).padStart(2,'0');
  const name=`mes_donnees_trace_${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}.json`;
  const url=URL.createObjectURL(new Blob([txt],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(url);a.remove();}catch(e){}},1500);return {ok:true,name,size:txt.length};}catch(e){console.warn(e);return {ok:false,error:String(e&&e.message||e)};}}
