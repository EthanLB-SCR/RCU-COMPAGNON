# Jeu de DXF de test pour le lecteur « universel » (toutes les familles d'objets, règles de couleur/calque) + image de référence rendue par ezdxf (règles AutoCAD).
# python3 tools/gen_dxf_tests.py → test/dxf/fidelite.dxf + test/dxf/fidelite_ref.png
import ezdxf, os, math
from ezdxf.enums import TextEntityAlignment
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
from ezdxf.addons.drawing.config import Configuration, BackgroundPolicy, ColorPolicy, LineweightPolicy
import matplotlib.pyplot as plt

OUT=os.path.join(os.path.dirname(__file__),'..','test','dxf')
os.makedirs(OUT,exist_ok=True)
doc=ezdxf.new('R2018',setup=True)
doc.header['$INSUNITS']=6
L=doc.layers
L.add('TUBE_ALLER',color=1)
L.add('TUBE_RETOUR',color=5)
L.add('ISO',color=8)
L.add('TEXTE',color=7)
L.add('OFF',color=3).off()
fr=L.add('FROZEN',color=3); fr.freeze()
L.add('DASH',color=6,linetype='DASHED')
L.add('CENTRE',color=4,linetype='CENTER')
L.add('EPAIS',color=4,lineweight=70)
tc=L.add('TC',color=7); tc.rgb=(20,160,90)
L.add('HACH',color=2)
L.add('BLOCS',color=30)
msp=doc.modelspace()
# 1) traits de base : deux tubes parallèles + isolation, une baïonnette
for y,lay in ((0,'TUBE_ALLER'),(0.35,'TUBE_RETOUR')):
    msp.add_lwpolyline([(0,y),(30,y),(32,y+3),(60,y+3)],dxfattribs={'layer':lay})
    for dy in (-0.1,0.1):
        msp.add_lwpolyline([(0,y+dy),(30,y+dy),(32,y+3+dy),(60,y+3+dy)],dxfattribs={'layer':'ISO'})
