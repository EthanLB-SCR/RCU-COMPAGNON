#!/usr/bin/env python3
# make_fixture_prix.py — génère test/fixture_prix.xlsx : une MAQUETTE SYNTHÉTIQUE du classeur de chiffrage SCR (mêmes feuilles, mêmes tables nommées,
# mêmes blocs de Base Opération, mêmes noms FO_*) avec des PRIX FICTIFS et ronds. Sert aux tests (e2e_commerce2) : le vrai classeur et les vrais prix
# ne sont jamais dans le dépôt. Les formules sont écrites comme dans le vrai classeur (heures = k × heures/jour ÷ cadence ; fournitures = k × VLOOKUP(DN, FO_Table[], col)).
# python3 test/make_fixture_prix.py  →  test/fixture_prix.xlsx
import os, datetime
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.workbook.defined_name import DefinedName

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixture_prix.xlsx')
wb = Workbook()
DNS = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600]
POUCE = {20: 1, 25: 1, 32: 1.25, 40: 1.5, 50: 2, 65: 2.5, 80: 3, 100: 4, 125: 5, 150: 6, 200: 8, 250: 10, 300: 12, 350: 14, 400: 16, 450: 18, 500: 20, 600: 24}

# ───────────────────────── Base MO ─────────────────────────
mo = wb.active; mo.title = 'Base MO'
mo['A1'] = "BASE MAIN D'ŒUVRE (MAQUETTE DE TEST — PRIX FICTIFS)"
mo['A3'] = 'TAUX HORAIRES PAR POSTE'; mo['F3'] = 'PARAMÈTRES GÉNÉRAUX'
for c, h in enumerate(['Poste', 'Taux SCR', 'FG Chantier', 'FG Structure', 'Sinistre', 'Total /h', 'Heures /jour', 'Total /jour'], 1): mo.cell(4, c, h)
POSTES = [('Soudeur', 70, 5, 20, 5), ('Tuyauteur', 60, 5, 20, 5), ('Manchonneur', 50, 5, 20, 5), ("Chauffeur d'engin", 55, 5, 20, 5), ('Opérations Spécifiques (OS)', 70, 5, 20, 5)]
for i, (p, t, fc, fs, s) in enumerate(POSTES):
    r = 5 + i; tot = t + fc + fs + s
    for c, v in enumerate([p, t, fc, fs, s, tot, 10, tot * 10], 1): mo.cell(r, c, v)
# → S = 100 €/h, T = 90, M = 80, P = 85, OS = 100 ; S+T = 190 ; S+T+P = 275 ; M+M = 160 ; journée = 10 h
mo['A11'] = 'COMPOSITION ÉQUIPES TYPE'
for c, h in enumerate(['Équipe', 'Soudeur', 'Tuyauteur', 'Manchonneur', 'Chauffeur', 'Nb pers', 'Coût /jour', 'Coût /h'], 1): mo.cell(12, c, h)
EQ = [('Soudeur (S)', 1, 0, 0, 0, 1, 1000, 100), ('Soudeur + Tuyauteur (S+T)', 1, 1, 0, 0, 2, 1900, 190), ('Soudeur + Tuyauteur + Chauffeur (S+T+P)', 1, 1, 0, 1, 3, 2750, 275),
      ('Manchonneur (M)', 0, 0, 1, 0, 1, 800, 80), ('Manchonneurs x 2 (M +M)', 0, 0, 2, 0, 2, 1600, 160), ('Opérations Spécifiques (OS)', 0, 0, 0, 0, 1, 1000, 100), ('OS x 2', 0, 0, 0, 0, 2, 2000, 200), ('OS x 3', 0, 0, 0, 0, 3, 3000, 300)]
for i, row in enumerate(EQ):
    for c, v in enumerate(row, 1): mo.cell(13 + i, c, v)
