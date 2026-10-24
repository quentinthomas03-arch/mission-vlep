// scola-geh.js - Scol@ saisi une fois par GEH (tâche, métier, procédé, lieu, ventilation, captage)
// © 2025 Quentin THOMAS
//
// Un GEH est un groupe d'exposition homogène : ses circonstances Scol@ sont en général les mêmes pour tous ses
// prélèvements. Saisies ici (g.scola), elles sont recopiées dans chaque prélèvement du GEH (sb.scolaTache…), là où
// rien n'est saisi ou là où la valeur suivait déjà celle du GEH ; un prélèvement changé à la main (une tâche CT
// différente…) garde la sienne, et l'écran le signale avec « Appliquer à tous ». La feuille de calcul lit toujours
// les valeurs des prélèvements : rien ne change à l'export.

var SG_CHAMPS = ['scolaTache', 'scolaMetier', 'scolaProcede', 'ventEnv', 'ventEnvAutre', 'ventGenerale', 'ventGeneraleAutre', 'ventCaptage', 'ventCaptageAutre', 'scolaApr'];
// Efficacité de la protection respiratoire (liste Scol@ Plage_Protection_individuelle, hors « Absence », déduite sans EPI)
var SG_APR = ['Protection respiratoire efficace et appropriée', "Protection respiratoire efficace et appropriée avec procédures d'utilisation et de gestion de l'APR", 'Sans protection respiratoire efficace et appropriée', 'Information non relevée'];
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
// Champs essentiels manquants (lieu, ventilation et captage ont une valeur par défaut) ; protection respiratoire si un
// prélèvement du GEH a un EPI
function sgManquants(g, m) {
  var s = g.scola || {};
  var l = SG_ESSENTIELS.filter(function (c) { return !s[c[0]]; }).map(function (c) { return c[1]; });
  if (m && sgAvecEpi(m, g) && !s.scolaApr) l.push('protection respiratoire');
  return l;
}
function sgAvecEpi(m, g) { return sgSubs(m, g.id).some(function (sb) { return sb.epiType && sb.epiType !== 'sans objet'; }); }
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

