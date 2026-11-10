// 10/11 (Ethan : « déplacer À savoir selon mon schéma, et en dessous un tableau liège Ma journée : l'agenda du jour, et des tâches comme les notes, avec rappel ») — maquette
import { chromium } from 'playwright';
const U = process.env.U || 'http://127.0.0.1:8769/index.html';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#pt-nav button[data-k="bureau"]'); await p.waitForTimeout(600);
await p.click('#pt-nav button[data-k="bureau"]'); await p.waitForTimeout(2500);
const R = {}; const chip = re => p.evaluate(re => { const c = [...document.querySelectorAll('.m3d-chip')].find(x => new RegExp(re).test(x.textContent)); if (c) c.click(); return !!c; }, re);
// j1) tableau blanc poussé vers le fond (z < -0.5) ; tableau liège présent, 3 rendez-vous de l'appli dessus, zone « ＋ »
R.j1 = await p.evaluate(() => { const H = window.PROTO.H, pod = H.state.pod; const J = pod.userData.jour; const wb = (pod.userData.fixed || []).map(f => f.ob); const z = wb.map(o => o.position.z); return !!J && J.data.rdv.length === 3 && J.ecran.zones.some(zz => zz.pick && zz.pick.type === 'jourAdd') && z.some(v => v < -0.5) && z.some(v => v > -0.5 && v < 0); });
// j2) puce « Agenda » → vue jour + panneau « Ma journée » avec le genre Tâche présélectionné
await chip('Agenda'); await p.waitForTimeout(1500);
R.j2 = await p.evaluate(() => window.PROTO.H.state.vue === 'jour' && /Ma journée/.test((document.querySelector('.m3d-over h4') || {}).textContent || '') && !!document.querySelector('[data-nkind="t"].primary') && !!document.querySelector('[data-note-h]'));
// j3) une tâche avec heure et rappel → épinglée sur le tableau (pas sur le retour), rappel gardé
const soon = await p.evaluate(() => { const d = new Date(); d.setMinutes(d.getMinutes() + 3); const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); });
await p.fill('[data-note-text]', 'Appeler le bureau d\'études'); await p.fill('[data-note-h]', '14:00'); await p.fill('[data-note-when]', soon); await p.click('[data-note-save]'); await p.waitForTimeout(1800);
R.j3 = await p.evaluate(soon => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /bureau d/.test(x.t)); const J = H.state.pod.userData.jour; return !!n && n.k === 't' && n.h === '14:00' && n.r === soon && n.x == null && J.data.taches.length === 1 && J.data.taches[0].id === n.id && !(H.state.pod.userData.notes || {})[n.id] && H.state.vue === 'jour'; }, soon);
// j4) un rendez-vous (heure obligatoire) → dans l'agenda du tableau, trié
await p.click('[data-note-cancel]').catch(() => { }); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('[data-nkind="rdv"]').click()); await p.waitForTimeout(600);
await p.fill('[data-note-text]', 'Visite client Lycée'); await p.click('[data-note-save]'); await p.waitForTimeout(800);
R.j4a = await p.evaluate(() => /heure du rendez-vous/.test((document.querySelector('.m3d-toast') || {}).textContent || '') && !window.PROTO.H.state.DATA.notes.some(x => /Lycée/.test(x.t)));
await p.fill('[data-note-h]', '10:15'); await p.click('[data-note-save]'); await p.waitForTimeout(1800);
R.j4 = await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /Lycée/.test(x.t)); const J = H.state.pod.userData.jour; const hs = J.data.rdv.map(r => r.h); return !!n && n.k === 'rdv' && n.h === '10:15' && !!n.j && hs.length === 4 && hs.join() === hs.slice().sort().join() && J.data.rdv.some(r => r.id === n.id && r.src === 'moi'); });
// j5) clic sur la tâche du tableau (zone) → panneau sur elle ; « ✓ Fait » → cochée, reste listée aujourd'hui
await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /bureau d/.test(x.t)); H.go('note', n.id); }); await p.waitForTimeout(1200);
R.j5a = await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /bureau d/.test(x.t)); return H.state.noteSel === n.id && H.state.vue === 'jour' && !!document.querySelector('[data-note-done]'); });
await p.click('[data-note-done]'); await p.waitForTimeout(1800);
if (process.env.DBG) console.log('j5', JSON.stringify(await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /bureau d/.test(x.t)); return { n, taches: H.state.pod.userData.jour.data.taches, today: H.state.DATA.today }; })));
R.j5 = await p.evaluate(() => { const H = window.PROTO.H; const n = H.state.DATA.notes.find(x => /bureau d/.test(x.t)); const J = H.state.pod.userData.jour; return n.done === true && n.rk === true && J.data.taches.length === 1 && J.data.taches[0].done; });
// j6) les post-its du retour n'ont pas bougé (les 5 notes de démo sont toujours sur le retour, aucune tâche dessus)
R.j6 = await p.evaluate(() => { const H = window.PROTO.H; const onRet = Object.keys(H.state.pod.userData.notes || {}); return onRet.length === 5 && !onRet.some(id => (H.state.DATA.notes.find(n => n.id === id) || {}).k); });
R.j7 = errs.length === 0;
const ko = Object.keys(R).filter(k => !R[k]); console.log(JSON.stringify(R), errs.slice(0, 2)); console.log('RESULTAT:' + (ko.length ? ' ECHEC ' + ko.join(',') : ' TOUT VERT')); await b.close();