mo['A22'] = 'CADENCES & COÛTS MO PAR SOUDURE / ML'
H23 = ['DN', 'Pouce', 'Cadence/jour\n1 soudeur', 'Cadence/jour\nSoud+Tuy', 'Cadence/jour\nSoud+Tuy+Chauff', 'MO / soudure\n1 soudeur', 'MO / soudure\nSoud+Tuy', 'MO / soudure\nSoud+Tuy+Chauff'] + \
      ['Cadence/jour\n2 manchonneurs', 'Cadence/jour\n1 manchonneur'] * 6 + ['Dépression\nmin / manchon', 'Fils DH\nmin / manchon', 'Ressuage\nmin / manchon', 'Itopo\nmin / manchon', 'Pression\nmin / manchon', 'Pose coussin\nmin / coussin']
for c, h in enumerate(H23, 1): mo.cell(23, c, h)
# cadences rondes : 1 soudeur = 40/pouce… → DN100 : S 5/j, S+T 10/j, S+T+P 10/j ; manchons thermo iso1 : 2 manch. 20/j, 1 manch. 10/j (toutes iso, électro = −2)
for i, dn in enumerate(DNS):
    r = 24 + i; p = POUCE[dn]; cS = max(1, round(20 / p)); cST = max(1, round(40 / p)); cSTP = max(1, round(40 / p))
    m2 = max(2, round(40 / p)); m1 = max(1, round(20 / p))
    row = [dn, p, cS, cST, cSTP, 1000 / cS, 1900 / cST, 2750 / cSTP, m2, m1, m2, m1, m2, m1, max(1, m2 - 2), max(1, m1 - 1), max(1, m2 - 2), max(1, m1 - 1), max(1, m2 - 2), max(1, m1 - 1), 5, 3, 2, 2, 3]
    if i == 0: row.append(2)  # pose coussin : 2 min
    for c, v in enumerate(row, 1): mo.cell(r, c, v)
mo['A43'] = 'TRAVAUX DE NUIT — Surcoût par poste'
mo['A62'] = 'MO DOE / DOCUMENTS / DIVERS'
for c, h in enumerate(['Désignation', 'Montant', 'Unité'], 1): mo.cell(64, c, h)
for i, (l, v) in enumerate([('Établissement DOE', 500), ('Établissement Carnet soudures', 1000), ('Plan isométrique par SCR', 800)]):
    mo.cell(65 + i, 1, l); mo.cell(65 + i, 2, v); mo.cell(65 + i, 3, 'forfait')

# ───────────────────────── Base FO ─────────────────────────
fo = wb.create_sheet('Base FO')
fo['A1'] = 'BASE FOURNITURE — PRIX UNITAIRES ACHAT (MAQUETTE DE TEST)'; fo['A2'] = 'Mise à jour : test — V99'
R = 4
def table(name, title, cols, rows):
    global R
    fo.cell(R, 1, title); R += 2; r0 = R
    for c, h in enumerate(cols, 1): fo.cell(R, c, h)
    for row in rows:
        R += 1
        for c, v in enumerate(row, 1): fo.cell(R, c, v)
    ref = 'A%d:%s%d' % (r0, chr(64 + len(cols)), R)
    t = Table(displayName=name, ref=ref); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True); fo.add_table(t)
    R += 2
VS = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 500]
table('FO_Vannes_Souder', '1. VANNES À SOUDER', ['DN', 'Vanne BS PI PN25 sans réducteur', 'Vanne BS PI PN25 avec réducteur', 'Vanne BS PR PN25', 'Vanne BS BW/F PN25', 'Vanne BS PEC PN25', 'Vanne BS PI PN40 sans réducteur'],
      [[dn, 10 + dn, 20 + dn, 30 + dn, 40 + dn, 50 + dn, 60 + dn] for dn in VS])
table('FO_Vannes_Brides_PN16_PN25_PN40', '2. VANNES LUG / BRIDES / BOULONS', ['DN', 'Vanne Lug PN16', 'Bride PN16', 'Boulons PN16 (lot)', 'Vanne Lug PN25', 'Bride PN25', 'Boulons PN25 (lot)', 'Vanne Lug PN40', 'Bride PN40', 'Joints + Boulons PN40 (lot)', 'Joints (lot, déduit)'],
      [[dn, 100 + dn, 10 + dn / 10, 5, 150 + dn, 12 + dn / 10, 6, 200 + dn, 15 + dn / 10, 8, 2] for dn in VS[:13]])
