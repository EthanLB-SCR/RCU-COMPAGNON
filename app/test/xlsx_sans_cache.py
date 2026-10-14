# Copie d'un .xlsx sans les valeurs en cache des formules (LibreOffice est alors forcé de tout recalculer) — tests du DPGF (lot C, 14/10).
import re, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
zi = zipfile.ZipFile(src); zo = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for n in zi.namelist():
    d = zi.read(n)
    if n.startswith('xl/worksheets/sheet'):
        d = re.sub(rb'(<f[^>]*/>|<f[^>]*>[^<]*</f>)<v>[^<]*</v>', rb'\1', d)
    zo.writestr(n, d)
zo.close()
