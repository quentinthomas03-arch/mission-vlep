# Extraction de la trame de rapport « Contrôle des VLEP - Modèle de rapport » (.dot) pour l'étude de l'export Word.
# Même principe que outils/extraire-feuille-calcul.py :
#   trame_rapport_modules/vba/*.bas      modules VBA et formulaires (AutoNew : lancé à la création d'un rapport)
#   trame_rapport_modules/plan.md        le document dans l'ordre : titres, paragraphes, tableaux, champs {…}, signets [#…]
#   trame_rapport_modules/champs.tsv     chaque champ Word (code, texte affiché, titre de section où il se trouve)
#   trame_rapport_modules/signets.tsv    signets (cibles des macros et des renvois)
# Le .dot est un format binaire : le convertir d'abord en .docx sans lancer ses macros :
#   powershell -File outils/trame-rapport/convertir.ps1 -Source "<trame.dot>" -Sortie "<trame.docx>"
# Le dossier de sortie est hors git (modèle SOCOTEC, macros).
#
# Usage : python -I outils/extraire-trame-rapport.py "<trame.dot>" "<trame convertie.docx>" [dossier de sortie]
# Prérequis : pip install oletools

import os, re, sys, zipfile, collections
import xml.etree.ElementTree as ET
from oletools.olevba import VBA_Parser

sys.stdout.reconfigure(encoding='utf-8')  # python -I ignore PYTHONIOENCODING
src, docx = sys.argv[1], sys.argv[2]
out = os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'trame_rapport_modules'))
os.makedirs(os.path.join(out, 'vba'), exist_ok=True)

# 1. VBA
modules = []
p = VBA_Parser(src)
for (_, _, vname, code) in p.extract_macros():
    nom = re.sub(r'\.(bas|cls|frm)$', '', vname)
    with open(os.path.join(out, 'vba', nom + '.bas'), 'w', encoding='utf-8') as f:
        f.write(code)
    modules.append((nom, len(code.splitlines())))
p.close()

# 2. Document
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
z = zipfile.ZipFile(docx)
styles = {}
st = ET.fromstring(z.read('word/styles.xml'))
for s in st.iter(W + 'style'):
    n = s.find(W + 'name')
    styles[s.get(W + 'styleId')] = n.get(W + 'val') if n is not None else s.get(W + 'styleId')

champs, signets, plan = [], [], []
section = ['(début)']

def texte_para(p):
    """Texte du paragraphe avec les champs {CODE → affiché} et les signets [#nom]."""
    out, pile = [], []  # pile de champs ouverts : [code, affiché, phase]
    for el in p.iter():
        tag = el.tag
        if tag == W + 'bookmarkStart':
            n = el.get(W + 'name')
            if n and not n.startswith('_'):
                out.append('[#' + n + ']'); signets.append((n, section[0]))
        elif tag == W + 'fldChar':
            t = el.get(W + 'fldCharType')
            if t == 'begin': pile.append(['', '', 'code'])
            elif t == 'separate' and pile: pile[-1][2] = 'res'
            elif t == 'end' and pile:
                code, res, _ = pile.pop()
                code = ' '.join(code.split())
                champs.append((code, ' '.join(res.split())[:120], section[0]))
                txt = '{' + code + (' → ' + ' '.join(res.split())[:60] if res.strip() else '') + '}'
                if pile: pile[-1][1 if pile[-1][2] == 'res' else 0] += txt
                else: out.append(txt)
        elif tag == W + 'instrText':
            if pile: pile[-1][0] += el.text or ''
        elif tag == W + 'fldSimple':
            pass  # traité par sa balise : code en attribut, texte dans les w:t enfants
        elif tag == W + 't':
            t = el.text or ''
            if pile: pile[-1][1 if pile[-1][2] == 'res' else 0] += t if pile[-1][2] == 'res' else ''
            else: out.append(t)
        elif tag == W + 'tab' and not pile:
            out.append('\t')
    for fs in p.iter(W + 'fldSimple'):
        code = ' '.join((fs.get(W + 'instr') or '').split())
        champs.append((code, ''.join(t.text or '' for t in fs.iter(W + 't'))[:120], section[0]))
    return ''.join(out).strip()

