// Outil de contrôle (outils/verification/LISEZMOI.txt)
// Génère le rapport Word de la mission du banc d'essai (outils/feuille-calcul/generer-test.js) avec une feuille de
// calcul enregistrée par Excel. Usage : node generer-rapport.js <racine appli> <feuille calculée .xlsm> <sortie .docx>
const fs = require('fs'), path = require('path'), vm = require('vm');
const [racine, feuille, sortie] = process.argv.slice(2);
const store = {};
const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Uint8Array, ArrayBuffer, TextDecoder, TextEncoder,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {} }; } },
  navigator: {}, alert: m => console.log('[alert]', m), confirm: () => true };
ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
ctx.JSZip = require(path.join(racine, 'js', 'jszip.min.js'));
['js/icons.js', 'js/database.js', 'js/scola-listes.js', 'js/state.js', 'js/prepa.js', 'js/terrain.js', 'js/consignes-agents.js', 'js/releves-analyseur.js', 'js/echantillons.js',
 'js/xlsm-moteur.js', 'js/feuille-calcul.js', 'js/veolia.js', 'js/scola-dossier.js', 'js/activite.js', 'js/docx-moteur.js', 'js/rapport.js', 'js/rapport-resultats.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(racine, f), 'utf8'), ctx, { filename: f }));
vm.runInContext('state.agentsDB = JSON.parse(JSON.stringify(BUILTIN_DB));', ctx);
vm.runInContext(`var _gen = XlsmMoteur.Classeur.prototype.generer; XlsmMoteur.Classeur.prototype.generer = function(t){ return _gen.call(this, t === 'blob' ? 'nodebuffer' : t); };`, ctx);
// mission du banc d'essai, telle quelle
const src = fs.readFileSync(path.join(racine, 'outils', 'feuille-calcul', 'generer-test.js'), 'utf8');
const debut = src.indexOf('(function(){'), fin = src.indexOf('})()', debut) + 4;
ctx.__m = vm.runInContext(src.slice(debut, fin), ctx);
ctx.__m.scolaDossier = 'DOSSIER-TEST';
ctx.__m.rapport = { chrono: 'CHRONO-TEST', contrat: 'CONTRAT-TEST', interlocuteur: 'M. Test', redacteur: 'Rédacteur', valideur: 'Valideur', agence: 'woippy', types: { periodique: true }, categories: {} };
ctx.__trame = fs.readFileSync(path.join(racine, 'modele', 'trame-rapport-vlep.docx'));
ctx.__feuille = fs.readFileSync(feuille);
vm.runInContext('construireRapport(__m, __trame, "nodebuffer", __feuille)', ctx).then(r => {
  fs.writeFileSync(sortie, r.blob);
  console.log('Écrit :', sortie);
  console.log('Catégories précochées :', JSON.stringify(ctx.__m.rapport.categories), 'poste fixe :', ctx.__m.rapport.posteFixe);
  console.log('Résultats :', JSON.stringify(r.resultats, null, 1));
}).catch(e => { console.error('ERREUR', e); process.exit(1); });
