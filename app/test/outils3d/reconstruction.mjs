// OUTIL DE MAQUETTE 3D (hors tests de l'appli) — sert à contrôler la maquette du Monde 3D : npm run build:monde, servir app/dist-monde sur le port 8769, puis node test/outils3d/reconstruction.mjs
// Variables : U (adresse de la maquette), OUT (dossier des captures, défaut ./shots), ONLY, TAG, VW, VH, DEP selon l'outil.
// les règles d'affichage des étiquettes doivent toujours s'appliquer (aucune étiquette métier ni prénom sur la vue d'ensemble)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs'; mkdirSync(process.env.OUT || './shots', { recursive: true });
const U = process.env.U || 'http://127.0.0.1:8769/index.html';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(600);
const metier = () => p.evaluate(() => { const L = [...document.querySelectorAll('.m3d-lab')].filter(e => e.style.display !== 'none' && e.offsetParent !== null).map(e => e.textContent.trim()); return { n: L.length, metier: L.filter(t => /cmd|rupture|AB-\d|place libre|prépar|prête|DN |Listes|Livraison/.test(t)).length, noms: L.filter(t => /^(Ethan|Marc|Sophie|Paul)$/.test(t)).length }; });
const say = async n => console.log(n, JSON.stringify(await metier()));
await p.click('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(2500); await say('monde');
for (const k of ['flotte', 'monde', 'visit', 'monde']) { await p.evaluate(k => { const H = window.PROTO.H; if (k === 'visit') H.state.visitId = (window.PROTO.people[1] || {}).id; H.setScene(k); }, k); await p.waitForTimeout(2200); await say('setScene ' + k); }
await p.screenshot({ path: (process.env.OUT || './shots') + '/reconstruction.png' });
console.log('errs', JSON.stringify(errs)); await b.close();
