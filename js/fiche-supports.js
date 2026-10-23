// fiche-supports.js - Fiche de préparation des supports (aide au technicien, pas un bon de commande)
// © 2025 Quentin THOMAS
//
// D'après la mission (préparée ou déjà sur le terrain) et la base des agents :
//   - par polluant : support, réf. et code support, laboratoire, débits, conservation et commentaire de la base ;
//   - tableau conseil : supports à prévoir par type (échantillons + blancs), avec le nombre si les agents qui le
//     peuvent sont regroupés sur un même support ;
//   - prélèvements à équiper par appareil (pompe, CIP10, analyseur).
// Règles de comptage (affichées sur la fiche) :
//   - un support par jour de prélèvement et par support physique : agents cochés « Même support » sur le terrain
//     = un seul support ; supports d'un prélèvement fractionné comptés ;
//   - regroupement possible = agents d'un même GEH, même type (8h / CT), même jour, que la base place sur le même
//     support (code support et prétraitement identiques), comme le badge du terrain ;
//   - blancs : gravimétrie 2 par lot de 15 échantillons au plus ; sinon 1 par type de support (un lot supposé) ;
//   - aucune marge pour casse : le technicien la note dans le commentaire de la fiche.

var FS_DEBITS = { '8h': ['débit min  8h (L/min)', 'débit max  8h (L/min)'], 'CT': ['débit min CT (L/min)', 'débit max CT (L/min)'] };

function fsTexte(v) { var t = String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim(); return t === '-' ? '' : t; }

// Type de support d'un agent : code support de la base, sinon libellé du support, sinon agent hors base
function fsCle(an) {
  var ag = getAgentFromDB(an);
  if (!ag) return 'manuel|' + an;
  var code = fsTexte(ag['Code support']), sup = fsTexte(ag['Support de prélèvement']);
  return code ? 'code|' + code : (sup ? 'sup|' + sup.toLowerCase() : 'manuel|' + an);
}

// Mission telle qu'elle sera prélevée : en préparation, prélèvements générés (sur une copie) d'après les affectations
function fsMissionPrevue(m) {
  if (m.status !== 'prepa' && (m.prelevements || []).length) return m;
  var c = JSON.parse(JSON.stringify(m));
  if (c.affectations && typeof generatePrelevements === 'function') generatePrelevements(c);
  return c;
}

function fsBlancs(nEch, gravi) { return nEch ? (gravi ? 2 * Math.ceil(nEch / 15) : 1) : 0; }

