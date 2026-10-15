# Génère js/scola-listes.js à partir des listes Scol@ de la feuille de calcul (onglet caché Liste_Scola,
# mis à jour par la macro « MAJ Scol@ »). À relancer quand une nouvelle version de la feuille de calcul
# arrive avec des listes Scol@ modifiées.
#
# Usage : python -I outils/generer-listes-scola.py [modele/feuille-calcul-vlep.xlsm]

import json, os, sys, warnings
import openpyxl

warnings.filterwarnings('ignore')
racine = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(racine, 'modele', 'feuille-calcul-vlep.xlsm')

LISTES = {
    'tache': 'Plage_Tache',
    'metier': 'Plage_Metier',
    'procede': 'Plage_Procede',
}

wb = openpyxl.load_workbook(src, read_only=False, data_only=True)
out = {}
for cle, nom in LISTES.items():
    dn = wb.defined_names.get(nom)
    vals = []
    for titre, plage in dn.destinations:
        for row in wb[titre][plage]:
            v = row[0].value
            if v is None:
                continue
            v = ' '.join(str(v).split())
            if v and v not in vals:
                vals.append(v)
    out[cle] = sorted(vals, key=lambda s: s.lower())

js = ('// scola-listes.js - Listes Scol@ (tâche, métier, type de procédé) issues de la feuille de calcul\n'
      '// Fichier généré par outils/generer-listes-scola.py depuis « ' + os.path.basename(src) + ' » : ne pas modifier à la main.\n'
      'var SCOLA_LISTES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
dest = os.path.join(racine, 'js', 'scola-listes.js')
with open(dest, 'w', encoding='utf-8') as f:
    f.write(js)
print('Écrit', dest, {k: len(v) for k, v in out.items()}, len(js.encode('utf-8')) // 1024, 'Ko')
