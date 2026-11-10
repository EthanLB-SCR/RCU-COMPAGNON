// 10/11 (Ethan : « sur les post-it, une heure de rappel ; quand l'heure arrive ça fait un petit rappel sur ton post-it ») — sur la maquette (même code que l'appli)
import { chromium } from 'playwright';
const U = process.env.U || 'http://127.0.0.1:8769/index.html';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#pt-nav button[data-k="bureau"]'); await p.waitForTimeout(600);
await p.click('#pt-nav button[data-k="bureau"]'); await p.waitForTimeout(2500);
const R = {}; const H = () => p.evaluate(() => window.PROTO.H);
const now16 = await p.evaluate(() => { const d = new Date(); const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); });
// r1 : le champ « Me le rappeler » existe dans le formulaire des notes ; la note de démo porte sa cloche dans la liste
const chipNotes = () => p.evaluate(() => { const c = [...document.querySelectorAll('.m3d-chip')].find(x => /Mes notes/.test(x.textContent)); if (c) c.click(); return !!c; }); await chipNotes(); await p.waitForTimeout(1500);
R.r1 = await p.evaluate(() => !!document.querySelector('[data-note-when]') && [...document.querySelectorAll('.m3d-nrap')].some(e => /🔔 dem\. 08:30/.test(e.textContent)));
// r2 : nouvelle note avec rappel dans 2 min → enregistrée avec r, pas due
await p.fill('[data-note-text]', 'Rappeler le fournisseur de manchons'); const soon = await p.evaluate(() => { const d = new Date(); d.setMinutes(d.getMinutes() + 2); const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); });
await p.fill('[data-note-when]', soon); await p.click('[data-note-save]'); await p.waitForTimeout(1500);
if (process.env.DBG) console.log('r2', JSON.stringify(await p.evaluate(() => window.PROTO.H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)) || null)), soon, await p.evaluate(() => (window.PROTO.H.state.pod.userData.dueNotes || []).length));
R.r2 = await p.evaluate(soon => { const N = window.PROTO.H.state.DATA.notes; const n = N.find(x => /fournisseur de manchons/.test(x.t)); return !!n && n.r === soon && !n.rk && !(window.PROTO.H.state.pod.userData.dueNotes || []).length; }, soon);
// r3 : une note dont l'heure est passée → post-it marqué « due » (il s'agite) et ligne « Rappel arrivé » quand on l'ouvre
await p.evaluate(now16 => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)); n.r = now16; H.setScene('bureau'); }, now16); await p.waitForTimeout(1200); await chipNotes(); await p.waitForTimeout(800);
R.r3 = await p.evaluate(() => { const H = window.PROTO.H; const L = H.state.pod.userData.dueNotes || []; return L.length === 1 && L[0].userData.noteId === H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)).id; });
await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)); if (H.state.vue !== 'note:' + n.id) H.go('note', n.id); }); await p.waitForTimeout(1200);
R.r3b = await p.evaluate(() => /Rappel arrivé/.test(document.body.textContent) && !!document.querySelector('[data-note-seen]'));
// r4 : « +1 h » reporte (plus due) ; r5 : remise à l'heure passée puis « ✓ Vu » → rk, plus d'agitation
await p.click('[data-note-later="60"]'); await p.waitForTimeout(1500);
R.r4 = await p.evaluate(now16 => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)); return n.r > now16 && !n.rk && !(H.state.pod.userData.dueNotes || []).length; }, now16);
await p.evaluate(now16 => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)); n.r = now16; H.setScene('bureau'); if (H.state.vue !== 'note:' + n.id) H.go('note', n.id); }, now16); await p.waitForTimeout(1500);
await p.click('[data-note-seen]'); await p.waitForTimeout(1500);
R.r5 = await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /fournisseur de manchons/.test(x.t)); return n.rk === true && !(H.state.pod.userData.dueNotes || []).length; });
// r6 : le rappel qui ARRIVE pendant qu'on travaille : toast dans les 25 s (vérification périodique)
await p.evaluate(now16 => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /grue/.test(x.t)); n.r = now16; delete n.rk; }, now16);
let toast = ''; for (let i = 0; i < 26 && !/Rappel/.test(toast); i++) { await p.waitForTimeout(1000); toast = await p.evaluate(() => { const t = document.querySelector('.m3d-toast'); return t && !t.hidden ? t.textContent : ''; }); }
R.r6 = /🔔 Rappel : Appeler Lucas/.test(toast);
R.r7 = errs.length === 0;
const ko = Object.keys(R).filter(k => !R[k]); console.log(JSON.stringify(R), errs.slice(0, 2)); console.log('RESULTAT:' + (ko.length ? ' ECHEC ' + ko.join(',') : ' TOUT VERT')); await b.close();
