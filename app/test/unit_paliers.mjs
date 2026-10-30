// unit_paliers.mjs — 30/10 (lot 2910h). Paliers d'accès aux options (src/paliers.js) : logique pure + garde-fou statique.
//  u1  registre : 20 options, clés uniques, groupe et palier connus, Bouclage / Conversation / QSE / Dossier / Export / Planning / Production en Socle (Ethan 30/10)
//  u2  toute clé utilisée dans le code (feat('x'), featOn('x'), feat:'x', TAB_FEAT, SHOW_FEAT, menu « Poser ») est déclarée — une clé inconnue n'est JAMAIS cachée (on ne casse pas l'existant),
//      donc une faute de frappe rendrait une option Labo visible à tout le monde : c'est ici qu'on l'attrape
//  u3  featFor : éteint → tout ; allumé → socle voit le socle, labo voit tout, « en moins » / « en plus » personnels priment, option passée au Socle visible pour tous
//  u4  norm : réglage sale (clés inconnues, paliers inconnus, « socle » explicite) nettoyé ; setFeatPalier remet au défaut = supprime l'entrée
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));const SRC=path.join(here,'..','src');
const P=await import(path.join(SRC,'paliers.js'));
const C={};const J=x=>JSON.stringify(x);
/* u1 */
const keys=P.FEATURES.map(f=>f[0]);
let o={n:keys.length,uniq:new Set(keys).size===keys.length,grp:P.FEATURES.every(f=>P.GROUPES[f[2]]),pal:P.FEATURES.every(f=>P.PALIERS[f[3]]),desc:P.FEATURES.every(f=>f[1]&&f[4]),
  socle:keys.filter(k=>P.featDef(k)[3]==='socle'),labo:keys.filter(k=>P.featDef(k)[3]==='labo')};
console.log('u1) registre :',J(o));
C.u1=o.n>=20&&o.uniq&&o.grp&&o.pal&&o.desc&&['bouclage','conv','qse','dossier','export','planning','production'].every(k=>o.socle.includes(k))&&['hydro','stock','fourniture','phasage','modifs','points','commerce','parc','magasin','frais','objectifs','accident','mutu'].every(k=>o.labo.includes(k));
/* u2 : scan statique */
const used=new Map();const add=(k,where)=>{if(!used.has(k))used.set(k,new Set());used.get(k).add(where);};
for(const f of fs.readdirSync(SRC).filter(f=>f.endsWith('.js')&&f!=='paliers.js')){const s=fs.readFileSync(path.join(SRC,f),'utf8');
  for(const m of s.matchAll(/\bfeat(?:On)?\('([a-z_]+)'\)/g))add(m[1],f);
  for(const m of s.matchAll(/\bfeat:'([a-z_]+)'/g))add(m[1],f);
  for(const name of ['TAB_FEAT','SHOW_FEAT']){const m=s.match(new RegExp(name+'=\\{([^}]*)\\}'));if(m)for(const v of m[1].matchAll(/:'([a-z_]+)'/g))add(v[1],f+':'+name);}
  const pose=s.match(/function openPoseSheet\(\)\{[\s\S]*?\];/);if(pose)for(const m of pose[0].matchAll(/\),'([a-z_]+)'\]/g))add(m[1],f+':Poser');}
const unknown=[...used.keys()].filter(k=>!P.featDef(k));const unused=keys.filter(k=>!used.has(k));
console.log('u2) clés utilisées :',J({n:used.size,unknown,unused,where:Object.fromEntries([...used].map(([k,w])=>[k,[...w].join(' ')]))}));
C.u2=used.size>=19&&!unknown.length&&!unused.length;
/* u3 : featFor (CFG en mémoire, pas de localStorage en node) */
P.initPaliers({state:{},sync:null});
const eth={id:'l:ethan',email:'e@scr'},kar={id:'l:karim',email:'k@scr'};
const cfg=P.paliersCfg();
o={off:{eh:P.featFor(eth,'hydro'),kc:P.featFor(kar,'commerce'),unk:P.featFor(kar,'nimportequoi')}};
cfg.on=true;cfg.people={'l:ethan':'labo'};cfg.extra={'l:ethan':{hydro:false},'l:karim':{stock:true}};cfg.feat={phasage:'socle'};
o.on={ethHydro:P.featFor(eth,'hydro'),ethStock:P.featFor(eth,'stock'),ethConv:P.featFor(eth,'conv'),karHydro:P.featFor(kar,'hydro'),karStock:P.featFor(kar,'stock'),karPhasage:P.featFor(kar,'phasage'),karConv:P.featFor(kar,'conv'),karCommerce:P.featFor(kar,'commerce'),unk:P.featFor(kar,'nimportequoi'),
  ethPal:P.personPalier(eth),karPal:P.personPalier(kar),byEmail:P.featFor({id:'zz',email:'e@scr'},'stock')/* l'adresse n'est pas une clé des gens → socle */,sum:P.paliersSummary([eth,kar])};
console.log('u3) featFor :',J(o));
C.u3=o.off.eh&&o.off.kc&&o.off.unk&&o.on.ethHydro===false&&o.on.ethStock===true&&o.on.ethConv===true&&o.on.karHydro===false&&o.on.karStock===true&&o.on.karPhasage===true&&o.on.karConv===true&&o.on.karCommerce===false&&o.on.unk===true&&o.on.ethPal==='labo'&&o.on.karPal==='socle'&&o.on.byEmail===false&&o.on.sum.people.length===1&&o.on.sum.labo.includes('hydro')&&!o.on.sum.labo.includes('phasage');
/* u4 : norm + réglages */
const n=P.paliersCfg;const dirty={on:'oui',feat:{hydro:'socle',inconnue:'labo',stock:'bizarre'},people:{a:'labo',b:'socle',c:'xx'},extra:{a:{hydro:true,inconnue:false,stock:'non'},b:'rien'},at:'t',by:'moi'};
const r1=await P.savePaliers(dirty);const c1=n();
const r2=await P.setFeatPalier('hydro','labo');const c2=n();const r3=await P.setFeatPalier('zzz','labo');
const r4=await P.setPersonPalier({id:'a'},'socle');const c4=n();const r5=await P.setPersonExtra({id:'a'},'hydro',null);const c5=n();const r6=await P.setPersonExtra({},'hydro',true);
o={r1:r1.ok&&r1.where,c1:{on:c1.on,feat:c1.feat,people:c1.people,extra:c1.extra,v:c1.v},r2:r2.ok,c2feat:c2.feat,r3:r3.error,c4people:c4.people,c5extra:c5.extra,r6:r6.error};
console.log('u4) norm :',J(o));
C.u4=o.r1==='appareil'&&o.c1.on===true&&J(o.c1.feat)==='{"hydro":"socle"}'&&J(o.c1.people)==='{"a":"labo"}'&&J(o.c1.extra)==='{"a":{"hydro":true}}'&&o.c1.v===1&&o.r2&&J(o.c2feat)==='{}'&&!!o.r3&&J(o.c4people)==='{}'&&J(o.c5extra)==='{}'&&!!o.r6;
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));process.exit(Object.values(C).every(Boolean)?0:1);