table('FO_Vannes_BS_Brides', '3. VANNES BS BRIDES / BOULONS', ['DN', 'Vanne BS Bride PN40', 'Bride PN40', 'Boulons PN40 (lot)', 'Vanne BS Bride PN25', 'Bride PN25', 'Boulons PN25 (lot)', 'Joints (lot, déduit)'],
      [[dn, 120 + dn, 15 + dn / 10, 8, 110 + dn, 12 + dn / 10, 6, 2] for dn in VS[:12]])
table('FO_Accessoires_Acier', '4. ACCESSOIRES ACIER', ['DN', 'Bobines', 'Coudes à visser', 'Bouchon F', 'Raccord sym. M', 'Raccord sym. F', 'Bouchons pompier', 'Tubes acier 6ml', 'Coudes à souder', 'Fonds bombés', 'Boulet mousse', 'Renfort PEC (selle)', 'Brides PN25'],
      [[dn, 2 + dn / 10, 1 + dn / 10, 1 + dn / 20, 3, 3, 4, 10 + dn, 2 + dn / 10, 5 + dn / 10, 20 + dn / 5, 10 + dn / 10, 8 + dn / 10] for dn in VS])
table('FO_Colliers_Centreurs', '5. COLLIERS CENTREURS', ['DN Isolation', 'Nb segments par collier', 'Prix unitaire segment'],
      [[d, 2 if d < 200 else 3 if d < 400 else 4, 12] for d in [90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800]])
ISO = {20: (90, 110, 125), 25: (90, 110, 125), 32: (110, 125, 140), 40: (110, 125, 140), 50: (125, 140, 160), 65: (140, 160, 180), 80: (160, 180, 200), 100: (200, 225, 250), 125: (225, 250, 280), 150: (250, 280, 315), 200: (315, 355, 400), 250: (400, 450, 500), 300: (450, 500, 560), 350: (500, 560, 630), 400: (560, 630, 710), 450: (630, 710, 800), 500: (710, 800, 900), 600: (800, 900, 1000)}
import math
table('FO_Isolation', '6. ISOLATION (diamètres extérieurs)', ['DN Acier', 'Ø ISO 1', 'Ø ISO 2', 'Ø ISO 3', 'Poids kg/ml', 'Volume/ml Iso 1', 'Volume/ml Iso 2', 'Volume/ml Iso 3', 'Ø intérieur (mm)', 'Nb coupes / jour (en 5 ml)'],
      [[dn, ISO[dn][0], ISO[dn][1], ISO[dn][2], round(dn / 10, 1), round(math.pi * (ISO[dn][0] / 2000) ** 2, 5), round(math.pi * (ISO[dn][1] / 2000) ** 2, 5), round(math.pi * (ISO[dn][2] / 2000) ** 2, 5), dn, 48 if dn <= 100 else 24] for dn in DNS])
table('FO_Forfaits_Distance', '7b. FORFAITS PAR DISTANCE', ['Poste', '0-100 km', '100-150 km', '150-200 km', '200-300 km', '300-500 km', '> 500 km (€/km supp)'],
      [['Mob/Démob Radio', 1000, 1200, 1500, 2000, 3000, 5], ['Mob/Démob Ultrasons', 800, 1000, 1200, 1600, 2400, 4], ['Mob/Démob Ressuage', 600, 800, 1000, 1300, 2000, 3]])
table('FO_Prix_Films', '7c. PRIX PAR FILM / CONTRÔLE (par tranche DN)', ['Tranche DN', 'Radio', 'Ultrasons', 'Ressuage', 'DN min', 'DN max'],
      [['DN 15 à 65', 50, 40, 30, 15, 65], ['DN 80 à 200', 100, 80, 60, 80, 200], ['DN 250 à 400', 150, 120, 90, 250, 400], ['DN 450 à 600', 200, 160, 120, 450, 600]])