function ficheSupports(m) {
  var mm = fsMissionPrevue(m), supports = {}, ordre = [], agents = [], buckets = {}, ordreB = [];
  var materiel = { pompe: 0, cip10: 0, analyseur: 0 }, parJour = {};
  var gehDe = function (id) { var g = (mm.gehs || []).filter(function (x) { return String(x.id) === String(id); })[0]; return g ? 'GEH ' + g.num + (g.name ? ' « ' + g.name + ' »' : '') : 'GEH ?'; };
  var sup = function (an) {
    var cle = fsCle(an);
    if (!supports[cle]) { supports[cle] = { cle: cle, agents: [], ech: 0, echRegroupe: 0, gravi: false, ag: getAgentFromDB(an) }; ordre.push(cle); }
    var s = supports[cle];
    if (s.agents.indexOf(an) === -1) s.agents.push(an);
    if (estGravimetrie(an)) s.gravi = true;
    return s;
  };
  var jour = function (d, t) { if (!d) return; if (!parJour[d]) parJour[d] = { pompe: 0, cip10: 0, analyseur: 0 }; parJour[d][t]++; };
  (mm.prelevements || []).forEach(function (p) {
    var noms = (p.agents || []).map(function (a) { return a.name; });
    (p.subPrelevements || []).forEach(function (s0, si) {
      if (s0.nonRealise) return;
      // polluants de la fiche, avec les types de VLEP prélevés (débits à rappeler)
      noms.forEach(function (an) {
        var a = agents.filter(function (x) { return x.nom === an; })[0];
        if (!a) { a = { nom: an, types: {} }; agents.push(a); }
        a.types[p.type === 'CT' ? 'CT' : '8h'] = true;
      });
      var j = s0.date || s0.jourPrevu || '';
      noms.filter(isAnalyseurAgent).forEach(function () { materiel.analyseur++; jour(j, 'analyseur'); });
      var preleves = noms.filter(function (an) { return !isAnalyseurAgent(an); });
      // supports physiques réels : agents cochés « Même support » = un groupe
      var groupes = [], vus = {};
      preleves.forEach(function (an) {
        if (vus[an]) return;
        var g = getCoPrelGroupMembers(s0, an).filter(function (x) { return preleves.indexOf(x) !== -1; });
        if (g.length < 2) g = [an];
        g.forEach(function (x) { vus[x] = true; });
        groupes.push(g);
      });
      var nSupports = expandSubSupports(s0).length;
      groupes.forEach(function (g) {
        var s = sup(g[0]);
        g.forEach(function (x) { if (s.agents.indexOf(x) === -1) s.agents.push(x); if (estGravimetrie(x)) s.gravi = true; });
        s.ech += nSupports;
        var t = isTachymetreAgent(g[0]) ? 'cip10' : 'pompe';
        materiel[t]++; jour(j, t);
      });
      // regroupement possible : même GEH, même type, même jour (rang), agents de même support dans la base
      var bk = p.gehId + '|' + p.type + '|' + si;
      if (!buckets[bk]) { buckets[bk] = { geh: p.gehId, type: p.type, jour: si, entrees: [] }; ordreB.push(bk); }
      preleves.forEach(function (an) { buckets[bk].entrees.push({ an: an, n: nSupports }); });
    });
  });
  // nombre si regroupés + suggestions de regroupement (non encore faits)
  var suggestions = [];
  ordreB.forEach(function (k) {
    var b = buckets[k], parts = [];
    b.entrees.forEach(function (e) {
      var pt = parts.filter(function (x) { return x[0].an !== e.an && agentsShareSamePhysicalSupport(x[0].an, e.an); })[0];
      if (pt && !pt.some(function (x) { return x.an === e.an; })) pt.push(e); else if (!pt) parts.push([e]);
    });
    parts.forEach(function (pt) {
      supports[fsCle(pt[0].an)].echRegroupe += Math.max.apply(null, pt.map(function (x) { return x.n; }));
      if (pt.length > 1 && b.jour === 0) {
        var txt = gehDe(b.geh) + ' (' + (b.type === 'CT' ? 'CT' : '8h') + ') : ' + pt.map(function (x) { return x.an; }).join(' + ');
        if (suggestions.indexOf(txt) === -1) suggestions.push(txt);
      }
    });
  });
  var lignes = ordre.map(function (k) {
    var s = supports[k], ag = s.ag;
    return {
      cle: k, agents: s.agents, gravi: s.gravi, manuel: k.indexOf('manuel|') === 0,
      support: ag ? fsTexte(ag['Support de prélèvement']) : '', ref: ag ? fsTexte(ag['Réf. support']) : '', code: ag ? fsTexte(ag['Code support']) : '',
      labo: ag ? fsTexte(ag['Laboratoire sous-traitant']) : '',
      ech: s.ech, blancs: fsBlancs(s.ech, s.gravi), echRegroupe: s.echRegroupe, blancsRegroupe: fsBlancs(s.echRegroupe, s.gravi)
    };
  });
  return { lignes: lignes, agents: agents, materiel: materiel, parJour: parJour, suggestions: suggestions, enPrepa: m.status === 'prepa' || !(m.prelevements || []).length };
}

// ---------- Écran ----------
function ouvrirFicheSupports(retour) {
  state.ficheSupportsRetour = retour || state.view;
  state.view = 'fiche-supports';
  render();
  window.scrollTo(0, 0);
}

