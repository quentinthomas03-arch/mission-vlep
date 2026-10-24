// bureau.js - Bureau : ce qui se fait après le terrain, à part de la saisie sur site
// © 2025 Quentin THOMAS
//
// Accueil : 1. Préparation, 2. Terrain, 3. Bureau. Le Bureau regroupe le dossier Scol@, la codification Scol@ par GEH
// (tâche, métier, procédé), la feuille de calcul et le rapport Word. Le terrain ne garde que la saisie sur site.

// Missions passées au terrain (validées, en cours, terminées)
function bureauMissions() {
  return (state.missions || []).filter(function (m) { return m.status === 'validee' || m.status === 'encours' || m.status === 'terminee'; });
}

function ouvrirBureau(id) {
  state.currentMissionId = id; state.missionMenuOpen = false; state.scolaDossierEdition = false;
  state.view = 'bureau-mission';
  render(); window.scrollTo(0, 0);
}

function renderBureauList() {
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.fileText + ' Bureau</h1><p class="subtitle">Après le terrain : Scol@, feuille de calcul et rapport Word</p></div>';
  var ml = bureauMissions();
  if (!ml.length) return h + '<div class="empty-state"><div class="empty-state-icon">' + ICONS.list + '</div><p>Aucune mission passée au terrain</p></div>';
  ml.forEach(function (m) {
    var t = 0, d = 0;
    m.prelevements.forEach(function (p) { p.subPrelevements.forEach(function (s) { if (s.nonRealise) return; t++; if (s.completed) d++; }); });
    var pct = t ? Math.round(d / t * 100) : 0;
    var scola = typeof scolaDossierManquants === 'function' && typeof FC_MODELE_DISPO !== 'undefined' && FC_MODELE_DISPO === true ? scolaDossierManquants(m) : [];
    h += '<div class="mission-card mission-card-' + m.status + '" onclick="ouvrirBureau(' + m.id + ');"><div class="mission-title">' + escapeHtml(m.clientSite || 'Sans nom') +
      '<span class="status-badge status-' + m.status + '">' + (m.status === 'validee' ? 'Prête' : (m.status === 'encours' ? 'En cours' : 'Terminée')) + '</span></div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div><div class="progress-text">' + d + '/' + t + ' prélèvements terrain' +
      (m.scolaDossier ? ' · dossier ' + escapeHtml(m.scolaDossier) : '') + (scola.length ? ' · <span style="color:var(--status-warn-fg);">Scol@ : manque ' + escapeHtml(scola.join(', ')) + '</span>' : '') + '</div></div>';
  });
  return h;
}

function renderBureauMission() {
  var m = getCurrentMission();
  if (!m) { state.view = 'bureau-list'; return renderBureauList(); }
  var fc = typeof FC_MODELE_DISPO !== 'undefined' && FC_MODELE_DISPO === true;
  var h = '<button class="back-btn" onclick="state.view=\'bureau-list\';state.currentMissionId=null;render();">' + ICONS.arrowLeft + ' Bureau</button>';
  h += '<div class="card mission-head"><div class="mission-hero"><div class="mission-hero-text"><div class="mission-hero-kicker">Bureau' + (m.scolaDossier ? ' · dossier ' + escapeHtml(m.scolaDossier) : '') + '</div>';
  h += '<h1>' + escapeHtml(m.clientSite || 'Sans nom') + '</h1></div></div></div>';
  if (typeof renderRappelSauvegarde === 'function') h += renderRappelSauvegarde(m);
  if (fc && typeof renderScolaDossierRappel === 'function') h += renderScolaDossierRappel(m);
  if (typeof renderScolaGehLigne === 'function') h += renderScolaGehLigne(m);
  if (fc) h += '<div class="row-card" onclick="exportFeuilleCalcul();">' + ICONS.sheet + '<span class="row-card-label">Feuille de calcul<span class="menu-row-sub">Générée depuis les saisies du terrain</span></span>' + ICONS.chevronRight + '</div>';
  h += '<div class="row-card" onclick="state.view=\'rapport-donnees\';render();window.scrollTo(0,0);">' + ICONS.fileText + '<span class="row-card-label">Rapport Word<span class="menu-row-sub">Données du rapport, génération</span></span>' + ICONS.chevronRight + '</div>';
  h += '<button class="add-link" onclick="state.view=\'terrain-mission\';render();window.scrollTo(0,0);">' + ICONS.clipboard + ' Saisie terrain de la mission</button>';
  return h;
}

console.log('✓ Bureau chargé');
