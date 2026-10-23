// scola-geh.js - Scol@ saisi une fois par GEH (tâche, métier, procédé, lieu, ventilation, captage)
// © 2025 Quentin THOMAS
//
// Un GEH est un groupe d'exposition homogène : ses circonstances Scol@ sont en général les mêmes pour tous ses
// prélèvements. Saisies ici (g.scola), elles sont recopiées dans chaque prélèvement du GEH (sb.scolaTache…), là où
// rien n'est saisi ou là où la valeur suivait déjà celle du GEH ; un prélèvement changé à la main (une tâche CT
// différente…) garde la sienne, et l'écran le signale avec « Appliquer à tous ». La feuille de calcul lit toujours
// les valeurs des prélèvements : rien ne change à l'export.

var SG_CHAMPS = ['scolaTache', 'scolaMetier', 'scolaProcede', 'ventEnv', 'ventEnvAutre', 'ventGenerale', 'ventGeneraleAutre', 'ventCaptage', 'ventCaptageAutre'];
var SG_ESSENTIELS = [['scolaTache', 'tâche'], ['scolaMetier', 'métier'], ['scolaProcede', 'procédé']];

function sgDisponible() { return typeof SCOLA_LISTES !== 'undefined' && typeof FC_MODELE_DISPO !== 'undefined' && FC_MODELE_DISPO === true; }

// Prélèvements (jours) du GEH, non réalisés exclus
function sgSubs(m, gid) {
  var l = [];
  (m.prelevements || []).forEach(function (p) {
    if (String(p.gehId) !== String(gid)) return;
    (p.subPrelevements || []).forEach(function (sb) { if (!sb.nonRealise) l.push(sb); });
  });
  return l;
}
// Champs essentiels manquants (lieu, ventilation et captage ont une valeur par défaut)
function sgManquants(g) {
  var s = g.scola || {};
  return SG_ESSENTIELS.filter(function (c) { return !s[c[0]]; }).map(function (c) { return c[1]; });
}
// Prélèvements dont la valeur diffère de celle du GEH (saisie à la main)
function sgEcarts(m, g, k) {
  var v = (g.scola || {})[k];
  if (!v) return 0;
  return sgSubs(m, g.id).filter(function (sb) { return sb[k] && sb[k] !== v; }).length;
}

// Saisie d'un champ du GEH : recopiée là où le prélèvement est vide ou suivait l'ancienne valeur du GEH
function scolaGehRecopier(m, g, k, v) {
  if (!g.scola) g.scola = {};
  var ancien = g.scola[k] || '';
  if (v) g.scola[k] = v; else delete g.scola[k];
  sgSubs(m, g.id).forEach(function (sb) {
    if (!sb[k] || sb[k] === ancien) { if (v) sb[k] = v; else delete sb[k]; }
  });
}
// Prélèvements créés après la saisie du GEH (validation, ajout sur le terrain, export) : champs vides complétés
function scolaGehCompleter(m) {
  (m.gehs || []).forEach(function (g) {
    var s = g.scola; if (!s) return;
    sgSubs(m, g.id).forEach(function (sb) { SG_CHAMPS.forEach(function (k) { if (s[k] && !sb[k]) sb[k] = s[k]; }); });
  });
}

function sgGeh(gid) { var m = getCurrentMission(); return m ? { m: m, g: (m.gehs || []).filter(function (x) { return String(x.id) === String(gid); })[0] } : {}; }
function scolaGehMaj(gid, k, v) {
  var o = sgGeh(gid); if (!o.g) return;
  scolaGehRecopier(o.m, o.g, k, v);
  saveData('vlep_missions_v3', state.missions);
  render();
}
function scolaGehAppliquerTous(gid, k) {
  var o = sgGeh(gid); if (!o.g || !o.g.scola || !o.g.scola[k]) return;
  var n = sgEcarts(o.m, o.g, k);
  if (!confirm('Remplacer la valeur saisie à la main sur ' + n + ' prélèvement' + (n > 1 ? 's' : '') + ' par celle du GEH ?')) return;
  sgSubs(o.m, o.g.id).forEach(function (sb) { sb[k] = o.g.scola[k]; });
  saveData('vlep_missions_v3', state.missions);
  render();
}