table('FO_Supportage', '8. SUPPORTAGE', ['Type de support', 'Fourniture', 'MO (h / support)', "Prix de vente d'un support"], [['Suspendu', 50, 1, 150], ['Mural', 60, 1.5, 210], ['IPN Vertical', 120, 2, 320], ['H avec pied', 150, 2, 350]])
table('FO_Calorifugeage', '9. CALORIFUGEAGE', ['DN', 'Ø ext.', 'Fourn. droite Laine (€/ml)', 'Fourn. droite PVC (€/ml)', 'Fourn. droite Isoxal (€/ml)', 'Fourn. coude Laine (€/u)', 'Fourn. coude PVC (€/u)', 'Fourn. coude Isoxal (€/u)', 'MO droite PVC (h/ml)', 'MO droite Isoxal (h/ml)', 'MO coude PVC (h/u)', 'MO coude Isoxal (h/u)'],
      [[dn, dn + 100, 10 + dn / 10, 5 + dn / 10, 8 + dn / 10, 20 + dn / 5, 10 + dn / 5, 15 + dn / 5, 0.2, 0.3, 0.5, 0.7] for dn in [40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 400]])
table('FO_Taux_RCFA', '14. RCFA PAR CLIENT', ['Client', 'Taux RCFA'], [['CORIANCE', 0.05], ['ENGIE', 0.04], ['DALKIA', 0.03], ['IDEX', 0], ['EHTP', 0.01], ['AUTRE', 0]])
# paramètres nommés FO_* (une cellule chacun)
fo.cell(R, 1, '20. PARAMÈTRES'); R += 2
PARAMS = [('FO_AR_Benne_Contener_WC', 150), ('FO_AR_Pelle', 300), ('FO_Abattement_Pelle_Gros_Chantier', 0.2), ('FO_Adoucisseur_15', 800), ('FO_Adoucisseur_5', 500), ('FO_Amene_Repli_Equipe', 1000), ('FO_Boitier_Plexo', 10), ('FO_Boulet_Compresseur_Type_1', 200), ('FO_Boulet_Compresseur_Type_2', 300), ('FO_Boulet_Compresseur_Type_3', 400),
          ('FO_Boulet_Duree_Location_Compresseur', 2), ('FO_Boulet_Duree_Location_Pelle', 4), ('FO_Boulet_Location_Pelle_h', 60), ('FO_Boulet_MO_AR_Compresseur_Pers', 1), ('FO_Boulet_MO_AR_Compresseur_h', 2), ('FO_Boulet_MO_Extremites_Pers', 2), ('FO_Boulet_MO_Extremites_h', 2), ('FO_Boulet_MO_Piston_Pers', 2), ('FO_Boulet_MO_Piston_h', 1), ('FO_Boulet_MO_Poussee_Pers', 2), ('FO_Boulet_MO_Poussee_h', 2), ('FO_Boulet_MO_Retrait_Pers', 2), ('FO_Boulet_MO_Retrait_h', 1),
          ('FO_Boulet_Nb_Bobines', 2), ('FO_Boulet_Nb_Boulets', 2), ('FO_Boulet_Nb_Fonds_Bombes', 2), ('FO_Boulet_Nb_Tetes_Chat', 1), ('FO_Boulet_Nb_Vannes_BS_PR', 2), ('FO_Boulet_Prix_Tete_Chat', 50), ('FO_Calo_Nb_Pers_Deplacement', 2), ('FO_Camion_Plateau', 40), ('FO_Conservation_Circulation', 0.5), ('FO_Conservation_Dechets', 200), ('FO_Conservation_Dosage', 1), ('FO_Conservation_Produit', 10), ('FO_Conservation_Remplissage', 0.5), ('FO_Conservation_Vidange', 0.5),
          ('FO_Cout_Journee_Benne', 20), ('FO_Cout_Journee_Contener', 10), ('FO_Cout_Journee_Pelle', 200), ('FO_Cout_Journee_WC', 5), ('FO_DN_Accessoires_Injection', 20), ('FO_Dechets_DIB_Tonne', 100), ('FO_Depose_Arrondi_Prix_MO', 500), ('FO_Depose_Espacement_Coupes', 5), ('FO_Depose_Volume_Rotation', 8), ('FO_EauAdoucie_Eau_m3', 5), ('FO_EauAdoucie_Flexible', 100), ('FO_EauAdoucie_Mise_En_Service', 2), ('FO_EauAdoucie_Sel', 2), ('FO_EauAdoucie_Soude', 3),
          ('FO_Epreuve_Debit_Poteau', 30), ('FO_Epreuve_Eau_m3', 5), ('FO_Epreuve_Hydrocureur_h', 150), ('FO_Epreuve_MO_Decompression', 1), ('FO_Epreuve_MO_Montee_Pression', 2), ('FO_Epreuve_Mise_En_Place', 2), ('FO_Epreuve_Plafond_Duree', 10), ('FO_Epreuve_Pompe', 100), ('FO_Epreuve_Rapport', 100), ('FO_Etiquette_Marquage', 10), ('FO_Foncage_Colliers_Sup', 2), ('FO_Foncage_Espacement_Colliers', 1.5), ('FO_Foncage_Nb_Films_Vacation', 4), ('FO_Foncage_Nb_Obturateurs', 2), ('FO_Foncage_Nb_Tubes', 2), ('FO_Foncage_Prix_Obturateur', 100), ('FO_Foncage_Ratio_Segments_h', 10), ('FO_Foncage_Transport_Colliers', 200),
          ('FO_Groupe_Transfo_Jour', 100), ('FO_Heures_Par_Jour', 10), ('FO_Journee_Pelle_Complete', 2000), ('FO_MO_Pose_Boitiers', 0.5), ('FO_Nb_Boitiers_Par_Vanne', 2), ('FO_Nb_Remplissages', 2), ('FO_Passivation_Circulation', 0.5), ('FO_Passivation_Dechets', 200), ('FO_Passivation_Dosage', 1), ('FO_Passivation_Produit', 10), ('FO_Peinture_Aerien_ml', 5), ('FO_Peinture_SST_Gros_DN', 40), ('FO_Peinture_SST_Petit_DN', 20), ('FO_Peinture_SST_Seuil_DN', 100), ('FO_Petite_Grue', 80), ('FO_Prix_Certificat', 30), ('FO_Purgeur_Auto', 200), ('FO_Rallonge_Vanne_Preisolee', 50), ('FO_Ratio_Dechets', 0.05),
          ('FO_Rincage_Amortissement_SKID', 200), ('FO_Rincage_Chasse', 0.5), ('FO_Rincage_Circulation', 1), ('FO_Rincage_Coefficient_Chasse', 2), ('FO_Rincage_Dechets', 200), ('FO_Rincage_Eau_m3', 5), ('FO_Rincage_Filtration', 0.5), ('FO_Rincage_MO_Installation', 2), ('FO_Rincage_Rapport', 100), ('FO_Rincage_Repli', 1), ('FO_Rincage_Transport_SKID', 300), ('FO_Seuil_Volume_Compresseur_1', 50), ('FO_Seuil_Volume_Compresseur_2', 150), ('FO_Support_Espacement_Gros_DN', 2), ('FO_Support_Espacement_Petit_DN', 3), ('FO_Support_Seuil_DN', 125), ('FO_Te_Acier', 10), ('FO_Transport_Fournitures', 100), ('FO_Volume_Reference_Ratios', 30)]