function fsCarteAgent(a) {
  var ag = getAgentFromDB(a.nom), h = '<div class="card fs-agent">';
  h += '<div class="fs-agent-nom">' + escapeHtml(a.nom) + '</div>';
  if (!ag) return h + '<p class="fs-alerte">Agent hors base : support, débits et conservation à vérifier.</p></div>';
  var l = function (lib, v) { v = fsTexte(v); return v ? '<div class="fs-ligne"><span>' + lib + '</span><span>' + escapeHtml(v) + '</span></div>' : ''; };
  h += l('Support', ag['Support de prélèvement']);
  var ref = [fsTexte(ag['Réf. support']) ? 'réf. ' + fsTexte(ag['Réf. support']) : '', fsTexte(ag['Code support']) ? 'code ' + fsTexte(ag['Code support']) : ''].filter(Boolean).join(' · ');
  h += l('Réf. support', ref);
  h += l('Laboratoire', ag['Laboratoire sous-traitant']);
  Object.keys(a.types || {}).forEach(function (t) {
    var fr = function (v) { return fsTexte(v).replace(/^(\d+)\.(\d+)$/, '$1,$2'); };
    var d = FS_DEBITS[t], mn = fr(ag[d[0]]), mx = fr(ag[d[1]]);
    if (mn || mx) h += l('Débit ' + t, (mn && mx && mn !== mx ? mn + ' à ' + mx : (mn || mx)) + ' L/min');
  });
  h += l('Stockage avant', ag['stockage avant prélèvement']);
  h += l('Conservation', ag['conservation après prélèvement (t°/durée max)']);
  h += l('Transport', ag['transport']);
  if (estGravimetrie(a.nom)) h += '<div class="fs-ligne"><span>Blancs</span><span>Gravimétrie : 2 blancs par lot de 15 échantillons au plus</span></div>';
  var com = typeof consigneCommentaire === 'function' ? consigneCommentaire(a.nom) : '';
  if (com) h += '<div class="fs-commentaire">' + escapeHtml(com) + '</div>';
  return h + '</div>';
}