// Recherche dans une liste Scol@ (tâche, métier) pour un GEH, sans tout redessiner (clavier gardé ouvert)
function scolaGehRechercher(gid, cle, valeur) {
  var box = document.getElementById('sg-res-' + gid + '-' + cle);
  if (!box) return;
  var res = scolaResultats(cle, valeur);
  if (res === null) { box.innerHTML = ''; return; }
  if (!res.length) { box.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:4px;">Aucun résultat dans la liste Scol@</div>'; return; }
  box.innerHTML = '<div class="search-results">' + res.map(function (r) {
    return '<div class="search-result-item" onmousedown="event.preventDefault();" onclick="scolaGehMaj(' + gid + ',\'' + cle + '\',\'' + escapeJs(r) + '\');">' + escapeHtml(r) + '</div>';
  }).join('') + '</div>';
}

// ---------- Écran ----------

function sgBoutons(gid, k, valeur, options) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">' + options.map(function (o) {
    var v = o[0], sel = valeur === v;
    return '<button type="button" class="btn btn-small ' + (sel ? 'btn-primary' : 'btn-gray') + '" style="width:auto;" onclick="scolaGehMaj(' + gid + ',\'' + k + '\',' + (sel ? '\'\'' : '\'' + escapeJs(v) + '\'') + ');">' + escapeHtml(o[1]) + '</button>';
  }).join('') + '</div>';
}
function sgAutre(gid, k, valeur) {
  return '<input type="text" class="input" style="margin-bottom:6px;" value="' + escapeHtml(valeur || '') + '" placeholder="Préciser" onchange="scolaGehMaj(' + gid + ',\'' + k + '\',this.value.trim());">';
}
function sgEcartLigne(m, g, k) {
  var n = sgEcarts(m, g, k);
  if (!n) return '';
  return '<div style="font-size:12px;color:#b45309;margin:-2px 0 8px;">' + n + ' prélèvement' + (n > 1 ? 's ont' : ' a') + ' une autre valeur, saisie à la main · <a href="#" onclick="event.preventDefault();scolaGehAppliquerTous(' + g.id + ',\'' + k + '\');">Appliquer à tous</a></div>';
}
function sgTitre(t) { return '<div style="font-size:13px;color:var(--text-dark);margin:8px 0 4px;">' + t + '</div>'; }

function renderScolaGehChamps(m, g) {
  var s = g.scola || {}, gid = g.id, h = '';
  [['scolaTache', 'tache', 'Tâche', 'Rechercher une tâche (ex. pistolet, ponçage)…'], ['scolaMetier', 'metier', 'Métier', 'Rechercher un métier (ex. peintre, soudeur)…']].forEach(function (c) {
    h += sgTitre(c[2]);
    if (s[c[0]]) {
      h += '<div style="display:flex;align-items:center;gap:6px;background:var(--primary-pale);border-radius:8px;padding:6px 8px;font-size:12px;margin-bottom:6px;"><span style="flex:1;">' + escapeHtml(s[c[0]]) + '</span>';
      h += '<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="scolaGehMaj(' + gid + ',\'' + c[0] + '\',\'\');">Changer</button></div>';
    } else {
      h += '<input type="text" class="input" style="margin-bottom:4px;" placeholder="' + escapeHtml(c[3]) + '" oninput="scolaGehRechercher(' + gid + ',\'' + c[0] + '\',this.value);">';
      h += '<div id="sg-res-' + gid + '-' + c[0] + '"></div>';
    }
    h += sgEcartLigne(m, g, c[0]);
  });
  h += sgTitre('Type de procédé') + sgBoutons(gid, 'scolaProcede', s.scolaProcede, SCOLA_LISTES.procede.map(function (o) { return [o, o.replace(/\s*\(anciennement[^)]*\)/, '')]; })) + sgEcartLigne(m, g, 'scolaProcede');
  h += sgTitre('Environnement') + sgBoutons(gid, 'ventEnv', s.ventEnv, [['Local standard industriel', 'Local standard industriel'], ['Lieu de travail en plein air', 'Lieu de travail en plein air'], ['Autre', 'Autre']]);
  if (s.ventEnv === 'Autre') h += sgAutre(gid, 'ventEnvAutre', s.ventEnvAutre);
  h += sgEcartLigne(m, g, 'ventEnv');
  h += sgTitre('Ventilation générale mécanique') + sgBoutons(gid, 'ventGenerale', s.ventGenerale, [['oui', 'Oui'], ['non', 'Non'], ['autre', 'Autre']]);
  if (s.ventGenerale === 'autre') h += sgAutre(gid, 'ventGeneraleAutre', s.ventGeneraleAutre);
  h += sgEcartLigne(m, g, 'ventGenerale');
  h += sgTitre('Captage localisé') + sgBoutons(gid, 'ventCaptage', s.ventCaptage, ['Non', 'Inducteur', 'Enveloppant', 'Cabine ventilée de grande dimension', 'Autre'].map(function (o) { return [o, o]; }));
  if (s.ventCaptage === 'Autre') h += sgAutre(gid, 'ventCaptageAutre', s.ventCaptageAutre);
  h += sgEcartLigne(m, g, 'ventCaptage');
  return h;
}

