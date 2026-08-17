# Filtre un DXF ASCII (sortie LibreDWG) : garde HEADER, TABLES, les ENTITIES du modelspace dont le calque matche RE, et les BLOCKS référencés (transitivement). Sortie compacte pour tests dans l'appli.
import sys, re
src, dst, layer_re = sys.argv[1], sys.argv[2], re.compile(sys.argv[3], re.I)
KEEP_TYPES={'LWPOLYLINE','POLYLINE','VERTEX','SEQEND','LINE','INSERT','ATTRIB','TEXT','MTEXT','DIMENSION','ARC','CIRCLE'}
def pairs(fh):
    it=iter(fh)
    for a in it:
        b=next(it,None)
        if b is None: return
        yield a.strip(), b.rstrip('\r\n')
# passe 1 : entités du modelspace à garder → noms de blocs référencés ; blocs → sous-blocs
sec=None; blk=None; cur=None; used=set(); blockrefs={}; ent_layer=None
def scan():
    global sec,blk,cur
    with open(src,encoding='utf-8',errors='replace') as fh:
        cur=None; ename=None; elayer='0'; etype=None; in_ent=False; group=None; groups=[]
        for code,v in pairs(fh):
            if code=='0':
                vv=v.strip()
                if in_ent and etype=='INSERT' and ename:
                    if sec=='ENTITIES' and layer_re.search(elayer): used.add(ename)
                    if sec=='BLOCKS' and blk: blockrefs.setdefault(blk,set()).add(ename)
                in_ent=False; etype=None; ename=None; elayer='0'
                if vv=='SECTION': sec='?'; continue
                if vv=='ENDSEC': sec=None; blk=None; continue
                if sec=='BLOCKS' and vv=='BLOCK': blk='?'; continue
                if sec=='BLOCKS' and vv=='ENDBLK': blk=None; continue
                if sec=='ENTITIES' or (sec=='BLOCKS' and blk): in_ent=True; etype=vv
                continue
            if sec=='?' and code=='2': sec=v.strip(); continue
            if sec=='BLOCKS' and blk=='?' and not in_ent and code=='2': blk=v.strip(); continue
            if in_ent:
                if code=='8': elayer=v
                elif code=='2' and etype=='INSERT': ename=v.strip()
scan()
grow=True
while grow:
    grow=False
    for b in list(used):
        for s in blockrefs.get(b,()):
            if s not in used: used.add(s); grow=True
# passe 2 : écriture
out=open(dst,'w',encoding='utf-8',newline='\n')
def w(code,v): out.write(f'{code}\n{v}\n')
sec=None; blk=None; keep_blk=False; in_ent=False; etype=None; ebuf=[]; ekeep=False; skip_ent=False
poly_keep=False
with open(src,encoding='utf-8',errors='replace') as fh:
    for code,v in pairs(fh):
        if code=='0':
            vv=v.strip()
            # flush entité précédente
            if in_ent:
                if ekeep:
                    for c,x in ebuf: w(c,x)
                in_ent=False; ebuf=[]; ekeep=False
            if vv=='SECTION': sec='?'; w(0,'SECTION'); continue
            if vv=='ENDSEC': sec=None; blk=None; w(0,'ENDSEC'); continue
            if vv=='EOF': w(0,'EOF'); continue
            if sec=='BLOCKS':
                if vv=='BLOCK': blk='?'; keep_blk=None; ebuf=[(0,'BLOCK')]; in_ent=True; ekeep=False; etype='BLOCK'; continue
                if vv=='ENDBLK':
                    if keep_blk: w(0,'ENDBLK')
                    blk=None; in_ent=True; ekeep=False; ebuf=[]; etype='ENDBLK'; 
                    # ENDBLK a des sous-tags (5,330,100…) : on les garde si le bloc est gardé
                    ekeep=bool(keep_blk); ebuf=[] ; continue
                if blk: in_ent=True; etype=vv; ebuf=[(0,vv)]; ekeep=bool(keep_blk) and vv in KEEP_TYPES; continue
            if sec=='ENTITIES':
                in_ent=True; etype=vv; ebuf=[(0,vv)]; ekeep=(vv in KEEP_TYPES); 
                if vv in ('VERTEX','SEQEND'): ekeep=poly_keep
                continue
            if sec in ('HEADER','CLASSES','TABLES','OBJECTS') or sec=='?': w(0,vv); continue
            continue
        if sec=='?' and code=='2': sec=v.strip(); w(2,v); continue
        if sec=='BLOCKS' and blk=='?' and etype=='BLOCK' and code=='2':
            blk=v.strip(); keep_blk=(blk in used) or blk.startswith('*Model_Space') or blk.startswith('*Paper_Space')
            ebuf.append((code,v)); ekeep=keep_blk; continue
        if in_ent:
            ebuf.append((code,v))
            if sec=='ENTITIES' and code=='8' and etype not in ('VERTEX','SEQEND'):
                lay=v; ok=bool(layer_re.search(lay)); ekeep=ekeep and ok
                if etype=='POLYLINE': poly_keep=ok
            continue
        if sec in ('HEADER','CLASSES','TABLES','OBJECTS'): w(code,v)
out.close()
print('ok', dst, 'blocs gardés', len(used))