for n, v in PARAMS:
    fo.cell(R, 1, n.replace('FO_', '').replace('_', ' ')); fo.cell(R, 2, v)
    dn = DefinedName(n, attr_text="'Base FO'!$B$%d" % R); wb.defined_names[n] = dn; R += 1
R += 2
fo.cell(R, 1, '21. LISTE PIÈCES — PANIER SUR MESURE'); R += 2
for c, h in enumerate(['Pièce', 'Col. fourniture', 'Col. MO\n(pièces préparées)'], 1): fo.cell(R, c, h)
for i, (p, c) in enumerate([('Bobines', 2), ('Coudes à visser', 3), ('Bouchon F', 4), ('Tubes acier 6ml', 8), ('Coudes à souder', 9), ('Fonds bombés', 10)]):
    fo.cell(R + 1 + i, 1, p); fo.cell(R + 1 + i, 2, c)

# ───────────────────────── Base Opération ─────────────────────────
op = wb.create_sheet('Base Opération')
op['A1'] = 'BASE OPÉRATION — PANIERS (MAQUETTE DE TEST)'
op['A3'] = 'RÉFÉRENCE ÉQUIPES'
for c, h in enumerate(['Code', 'Nb pers', 'Taux horaire'], 1): op.cell(5, c, h)
for i, (k, n, t) in enumerate([('S', 1, 100), ('S+T', 2, 190), ('S+T+P', 3, 275), ('M', 1, 80), ('M+M', 2, 160), ('OS', 1, 100), ('OS+OS', 2, 200), ('OS+OS+OS', 3, 300)]):
    op.cell(6 + i, 1, k); op.cell(6 + i, 2, n); op.cell(6 + i, 3, t)