function renderScolaGeh() {
  var m = getCurrentMission();
  if (!m) { state.view = 'terrain-list'; render(); return ''; }
  if (!state.sgOuvert) state.sgOuvert = {};
  var h = '<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">' + ICONS.arrowLeft + ' Mission</button>';
  h += '<div class="card"><h2>' + ICONS.clipboard + ' Scol@ par GEH</h2><p class="subtitle">Saisi une fois par GEH, recopié dans tous ses prélèvements. Un prélèvement changé à la main garde sa valeur.</p></div>';
  var gehs = (m.gehs || []).filter(function (g) { return g.name; });
  gehs.forEach(function (g) {
    var manq = sgManquants(g), ouvert = state.sgOuvert[g.id] || (gehs.length === 1);
    var nb = sgSubs(m, g.id).length;
    h += '<div class="accordion"><div class="accordion-header ' + (ouvert ? 'open' : '') + '" onclick="state.sgOuvert[' + g.id + ']=!state.sgOuvert[' + g.id + '];render();"><span class="accordion-icon">' + ICONS.chevronRight + '</span>';
    h += '<span class="accordion-title">' + g.num + '. ' + escapeHtml(g.name) + '</span>';
    h += '<span class="accordion-count" style="' + (manq.length ? 'color:#b45309;' : '') + '">' + (manq.length ? 'à compléter' : 'complet') + '</span></div>';
    if (ouvert) {
      h += '<div class="accordion-body open" style="padding:8px 12px;">';
      h += '<div style="font-size:12px;color:var(--text-muted);">' + nb + ' prélèvement' + (nb > 1 ? 's' : '') + ' dans ce GEH' + (manq.length ? ' · manque : ' + manq.join(', ') : '') + '</div>';
      h += renderScolaGehChamps(m, g) + '</div>';
    }
    h += '</div>';
  });
  return h;
}

// Ligne de l'écran mission : nombre de GEH à compléter
function renderScolaGehLigne(m) {
  if (!sgDisponible()) return '';
  var gehs = (m.gehs || []).filter(function (g) { return g.name; });
  if (!gehs.length) return '';
  var n = gehs.filter(function (g) { return sgManquants(g).length; }).length;
  return '<div class="row-card" onclick="state.view=\'scola-geh\';render();window.scrollTo(0,0);">' + ICONS.clipboard + '<span class="row-card-label">Scol@ par GEH</span>' +
    '<span style="font-size:12px;color:' + (n ? '#b45309' : 'var(--accent)') + ';margin-right:6px;">' + (n ? n + ' à compléter' : 'complet') + '</span>' + ICONS.chevronRight + '</div>';
}

console.log('✓ Scol@ par GEH chargé');
