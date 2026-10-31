// tutos_compagnon.js — 31/10/2026 : TUTORIELS DÉTAILLÉS (Ethan : « un tuto par module qui décrit toutes les options, puis des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options »). Déclaratif, lu par tuto.js : clé « module » = vue d'ensemble du module (une étape par option), « module:option » = le
// tutoriel détaillé de l'option. Une étape = {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre:'…', texte:'…', si:(api)=>bool}
// (api.can(droit), api.feat(option)). Le nom affiché de chaque option est dans NOMS.
// Lot « co » (31/10) : Aujourd'hui (accueil), Compagnon et ses rubriques, Équipe et ses options, Réglages (administrateur). Clés relevées dans l'appli (TRACE.tuto.where()).
// CHOIX notés pour Ethan :
//  · la vue d'ensemble de Compagnon tient en 8 étapes (le test de régression e2e_mo_3110 la déroule en 8 touchers au plus) : les rubriques sœurs y sont regroupées par deux
//    (Heures + Productions, Passeport + Avatar, Magasin + Mes demandes) ; chacune garde son tutoriel détaillé, qui s'ouvre la 1re fois qu'on entre dans la rubrique ;
//  · « Accueil » de Compagnon n'a pas de clé à lui (l'appli le compte comme l'écran du module) : sa vue d'ensemble y montre le pointage, le reste est détaillé dans les rubriques ;
//  · Réglages n'a qu'une clé (« reglages ») pour tous ses volets : une étape par volet (Personnes, Postes, Qui peut quoi, Options, Entreprise et modules, Bac à sable) ;
//  · une étape réservée (droit, rubrique présente ou non) : sur l'écran concerné, c'est ce qui est affiché qui décide (la rubrique ou le bouton existe pour cette personne) ;
//    lancée d'ailleurs (📚 Tous les tutoriels), ce sont les droits et les options de la personne qui décident.
const vu=q=>{try{return !!document.querySelector(q);}catch(e){return false;}};
const ou=a=>{try{return String((a&&a.where&&a.where())||'');}catch(e){return '';}};
const sur=(a,k)=>ou(a)===k; /* exactement cet écran */
const dans=(a,m)=>{const w=ou(a);return w===m||w.startsWith(m+':');}; /* un écran du module */
const can=(a,k)=>!a||!a.can||!!a.can(k);
const feat=(a,k)=>!a||!a.feat||!!a.feat(k);
const adm=()=>{try{const T=window.TRACE;return !!(T&&T.acces&&T.acces.isAdmin&&T.acces.isAdmin());}catch(e){return false;}};
/* pointe-t-il ? comme Compagnon (espace.js, droits) : le droit « Pointer sa journée » de son poste, sans compter les pouvoirs d'administrateur (un administrateur ne pointe pas d'office) */
const pointe=a=>{try{const T=window.TRACE;const acc=T&&T.acces&&T.acces.current&&T.acces.current();if(acc&&T.acces.rights)return !!T.acces.rights(Object.assign({},acc,{admin:false}))['pointage.self'];}catch(e){}return can(a,'pointage.self');};
/* sur l'écran k (ou dans le module k), l'étape n'apparaît que si q est affiché ; ailleurs, f décide (droits, options) */
const siEcran=(k,q,f)=>a=>(k.includes(':')?sur(a,k):dans(a,k))?vu(q):(!f||!!f(a));
const siHub=(q,f)=>a=>sur(a,'equipe')?vu(q):(!f||!!f(a)); /* lignes du hub Équipe (pas dans ses sous-écrans) */
const CH=v=>'#eq-app .eq-subs [data-v="'+v+'"]'; /* une rubrique de Compagnon */
const QSE=a=>adm()||can(a,'qse.manage');

export const NOMS={
  'compagnon:docs':'Documents','compagnon:planning':'Planning','compagnon:chantiers':'Chantiers','compagnon:prod':'Productions','compagnon:frais':'Notes de frais',
  'compagnon:heures':'Heures','compagnon:habs':'Passeport','compagnon:avatar':'Avatar','compagnon:dem':'Mes demandes · commande','compagnon:mag':'Mes demandes · dépôt',
  'compagnon:vlaisse':'Véhicule laissé','compagnon:vx':'Véhicule',
  'equipe:annu':'Annuaire','equipe:docs':"Documents d'entreprise",'equipe:info':'Communication interne',
  'equipe:x:acc':'Accueil RH','equipe:x:dob':'Documents administratifs','equipe:x:pack':'Pack SCR'
};