r = 15
def hf(k, col, row): return "=%d*'Base MO'!$G$5/VLOOKUP(A%d,'Base MO'!$A$24:$F$41,%d,FALSE)" % (k, row, col)
def vl(k, tbl, col, row): return ('=%d*' % k if k != 1 else '=') + 'VLOOKUP(A%d,%s[],%d,FALSE)' % (row, tbl, col)
def block(title, header, rows, groups=None):
    """rows : liste de listes (valeurs ou formules) ; groups : libellés de groupe au-dessus de l'en-tête"""
    global r
    op.cell(r, 1, title); r += 2
    if groups:
        for c, g in enumerate(groups, 1):
            if g: op.cell(r, c, g)
        r += 1
    for c, h in enumerate(header, 1): op.cell(r, c, h)
    hr = r
    for row in rows:
        r += 1
        for c, v in enumerate(row, 1):
            if callable(v): v = v(r)
            if v is not None: op.cell(r, c, v)
    r += 2
    return hr
PAN_DN = [20, 25, 32, 40, 50, 65, 80, 100]
block('PURGE', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Vanne ×2', 'Bobine', 'Coude ×4', 'Bouchon ×2', 'Bande grasse', 'Peinture', 'Purgeur auto ×2', 'Tés acier', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T', lambda rr: hf(2, 3, rr), 190, None, lambda rr: vl(2, 'FO_Vannes_Souder', 4, rr), lambda rr: vl(1, 'FO_Accessoires_Acier', 2, rr), lambda rr: vl(4, 'FO_Accessoires_Acier', 3, rr), lambda rr: vl(2, 'FO_Accessoires_Acier', 4, rr), 50, 25, '=2*FO_Purgeur_Auto', '=FO_Te_Acier', None, None] for dn in PAN_DN])
block('VIDANGE ASPIRATION', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Vanne ×2', 'Bobine', 'Racc. pomp. F ×2', 'Bouch. pomp. ×2', 'Bande grasse', 'Peinture', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T', lambda rr: hf(2, 3, rr), 190, None, lambda rr: vl(2, 'FO_Vannes_Souder', 4, rr), lambda rr: vl(1, 'FO_Accessoires_Acier', 2, rr), lambda rr: vl(2, 'FO_Accessoires_Acier', 6, rr), lambda rr: vl(2, 'FO_Accessoires_Acier', 7, rr), 50, 25, None, None] for dn in PAN_DN])
block('VIDANGE GRAVITÉ', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Coude souder ×2', 'Bande grasse', 'Peinture', 'Rallonge', 'Total Fourn.', 'TOTAL', 'Vanne ×2'],
      [[dn, 'S+T', lambda rr: hf(2, 3, rr), 190, None, lambda rr: vl(2, 'FO_Accessoires_Acier', 9, rr), 50, 25, '=FO_Rallonge_Vanne_Preisolee', None, None, lambda rr: vl(2, 'FO_Vannes_Souder', 4, rr)] for dn in PAN_DN])
