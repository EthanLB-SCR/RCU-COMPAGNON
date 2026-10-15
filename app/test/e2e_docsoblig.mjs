// 14/10 après-midi (lot D) — DOCUMENTS OBLIGATOIRES ET DOCUMENTS ADMINISTRATIFS DE L'ENTREPRISE (Ethan : « une section documents obligatoires : ce qui est formulaire
// à remplir, acte d'engagement etc. ; on peut les télécharger pour les remplir et les déposer complétés, pour après pouvoir les inclure au dossier de remise d'offre »
// + « l'assurance déposée dans le logiciel […] comme d'autres documents obligatoires pouvant être joints à l'offre »).
// Hors connexion (Ethan, administrateur), fichiers FICTIFS : (1) SCR → Documents administratifs : Kbis déposé avec validité J+10 (alerte), URSSAF (date proposée
// +6 mois), assurance RC (assureur, police, garanties) → registre « entdoc » ; (2) alerte : pastille du hub + « À faire » ; (3) DCE déposé → formulaires repérés
// (AE, DC1, attestation de visite ; pas le CCTP ni la DPGF), étiquette « à remplir » dans le Dossier ; (4) 7 · Offre : original téléchargé, AE complété déposé,
// DC1 retiré de la remise, Kbis « expire avant la remise », pièce libre ; liste de contrôle d'origine intacte (6 cases) ; (5) 📦 dossier de remise (.zip) : pièces
// complétées + documents de l'entreprise + bordereau (manquants listés) ; (6) nouvelle version au prix changé → AE « à refaire » ; (7) droits : soudeur sans accès.
// 14/10 soir (lot M3) : le mémoire part en PDF dans le dossier de remise quand il est fait avec la bibliothèque SCR (contrôlé dans e2e_memoire_pdf) ; ici, sans
// bibliothèque, la ligne « Mémoire technique » annonce toujours le Word (sections libres) — contrôle ajouté au (4).
import { chromium } from 'playwright';
import { unzipSync, strFromU8 } from 'fflate';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);
const txt=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
const click=async(v,act)=>{const ok=await page.evaluate(([v,a])=>{const b=document.querySelector(`#eq-app [data-act=${a}][data-v="${v}"]`);if(b)b.click();return !!b;},[v,act||'af']);await wait(300);return ok;};
const set=async(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)return false;el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));return true;},[sel,val]);
const pdf=t=>Buffer.from('%PDF-1.4\n% fichier FICTIF de test : '+t+'\n%%EOF\n','utf8');
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const plus=(n,m)=>{const d=new Date();if(m)d.setMonth(d.getMonth()+m);else d.setDate(d.getDate()+n);return iso(d);};
const NUM='O2610-41';
// ── 1) SCR → Documents administratifs : 7 types à déposer ; Kbis (J+10), URSSAF (date proposée +6 mois), assurance RC (assureur, police, garanties)
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htEnt').click();});await wait(350);
let out={row:await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent));return r?r.textContent.replace(/\s+/g,' '):'';})};
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent)).click();});await wait(350);
out.view=await page.evaluate(()=>({h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',rows:document.querySelectorAll('#eq-app .dob-erow').length,todo:[...document.querySelectorAll('#eq-app .dob-erow .dob-st')].filter(x=>/à déposer/.test(x.textContent)).length}));
await click('dob|edit|kbis','x');out.kbisModal=await page.evaluate(()=>({file:!!document.getElementById('ed-file'),valid:document.getElementById('ed-valid').value}));
await page.setInputFiles('#ed-file',{name:'kbis-fictif.pdf',mimeType:'application/pdf',buffer:pdf('kbis')});await set('#ed-valid',plus(10));await page.evaluate(()=>document.getElementById('ed-ok').click());await wait(700);
await click('dob|edit|urssaf','x');out.urssafSug=await page.evaluate(()=>document.getElementById('ed-valid').value);await page.setInputFiles('#ed-file',{name:'urssaf-fictive.pdf',mimeType:'application/pdf',buffer:pdf('urssaf')});await page.evaluate(()=>document.getElementById('ed-ok').click());await wait(700);
await click('dob|edit|assurance_rc','x');out.rcFields=await page.evaluate(()=>!!document.getElementById('ed-ass')&&!!document.getElementById('ed-pol')&&!!document.getElementById('ed-gar'));
await page.setInputFiles('#ed-file',{name:'attestation-rc-fictive.pdf',mimeType:'application/pdf',buffer:pdf('rc')});await page.evaluate(v=>{document.getElementById('ed-valid').value=v;document.getElementById('ed-ass').value='Assureur fictif';document.getElementById('ed-pol').value='POL-0001';document.getElementById('ed-gar').value='RC exploitation : 1 000 000 € par sinistre (fictif)';document.getElementById('ed-ok').click();},plus(200));await wait(700);
out.reg=await page.evaluate(()=>{const g=id=>window.TRACE.reg.get('entdoc',id);const k=g('kbis'),u=g('urssaf'),r=g('assurance_rc');return {k:k&&{type:k.type,file:k.file,data:/^data:application\/pdf/.test(k.data||''),valid:k.validUntil,by:k.by},u:u&&u.validUntil,r:r&&{ass:r.assureur,pol:r.police,gar:r.garanties,title:r.title}};});
out.st=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .dob-erow')].map(x=>x.dataset.ent+':'+x.querySelector('.dob-st').textContent).join(' | '));
console.log('1) documents administratifs :',JSON.stringify(out));
C.c1=/Documents administratifs \(offres\)/.test(out.row)&&/7 à déposer/.test(out.row)&&/Documents administratifs de l'entreprise/.test(out.view.h2)&&out.view.rows===7&&out.view.todo===7&&out.kbisModal.file&&out.kbisModal.valid===plus(0,3)
  &&out.reg.k&&out.reg.k.type==='kbis'&&out.reg.k.file==='kbis-fictif.pdf'&&out.reg.k.data&&out.reg.k.valid===plus(10)&&/Ethan/.test(out.reg.k.by)&&out.urssafSug===plus(0,6)&&out.reg.u===plus(0,6)&&out.rcFields&&out.reg.r&&out.reg.r.ass==='Assureur fictif'&&out.reg.r.pol==='POL-0001'&&/1 000 000/.test(out.reg.r.gar)
  &&/kbis:expire le .* \(J-10\)/.test(out.st)&&/urssaf:valide jusqu'au/.test(out.st)&&/assurance_rc:valide jusqu'au/.test(out.st)&&/assurance_decennale:à déposer/.test(out.st);
// ── 2) alerte avant échéance : pastille du hub, « À faire » d'Ethan
await page.evaluate(()=>document.querySelector('#eq-app .ac-back')&&document.querySelector('#eq-app .ac-back').click());await wait(300);
out={row:await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent));return r?r.textContent.replace(/\s+/g,' '):'';})};
await page.evaluate(()=>document.getElementById('htHome').click());await wait(400);out.notif=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/Kbis/.test(t))||'');
console.log('2) alerte :',JSON.stringify(out));
C.c2=/1 à renouveler/.test(out.row)&&/Kbis expire dans 10 jours/.test(out.notif);
// ── 3) affaire + DCE déposé : formulaires repérés (AE, DC1, attestation de visite), pas le CCTP ni la DPGF ; étiquette « 📝 à remplir » dans 1 · Dossier
await page.evaluate(()=>{document.getElementById('htCom').click();});await wait(300);
await click('new|');await page.evaluate(n=>{document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Ville fictive — offre test';document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-etat').value='devis';},NUM);await click('create|');
await page.evaluate(([n,d])=>window.TRACE.affaires.set(n,{dateReponse:d}),[NUM,plus(20)]);
await click('tab|dossier');await page.setInputFiles('#eq-app input[data-affile]',[{name:'AE_lot_2.pdf',mimeType:'application/pdf',buffer:pdf('ae')},{name:'DC1.pdf',mimeType:'application/pdf',buffer:pdf('dc1')},{name:'Attestation de visite.pdf',mimeType:'application/pdf',buffer:pdf('visite')},{name:'CCTP lot 2.pdf',mimeType:'application/pdf',buffer:pdf('cctp')},{name:'DPGF à compléter.pdf',mimeType:'application/pdf',buffer:pdf('dpgf')}]);await wait(1500);
out={pieces:await page.evaluate(n=>(window.TRACE.affaires.get(n).dce||[]).map(d=>d.name+':'+(d.local?'L':'-')),NUM),tags:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-dp b')].filter(b=>/📝 à remplir/.test(b.textContent)).map(b=>b.textContent.replace('📝 à remplir','').trim()))};
out.ft=await page.evaluate(()=>{const f=window.TRACE.docsOblig.formType;return [f({name:'ATTRI1_lot2.docx'}),f({name:'Cadre de réponse technique.docx'}),f({name:'Plan_AE.pdf',catKey:'plans'}),f({name:'Règlement de consultation.pdf'}),f({name:'DUME.xml'}),f({name:'DC2 déclaration.pdf'}),f({name:'Mail MOE.txt',text:'x'})].join(',');});
console.log('3) DCE et formulaires :',JSON.stringify(out));
C.c3=out.pieces.length===5&&out.pieces.every(p=>/:L$/.test(p))&&out.tags.sort().join('|')==='AE_lot_2.pdf|Attestation de visite.pdf|DC1.pdf'&&out.ft==='ae,cadre,,,dume,dc2,';
// ── 4) 7 · Offre : documents obligatoires — original téléchargé, AE complété déposé, DC1 hors remise, Kbis « expire avant la remise », pièce libre
await click('tab|offre');
out={sec:await page.evaluate(()=>{const s=document.getElementById('dob-offre');const rows=[...document.querySelectorAll('#dob-offre .dob-row')].map(r=>r.dataset.key+'='+r.querySelector('.dob-st').textContent);return {h:s&&s.querySelector('h3').textContent,rows,taches:document.querySelectorAll('#eq-app .cm-tache').length,forms:/Formulaires du DCE à remplir · 3/.test(s.textContent),mem:(document.querySelector('#dob-offre .dob-row[data-key="p:memoire"] .tx small')||{}).textContent||''};})};
const ids=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const id=nm=>(a.dce.find(d=>d.name===nm)||{}).id;return {ae:id('AE_lot_2.pdf'),dc1:id('DC1.pdf'),vis:id('Attestation de visite.pdf')};},NUM);
const [dlo]=await Promise.all([page.waitForEvent('download',{timeout:8000}),click('oborig|'+ids.ae)]);out.orig=dlo.suggestedFilename();
await click('obfile|f:'+ids.ae);await page.setInputFiles('#dob-pick',{name:'AE_lot_2_signe.pdf',mimeType:'application/pdf',buffer:pdf('ae signé')});await wait(900);
await click('obinc|f:'+ids.dc1);
await click('obadd|');await page.evaluate(()=>{document.getElementById('ob-lab').value='Références fictives';document.getElementById('ob-ok').click();});await wait(300);
const cid=await page.evaluate(n=>((window.TRACE.affaires.get(n).offre.oblig||{}).custom||[])[0].id,NUM);
await click('obfile|c:'+cid);await page.setInputFiles('#dob-pick',{name:'references.pdf',mimeType:'application/pdf',buffer:pdf('références')});await wait(900);
out.after=await page.evaluate(([n,ids])=>{const a=window.TRACE.affaires.get(n);const I=a.offre.oblig.items;const st=k=>{const r=document.querySelector(`#dob-offre .dob-row[data-key="${k}"] .dob-st`);return r?r.textContent:'';};
  return {ae:I['f:'+ids.ae].file&&{name:I['f:'+ids.ae].file.name,v:I['f:'+ids.ae].file.v,local:I['f:'+ids.ae].file.local},aeSt:st('f:'+ids.ae),dc1:I['f:'+ids.dc1].inc,kbis:st('e:kbis'),urssaf:st('e:urssaf'),rib:!!document.querySelector('#dob-offre .dob-row[data-key="e:rib"] input:checked'),hint:[...document.querySelectorAll('#eq-app .cm-tache small')].map(x=>x.textContent).join(' | '),taches:document.querySelectorAll('#eq-app .cm-tache').length,custom:st('c:'+a.offre.oblig.custom[0].id)};},[NUM,ids]);