const TUTOS={
/* ═══ AUJOURD'HUI (accueil de l'appli) ═══ */
accueil:[
  {titre:'Bienvenue dans Tracé',texte:"Aujourd'hui, c'est ta page d'accueil : ta journée, ce qui t'attend, tes modules. Elle s'adapte à ton poste et à tes droits."},
  {sel:'#tbHomeMod',titre:'Tracé + le module',texte:"Touche « Tracé ▾ » pour changer de module, revoir le tutoriel de l'écran ou les voir tous (📚). Le logo te ramène ici."},
  {sel:'#eq-app .ac-hero',titre:'Ta journée',texte:"Ton chantier du jour, la météo, ton équipe et l'objectif posé par ton chef (la semaine en chiffres pour l'encadrement). Un bouton t'y emmène."},
  {sel:'#eq-app .ac-two section.ptc',titre:'Pointer ta journée',texte:"« ▶ Commencer la journée » en arrivant, puis pause midi et fin de journée : un toucher à chaque fois. Ton chef valide ensuite.",si:siEcran('accueil','#eq-app .ac-two section.ptc',pointe)},
  {sel:'#eq-app .ac-notif, #eq-app .ac-two .ac-empty',titre:'À faire',texte:"Ce qui attend un geste de toi : document à signer, accueil chantier, tâche… Touche la ligne pour le faire ; bord rouge = urgent ou en retard."},
  {sel:'#eq-app .ac-kgrid',titre:'À savoir',texte:"L'info sans geste à faire : planning, objectifs, demandes… Touche une tuile pour le détail."},
  {sel:'#eq-app .ac-spaces',titre:'Tes espaces',texte:"Un module par tuile, selon ton poste. Un chiffre sur une tuile : des choses t'y attendent."},
  {sel:'#eq-app [data-act="accnew"]',titre:'Déclarer un accident',texte:"Accident, presque-accident ou soin bénin : touche ce bouton tout de suite, même incomplet. La RH est prévenue et complète."},
  {sel:'#homeAva',titre:'Ta pastille',texte:"Touche ton avatar, en haut à droite : ton compte, ton nom affiché, ton mot de passe, la déconnexion."}
],

/* ═══ COMPAGNON — vue d'ensemble (8 étapes au plus : voir l'en-tête) ═══ */
compagnon:[
  {sel:'#eq-app .eq-subs',titre:'Compagnon, ton espace',texte:"Tout ce qui te concerne : pointage, heures, documents, matériel. Glisse la barre pour voir tes rubriques ; « ? » relance le tutoriel."},
  {sel:'#eq-app section.ptc, '+CH('moi'),titre:'Accueil et pointage',texte:"L'Accueil, c'est ta journée : chantier, demain, échéances, ta fiche. Pointe ici : « ▶ Commencer la journée », la pause, la fin.",si:siEcran('compagnon',CH('heures'),pointe)},
  {sel:CH('moi'),titre:'Accueil : ta journée',texte:"Ton chantier du jour, demain, tes notes de frais, tes échéances et ta fiche : tout d'un coup d'œil.",si:a=>dans(a,'compagnon')?!vu(CH('heures')):!pointe(a)},
  {sel:CH('docs')+', #eq-app .eq-subs',titre:'Documents',texte:"Règlement, notes de service, flash info : à lire jusqu'en bas, puis à signer au doigt sous 7 jours. La pastille rouge compte ce qui reste."},
  {sel:CH('planning')+', #eq-app .eq-subs',titre:'Planning',texte:"Ta semaine jour par jour : ton chantier, avec qui, tes objectifs. « Semaine prochaine » pour savoir où tu vas lundi.",si:siEcran('compagnon',CH('planning'),a=>feat(a,'planning'))},
  {sel:CH('heures')+', '+CH('prod')+', #eq-app .eq-subs',titre:'Heures et Productions',texte:"Heures : tes journées pointées, ce qui est validé, ta navette du mois. Productions : tes soudures et manchons comptés sur le plan.",si:siEcran('compagnon',CH('heures')+', '+CH('prod'),pointe)},
  {sel:CH('frais')+', #eq-app .eq-subs',titre:'Notes de frais',texte:"Une dépense avancée pour le chantier : le montant, le ticket en photo, c'est envoyé. Ton conducteur valide, le bureau rembourse.",si:siEcran('compagnon',CH('frais'),a=>feat(a,'frais'))},
  {sel:CH('habs')+', #eq-app .eq-subs',titre:'Passeport et Avatar',texte:"Passeport : tes habilitations, à jour ou à renouveler. Avatar : ton personnage dans l'appli, il porte tes récompenses."},
  {sel:CH('mag')+', '+CH('dem')+', #eq-app .eq-subs',titre:'Mes demandes',texte:"Besoin de matériel pour ton chantier ? « ＋ Nouvelle demande », puis tu suis l'état : avec un magasin, tu la retires au dépôt ; sinon l'encadrement la commande et la fait livrer.",si:siEcran('compagnon',CH('mag')+', '+CH('dem'),a=>feat(a,'magasin')||feat(a,'demandes'))},
  {sel:CH('vlaisse')+', #eq-app .eq-subs',titre:'Véhicule laissé',texte:"Un véhicule t'attend sur un chantier ou au dépôt : lis son état des lieux, puis signe pour le prendre.",si:a=>dans(a,'compagnon')&&vu(CH('vlaisse'))},
  {sel:CH('chantiers')+', #eq-app .eq-subs',titre:'Chantiers',texte:"Les chantiers dont tu es chef ou conducteur : avancement, stock, engins.",si:a=>dans(a,'compagnon')&&vu(CH('chantiers'))}
],

'compagnon:docs':[
  {sel:'#eq-app .ac-row.todo, #eq-app h2.vt',titre:'À lire et signer',texte:"Les documents qui te concernent : règlement intérieur, notes de service, flash info. Le plus urgent en haut, à signer sous 7 jours."},
  {sel:'#eq-app [data-act="docopen"]',titre:'Ouvrir un document',texte:"Touche-le : il s'ouvre en grand (« ⤢ Plein écran » si besoin). Déroule-le jusqu'en bas, ou jusqu'à la dernière page du PDF."},
  {titre:'Signer au doigt',texte:"En bas, « ✓ J'ai lu en entier — je signe » se débloque. Signe dans le cadre avec le doigt, puis « Valider ma signature »."},
  {titre:'Les couleurs',texte:"Bord rouge : à lire et signer, avec la date limite (en rouge si elle est dépassée) ; ✓ vert : signé, avec sa date."},
  {titre:'Nouvelle version',texte:"Un document qui change revient « nouvelle version, à lire et signer ». Ton ancienne signature reste gardée."},
  {titre:'Livrets et déjà signés',texte:"Plus bas : tes livrets d'accueil, à relire chapitre par chapitre quand tu veux, et tout ce que tu as déjà signé."},
  {titre:'Rien ne bloque',texte:"Tu gardes l'accès à toute l'appli pendant ces 7 jours. Les RH voient qui a signé et relancent les retards."}
],
'compagnon:planning':[
  {sel:'#eq-app .eq-semaine',titre:'Ta semaine',texte:"Un jour par case : ton chantier, la météo, 🎯 tes objectifs ; « repos » si rien n'est prévu. Touche un jour pour son détail."},
  {sel:'#eq-app [data-act="plansem"]',titre:'Cette semaine, la suivante',texte:"« Semaine prochaine » pour savoir où tu vas lundi. Le week-end, c'est elle qui s'ouvre."},
  {sel:'#eq-app .eq-plan-site, #eq-app .eq-cols',titre:'Le détail du jour',texte:"Horaires et point de rassemblement, tes objectifs, les responsables du chantier et tes compagnons : 📞 pour appeler."},
  {sel:'#eq-app .eq-plan-site [data-act="opensite"]',titre:'Ouvrir le chantier',texte:"En bas du jour, « Ouvrir le chantier » t'emmène sur son plan. 🗺 à côté d'un objectif le montre sur le plan.",si:siEcran('compagnon:planning','#eq-app .eq-plan-site')},
  {sel:'#eq-app [data-act="xgo"][data-v="agenda"]',titre:'Composer ma semaine',texte:"Encadrement : ton planning n'est pas imposé. Ajoute visites, réunions et rendez-vous ; export Outlook possible.",si:siEcran('compagnon:planning','#eq-app [data-act="xgo"][data-v="agenda"]',a=>can(a,'planning.edit'))},
  {titre:'Qui fait le planning',texte:"Ton conducteur place les équipes. Dès que c'est fait, ton Accueil affiche aussi où tu vas demain."}
],
'compagnon:prod':[
  {sel:'#eq-app .eq-filtres',titre:'Choisis la période',texte:"Semaine, Mois ou 12 semaines. ◀ ▶ ou la liste juste en dessous pour aller à une semaine précise."},
  {sel:'#eq-app .eq-tiles, #eq-app .eq-scroll .card',titre:'Ton total',texte:"Ce que tu as fait sur la période : soudures, manchons… et le détail par DN juste en dessous."},
  {sel:'#eq-app .eq-sem-h',titre:'Semaine par semaine',texte:"Touche une semaine pour la déplier jour par jour : ton chantier et ta production de chaque jour."},
  {titre:"D'où viennent les chiffres",texte:"Chaque soudure ou manchon pointé sur le plan à ton nom compte ici. En cas d'erreur, vois avec ton chef de chantier."},
  {titre:'Ta récompense',texte:"Ta production fait monter ton palier : il se voit sur ton avatar (carte « Tes récompenses » de l'Accueil, rubrique Avatar)."}
],
'compagnon:frais':[
  {sel:'#eq-app .ac-stats',titre:'Tes notes de frais',texte:"Le total de tes notes de frais et combien attendent d'être validées."},
  {sel:'#eq-app [data-act="cmd"][data-v="dbnew|"]',titre:'➕ Note de frais',texte:"Une dépense avancée pour le chantier : carburant, péage, hôtel, repas… Touche le bouton dès que tu as payé."},
  {titre:'Remplir la note',texte:"Date, montant TTC, nature, chantier, payé avec (carte SCR, tes deniers, caisse du chantier). Puis « Enregistrer la note de frais »."},
  {titre:'Le ticket, tout de suite',texte:"« 📷 Prendre en photo » ou « 📎 Importer » (photo, PDF). Ticket donné au chef : écris « ticket remis au chef » dans Lien."},
  {titre:'Qui valide',texte:"Ton conducteur ou le bureau valide, puis le bureau rembourse. Tant qu'elle est « Saisi », tu peux la retirer (🗑)."},
  {titre:'Les états',texte:"Saisi (jaune) → Validé (vert) → Remboursé (violet). Refusé (rouge) : le nom de qui a refusé est sur la ligne."},
  {titre:'Hors réseau',texte:"Sans réseau, la photo du ticket reste dans la note et part avec elle au retour du réseau."}
],
'compagnon:heures':[
  {sel:'#eq-app section.ptc',titre:'Ton pointage du jour',texte:"Comme sur l'Accueil : « ▶ Commencer la journée », « Pause midi », « ▶ Reprise après la pause », « ■ Fin de journée »."},
  {sel:'#eq-app section.ptc',titre:'Les couleurs du pointage',texte:"Gris : pas commencée ; vert : au travail ; orange : en pause ; bleu : en route vers un autre chantier ; noir : journée finie."},
  {sel:'#eq-app .pi-pts',titre:'Tes derniers pointages',texte:"Chaque jour passe par 3 étapes : déclaré › chef › conducteur. Fin oubliée : « 🕓 Indiquer l'heure de fin », ton chef la voit.",si:siEcran('compagnon:heures','#eq-app .pi-pts')},
  {sel:'#eq-app .eq-filtres',titre:'Tes heures par période',texte:"Semaine, Mois ou 12 semaines : heures travaillées, jours pointés, pauses. Touche une semaine pour le jour par jour."},
  {sel:'#eq-app .mynav',titre:'Ma navette',texte:"Tes variables du mois : heures, heures sup à 125 % et 150 %, déplacements. « ⬇ Ma navette (Excel) » pour la garder."},
  {titre:'Une erreur ?',texte:"Fin touchée par erreur : « ↩ Annuler la fin » tant que personne n'a validé. Après, ton chef corrige, avec le motif."},
  {titre:'Hors réseau',texte:"Sans réseau, ton pointage est gardé sur le téléphone et part dès que le réseau revient. Ta position n'est notée qu'au début et à la fin."}
],
'compagnon:habs':[
  {sel:'#eq-app .eq-scroll .eq-filtres',titre:"Ton passeport d'un coup d'œil",texte:"Tes formations et habilitations comptées par état : à jour, à renouveler (90 j), expiré, manquant."},
  {sel:'#eq-app .eq-scroll .eq-list',titre:'Chaque habilitation',texte:"Son nom, son numéro, jusqu'à quand elle est valable. S'il y a une pièce jointe, touche la ligne pour l'ouvrir."},
  {titre:'Les couleurs',texte:"Vert : à jour ; orange : à renouveler sous 90 jours ; rouge : expirée ; gris : manquante pour ton poste."},
  {titre:'Qui le tient à jour',texte:"Les RH saisissent tes habilitations : une date fausse, une pièce à ajouter, préviens-les."},
  {titre:'Qui voit tes alertes',texte:"Ton chef et les RH voient aussi tes échéances : ils programment les recyclages avant qu'elles n'expirent."}
],
'compagnon:mag':[
  {sel:'#eq-app [data-v="mag|new"]',titre:'＋ Nouvelle demande',texte:"Du matériel du dépôt ? Touche « ＋ Nouvelle demande »."},
  {titre:'Choisis les articles',texte:"Ta liste de métier en premier, ou 🔍 cherche dans tout le dépôt. + et − pour la quantité, puis « Suivant › »."},
  {titre:'Pour quoi ?',texte:"🏗 Chantier, 🚐 Véhicule ou 📦 Dépôt, ⚡ urgent si besoin, une note. Puis « 📤 Envoyer la demande »."},
  {sel:'#eq-app .mag-row, #eq-app .mag-vide',titre:'Suivre ta demande',texte:"Envoyée (bleu) → En préparation (jaune) → Prête au dépôt (vert) : tu es prévenu, passe la retirer. Touche-la pour le détail."},
  {titre:'Annuler, reliquat',texte:"« Annuler la demande » tant que la préparation n'a pas commencé. Prête en partie : le reste suit, tu seras prévenu."},
  {sel:'#eq-app [data-v="mag|fiches|"]',titre:'🧰 Fiches type',texte:"Le matériel prévu pour chaque poste : à regarder avant de demander."},
  {sel:'#eq-app .mag-rf',titre:'Hors réseau',texte:"Sans réseau, ta demande reste sur le téléphone et part toute seule au retour. ↻ recharge l'état depuis le serveur."}
],
'compagnon:dem':[
  {sel:'#eq-app .dm-head',titre:'Mes demandes',texte:"Du matériel pour un chantier, commandé par ton conducteur ou le bureau (pas par le dépôt). Tu demandes, tu suis chaque étape."},
  {sel:'#eq-app [data-v="dem|new|"]',titre:'＋ Nouvelle demande',texte:"1/2 : ce qu'il te faut. Ta liste de métier (+ et −), ou écris l'article et la quantité, puis « ＋ Ajouter à ma demande »."},
  {titre:'2/2 : pour quel chantier',texte:"Le chantier (les tiens en premier), ⚡ urgent si besoin, une photo, une note. Puis « 📤 Envoyer la demande »."},
  {sel:'#eq-app .dm-row, #eq-app .dm-vide',titre:"Suivre l'état",texte:"Envoyée (bleu) → Commandée (jaune, avec la date prévue) → Livrée (vert). Livrée en partie (violet) : le reste suit."},
  {titre:'Refusée, annulée',texte:"Refusée (rouge) : le motif est écrit. Tu peux annuler ta demande tant qu'elle n'est pas commandée."},
  {titre:'Tu es prévenu',texte:"À chaque changement, « nouveau » s'affiche sur la demande et une pastille sur la rubrique."},
  {sel:'#eq-app [data-v="dem|file|"]',titre:'📋 Demandes à traiter',texte:"Encadrement : les demandes de tes équipes. « 🛒 Commandé », puis « 📦 Livré / remis », ou « Refuser la demande » avec un motif.",si:a=>sur(a,'compagnon:dem')&&vu('#eq-app [data-v="dem|file|"]')},
  {titre:'Hors réseau',texte:"Sans réseau, la demande reste sur le téléphone (« ⏳ pas encore partie ») et part toute seule au retour du réseau."}
],
'compagnon:avatar':[
  {sel:'#eq-av-prev',titre:'Ton avatar',texte:"C'est toi dans l'appli : Accueil, planning, annuaire. « Au travail » et « Hors travail » montrent tes deux tenues."},
  {sel:'#eq-av-side .card',titre:'Poste',texte:"Ton poste fixe ta tenue de travail : il est attribué par l'administrateur."},
  {titre:'Visage',texte:"Silhouette, teint, cheveux, coiffure, barbe… Touche une vignette : l'aperçu change tout de suite."},
  {titre:'Tenue hors travail',texte:"Haut, bas, chaussures, couleurs, accessoire : ta tenue perso, montrée en dehors de tes heures pointées."},
  {titre:'Récompenses',texte:"Elles se gagnent sur le terrain (production, sécurité, qualité, ancienneté) et se voient sur ton avatar."},
  {sel:'#eq-app [data-act="avhasard"]',titre:'Au hasard, réinitialiser',texte:"« 🎲 Au hasard » tire un avatar, « Réinitialiser » revient au départ. Tout est enregistré au fur et à mesure."}
],
'compagnon:chantiers':[
  {sel:'#eq-app .eq-sems .card',titre:'Tes chantiers',texte:"Un chantier par carte : ville, météo, qui est dessus aujourd'hui, le chef de chantier."},
  {sel:'#eq-app .eq-prog',titre:"L'avancement",texte:"Soudures faites sur le total, en %. La barre avance avec les soudures pointées sur le plan."},
  {titre:'Stock et engins',texte:"Les articles suivis (orange : sous le seuil, à commander) et les engins, loués ou en propre, avec la fin de location."},
  {sel:'#eq-app .eq-sems [data-act="opensite"]',titre:'Ouvrir le stock',texte:"« Ouvrir le stock » t'emmène dans l'onglet Stock du chantier : livraisons, zones, prélèvements."}
],
'compagnon:vlaisse':[
  {sel:'#eq-app .veh2-card',titre:'Un véhicule à prendre',texte:"Laissé sur un chantier ou au dépôt, pour toi ou « à qui le prendra » : qui l'a laissé, où, quand, ses kilomètres."},
  {sel:'#eq-app .veh2-card .veh-big',titre:'Le prendre',texte:"Touche le bouton : tu lis l'état des lieux laissé (photos, kilomètres, remarques). S'il n'y en a pas, tu fais le tien, étape par étape."},
  {titre:'Exact ou contesté',texte:"Si c'est exact, signe : le véhicule est à toi. Sinon, conteste avec un mot ; les responsables tranchent."},
  {titre:'Qui valide ?',texte:"Signer l'état des lieux laissé suffit, sans responsable. Ton propre état des lieux, lui, est relu et validé par un responsable."}
],
'compagnon:vx':[
  {sel:'#eq-app .veh-wiz h2.vt, #eq-app .veh-bar, #eq-app .veh-wiz',titre:'Une étape par écran',texte:"L'état des lieux du véhicule que tu prends ou que tu laisses : le numéro (1/9…) et la barre montrent où tu en es."},
  {sel:'#veh-next',titre:'Continuer ›',texte:"Remplis l'étape, puis touche « Continuer › ». « Abandonner » arrête l'état des lieux."},
  {sel:'#eq-app [data-v^="veh|qui|"]',titre:'Qui est là ?',texte:"Le responsable est avec toi : il relit et valide tout de suite. Personne avec toi : tu fais tout et tu signes, un responsable valide ensuite."},
  {titre:'Kilomètres et niveaux',texte:"Le kilométrage, le carburant et les niveaux, puis les points d'état et les documents à bord."},
  {titre:'Les photos',texte:"Les photos imposées, puis chaque impact. Elles protègent la personne qui laisse le véhicule comme celle qui le prend."},
  {titre:'Inventaire et cartes',texte:"L'inventaire est pré-coché « présent » : ne touche que ce qui manque. Puis les cartes et dispositifs à bord."},
  {titre:'Signer',texte:"Relis le récapitulatif et signe au doigt. Un état des lieux laissé par quelqu'un d'autre : signe qu'il est exact, ou conteste."},
  {titre:'Rien ne se perd',texte:"Hors réseau, tout reste sur ce téléphone et part à la reconnexion ; une saisie interrompue se reprend depuis « À faire »."}
],

/* ═══ ÉQUIPE — vue d'ensemble ═══ */
equipe:[
  {titre:'Équipe',texte:"L'entreprise : les personnes, les documents à signer, les infos. Tout le monde y a accès ; quelques lignes sont réservées aux RH, au bureau et à l'administrateur."},
  {sel:'#eq-q',titre:"L'équipe de ton chantier",texte:"Intérimaire : tu vois les personnes de ton chantier. Touche une personne pour sa fiche et l'appeler.",si:a=>sur(a,'equipe')&&vu('#eq-q')&&!vu('#eq-app [data-act="xgo"][data-v="annu"]')},
  {sel:'#eq-app [data-act="xgo"][data-v="annu"]',titre:'Annuaire',texte:"Toute l'entreprise par poste : fiche, téléphone, e-mail. Touche une personne pour l'appeler.",si:siHub('#eq-app [data-act="xgo"][data-v="annu"]')},
  {sel:'#eq-app [data-act="xgo"][data-v="docs"]',titre:"Documents d'entreprise",texte:"Règlement intérieur, notes de service, flash info sécurité, documents d'accueil des nouveaux : qui les a signés.",si:siHub('#eq-app [data-act="xgo"][data-v="docs"]')},
  {sel:'#eq-app [data-act="xgo"][data-v="info"]',titre:'Communication interne',texte:"Les infos publiées à tout le monde : actualités, résultats, événements. À lire, sans signature.",si:siHub('#eq-app [data-act="xgo"][data-v="info"]')},
  {sel:'#eq-app [data-act="xgo"][data-v="x:dob:ent"]',titre:'Documents administratifs',texte:"Assurances, Kbis, URSSAF, RIB, qualifications : déposés une fois, joints aux offres, avec une alerte avant échéance.",si:siHub('#eq-app [data-act="xgo"][data-v="x:dob:ent"]',a=>QSE(a)||can(a,'affaires.view')||can(a,'dossier.edit'))},
  {sel:'#eq-app [data-act="xgo"][data-v="x:pack:imp"]',titre:'Pack SCR',texte:"Administrateur : le fichier privé de l'entreprise (catalogue du magasin, documents d'accueil, véhicules…), importé une fois.",si:siHub('#eq-app [data-act="xgo"][data-v="x:pack:imp"]',adm)},
  {sel:'#eq-app [data-act="tabgo"][data-v="admin"]',titre:'Administration',texte:"Administrateur : comptes et accès, postes, qui peut quoi, options et modules. C'est l'écran Réglages.",si:siHub('#eq-app [data-act="tabgo"][data-v="admin"]',adm)}
],
'equipe:annu':[
  {sel:'#eq-q',titre:"Chercher quelqu'un",texte:"Tape un nom ou un poste : la liste se filtre au fur et à mesure."},
  {sel:'#eq-app .eq-filtres:has([data-act="ffam"]), #eq-app [data-act="ffam"]',titre:'Par famille',texte:"Toutes, Direction, Encadrement, Terrain, Support : touche une famille pour ne garder qu'elle."},
  {sel:'#eq-app [data-chg="fSite"]',titre:'Par chantier',texte:"Choisis un chantier dans la liste : tu vois qui y travaille aujourd'hui."},
  {sel:'#eq-app .eq-filtres:has([data-act="entvue"]), #eq-app [data-act="entvue"]',titre:'Tenue de travail ou hors travail',texte:"Les avatars en tenue de chantier ou en tenue perso : pratique pour mettre un visage sur un nom."},
  {sel:'#eq-app .eq-pers',titre:"La fiche et l'appel",texte:"Touche une personne : sa fiche s'ouvre en bas — poste, chantier du jour, chef. « 📞 Appeler » ou « ✉️ E-mail » en un toucher."},
  {titre:'Ce qui reste privé',texte:"Domicile, contrat, compteurs d'heures : seuls les RH et l'encadrement concerné les voient. Ta fiche à toi est dans Compagnon (« Ta fiche »)."},
  {titre:'Ancienneté et médailles',texte:"RH et direction : les paliers d'ancienneté des 6 prochains mois et les médailles du travail à vérifier, en haut de la liste.",si:a=>can(a,'rh.voir')}
],
'equipe:docs':[
  {sel:'#eq-app [data-act="xgo"][data-v="x:acc:admin"]',titre:'📗 Accueil RH',texte:"Le livret d'accueil, les documents d'accueil des nouveaux, le passeport de prévention : qui a signé, qui est en retard.",si:a=>QSE(a)||can(a,'dossier.edit')},
  {sel:'#eq-app [data-act="docadm"]',titre:'Les documents',texte:"Règlement intérieur, notes de service, flash info : pour chacun, qui doit signer et combien l'ont fait."},
  {sel:'#eq-app [data-act="docadm"]',titre:'Qui a signé ?',texte:"Touche un document : chaque personne, ✓ avec la date ou « à signer ». « 🖨 Feuille des signatures » pour l'imprimer."},
  {sel:'#eq-app [data-act="docnew"][data-v="note"]',titre:'➕ Note de service',texte:"Un PDF à dérouler en entier, ou un texte. Choisis qui doit la signer, puis « Publier — à lire et signer ».",si:QSE},
  {sel:'#eq-app [data-act="docnew"][data-v="flash"]',titre:'⚡ Flash info sécurité',texte:"Toujours un PDF ; par défaut pour tous les postes exploitation et les intérimaires. Il arrive aussitôt « à lire et signer ».",si:QSE},
  {sel:'#eq-app [data-act="doclate"], #eq-app .okbox',titre:'À relancer',texte:"Qui n'a pas signé, les retards d'abord. « 🖨 Liste des retardataires » pour les relancer sur le chantier.",si:QSE},
  {titre:'Cibler, archiver',texte:"Dans un document : « 👥 Qui doit signer ? » pour changer qui est concerné, « Archiver » quand il n'est plus à signer.",si:QSE},
  {titre:'Et tes signatures ?',texte:"Tes propres documents à signer sont dans Compagnon → Documents, avec leur date limite (7 jours)."}
],
'equipe:info':[
  {sel:'#eq-app .ac-row[data-act="docopen"], #eq-app .ac-empty',titre:"Les infos de l'entreprise",texte:"Actualités, résultats, événements, arrivées : la plus récente en haut, avec qui l'a publiée et quand."},
  {sel:'#eq-app .ac-row[data-act="docopen"], #eq-app .ac-empty',titre:'Lire une info',texte:"Touche une info pour l'ouvrir en grand, avec son PDF s'il y en a un."},
  {titre:'À lire, pas à signer',texte:"Une info se lit, elle ne se signe pas. Ce qui doit être signé (note de service, flash info) passe par Documents d'entreprise."},
  {sel:'#eq-app [data-act="infonew"]',titre:'📣 Publier une info',texte:"Un titre, le texte (un paragraphe par ligne), un PDF si besoin, puis « Publier » : tout le monde la voit.",si:siEcran('equipe:info','#eq-app [data-act="infonew"]',QSE)}
],
'equipe:x:acc':[
  {sel:'#eq-app .eq-kpis',titre:'Accueil RH en chiffres',texte:"Documents d'accueil, lisibles, PDF à joindre, signatures en retard : un chiffre rouge est à traiter."},
  {sel:'#eq-app [data-v="acc|pick|pack"]',titre:'1. Importer le pack',texte:"Administrateur : le fichier privé de l'entreprise (documents, livrets, passeport). Le réimporter met à jour, sans doublon.",si:siEcran('equipe:x:acc','#eq-app [data-v="acc|pick|pack"]',adm)},
  {sel:'#eq-app [data-v="acc|pick|pdfs"]',titre:'2. Joindre les PDF',texte:"Plusieurs PDF d'un coup : chacun va au document qui porte son nom, et part aussitôt « à lire et signer ».",si:siEcran('equipe:x:acc','#eq-app [data-v="acc|pick|pdfs"]',adm)},
  {titre:'La carte de bienvenue',texte:"Un nouveau compte voit en tête de son accueil « Bienvenue », ses documents à signer sous 7 jours et « Commencer ». Rien ne bloque son accès."},
  {sel:'#eq-app .acc-drow, #eq-app .ac-empty',titre:"Les documents d'accueil",texte:"Pour chacun : texte ou PDF, qui doit signer, combien l'ont fait. Touche-le pour la liste des signatures."},
  {titre:'Retards et passeport',texte:"« En retard » liste qui n'a pas signé à temps. Plus bas : le passeport de prévention, formation par formation."}
],
'equipe:x:dob':[
  {sel:'#eq-app .eq-kpis',titre:'Les pièces en chiffres',texte:"Combien sont valides, à renouveler (30 jours ou moins), expirées ou encore à déposer."},
  {sel:'#eq-app .dob-erow',titre:'Une pièce par ligne',texte:"Attestations RC et décennale, Kbis, URSSAF, attestation fiscale, RIB, qualifications : leur validité et leur état."},
  {sel:'#eq-app .dob-erow [data-v^="dob|edit|"]',titre:'📎 Déposer',texte:"Choisis le fichier et sa date « Valide jusqu'au » (assureur et police pour une assurance), puis « Enregistrer ».",si:siEcran('equipe:x:dob','#eq-app .dob-erow [data-v^="dob|edit|"]',a=>adm()||can(a,'affaires.edit'))},
  {titre:'Les couleurs',texte:"Vert : valide ; orange : expire sous 30 jours (une alerte arrive dans « À faire ») ; rouge : expiré, « 📎 Remplacer » passe en premier."},
  {titre:'Joints aux offres',texte:"Déposés une fois, ils sont repris dans les offres. Une même attestation peut couvrir RC et décennale : un seul document."},
  {sel:'#eq-app [data-v="dob|new|"]',titre:'＋ Autre document',texte:"Un RIB de plus, une carte CIBTP, la liste des salariés étrangers… : ajoute-le à la liste.",si:siEcran('equipe:x:dob','#eq-app [data-v="dob|new|"]',a=>adm()||can(a,'affaires.edit'))}
],
'equipe:x:pack':[
  {sel:'#eq-app h2.vt + .card, #eq-app h2.vt',titre:'Pourquoi un pack',texte:"Le site de l'appli est public : rien de confidentiel dans son code. Les données privées de l'entreprise arrivent par ce fichier."},
  {sel:'#eq-app label.btn:has([data-xin="pack|file"]), #eq-app label.btn.primary',titre:'1 · Choisir le fichier',texte:"« 📂 Choisir le pack (.json) » : le fichier privé, gardé sur ton ordinateur."},
  {titre:'2 · Ce qui sera importé',texte:"Les parties trouvées (magasin, accueil, véhicules, mémoire technique…) : décoche ce que tu ne veux pas, puis « ⬆ Importer »."},
  {titre:'Le résultat',texte:"Une ligne par partie, verte si c'est passé. Réimporter met à jour sans doublon : signatures et stock gardent leur historique."},
  {titre:'Hors réseau',texte:"Les écritures partent au serveur ; sans réseau, elles attendent sur cet appareil et partent à son retour."}
],

/* ═══ RÉGLAGES (administrateur) — une seule clé pour tous les volets ═══ */
reglages:[
  {titre:'Réglages',texte:"L'écran de l'administrateur : qui a accès à Tracé, avec quels droits, quelles options et quels modules."},
  {sel:'#homeBody .admNav [data-av="people"]',titre:'👥 Personnes',texte:"Chaque compte : poste, type, chantiers 🏗, droits 🔑, Socle ou 🧪 Labo, actif ou non. ★ = administrateur."},
  {sel:'#admNew, #homeBody .admNav [data-av="people"]',titre:'➕ Créer un accès',texte:"Prénom, nom, e-mail, poste, type, puis « Créer l'accès ». 1re connexion : donne le « 🔐 Code de 1re connexion » de sa carte ; la personne choisit son mot de passe."},
  {sel:'#homeBody .admNav [data-av="postes"]',titre:'🧩 Postes',texte:"Les droits d'un poste valent pour toutes ses personnes (sauf ajustement 🔑). Coche, décoche : c'est enregistré tout de suite."},
  {sel:'#homeBody .admNav [data-av="who"]',titre:'🔎 Qui peut quoi ?',texte:"Choisis un droit : tu vois qui l'a et pourquoi (poste, ajustement personnel, administrateur)."},
  {sel:'#homeBody .admNav [data-av="options"]',titre:'🧪 Options',texte:"Les options rangées par module : Socle (tout le monde) ou 🧪 Labo (les testeurs). Désigne les testeurs, toi compris."},
  {sel:'#homeBody .admPalBan, #homeBody .admNav [data-av="options"]',titre:'⏻ Les paliers',texte:"Éteints : tout le monde voit tout. Allumés : chacun ne voit que son palier — passe-toi en 🧪 Labo avant d'allumer."},
  {sel:'#homeBody .admNav [data-av="entreprise"]',titre:'🏢 Entreprise et modules',texte:"Le logo et le nom en haut à droite, chez tout le monde. Plus bas, les modules pris : un module décoché disparaît partout."},
  {sel:'#homeBody .admNav [data-av="sandbox"]',titre:'🧪 Bac à sable',texte:"Un chantier et des personnages de démo pour tester sans rien envoyer au serveur. « Retirer » efface tout d'un coup."}
]
};
/* typographie : espace insécable avant « : ; ? ! » et dans les guillemets « … » — sur un petit écran, une ligne ne commence jamais par « : » ou « » » */
const NB=t=>String(t).replace(/ ([:;?!»])/g,'\u00a0$1').replace(/« /g,'«\u00a0');
Object.values(TUTOS).forEach(L=>L.forEach(e=>{e.titre=NB(e.titre);e.texte=NB(e.texte);}));
export default TUTOS;