def style_para(p):
    ps = p.find(W + 'pPr/' + W + 'pStyle')
    return styles.get(ps.get(W + 'val'), ps.get(W + 'val')) if ps is not None else ''

def parcourir(conteneur, profondeur=0):
    for el in list(conteneur):
        if el.tag == W + 'p':
            s, t = style_para(el), texte_para(el)
            if not t: continue
            titre = re.match(r'(heading|titre)\s*(\d)', s, re.I)
            if titre:
                section[0] = t[:80]
                plan.append('\n' + '#' * min(int(titre.group(2)) + 1, 6) + ' ' + t)
            else:
                plan.append(('  ' * profondeur) + t + (' _(' + s + ')_' if s and s not in ('Normal',) else ''))
        elif el.tag == W + 'tbl':
            lignes = el.findall(W + 'tr')
            plan.append(('  ' * profondeur) + '**[Tableau ' + str(len(lignes)) + ' lignes]**')
            for i, tr in enumerate(lignes[:6]):
                cells = []
                for tc in tr.findall(W + 'tc'):
                    cells.append(' / '.join(x for x in (texte_para(pp) for pp in tc.iter(W + 'p')) if x)[:70])
                plan.append(('  ' * profondeur) + '| ' + ' | '.join(cells) + ' |')
            if len(lignes) > 6: plan.append(('  ' * profondeur) + '| … |')
        elif el.tag == W + 'sdt':
            c = el.find(W + 'sdtContent')
            if c is not None: parcourir(c, profondeur)

parcourir(ET.fromstring(z.read('word/document.xml')).find(W + 'body'))
entetes = []
for n in sorted(x for x in z.namelist() if re.match(r'word/(header|footer)\d+\.xml', x)):
    r = ET.fromstring(z.read(n))
    section[0] = n.split('/')[-1]
    t = ' / '.join(x for x in (texte_para(pp) for pp in r.iter(W + 'p')) if x)
    if t: entetes.append('- ' + section[0] + ' : ' + t[:300])

with open(os.path.join(out, 'plan.md'), 'w', encoding='utf-8') as f:
    f.write('# Plan de « ' + os.path.basename(src) + ' »\n\nChamps Word entre {…} (code → texte affiché dans la trame), signets entre [#…].\n\n')
    f.write('## En-têtes et pieds de page\n\n' + '\n'.join(entetes) + '\n\n## Corps\n' + '\n'.join(plan) + '\n')
with open(os.path.join(out, 'champs.tsv'), 'w', encoding='utf-8') as f:
    f.write('code\taffiché\tsection\n' + ''.join('\t'.join(c) + '\n' for c in champs))
with open(os.path.join(out, 'signets.tsv'), 'w', encoding='utf-8') as f:
    f.write('signet\tsection\n' + ''.join('\t'.join(s) + '\n' for s in signets))

types = collections.Counter(c[0].split(' ')[0].upper() for c in champs if c[0])
with open(os.path.join(out, 'README.md'), 'w', encoding='utf-8') as f:
    f.write('# Extraction de « ' + os.path.basename(src) + ' »\n\nGénéré par `outils/extraire-trame-rapport.py`. Hors git.\n\n')
    f.write('## Modules VBA\n\n| Module | Lignes |\n|---|---|\n' + ''.join('| ' + n + ' | ' + str(l) + ' |\n' for n, l in modules))
    f.write('\n## Champs Word par type\n\n| Type | Nombre |\n|---|---|\n' + ''.join('| ' + t + ' | ' + str(n) + ' |\n' for t, n in types.most_common()))
    f.write('\n' + str(len(signets)) + ' signets, ' + str(sum(1 for l in plan if l.startswith('**[Tableau') or l.strip().startswith('**[Tableau'))) + ' tableaux.\n')
print('VBA :', ', '.join(n + ' (' + str(l) + ')' for n, l in modules))
print('Champs :', dict(types.most_common()))
print('Signets :', len(signets), '- sortie :', out)
