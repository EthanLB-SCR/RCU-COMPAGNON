// Mise en place commune à e2e_dpgf_clair.mjs et make_fixture_dpgfclair_avant.mjs (lot C2, 16/10) — données FICTIVES : base de prix test/fixture_prix.xlsx,
// zone 1 : DN 100 (120 soud., 600 ml), DN 80 (50, 300), DN 50 (30, 200), purges DN 32 × 3, chantier (benne, WC, amené / repli × 2), autocontrôle : dépression,
// itopo, pression (5 + 2 + 3 min par manchon dans la base fictive) ; zone 2 : DN 50 (20, 150), DN 40 (12, 60), sans autocontrôle ; DPGF test/fixture_dpgf_clair.xlsx.
import fs from 'fs';import path from 'path';
export const NUM='O2610-93';
export async function setupAffaire(page,url,HERE){const wait=ms=>page.waitForTimeout(ms);
  const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
  const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
  const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
  await page.goto(url);await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1200);
  {const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
  await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
    document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='DPGF plus clair (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
  await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
  const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
  const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
  await click('chetudeadd|');await dnRow(0,100,120,600);await dnRow(1,80,50,300);await dnRow(2,50,30,200);
  await unfold('purges');await chg('#eq-app [data-afx="e§purges.dn"]','32');await chg('#eq-app [data-afx="e§purges.paires"]','3');
  await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-20');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
  await chg('#eq-app [data-afx="e§chantier.arMO"]',true);await chg('#eq-app [data-afx="e§chantier.arMOQty"]','2');
  await unfold('eq');for(const t of ['depression','itopo','pression'])await chg(`#eq-app [data-afx="e§eq.ctrl.${t}"]`,true);
  await click('chetudeadd|');await dnRow(0,50,20,150);await dnRow(1,40,12,60);
  await click('tab|dpgf');
  const ORIG=fs.readFileSync(path.join(HERE,'fixture_dpgf_clair.xlsx'));
  await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot04_clair.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:ORIG});
  await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600); /* le message « DPGF lue » s'efface */
  return {chg,click,td,A,NUM,unfold,ORIG,wait};}
