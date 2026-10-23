// consignes-agents.js - Consignes de terrain tirées des commentaires de la base des agents
// © 2025 Quentin THOMAS
//
// La colonne « commentaire (interférent, impact des conditions ambiantes) » de la base contient, au milieu
// d'informations de laboratoire, des consignes utiles sur site. L'appli :
//   - contrôle seule les limites chiffrées (durée max par tube, volume max, durée min, durée CT imposée)
//     avec les plages et débits saisis, et propose le fractionnement quand il le faut ;
//   - affiche en évidence les rappels de matériel / manipulation ;
//   - signale les agents qu'aucun laboratoire n'analyse ;
//   - laisse le reste du commentaire consultable (repliable).
// Chaque règle cite un extrait (« cle ») qui doit figurer dans le commentaire : les tests automatiques
// préviennent si une nouvelle version de la base le modifie (règle à revoir).

var CONSIGNES_COMMENTAIRE = 'commentaire (interférent, impact des conditions ambiantes)';

var CONSIGNES_AGENTS = [
  { type: 'dureeMaxSupport', min: 120, cle: /2\s?h/i, agents: ['méthanol', '1,1,2-trichlorotrifluoroéthane (fréon 113)', 'bromochlorométhane'] },
  { type: 'dureeMaxSupport', min: 120, cle: /2 heures/i, agents: ['phosgène'] },
  { type: 'volumeMax', litres: 15, cle: /15 L/, agents: ['éthanol'] },
  { type: 'volumeMax', litres: 400, cle: /400 L/, agents: ['nicotine'] },
  { type: 'dureeMin', min: 361, cle: /361/, agents: ['Hydrazine'] },
  { type: 'dureeCT', min: 5, cle: /5 minutes/, agents: ["4,4' MDI ( méthylène diphényl diisocyanate)"] },
  { type: 'dureeCT', min: 1, cle: /1 minute/, agents: ['acide acrylique'] },
  { type: 'coPollution', avec: /styr[eè]ne/i, cle: /styr/i, agents: ['acétone', 'cyclohexanone', 'méthyléthylcétone (MEK) ou 2-butanone', 'méthylisobutylcétone (MIBK) ou 4-methyl, 2-pentanone', 'diisobutylcétone'] },
  { type: 'rappelCT', cle: /CT|court terme|court-terme|15 minutes/i, agents: ["acétate d'éthyle", 'acétate de n-butyle', 'alcool allylique', 'N,N-diméthyléthylamine (DMEA)'] },
  { type: 'rappel', cle: /./, agents: ["Aérosols de fluide d'usinage (Brouillard d'huiles)", "sulfure d'hydrogène (hydrogène sulfuré)", 'Benzo (a) pyrène (recommandation CNAM)',
    'oxyde de carbone', 'dioxyde de carbone', 'isopropanol', 'propanol', 'monochlorure de vinyle', 'Calcium (hydroxyde de ) fraction alvéolaire', 'Calcium (oxyde de )\nfraction alvéolaire',
    'fluor', 'hydrogène sélénié (séléniure de dihydrogène)', 'isocyanate de méthyle', 'Emissions d’échappement de moteurs Diesel mesurées sous forme de carbone élémentaire', 'diacétone alcool'] }
];

function consigneCommentaire(an) {
  var ag = getAgentFromDB(an);
  var c = ag ? String(ag[CONSIGNES_COMMENTAIRE] || '').trim() : '';
  return c === '-' ? '' : c;
}

function consigneSansLabo(an) { return /aucun laboratoire/i.test(consigneCommentaire(an)); }

function consignesRegles(an) {
  return CONSIGNES_AGENTS.filter(function (r) { return r.agents.indexOf(an) !== -1; });
}