function renderFicheSupports() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var f = ficheSupports(m), regroupable = f.lignes.some(function (l) { return l.echRegroupe < l.ech; });
  var h = '<button class="back-btn no-print" onclick="state.view=state.ficheSupportsRetour||\'home\';render();">' + ICONS.arrowLeft + ' Mission</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Fiche supports</h1>';
  h += '<p class="subtitle">' + escapeHtml(m.clientSite || '') + (m.scolaDossier ? ' · dossier ' + escapeHtml(m.scolaDossier) : '') + '</p>';
  h += '<p class="fs-note">Aide à la préparation, à vérifier : ce n’est pas un bon de commande. Nombres calculés d’après la mission ' + (f.enPrepa ? 'préparée' : 'telle que saisie sur le terrain') + '.</p>';
  h += '<button class="btn btn-gray mt-12 no-print" onclick="window.print();">' + ICONS.download + ' Imprimer / enregistrer en PDF</button></div>';
  if (!f.lignes.length && !f.materiel.analyseur) return h + '<div class="empty-state"><p>Aucun prélèvement prévu : affectez les agents aux GEH.</p></div>';

  // tableau conseil
  h += '<div class="section-title">Supports à prévoir</div><div class="card fs-tableau-carte"><table class="fs-tableau"><thead><tr><th>Support</th><th>Réf.</th><th>Échant.</th><th>Blancs</th><th>Total</th>' + (regroupable ? '<th>Si regroupés</th>' : '') + '</tr></thead><tbody>';
  f.lignes.forEach(function (l) {
    h += '<tr><td><strong>' + escapeHtml(l.manuel ? 'Hors base : ' + l.agents.join(', ') : (l.support || '?')) + '</strong><br><span class="fs-agents">' + escapeHtml(l.agents.join(', ')) + (l.labo ? ' · ' + escapeHtml(l.labo) : '') + '</span></td>';
    h += '<td>' + escapeHtml([l.ref, l.code].filter(Boolean).join(' / ') || '-') + '</td><td>' + l.ech + '</td><td>' + l.blancs + (l.gravi ? '<sup>g</sup>' : '') + '</td><td><strong>' + (l.ech + l.blancs) + '</strong></td>';
    if (regroupable) h += '<td>' + (l.echRegroupe < l.ech ? (l.echRegroupe + l.blancsRegroupe) : '=') + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table>';
  h += '<p class="fs-note">Blancs : 1 par type de support (un lot supposé) ; <sup>g</sup> gravimétrie : 2 par lot de 15 échantillons au plus. Aucune marge pour casse comptée.</p></div>';

  if (f.suggestions.length || regroupable) {
    h += '<div class="card fs-conseil"><strong>Regrouper d’abord ajuste les nombres</strong><p>Ces agents peuvent partager un même support (même support et prétraitement dans la base). S’ils sont prélevés ensemble, regroupez-les (mission sur le terrain, menu ⋯ › « Regrouper des prélèvements ») : la fiche passe à la colonne « Si regroupés ».</p>';
    if (f.suggestions.length) h += '<ul>' + f.suggestions.map(function (s) { return '<li>' + escapeHtml(s) + '</li>'; }).join('') + '</ul>';
    h += '<p>Prélèvement fractionné (plusieurs supports dans la journée) : ajoutez les supports dans le prélèvement (« + Support »), la fiche les compte.</p></div>';
  }

  // appareils
  // dates saisies puis jours du plan (J1, J2… dans l'ordre), jours « à placer » (J3/J4/J5) à la fin
  var rangJ = function (x) { var n = /^J(\d+)/.exec(x); return x.indexOf('/') !== -1 ? 1000 + (n ? +n[1] : 0) : (n ? +n[1] : 0); };
  var mt = f.materiel, jours = Object.keys(f.parJour).sort(function (a, b) { var da = /^\d{4}-/.test(a), db = /^\d{4}-/.test(b); return da !== db ? (da ? -1 : 1) : (da ? a.localeCompare(b) : rangJ(a) - rangJ(b)); });
  var titreJour = function (d) { return /^\d{4}-/.test(d) ? formatDateFR(d).slice(0, 5) : d; };
  h += '<div class="section-title">Prélèvements à équiper</div><div class="card fs-tableau-carte"><table class="fs-tableau"><thead><tr><th>Appareil</th><th>Total</th>' + jours.map(function (d) { return '<th>' + escapeHtml(titreJour(d)) + '</th>'; }).join('') + '</tr></thead><tbody>';
  [['pompe', 'Pompe (tubes, cassettes, filtres)'], ['cip10', 'CIP10'], ['analyseur', 'Analyseur (lecture directe)']].forEach(function (x) {
    if (!mt[x[0]]) return;
    h += '<tr><td>' + x[1] + '</td><td><strong>' + mt[x[0]] + '</strong></td>' + jours.map(function (d) { return '<td>' + (f.parJour[d][x[0]] || '') + '</td>'; }).join('') + '</tr>';
  });
  h += '</tbody></table><p class="fs-note">Nombre de prélèvements, par jour d’après le plan d’échantillonnage (prépa automatique, format 3) ou la date saisie. Par jour, c’est le maximum d’appareils utilisés en même temps si toutes les plages se recouvrent ; une colonne « J3/J4/J5 » = prélèvement à placer sur l’un de ces jours. Un support séquentiel réutilise la même pompe.</p></div>';

  // commentaire
  h += '<div class="section-title">Commentaire</div><div class="card"><textarea class="input fs-commentaire-saisie" rows="3" placeholder="Marge pour casse, stock disponible, remarques…" onchange="var m=getCurrentMission();if(m){m.ficheSupportsCommentaire=this.value;saveData(\'vlep_missions_v3\',state.missions);}">' + escapeHtml(m.ficheSupportsCommentaire || '') + '</textarea></div>';

  // par polluant
  h += '<div class="section-title">Par polluant</div>';
  f.agents.forEach(function (a) { h += fsCarteAgent(a); });
  return h;
}

console.log('✓ Fiche supports chargée');