# by-pass / fonds bombés : valeurs figées (heures + totaux) comme dans le classeur
block('BY-PASS - FONDS BOMBÉS', ['DN', 'Équipe', 'BY-PASS', 'FONDS BOMBÉS', 'Taux horaire', 'BY-PASS', 'FONDS BOMBÉS', 'Coude ×2', 'Vanne DN20 ×1', 'Fonds bomb. ×2', 'Peinture', 'BY-PASS', 'FONDS BOMBÉS', 'BY-PASS', 'FONDS BOMBÉS'],
      [[dn, 'S+T', 4, 2, 190, 760, 380, 10, 30, 20, 20, 60, 70, 820, 450] for dn in PAN_DN], groups=['', '', 'Heures', '', '', 'MO', '', 'Fournitures', '', '', '', 'Total fourn.', '', 'TOTAL', ''])
op.cell(r, 1, 'Boîtiers Plexo + pose (ajouté à chaque vanne SST)'); op.cell(r, 2, 60); r += 2
for title, tbl, cv, cb, cj in [('SST — VANNES BS PN25', 'FO_Vannes_Souder', 2, None, None), ('SST — VANNES BS PN40', 'FO_Vannes_Souder', 7, None, None)]:
    block(title, ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Vanne BS ×2', 'Peinture', 'Total Fourn.', 'TOTAL'],
          [[dn, 'S+T', lambda rr: hf(2, 3, rr), 190, None, lambda rr, cv=cv, tbl=tbl: vl(2, tbl, cv, rr), '=IF($A%d>=FO_Peinture_SST_Seuil_DN,FO_Peinture_SST_Gros_DN,FO_Peinture_SST_Petit_DN)', None, None] for dn in PAN_DN])
