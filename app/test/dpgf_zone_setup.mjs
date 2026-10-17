// Mise en place commune à e2e_dpgf_zone.mjs et make_fixture_dpgfzone_avant.mjs (lot DZ, 17/10) — données 100 % FICTIVES : base de prix test/fixture_prix.xlsx,
// DPGF test/fixture_dpgf_suivi.xlsx ; 3 zones aux noms fictifs : Secteur Alpha (DN 100 : 60 soud., 600 ml ; DN 80 : 20 soud., 300 ml), Secteur Bêta (DN 65 :
// 100 soud., 250 ml), Secteur Gamma (DN 50 : 20 soud., 150 ml) ; onglet Installations : WC, conteneur, pelle (2 A/R) du 02/11 au 27/11/2026, amené / repli × 2, DOE ;
// ventilées AUX JOURS D'ÉQUIPE (Bêta a peu de ml mais beaucoup de soudures : sa part n'a rien à voir avec ses ml).
// setupZoneAffaire : l'affaire, la base, le DPGF importé ; avec opt.chiffrage = false, le chiffrage n'est pas saisi (la suite reprend celui de la fixture).
import fs from 'fs';import path from 'path';
export const NUM='O2610-91';
export const ZONES=[['Secteur Alpha (essai)',[[100,60,600],[80,20,300]]],['Secteur Bêta (essai)',[[65,100,250]]],['Secteur Gamma (essai)',[[50,20,150]]]];
export async function setupZoneAffaire(page,url,HERE,opt){opt=opt||{};const wait=ms=>page.waitForTimeout(ms);
  const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
  const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
  const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
  await page.goto(url);await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1200);
  {const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
  await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
    document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Installations par zone (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
  await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
  if(opt.chiffrage!==false){
    const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
    for(const [nom,rows] of ZONES){await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]',nom);for(let i=0;i<rows.length;i++)await dnRow(i,...rows[i]);}
    await click('chview|inst');await chg('#eq-app [data-afx="inst§on"]',true);await chg('#eq-app [data-afx="inst§d0"]','2026-11-02');await chg('#eq-app [data-afx="inst§d1"]','2026-11-27');
    await chg('#eq-app [data-afx="inst§items.wc.on"]',true);await chg('#eq-app [data-afx="inst§items.contener.on"]',true);await chg('#eq-app [data-afx="inst§items.pelle.on"]',true);await chg('#eq-app [data-afx="inst§items.pelle.ar"]','2');
    await chg('#eq-app [data-afx="inst§arMO"]',true);await chg('#eq-app [data-afx="inst§arMOQty"]','2');
    await chg('#eq-app [data-afx="inst§doe"]',true);await chg('#eq-app [data-afx="inst§ventil"]','mo');}
  await click('tab|dpgf');
  const ORIG=fs.readFileSync(path.join(HERE,'fixture_dpgf_suivi.xlsx'));
  await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot05_zones.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:ORIG});
  await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600); /* le message « DPGF lue » s'efface */
  return {chg,click,td,A,NUM,ORIG,wait};}