function cnDuree(plages) {
  var mn = 0;
  (plages || []).forEach(function (pl) {
    var d = /^(\d{1,2}):(\d{2})/.exec(pl.debut || ''), f = /^(\d{1,2}):(\d{2})/.exec(pl.fin || '');
    if (d && f) { var x = (+f[1] * 60 + +f[2]) - (+d[1] * 60 + +d[2]); if (x > 0) mn += x; }
  });
  return mn;
}
function cnNombre(v) { var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
function cnHeures(mn) { return Math.floor(mn / 60) + 'h' + (mn % 60 < 10 ? '0' : '') + (mn % 60); }
function cnLitres(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }

// Alertes pour un agent d'un sous-prélèvement : [{niveau: 'alerte' | 'info', texte}]
function consignesAgent(m, p, sb, an) {
  var out = [], com = consigneCommentaire(an), regles = consignesRegles(an);
  var ct = p.type === 'CT';
  if (consigneSansLabo(an)) out.push({ niveau: 'alerte', texte: 'Aucun laboratoire n’analyse actuellement cet agent (base des agents) : le prélèvement ne pourra pas être exploité.' });
  var supports = expandSubSupports(sb);
  regles.forEach(function (r) {
    if (r.type === 'dureeMaxSupport' && !ct) {
      var trop = supports.map(function (s, k) { return { k: k + 1, d: cnDuree(s.plages) }; }).filter(function (x) { return x.d > r.min; });
      if (trop.length) out.push({ niveau: 'alerte', texte: cnHeures(r.min) + ' maximum par tube (migration vers la 2e zone) : ' + trop.map(function (x) { return 'support n°' + x.k + ' = ' + cnHeures(x.d); }).join(', ') + '. Fractionnez avec « + Support (prélèvement fractionné) ».' });
      else out.push({ niveau: 'info', texte: cnHeures(r.min) + ' maximum par tube : au-delà, fractionner avec « + Support ».' });
    }
    if (r.type === 'volumeMax') {
      var dep = supports.map(function (s, k) {
        var ad = (s.agentData && s.agentData[an]) || {};
        var di = cnNombre(ad.debitInitial), df = cnNombre(ad.debitFinal), deb = di !== null && df !== null ? (di + df) / 2 : null;
        return { k: k + 1, v: deb !== null ? deb * cnDuree(s.plages) : null };
      }).filter(function (x) { return x.v !== null && x.v > r.litres; });
      var range = typeof getDebitRange === 'function' ? getDebitRange(an, p.type) : null;
      var dureeMax = range && range.min > 0 ? Math.floor(r.litres / range.min) : null;
      if (dep.length) out.push({ niveau: 'alerte', texte: 'Volume maximal ' + r.litres + ' L par tube (migration) : ' + dep.map(function (x) { return 'support n°' + x.k + ' ≈ ' + cnLitres(x.v) + ' L'; }).join(', ') + '. Fractionnez avec « + Support ».' });
      else out.push({ niveau: 'info', texte: 'Volume maximal ' + r.litres + ' L par tube' + (dureeMax ? ' : à ' + String(range.min).replace('.', ',') + ' L/min, ' + cnHeures(dureeMax) + ' maximum par tube' : '') + '.' });
    }
    if (r.type === 'dureeMin' && !ct) {
      var tot = dureePrelevementMin(sb);
      out.push({ niveau: tot > 0 && tot < r.min ? 'alerte' : 'info', texte: 'Durée minimale de prélèvement : ' + r.min + ' min' + (tot > 0 && tot < r.min ? ' (saisi : ' + tot + ' min)' : '') + '.' });
    }
    if (r.type === 'dureeCT' && ct) {
      var dct = dureePrelevementMin(sb);
      out.push({ niveau: dct > 0 && dct !== r.min ? 'alerte' : 'info', texte: 'VLEP court terme sur ' + r.min + ' min : prélèvement CT obligatoirement de ' + r.min + ' min' + (dct > 0 && dct !== r.min ? ' (saisi : ' + dct + ' min)' : '') + '.' });
    }
    if (r.type === 'coPollution') {
      var avec = (m.agents || []).concat(p.agents || []).some(function (a) { return r.avec.test(a.name || ''); });
      if (avec) out.push({ niveau: 'alerte', texte: com });
    }
    if (r.type === 'rappelCT' && ct) out.push({ niveau: 'info', texte: com });
    if (r.type === 'rappel') out.push({ niveau: 'info', texte: com });
  });
  return out;
}

// Bloc affiché sous l'agent sur l'écran de terrain
function renderConsignesAgent(m, p, sb, an) {
  if (typeof getAgentFromDB !== 'function') return '';
  var lignes = consignesAgent(m, p, sb, an), com = consigneCommentaire(an);
  var h = '';
  lignes.forEach(function (l) {
    var alerte = l.niveau === 'alerte';
    h += '<div style="font-size:11px;line-height:1.4;padding:6px 8px;margin:4px 0;border-radius:6px;background:' + (alerte ? '#fef2f2' : '#fffbeb') + ';color:' + (alerte ? '#b91c1c' : '#92400e') + ';">' + escapeHtml(l.texte) + '</div>';
  });
  // commentaire complet consultable si ses consignes ne sont pas déjà affichées en entier
  var affiche = lignes.some(function (l) { return l.texte === com; });
  if (com && !affiche) h += '<details style="margin:2px 0;"><summary style="font-size:11px;color:var(--text-muted);cursor:pointer;">Remarque de la base</summary><div style="font-size:11px;color:var(--text-muted);padding:4px 0;">' + escapeHtml(com) + '</div></details>';
  return h;
}

console.log('✓ Consignes agents chargées');
