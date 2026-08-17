import ezdxf, collections, re, sys, time
from ezdxf import recover
f=sys.argv[1]; t=time.time()
doc,aud=recover.readfile(f); msp=doc.modelspace(); print('recover: erreurs',len(aud.errors),'corrigées',len(aud.fixes))
print(f'### {f} — lu en {round(time.time()-t)} s | {doc.dxfversion} | INSUNITS={doc.header.get("$INSUNITS")}')
types=collections.Counter(e.dxftype() for e in msp); print('entités:',sum(types.values()),dict(types.most_common(12)))
lay=collections.defaultdict(collections.Counter)
for e in msp: lay[e.dxf.layer][e.dxftype()]+=1
print(f'\n== {len(lay)} calques (tous ceux qui semblent réseau, + top 25) ==')
shown=set()
for k in sorted(lay):
    if re.search(r'rcu|projet|trac|chauff|calep|logstor|renalia|aller|retour|sst|vanne|purge|vidange|soud|manch|coude|té\b|reduc|canalis|conduite|axe|reseau|réseau|présentation|presentation|isol|tube|dn',k,re.I):
        print(f'  {sum(lay[k].values()):6d} {k:60s} {dict(lay[k].most_common(5))}'); shown.add(k)
print('  -- top 25 restants --')
for k,c in sorted(lay.items(),key=lambda x:-sum(x[1].values()))[:25]:
    if k not in shown: print(f'  {sum(c.values()):6d} {k:60s} {dict(c.most_common(4))}')
ins=collections.Counter(e.dxf.name for e in msp if e.dxftype()=='INSERT')
print(f'\n== {len(ins)} noms de blocs (top 60) ==')
for k,v in ins.most_common(60): print(f'  {v:6d} {k}')
txt=collections.Counter()
for e in msp:
    if e.dxftype() in ('TEXT','MTEXT'):
        s=e.dxf.text if e.dxftype()=='TEXT' else e.text
        s=re.sub(r'\\[A-Za-z][^;]*;','',s).replace('{','').replace('}','').strip()
        if re.search(r'DN|Ø|%%c|\d{2,3}\s*/\s*\d{2,3}|aller|retour|soud|manch',s,re.I): txt[s[:50]]+=1
print(f'\n== textes techniques (top 40 sur {len(txt)}) ==')
for k,v in txt.most_common(40): print(f'  {v:5d} {k}')