block('SST — VANNES PAP PN25', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Brides ×4', 'Vanne lug ×2', 'Boulonnerie + joints', 'Peinture', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T', lambda rr: hf(3, 3, rr), 190, None, lambda rr: vl(4, 'FO_Vannes_Brides_PN16_PN25_PN40', 6, rr), lambda rr: vl(2, 'FO_Vannes_Brides_PN16_PN25_PN40', 5, rr), lambda rr: '=VLOOKUP(A%d,FO_Vannes_Brides_PN16_PN25_PN40[],7,FALSE)+VLOOKUP(A%d,FO_Vannes_Brides_PN16_PN25_PN40[],11,FALSE)' % (rr, rr), '=IF($A%d>=FO_Peinture_SST_Seuil_DN,FO_Peinture_SST_Gros_DN,FO_Peinture_SST_Petit_DN)', None, None] for dn in PAN_DN])
block('SST — VANNES BS BRIDES PN25', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Brides ×4', 'Vanne lug ×2', 'Boulonnerie + joints', 'Peinture', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T', lambda rr: hf(3, 3, rr), 190, None, lambda rr: vl(4, 'FO_Vannes_BS_Brides', 6, rr), lambda rr: vl(2, 'FO_Vannes_BS_Brides', 5, rr), lambda rr: '=VLOOKUP(A%d,FO_Vannes_BS_Brides[],7,FALSE)+VLOOKUP(A%d,FO_Vannes_BS_Brides[],8,FALSE)' % (rr, rr), '=IF($A%d>=FO_Peinture_SST_Seuil_DN,FO_Peinture_SST_Gros_DN,FO_Peinture_SST_Petit_DN)', None, None] for dn in PAN_DN])
RACC_DN = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250]
block('RACCORDEMENT — INSERTION DE TÉS', ['DN', 'Équipe 1', 'Nb heures 1', 'Équipe 2', 'Nb heures 2', 'Montant MO', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T+P', 8 if dn <= 100 else 12, 'M', 8 if dn <= 100 else 12, None, 0, None] for dn in RACC_DN])
block('RACCORDEMENT SUR ATTENTE', ['DN', 'Équipe 1', 'Nb heures 1', 'Équipe 2', 'Nb heures 2', 'Montant MO', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T+P', 6, 'M', 6, None, 0, None] for dn in RACC_DN])
block('RACCORDEMENT — PIQUAGE EN CHARGE', ['DN', 'Équipe', 'Nb heures', 'Taux horaire', 'Montant MO', 'Vanne PEC ×2', 'Selle renfort ×2', 'Total Fourn.', 'TOTAL'],
      [[dn, 'S+T', 10, 190, None, lambda rr: vl(2, 'FO_Vannes_Souder', 6, rr), lambda rr: vl(2, 'FO_Accessoires_Acier', 12, rr), None, None] for dn in PAN_DN])
block('DÉCHARGEMENT', ['Désignation', 'Équipe 1', 'Nb heures 1', 'Équipe 2', 'Nb heures 2', 'Taux Éq.1', 'Taux Éq.2', 'Nb personnes', 'Montant MO'], [['Déchargement', 'S+T+P', 2, 'M', 2, 275, 80, 4, 710]])
block('DÉCOUPE / COUPE / DÉPOSE', ['DN', 'Équipe', 'Coupes / jour'], [[dn, 'S+T', 48 if dn <= 100 else 24] for dn in DNS])
block('EXTRUSION (manchons — base)', ['DN', 'Équipe', 'MANCHONS', 'COUDE', 'PEC', 'PURGES', 'BY-PASS', 'Taux horaire', 'MANCHONS', 'COUDE', 'PEC', 'PURGES', 'BY-PASS', 'Amort. extrudeuse', 'Consommables', 'Total Fourn.', 'Manchons', 'Coudes', 'PEC', 'Purges', 'By-pass'],
      [[d, 'M+M', 2, 3, 8, 5, 6, 160, 320, 480, 1280, 800, 960, 200, 50, 250, 570, 730, 1530, 1050, 1210] for d in [90, 110, 125, 140, 160, 200, 225, 250]],
      groups=['', '', 'Heures', '', '', '', '', '', 'MO', '', '', '', '', 'Fournitures', '', '', 'TOTAL', '', '', '', ''])
block('COLLIERS CENTREURS', ['Paramètre', 'Équipe', 'Cadence (segments / h)'], [['Pose segments', 'M', 10]])
block('CALORIFUGEAGE', ['DN', 'Équipe', 'ml/h PVC', 'ml/h Isoxal'], [[dn, 'M+M', 8, 5] for dn in [40, 50, 65, 80, 100, 150, 200]])
block('BY-PASS SUR PURGE (VANNES PRÉISOLÉES)', ['Désignation', 'DN', 'Qté', 'Prix unitaire', 'Montant'],
      [['Coude à souder', 50, 6, '=VLOOKUP($B%d,FO_Accessoires_Acier[],9,FALSE)', None], ['Bobine', 50, 2, '=VLOOKUP($B%d,FO_Accessoires_Acier[],2,FALSE)', None], ['Tube acier nu (6 ml)', 50, 1, '=VLOOKUP($B%d,FO_Accessoires_Acier[],8,FALSE)', None], ['Vanne BS PR PN25', 50, 1, '=VLOOKUP($B%d,FO_Vannes_Souder[],4,FALSE)', None], ['MO soudeur + tuyauteur (heures)', None, 0.5, 190, None], ['Sous-total pour un by-pass', None, None, None, None], ['Nombre de by-pass par vanne', None, 2, None, None]])
# formules « %d » : la ligne est insérée après coup
for row in op.iter_rows():
    for cell in row:
        if isinstance(cell.value, str) and '%d' in cell.value: cell.value = cell.value.replace('%d', str(cell.row))

# ───────────────────────── Suivi actualisation ─────────────────────────
su = wb.create_sheet('Suivi actualisation')
su['A1'] = 'SUIVI DES VERSIONS'; su['A2'] = 'Version'; su['B2'] = 'Date V'; su['C2'] = 'Objet'
su['A3'] = 'V99'; su['B3'] = datetime.date(2026, 10, 1); su['C3'] = 'maquette de test'
wb.save(OUT); print('écrit', OUT)
