# scanner DXF minimal (même logique que parseDXF de l'appli) : ENTITIES du modelspace, calques, blocs insérés, textes
import sys, re, collections, time
f=sys.argv[1]; t=time.time()
sec=None; blk=False; cur=None; ents=0
types=collections.Counter(); lay=collections.defaultdict(collections.Counter); ins=collections.Counter(); insl=collections.Counter(); txt=collections.Counter(); attribs=collections.Counter(); blocks=set(); blkents=collections.Counter()
def flush():
    global cur
    if cur is None: return
    if blk:
        blkents[cur['type']]+=1
    else:
        types[cur['type']]+=1; lay[cur['layer']][cur['type']]+=1
        if cur['type']=='INSERT': ins[cur.get('name','?')]+=1; insl[(cur['layer'],cur.get('name','?'))]+=1
        if cur['type'] in ('TEXT','MTEXT'):
            s=re.sub(r'\\[A-Za-z][^;]*;','',cur.get('text','')).replace('{','').replace('}','').replace('\\P',' ').strip()
            if re.search(r'DN|Ø|%%c|\d{2,3}\s*[/x]\s*\d{2,3}|aller|retour|soud|manch|coude|té\b|vanne|purge|reduc',s,re.I): txt[s[:60]]+=1
        if cur['type']=='ATTRIB': attribs[(cur.get('tag','?'),cur.get('text','')[:30])]+=1
    cur=None
with open(f,encoding='utf-8',errors='replace') as fh:
    it=iter(fh)
    for a in it:
        try: b=next(it)
        except StopIteration: break
        code=a.strip(); v=b.rstrip('\n').rstrip('\r')
        if code=='0':
            vv=v.strip()
            if vv=='SECTION': flush(); sec='?'; continue
            if vv=='ENDSEC': flush(); sec=None; blk=False; continue
            if sec=='BLOCKS':
                if vv=='BLOCK': flush(); blk=True; cur=None; continue
                if vv=='ENDBLK': flush(); blk=False; continue
            if sec=='ENTITIES' or (sec=='BLOCKS' and blk):
                flush(); cur={'type':vv,'layer':'0'}
            continue
        if sec=='?' and code=='2': sec=v.strip(); continue
        if cur is None: continue
        if code=='8': cur['layer']=v
        elif code=='2': cur['name']=v.strip() if cur['type']!='ATTRIB' else cur.get('name'); 
        elif code=='1' or code=='3': cur['text']=cur.get('text','')+v
        if cur['type']=='ATTRIB' and code=='2': cur['tag']=v.strip()
flush()
print(f'### {f} — scan {round(time.time()-t)} s | modelspace: {sum(types.values())} entités | dans blocs: {sum(blkents.values())}')
print('types:',dict(types.most_common(14)))
print(f'\n== calques réseau ({len(lay)} au total) ==')
for k in sorted(lay):
    if re.search(r'rcu|projet|trac|chauff|calep|logstor|renalia|axiom|inpal|aller|retour|sst|vanne|purge|vidange|soud|manch|coude|té\b|reduc|canalis|conduite|axe|reseau|réseau|présentation|presentation|isol|tube|dn|iso',k,re.I):
        print(f'  {sum(lay[k].values()):6d} {k:62s} {dict(lay[k].most_common(5))}')
print('\n== top 20 calques ==')
for k,c in sorted(lay.items(),key=lambda x:-sum(x[1].values()))[:20]: print(f'  {sum(c.values()):6d} {k:62s} {dict(c.most_common(4))}')
print(f'\n== blocs insérés nommés (top 50 sur {len(ins)}) ==')
for k,v in [x for x in ins.most_common() if not x[0].startswith('*')][:50]: print(f'  {v:6d} {k}')
print(f'\n== textes techniques (top 40 sur {len(txt)}) ==')
for k,v in txt.most_common(40): print(f'  {v:5d} {k}')
if attribs:
    print(f'\n== ATTRIB (tag,valeur) top 30 ==')
    for k,v in attribs.most_common(30): print(f'  {v:5d} {k}')