console.log('4) 7 · Offre :',JSON.stringify(out));
C.c4=/Documents obligatoires/.test(out.sec.h)&&out.sec.forms&&/^généré depuis 5 · Mémoire \(Word\)/.test(out.sec.mem)&&out.sec.taches===6&&out.sec.rows.some(r=>/^e:assurance_decennale=à déposer/.test(r))&&!out.sec.rows.some(r=>/CCTP|DPGF à/.test(r))&&out.orig==='AE_lot_2.pdf'
  &&out.after.ae&&out.after.ae.name==='AE_lot_2_signe.pdf'&&out.after.ae.v===1&&out.after.ae.local&&/complété · déposé le/.test(out.after.aeSt)&&out.after.dc1===false&&/expire avant la remise/.test(out.after.kbis)&&/valide jusqu'au/.test(out.after.urssaf)&&!out.after.rib
  &&/AE complété déposé ✓/.test(out.after.hint)&&/documents administratifs valides/.test(out.after.hint)&&out.after.taches===6&&/^déposé le/.test(out.after.custom);
// ── 5) 📦 dossier de remise (.zip) : pièces cochées et complétées, documents de l'entreprise, bordereau avec les manquants
const [dlz]=await Promise.all([page.waitForEvent('download',{timeout:15000}),click('obzip|')]);const zpath=await dlz.path();const Z=unzipSync(new Uint8Array(fs.readFileSync(zpath)));const names=Object.keys(Z).sort();
const bord=strFromU8(Z['00_Bordereau_des_pieces.html']||new Uint8Array());const last=await page.evaluate(()=>window.TRACE.docsOblig.lastZip());
out={name:dlz.suggestedFilename(),names,ae:Z['01_Formulaires/01_AE_lot_2_signe.pdf']&&strFromU8(Z['01_Formulaires/01_AE_lot_2_signe.pdf']).includes('ae signé'),miss:last&&last.miss,bord:/Bordereau des pièces/.test(bord)&&/AE_lot_2_signe\.pdf/.test(bord)&&/manquant/.test(bord)&&/Attestation de visite/.test(bord)};
console.log('5) dossier de remise :',JSON.stringify(out));
C.c5=new RegExp('^Offre_'+NUM+'_v1_\\d{4}-\\d\\d-\\d\\d\\.zip$').test(out.name)&&out.names.includes('00_Bordereau_des_pieces.html')&&out.ae&&out.names.some(n=>/^02_Entreprise\/\d\d_Kbis\.pdf$/.test(n))&&out.names.some(n=>/^02_Entreprise\/\d\d_URSSAF\.pdf$/.test(n))&&out.names.some(n=>/^02_Entreprise\/\d\d_Assurance_RC\.pdf$/.test(n))
  &&out.names.some(n=>/^04_Autres_pieces\/01_references\.pdf$/.test(n))&&!out.names.some(n=>/DC1/.test(n))&&!out.names.some(n=>/RIB/.test(n))&&out.miss.some(m=>/Attestation de visite/.test(m))&&out.miss.some(m=>/décennale/.test(m))&&out.bord;
