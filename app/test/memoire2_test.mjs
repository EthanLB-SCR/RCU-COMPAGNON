// 14/10 nuit — mémoire « bibliothèque SCR » (src/memoire2.js), sans navigateur : import du pack (bibliothèque FICTIVE), nettoyage du HTML, trous, export Word.
// node test/memoire2_test.mjs → RESULTAT: TOUT VERT | ECHEC <clés>
import {initReg,regGet,regSet} from '../src/reg.js';
import {memLibInit,memoirePackImport,memoirePack,memLib,memLibDocHTML,memLibCount,memSanitize,memLibActive,memLibReady,memLibMode} from '../src/memoire2.js';
import {FAKE_BLOCS,FAKE_STYLE} from './memoire_fake.mjs';
initReg({kv:{set:async()=>true,get:async()=>null},state:{cloudUser:null},sync:{},toast:()=>{}});
const AS0={};memLibInit({toast:()=>{},userName:()=>'Testeur'},{affGet:()=>null,affSet:()=>{},AS:()=>AS0,vars:()=>({})});
const C={};const log=(k,v)=>{C[k]=!!v;if(!v)console.log('ÉCHEC',k);};
// 1) import du pack : une seule ligne « memlib » du registre doc, jamais à signer
const r1=await memoirePackImport({blocs:FAKE_BLOCS,style:FAKE_STYLE},{api:{userName:()=>'Testeur'}});const L1=memLib();
console.log('1)',r1);
log('import',/5 blocs, 12 paragraphes \(9 cochés par défaut\), 3 sections, 3 trous/.test(r1)&&L1&&L1.kind==='memlib'&&L1.req&&L1.req.none===true&&L1.version===1&&L1.by==='Testeur'&&L1.blocs.length===5&&L1.style&&L1.style.h2.color==='#123456'&&memoirePack.key==='memoire'&&memoirePack.import===memoirePackImport);
// 2) réimport : version 2, corrections de l'appli gardées ; pack invalide refusé
regSet('doc','memlib',{corr:{'t-soudage-1':{html:'<p>Texte corrigé.</p>',at:'2026-10-14',by:'Ethan'}}});
const r2=await memoirePackImport(JSON.stringify({blocs:FAKE_BLOCS}),{me:{prenom:'Ethan',nom:'L.'}});const L2=memLib();
let bad=0;for(const p of [null,{blocs:[]},{blocs:[{id:'x y',paragraphes:[]}]},{blocs:[{id:'a',paragraphes:[{id:'p1',html:''},{id:'p1',html:''}]}]}]){try{await memoirePackImport(p,{});}catch(e){bad++;}}
console.log('2)',r2,'refusés :',bad);
log('reimport',L2.version===2&&L2.corr&&L2.corr['t-soudage-1']&&/1 correction de l’appli conservée/.test(r2)&&L2.style&&L2.style.h2.color==='#123456'&&L2.by==='Ethan L.'&&bad===4);
// 3) nettoyage : ni script, ni attribut, ni image
const s=memSanitize('<p onclick="x()" style="color:red">a<script>alert(1)</script><img src=x onerror=alert(2)>b <a href="javascript:z">lien</a></p><div>c</div><table><tr><td colspan="2" onmouseover="q">d</td></tr></table>');
console.log('3)',s);log('sanitize',s==='<p>ab lien</p><p>c</p><table><tr><td colspan="2">d</td></tr></table>');
// 4) une affaire : cochés par défaut, trous (2 dans les paragraphes cochés), variables vides = trous ; remplir → prête
const a={num:'O2610-91',nom:'Réseau fictif',client:'CLIENT-TEST',ville:'Testville',consult:{}};
let c=memLibCount(a,{});console.log('4)',JSON.stringify(c),memLibMode(a),memLibActive(a));
const a2=Object.assign({},a,{memoire:{mode:'lib',lib:{sel:{'t-controles-2':true,'t-annexes-2':false},fill:{'t-acteurs-1|nom du maître d’œuvre|0':'BET Fictif','{{delai}}':'12 semaines'},edits:{}}}});
const c2=memLibCount(a2,{});const a3=JSON.parse(JSON.stringify(a2));a3.memoire.lib.fill['t-controles-1|nom du conducteur de travaux|0']='Jean Test';const c3=memLibCount(a3,{});
console.log('   ',JSON.stringify(c2),JSON.stringify(c3),memLibReady(a2,{}),memLibReady(a3,{}));
log('holes',c.sel===9&&c.tot===12&&c.holes===2&&memLibMode(a)==='lib'&&!memLibActive(a)&&c2.sel===9&&c2.holes===1&&c3.holes===0&&!memLibReady(a2,{})&&memLibReady(a3,{})&&memLibActive(a2));
// 5) export Word : gabarit du pack, page de garde, trous rouges, valeurs remplies, puces, tableaux
const w=memLibDocHTML(a2,{},{word:true});const p=memLibDocHTML(a3,{},{word:false});
const ok5={h2:/h2\{[^}]*color:#123456/.test(w),h3:/h3\{[^}]*color:#654321/.test(w),th:/<th style="background:#FF6601/.test(w),band:/background:#FABF8E/.test(w),puce:/<li style="color:#AA0011"><span style="color:#000000">/.test(w),square:/list-style-type:square/.test(w),
  cover:/O2610-91/.test(w)&&/CLIENT-TEST/.test(w)&&/Testville/.test(w)&&/MÉMOIRE<br>TECHNIQUE TEST/.test(w)&&/\d\d\/\d\d\/\d{4}/.test(w),red:/\.ac\{color:#EE0000;font-style:italic\}/.test(w)&&/<span class="ac">\[À COMPLÉTER : nom du conducteur de travaux\]<\/span>/.test(w),
  filled:/BET Fictif/.test(w)&&/12 semaines/.test(w)&&!/maître d’œuvre\]/.test(w),corr:/Texte corrigé\./.test(w),out:!/Fin du mémoire/.test(w)&&/Délai d’exécution proposé : 12 semaines/.test(w),nums:/>1\. Présentation de l’offre</.test(w)&&/>2\.1 Soudage des tubes</.test(w)&&/>2\.1\.1 Qualification des soudeurs</.test(w),
  merged:(w.match(/<ul/g)||[]).length===1,print:/@bottom-right\{content:"Page " counter\(page\) " \/ " counter\(pages\)/.test(p)&&!/class="ac"/.test(p.replace(/\.ac\{/,''))&&/Jean Test/.test(p),word:/xmlns:w="urn:schemas-microsoft-com:office:word"/.test(w)&&/WordSection1/.test(w)};
console.log('5)',JSON.stringify(ok5));log('export',Object.values(ok5).every(Boolean));
const badk=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(badk.length?'RESULTAT: ECHEC '+badk.join(','):'RESULTAT: TOUT VERT');setTimeout(()=>process.exit(0),50);