// Formulaire du jour : environnement, ventilation, captage, tâche, métier et procédé repliés en une ligne quand le jour
// suit exactement son GEH (valeurs par défaut comprises) ; un écart, ou un GEH sans saisie, montre le formulaire complet
var SG_JOUR = ['ventEnv', 'ventEnvAutre', 'ventGenerale', 'ventGeneraleAutre', 'ventCaptage', 'ventCaptageAutre'];
var SG_DEFAUTS = { ventEnv: 'Local standard industriel', ventGenerale: 'non', ventCaptage: 'Non' };
function sbSuitGeh(m, p, sb) {
  var g = (m.gehs || []).filter(function (x) { return String(x.id) === String(p.gehId); })[0];
  var s = g && g.scola;
  if (!s || !['ventEnv', 'ventGenerale', 'ventCaptage'].some(function (k) { return s[k]; })) return null;
  var eff = function (o, k) { return String(o[k] || SG_DEFAUTS[k] || '').trim(); };
  if (!SG_JOUR.every(function (k) { return eff(sb, k) === eff(s, k); })) return null;
  var autre = function (k) { return eff(s, k) === 'Autre' || eff(s, k) === 'autre' ? eff(s, k + 'Autre') || 'autre' : eff(s, k); };
  var resume = [autre('ventEnv'), 'ventilation générale ' + (eff(s, 'ventGenerale') === 'autre' ? eff(s, 'ventGeneraleAutre') || 'autre' : eff(s, 'ventGenerale')), 'captage ' + autre('ventCaptage').toLowerCase()];
  return { g: g, resume: resume };
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
// ---------- Parcourir les listes sans rien écrire ----------
// Tâches : par première lettre. Métiers (11 000 appellations) : grand domaine du répertoire ROME (1re lettre du code),
// puis fiche ROME (métiers voisins, désignée par ses deux appellations les plus courtes), puis appellation.
var SG_ROME_DOMAINES = { A: 'Agriculture, pêche, espaces naturels et verts, soins aux animaux', B: 'Arts et façonnage d’ouvrages d’art', C: 'Banque, assurance, immobilier',
  D: 'Commerce, vente et grande distribution', E: 'Communication, média et multimédia', F: 'Construction, bâtiment et travaux publics', G: 'Hôtellerie-restauration, tourisme, loisirs et animation',
  H: 'Industrie', I: 'Installation et maintenance', J: 'Santé', K: 'Services à la personne et à la collectivité', L: 'Spectacle', M: 'Support à l’entreprise', N: 'Transport et logistique' };
var _sgRome = null;
function sgRomeIndex() {
  if (_sgRome) return _sgRome;
  var fiches = {};
  (SCOLA_LISTES.metier || []).forEach(function (n, i) {
    var c = (SCOLA_LISTES.metierRome || [])[i] || '';
    if (!SG_ROME_DOMAINES[c.charAt(0)]) return;
    (fiches[c] = fiches[c] || []).push(n);
  });
  var domaines = {};
  Object.keys(fiches).forEach(function (c) {
    var noms = fiches[c].slice().sort(function (a, b) { return a.length - b.length; });
    (domaines[c.charAt(0)] = domaines[c.charAt(0)] || []).push({ code: c, noms: fiches[c], titre: noms.slice(0, 2).join(', ') });
  });
  Object.keys(domaines).forEach(function (d) { domaines[d].sort(function (a, b) { return a.titre.localeCompare(b.titre, 'fr'); }); });
  return (_sgRome = domaines);
}
function sgParcours(gid, cle, maj) {
  state.sgParcours = (state.sgParcours && state.sgParcours.gid === gid && state.sgParcours.cle === cle && !maj) ? null : Object.assign({ gid: gid, cle: cle }, maj || {});
  render();
}
function sgParcoursChoisir(gid, cle, v) { state.sgParcours = null; scolaGehMaj(gid, cle, v); }
function renderSgParcours(gid, cle) {
  var p = state.sgParcours;
  if (!p || p.gid !== gid || p.cle !== cle) return '';
  var bouton = function (onclick, texte, sous, cls) { return '<button type="button" class="sg-parcours-item' + (cls ? ' ' + cls : '') + '" onclick="' + onclick + '">' + escapeHtml(texte) + (sous ? '<small>' + escapeHtml(sous) + '</small>' : '') + '</button>'; };
  var choisir = function (v) { return 'sgParcoursChoisir(' + gid + ',\'' + cle + '\',\'' + escapeJs(v) + '\');'; };
  var h = '<div class="sg-parcours">';
  if (cle === 'scolaTache') {
    var lettres = [];
    SCOLA_LISTES.tache.forEach(function (t) { var l = scolaNorm(t).charAt(0).toUpperCase(); if (lettres.indexOf(l) === -1) lettres.push(l); });
    var lettre = p.lettre || lettres[0];
    h += '<div class="sg-lettres">' + lettres.map(function (l) { return '<button type="button" class="' + (l === lettre ? 'actif' : '') + '" onclick="sgParcours(' + gid + ',\'' + cle + '\',{lettre:\'' + l + '\'});">' + l + '</button>'; }).join('') + '</div>';
    SCOLA_LISTES.tache.filter(function (t) { return scolaNorm(t).charAt(0).toUpperCase() === lettre; }).forEach(function (t) { h += bouton(choisir(t), t); });
  } else {
    var dom = sgRomeIndex();
    if (!p.domaine) {
      h += '<div class="sg-parcours-aide">Domaine professionnel (répertoire ROME)</div>';
      Object.keys(SG_ROME_DOMAINES).filter(function (d) { return dom[d]; }).forEach(function (d) {
        var n = dom[d].reduce(function (s, f) { return s + f.noms.length; }, 0);
        h += bouton('sgParcours(' + gid + ',\'' + cle + '\',{domaine:\'' + d + '\'});', SG_ROME_DOMAINES[d], n + ' métiers');
      });
    } else if (!p.fiche) {
      h += '<button type="button" class="sg-parcours-retour" onclick="sgParcours(' + gid + ',\'' + cle + '\',{});">← Domaines</button><div class="sg-parcours-aide">' + escapeHtml(SG_ROME_DOMAINES[p.domaine]) + '</div>';
      dom[p.domaine].forEach(function (f) { h += bouton('sgParcours(' + gid + ',\'' + cle + '\',{domaine:\'' + p.domaine + '\',fiche:\'' + f.code + '\'});', f.titre + (f.noms.length > 2 ? '…' : ''), f.noms.length + ' appellation' + (f.noms.length > 1 ? 's' : '')); });
    } else {
      var f = dom[p.domaine].filter(function (x) { return x.code === p.fiche; })[0] || { noms: [] };
      h += '<button type="button" class="sg-parcours-retour" onclick="sgParcours(' + gid + ',\'' + cle + '\',{domaine:\'' + p.domaine + '\'});">← ' + escapeHtml(SG_ROME_DOMAINES[p.domaine]) + '</button>';
      f.noms.forEach(function (n) { h += bouton(choisir(n), n); });
    }
  }
  return h + '</div>';
}

function sgTitre(t) { return '<div style="font-size:13px;color:var(--text-dark);margin:8px 0 4px;">' + t + '</div>'; }

// Ventilation et captage du GEH (observés sur le site) : boutons, recopiés dans les jours du GEH
function renderSgVentilation(m, g) {
  // valeurs par défaut (local standard, pas de ventilation générale, pas de captage) affichées comme choisies
  var s = Object.assign({}, SG_DEFAUTS, g.scola || {}), gid = g.id, h = '';
  h += sgTitre('Environnement') + sgBoutons(gid, 'ventEnv', s.ventEnv, [['Local standard industriel', 'Local standard industriel'], ['Lieu de travail en plein air', 'Lieu de travail en plein air'], ['Autre', 'Autre']]);
  if (s.ventEnv === 'Autre') h += sgAutre(gid, 'ventEnvAutre', s.ventEnvAutre);
  h += sgEcartLigne(m, g, 'ventEnv');
  h += sgTitre('Ventilation générale mécanique') + sgBoutons(gid, 'ventGenerale', s.ventGenerale, [['oui', 'Oui'], ['non', 'Non'], ['autre', 'Autre']]);
  if (s.ventGenerale === 'autre') h += sgAutre(gid, 'ventGeneraleAutre', s.ventGeneraleAutre);
  h += sgEcartLigne(m, g, 'ventGenerale');
  h += sgTitre('Captage localisé') + sgBoutons(gid, 'ventCaptage', s.ventCaptage, ['Non', 'Inducteur', 'Enveloppant', 'Cabine ventilée de grande dimension', 'Autre'].map(function (o) { return [o, o]; }));
  if (s.ventCaptage === 'Autre') h += sgAutre(gid, 'ventCaptageAutre', s.ventCaptageAutre);
  return h + sgEcartLigne(m, g, 'ventCaptage');
}
// Résumé « local standard · ventilation générale non · captage enveloppant » des valeurs du GEH (défauts compris)
function sgVentResume(g) {
  var s = g.scola || {}, v = function (k) { return s[k] || SG_DEFAUTS[k] || ''; };
  var autre = function (k) { return /^autre$/i.test(v(k)) ? s[k + 'Autre'] || 'autre' : v(k); };
  return autre('ventEnv') + ' · ventilation générale ' + autre('ventGenerale') + ' · captage ' + autre('ventCaptage').toLowerCase();
}
// Terrain, en tête de chaque GEH : une ligne, l'éditeur sur demande
function renderVentilationGeh(m, g) {
  var ouvert = state.ventGehOuvert && state.ventGehOuvert[g.id];
  var bascule = 'if(!state.ventGehOuvert)state.ventGehOuvert={};state.ventGehOuvert[' + g.id + ']=' + (ouvert ? 'false' : 'true') + ';render();';
  var h = '<div class="vent-geh"><div class="vent-geh-ligne"><span><strong>Ventilation et captage du GEH</strong> : ' + escapeHtml(sgVentResume(g)) + '</span>';
  h += '<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="' + bascule + '">' + (ouvert ? 'Fermer' : 'Modifier') + '</button></div>';
  if (ouvert) h += '<div style="padding-top:4px;">' + renderSgVentilation(m, g) + '<div style="font-size:11px;color:var(--text-muted);">Recopié dans les prélèvements du GEH ; un jour différent se modifie dans le prélèvement.</div></div>';
  return h + '</div>';
}
// Bureau : ce que Scol@ reprend des observations du terrain (lecture seule)
function renderSgObserveTerrain(m, g) {
  var epi = {};
  sgSubs(m, g.id).forEach(function (sb) { var e = sb.epiType && sb.epiType !== 'sans objet' ? sb.epiType : 'sans EPI'; epi[e] = (epi[e] || 0) + 1; });
  var ecarts = ['ventEnv', 'ventGenerale', 'ventCaptage'].reduce(function (n, k) { return n + sgEcarts(m, g, k); }, 0);
  var h = '<div class="sg-terrain">' + sgTitre('Observé sur le terrain, repris par Scol@');
  h += '<div>' + escapeHtml(sgVentResume(g)) + '</div><div>EPI : ' + escapeHtml(Object.keys(epi).map(function (e) { return e + ' (' + epi[e] + ' j)'; }).join(', ') || '—') + '</div>';
  if (ecarts) h += '<div style="color:#b45309;">' + ecarts + ' jour' + (ecarts > 1 ? 's' : '') + ' avec une autre ventilation ou un autre captage, saisi' + (ecarts > 1 ? 's' : '') + ' sur le terrain</div>';
  return h + '<div style="font-size:11px;color:var(--text-muted);">Lieu, ventilation, captage et type de protection de Scol@ en découlent ; à corriger dans la saisie terrain.</div></div>';
}

function renderScolaGehChamps(m, g) {
  var s = g.scola || {}, gid = g.id, h = '';
  [['scolaTache', 'tache', 'Tâche', 'Rechercher une tâche (ex. pistolet, ponçage)…'], ['scolaMetier', 'metier', 'Métier', 'Rechercher un métier (ex. peintre, soudeur)…']].forEach(function (c) {
    h += sgTitre(c[2]);
    if (s[c[0]]) {
      h += '<div style="display:flex;align-items:center;gap:6px;background:var(--primary-pale);border-radius:8px;padding:6px 8px;font-size:12px;margin-bottom:6px;"><span style="flex:1;">' + escapeHtml(s[c[0]]) + '</span>';
      h += '<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="scolaGehMaj(' + gid + ',\'' + c[0] + '\',\'\');">Changer</button></div>';
    } else {
      var ouvert = state.sgParcours && state.sgParcours.gid === gid && state.sgParcours.cle === c[0];
      h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;"><input type="text" class="input" style="margin:0;flex:1;" placeholder="' + escapeHtml(c[3]) + '" oninput="scolaGehRechercher(' + gid + ',\'' + c[0] + '\',this.value);">';
      h += '<button type="button" class="btn btn-small ' + (ouvert ? 'btn-primary' : 'btn-gray') + '" style="width:auto;margin:0;white-space:nowrap;" onclick="sgParcours(' + gid + ',\'' + c[0] + '\');">' + (ouvert ? 'Fermer' : 'Parcourir') + '</button></div>';
      h += '<div id="sg-res-' + gid + '-' + c[0] + '"></div>' + renderSgParcours(gid, c[0]);
    }
    h += sgEcartLigne(m, g, c[0]);
  });
  h += sgTitre('Type de procédé') + sgBoutons(gid, 'scolaProcede', s.scolaProcede, SCOLA_LISTES.procede.map(function (o) { return [o, o.replace(/\s*\(anciennement[^)]*\)/, '')]; })) + sgEcartLigne(m, g, 'scolaProcede');
  h += renderSgObserveTerrain(m, g);
  if (sgAvecEpi(m, g) || s.scolaApr) {
    h += sgTitre('Protection respiratoire (EPI porté)') + sgBoutons(gid, 'scolaApr', s.scolaApr, SG_APR.map(function (o) { return [o, o.replace(/^Protection respiratoire /, '').replace(/^efficace et appropriée avec procédures.*/, 'efficace et appropriée, avec procédures d’utilisation et de gestion')]; }));
    h += '<div style="font-size:12px;color:var(--text-muted);margin:-2px 0 6px;">Le type de protection (demi-masque FFP2…) vient de l’EPI saisi ; sans EPI : « Absence de protection respiratoire ».</div>' + sgEcartLigne(m, g, 'scolaApr');
  }
  return h;
}

function renderScolaGeh() {
  var m = getCurrentMission();
  if (!m) { state.view = 'terrain-list'; render(); return ''; }
  if (!state.sgOuvert) state.sgOuvert = {};
  var h = '<button class="back-btn" onclick="state.view=\'bureau-mission\';render();">' + ICONS.arrowLeft + ' Bureau</button>';
  h += '<div class="card"><h2>' + ICONS.clipboard + ' Scol@ par GEH</h2><p class="subtitle">Tâche, métier, procédé et efficacité de la protection respiratoire, une fois par GEH, recopiés dans ses prélèvements. Lieu, ventilation, captage et EPI viennent du terrain.</p></div>';
  var gehs = (m.gehs || []).filter(function (g) { return g.name; });
  gehs.forEach(function (g) {
    var manq = sgManquants(g, m), ouvert = state.sgOuvert[g.id] || (gehs.length === 1);
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
  var n = gehs.filter(function (g) { return sgManquants(g, m).length; }).length;
  return '<div class="row-card" onclick="state.view=\'scola-geh\';render();window.scrollTo(0,0);">' + ICONS.clipboard + '<span class="row-card-label">Scol@ par GEH</span>' +
    '<span style="font-size:12px;color:' + (n ? '#b45309' : 'var(--accent)') + ';margin-right:6px;">' + (n ? n + ' à compléter' : 'complet') + '</span>' + ICONS.chevronRight + '</div>';
}

console.log('✓ Scol@ par GEH chargé');
