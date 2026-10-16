// Clés des composantes du DPGF (lot C3, 16/10 après-midi) : un lien enregistre désormais une clé STABLE « z:<id de la zone>|poste|… » (avant : « z0|… », le rang
// de la zone). Les suites écrites avant ce lot gardent leurs clés lisibles « z0|soudure|dn100 » et passent par ces deux fonctions :
//   K('z0|soudure|dn100') → la clé stable d'aujourd'hui (sélecteurs data-k, clics) ;  U(texte) → les clés stables réécrites « z0|… » (comparer ce qui est enregistré).
export async function cles(page,num){const ids=await page.evaluate(n=>((window.TRACE.affaires.get(n).chiffrage||{}).etudes||[]).map(z=>z.id),num);
  const K=k=>String(k).replace(/^z(\d+)\|/,(m,i)=>ids[+i]?'z:'+ids[+i]+'|':m);
  const U=s=>String(s).replace(/z:([^|"\s,+=#]+)\|/g,(m,id)=>{const i=ids.indexOf(id);return i>=0?'z'+i+'|':m;});
  /* un sélecteur qui contient data-k="z0|…" */const KS=sel=>String(sel).replace(/data-k="(z\d+\|[^"]*)"/g,(m,k)=>'data-k="'+K(k)+'"');
  return {ids,K,U,KS};}
