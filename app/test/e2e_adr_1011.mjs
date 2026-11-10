// 10/11 (Ethan : « quand on cale un chantier, l'adresse écrite est blanc sur blanc ») : les champs posés dans les bandeaux sombres du plan
// (calage : adresse ; transfert : n° de soudure) doivent avoir un texte sombre sur fond blanc, quoi qu'hérite le bandeau.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:8766';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
const R = {};
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g) || [0, 0, 0]; return (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255; };
for (const [k, id] of [['c1', 'cgAddr'], ['c2', 'tfNum']]) {
  const st = await p.evaluate(id => { const e = document.getElementById(id); if (!e) return null; const bar = e.closest('div[id$="Bar"]'); bar.style.display = 'flex'; e.parentElement.style.display = 'flex'; const s = getComputedStyle(e); return { color: s.color, bg: s.backgroundColor }; }, id);
  R[k] = !!st && lum(st.color) < 0.35 && lum(st.bg) > 0.8; console.log(id, JSON.stringify(st), R[k] ? 'ok' : 'KO');
}
const ko = Object.keys(R).filter(k => !R[k]); console.log('RESULTAT:' + (ko.length ? ' ECHEC ' + ko.join(',') : ' TOUT VERT')); await b.close();