# 2) polyligne fermée avec arcs (bulge), cercle, arc, ellipse, spline
msp.add_lwpolyline([(0,10,0,0,1),(6,10,0,0,0),(6,14,0,0,-0.5),(0,14)],format='xyseb',close=True,dxfattribs={'layer':'DASH'})
msp.add_circle((12,12),2,dxfattribs={'layer':'CENTRE'})
msp.add_arc((18,12),2,30,250,dxfattribs={'layer':'EPAIS'})
msp.add_ellipse((26,12),major_axis=(4,0),ratio=0.5,dxfattribs={'layer':'TC'})
msp.add_ellipse((34,12),major_axis=(3,1.5),ratio=0.4,start_param=0,end_param=math.pi*1.3,dxfattribs={'color':6})
msp.add_spline(fit_points=[(40,10),(43,14),(46,10),(49,14),(52,10)],dxfattribs={'layer':'TUBE_ALLER'})
sp=msp.add_spline(dxfattribs={'layer':'TUBE_RETOUR'}); sp.set_open_uniform([(40,16),(43,20),(46,16),(49,20),(52,16)],degree=3)
# 3) hachures : aplat plein sur boucle polyligne, motif ANSI31 sur cercle (boucle arête), aplat avec trou (evenodd)
h=msp.add_hatch(color=2,dxfattribs={'layer':'HACH'}); h.paths.add_polyline_path([(0,20),(8,20),(8,24),(0,24)],is_closed=True)
h2=msp.add_hatch(color=4,dxfattribs={'layer':'HACH'}); h2.set_pattern_fill('ANSI31',scale=0.5); h2.paths.add_edge_path().add_arc((14,22),2,0,360)
h3=msp.add_hatch(color=1,dxfattribs={'layer':'HACH'}); h3.paths.add_polyline_path([(20,20),(28,20),(28,26),(20,26)],is_closed=True); h3.paths.add_polyline_path([(22,22),(26,22),(26,24),(22,24)],is_closed=True)
msp.add_solid([(32,20),(38,20),(35,25)],dxfattribs={'color':3})
# 4) textes : alignements TEXT, MTEXT accroches, rotation, aligné entre deux points, largeur
msp.add_text('gauche base',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((0,30))
msp.add_text('centre',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((15,30),align=TextEntityAlignment.CENTER)
msp.add_text('droite',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((30,30),align=TextEntityAlignment.RIGHT)
msp.add_text('milieu',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((40,30),align=TextEntityAlignment.MIDDLE)
msp.add_text('haut gauche',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((0,34),align=TextEntityAlignment.TOP_LEFT)
msp.add_text('tourné 30°',height=0.8,dxfattribs={'layer':'TEXTE','rotation':30}).set_placement((15,34))
msp.add_text('aligné entre deux points',height=0.8,dxfattribs={'layer':'TEXTE'}).set_placement((26,34),(40,34),align=TextEntityAlignment.ALIGNED)
msp.add_text('rouge',height=0.8,dxfattribs={'color':1}).set_placement((44,34))
msp.add_text('DN50 (60,3/125)',height=0.9,dxfattribs={'layer':'TEXTE'}).set_placement((0,37))
mt=msp.add_mtext('MTEXT haut-gauche\\Pdeuxième ligne\\Ptroisième',dxfattribs={'char_height':0.8,'layer':'TEXTE'}); mt.set_location((0,44),attachment_point=1)
mt2=msp.add_mtext('MTEXT bas-centre tourné',dxfattribs={'char_height':0.8,'layer':'TEXTE','rotation':90}); mt2.set_location((30,40),attachment_point=8)
mt3=msp.add_mtext('{\\fArial|b1;gras} et \\C1;rouge puis un long paragraphe qui doit passer à la ligne selon la largeur du cadre',dxfattribs={'char_height':0.6,'layer':'TEXTE','width':12}); mt3.set_location((36,44),attachment_point=1)
mt4=msp.add_mtext('milieu-centre',dxfattribs={'char_height':0.8,'layer':'TEXTE'}); mt4.set_location((55,42),attachment_point=5)
# petits repères sous les points d'accrochage
for p in ((0,30),(15,30),(30,30),(40,30),(0,34),(15,34),(26,34),(40,34),(0,44),(30,40),(36,44),(55,42)):
    msp.add_circle(p,0.15,dxfattribs={'color':250})
# 5) blocs : calque 0 par calque, par bloc, couleur fixe ; imbriqué ; attributs ; insertions tournées / échelle
blk=doc.blocks.new('SYMB')
blk.add_lwpolyline([(-1,-1),(1,-1),(1,1),(-1,1)],close=True,dxfattribs={'layer':'0','color':256}) # par calque → suit l'insertion
blk.add_line((-1,-1),(1,1),dxfattribs={'layer':'0','color':0}) # par bloc
blk.add_circle((0,0),0.5,dxfattribs={'layer':'TUBE_ALLER'}) # couleur du calque TUBE_ALLER (rouge) partout
blk.add_line((-1,1),(1,-1),dxfattribs={'color':5}) # bleu fixe
blk.add_attdef('REP',(0,1.3),dxfattribs={'height':0.5,'layer':'TEXTE'})
nest=doc.blocks.new('NEST'); nest.add_blockref('SYMB',(0,0)); nest.add_blockref('SYMB',(3,0),dxfattribs={'rotation':45}); nest.add_text('nid',height=0.5,dxfattribs={'layer':'TEXTE'}).set_placement((1.5,-2))
msp.add_blockref('SYMB',(5,52),dxfattribs={'layer':'BLOCS'}).add_auto_attribs({'REP':'S1'})
msp.add_blockref('SYMB',(10,52),dxfattribs={'layer':'TUBE_RETOUR','color':2,'rotation':30,'xscale':1.5,'yscale':1.5}).add_auto_attribs({'REP':'S2'})
msp.add_blockref('NEST',(18,52),dxfattribs={'layer':'BLOCS'})
msp.add_blockref('SYMB',(28,52),dxfattribs={'layer':'OFF'}) # calque éteint → invisible
# 6) cotation, ligne de repère, épaisseur, calques éteints/gelés, image externe
dim=msp.add_linear_dim(base=(36,55),p1=(36,52),p2=(46,52),dimstyle='EZDXF'); dim.render()
msp.add_leader([(50,50),(53,53),(56,53)],dxfattribs={'layer':'TEXTE'})
msp.add_line((0,60),(20,60),dxfattribs={'layer':'EPAIS'})
msp.add_line((0,61),(20,61),dxfattribs={'lineweight':100,'color':1})
msp.add_line((0,62),(20,62),dxfattribs={'layer':'OFF'})
msp.add_line((0,63),(20,63),dxfattribs={'layer':'FROZEN'})
msp.add_line((0,64),(20,64),dxfattribs={'true_color':0x1E90FF})
img_def=doc.add_image_def(filename='ortho_test.jpg',size_in_pixel=(400,300))
msp.add_image(image_def=img_def,insert=(30,58),size_in_units=(12,9))
path=os.path.join(OUT,'fidelite.dxf'); doc.saveas(path)
# référence ezdxf (fond blanc, couleurs, épaisseurs)
fig=plt.figure(figsize=(16,18)); ax=fig.add_axes([0,0,1,1]); ctx=RenderContext(doc)
cfg=Configuration(background_policy=BackgroundPolicy.WHITE,color_policy=ColorPolicy.COLOR,lineweight_policy=LineweightPolicy.ABSOLUTE)
Frontend(ctx,MatplotlibBackend(ax),config=cfg).draw_layout(msp,finalize=True)
fig.savefig(os.path.join(OUT,'fidelite_ref.png'),dpi=300); print('ok',path)