// ── 6) nouvelle version au prix changé : l'AE déposé pour la v1 est signalé « à refaire »
await page.evaluate(()=>window.TRACE.affaires.v1Set({taux:80,heures:10,nSoud:3,nManch:1,autocontrole:0.05,ratioManchons:0.9,marge:0.1,dechets:0.1,radioPct:0.05,radioVac:10,radioForfait:1500,radioPU:[[9999,100]],cad:{100:[10,10]},rcfa:{}}));
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Négociation';document.getElementById('vv-ok').click();});await wait(400);
await click('tab|quantites');await click('qadd|');await set('#eq-app [data-afqr="0|dn"]','100');await wait(150);await set('#eq-app [data-afqr="0|soud"]','50');await wait(150);await set('#eq-app [data-afqr="0|ml"]','200');await wait(150);await click('qprefill|');
await click('tab|offre');out=await page.evaluate(([n,id])=>({v:window.TRACE.affaires.get(n).chiffrageV,ae:(document.querySelector(`#dob-offre .dob-row[data-key="f:${id}"] .dob-st`)||{}).textContent||''}),[NUM,ids.ae]);
await click('vview|1');out.v1=await page.evaluate(id=>({band:!!document.querySelector('#eq-app .vv-band'),ae:(document.querySelector(`#dob-offre .dob-row[data-key="f:${id}"] .dob-st`)||{}).textContent||'',ro:!document.querySelector('#dob-offre [data-v^="obfile|"]')}),ids.ae);await click('vexit|');
console.log('6) version et AE :',JSON.stringify(out));
C.c6=out.v===2&&/déposé pour la v1 \(0 €\) : à refaire, v2 = /.test(out.ae)&&out.v1.band&&/complété · déposé le/.test(out.v1.ae)&&out.v1.ro;
// ── 7) droits : un soudeur ne voit pas la ligne ; le bureau commercial (Sophie) peut déposer
out=await page.evaluate(async()=>{const T=window.TRACE;const r={};T.state.userId='karim';T.renderHome();document.getElementById('htEnt').click();await new Promise(x=>setTimeout(x,300));r.karim=[...document.querySelectorAll('#eq-app .ac-row')].some(x=>/Documents administratifs/.test(x.textContent));
  T.state.userId='sophie';T.renderHome();document.getElementById('htEnt').click();await new Promise(x=>setTimeout(x,300));const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs/.test(x.textContent));r.sophie=!!row;if(row){row.click();await new Promise(x=>setTimeout(x,300));r.edit=!!document.querySelector('#eq-app [data-act=x][data-v="dob|edit|kbis"]');}return r;});
console.log('7) droits :',JSON.stringify(out));
C.c7=!out.karim&&out.sophie&&out.edit;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
