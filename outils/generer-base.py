# Met à jour la base d'agents de l'appli (js/database.js) depuis le classeur
# « Base de données + Annexes MonDevis - Version NN.xlsm » (onglet « Base de données », en-têtes en ligne 8).
#
# Seules les colonnes déjà utilisées par l'appli sont reprises (mêmes noms de colonnes) ; une colonne
# disparue ou renommée est signalée. Un rapport des différences (agents ajoutés, retirés, champs modifiés)
# est affiché ; avec --ecrire, js/database.js est remplacé.
#
# Usage : python -I outils/generer-base.py "<Base ... Version 86.xlsm>" [--ecrire]

import json, os, re, sys, warnings
import openpyxl

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')  # python -I ignore PYTHONIOENCODING
racine = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = sys.argv[1]
ecrire = '--ecrire' in sys.argv
dest = os.path.join(racine, 'js', 'database.js')

# Base actuelle de l'appli
js = open(dest, encoding='utf-8').read()
debut = js.index('var BUILTIN_DB = ') + len('var BUILTIN_DB = ')
fin = js.rindex('];') + 1
actuelle = json.loads(js[debut:fin])
cles = []
for a in actuelle:
    for k in a:
        if k not in cles and not k.startswith('Coût unitaire'):  # tarifs internes : jamais dans le dépôt public
            cles.append(k)

# Nouvelle base
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
ws = wb['Base de données']
lignes = list(ws.iter_rows(min_row=8, values_only=True))
entetes = [h if h is not None else '' for h in lignes[0]]
# en-têtes comparés sans tenir compte des espaces et retours à la ligne (« Laboratoire sous-traitant »)
def norm(h):
    return ' '.join(str(h).split()).lower()
cles_norm = {norm(k): k for k in cles}
index = {}
for i, h in enumerate(entetes):
    k = cles_norm.get(norm(h))
    if k and k not in index:
        index[k] = i
absentes = [k for k in cles if k not in index]

def propre(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        return v.strip()  # texte vide conservé, comme dans la base actuelle
    return v

nouvelle = []
for row in lignes[1:]:
    nom = propre(row[index['Agent chimique']]) if 'Agent chimique' in index else None
    if not nom:
        continue
    a = {}
    for k in cles:
        if k in index:
            v = propre(row[index[k]])
            if v is not None:
                a[k] = v
    nouvelle.append(a)

# Rapport
def par_nom(base):
    d = {}
    for a in base:
        d.setdefault(a.get('Agent chimique'), []).append(a)
    return d
A, N = par_nom(actuelle), par_nom(nouvelle)
ajoutes = [n for n in N if n not in A]
retires = [n for n in A if n not in N]
modifies = []
for n in N:
    if n in A and len(A[n]) == 1 and len(N[n]) == 1:
        vide = lambda x: None if x in (None, '') else x
        diff = [k for k in cles if vide(A[n][0].get(k)) != vide(N[n][0].get(k))]
        if diff:
            modifies.append((n, diff))
print('Base actuelle :', len(actuelle), 'lignes ; nouvelle :', len(nouvelle), 'lignes')
if absentes:
    print('Colonnes de l\'appli absentes du classeur :', absentes)
print('Agents ajoutés (%d) :' % len(ajoutes))
for n in ajoutes: print('   +', n.replace('\n', ' '))
print('Agents retirés (%d) :' % len(retires))
for n in retires: print('   -', n.replace('\n', ' '))
print('Agents modifiés (%d) :' % len(modifies))
for n, d in modifies: print('   ~', n.replace('\n', ' ')[:70], ':', ', '.join(x.replace('\n', ' ')[:30] for x in d[:6]) + (' …' if len(d) > 6 else ''))

if ecrire:
    nom_src = os.path.basename(src)
    entete = js[:js.index('var BUILTIN_DB = ')]
    entete = re.sub(r'Mise à jour depuis .*', 'Mise à jour depuis ' + nom_src + ' (outils/generer-base.py)', entete)
    mv = re.search(r'Version\s*(\d+)', nom_src)
    entete = re.sub(r"var BUILTIN_DB_VERSION = '[^']*';[^\n]*\n*", '', entete)
    entete += "var BUILTIN_DB_VERSION = '" + ('Version ' + mv.group(1) if mv else nom_src) + "'; // une base collée à la main plus ancienne est remplacée\n\n"
    corps = 'var BUILTIN_DB = [\n' + ',\n'.join(json.dumps(a, ensure_ascii=False) for a in nouvelle) + '\n];\n'
    reste = js[fin:].lstrip(';').lstrip('\r\n')
    open(dest, 'w', encoding='utf-8').write(entete + corps + ('\n' + reste if reste.strip() else ''))
    print('Écrit :', dest)
