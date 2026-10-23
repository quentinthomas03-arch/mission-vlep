// regroupement.js - Regrouper des prélèvements (remplace « Fusionner intelligemment » et « Fusion manuelle »)
// © 2025 Quentin THOMAS
//
// Regrouper = plusieurs agents d'un même GEH et d'un même type (8h / CT) suivis sur le même opérateur, les mêmes jours
// et aux mêmes horaires : un seul prélèvement dans l'appli. Les agents que la base place sur le même support (code
// support et prétraitement identiques) partagent alors un seul support : « Même support » est coché pour tous les jours.
// Rien n'est regroupé sans un geste du technicien ; l'écran propose, par GEH :
//   - les agents d'un même support (un seul tube / filtre par jour) ;
//   - « tout le GEH » quand c'est sans risque (mêmes nombres de jours, mêmes jours prévus, aucune saisie en conflit) ;
//   - un choix libre.
// « Tout regrouper » applique en une fois les propositions sûres, après une liste à cocher.

var REG_CHAMPS = ['operateur', 'date', 'observations', 'dureeExpo', 'epiType', 'epiDuree', 'ventEnv', 'ventEnvAutre', 'ventGenerale', 'ventGeneraleAutre',
  'ventCaptage', 'ventCaptageAutre', 'scolaTache', 'scolaMetier', 'scolaProcede', 'jourPrevu', 'posteFixe', 'ecart', 'ecartMotif'];
var REG_SYNC = ['numPompe', 'debitInitial', 'debitFinal', 'refEchantillon', 'lot'];

function regVide(f, v) { return v === undefined || v === null || v === false || String(v).trim() === '' || (f === 'epiType' && v === 'sans objet'); }
function regPlages(sb) { return (sb.plages || []).filter(function (pl) { return pl.debut || pl.fin; }).map(function (pl) { return (pl.debut || '?') + '-' + (pl.fin || '?'); }).join(', '); }
function regNoms(p) { return (p.agents || []).map(function (a) { return a.name; }); }
function regCle(p) { return p.gehId + '|' + p.type + '|' + (p.isReglementaire ? 1 : 0); }

// Partition des agents par support physique d'après la base (analyseurs à part : rien à partager)
function regPartitionSupport(noms) {
  var parts = [];
  noms.forEach(function (n) {
    var pt = isAnalyseurAgent(n) ? null : parts.filter(function (x) { return !isAnalyseurAgent(x[0]) && agentsShareSamePhysicalSupport(x[0], n); })[0];
    if (pt) pt.push(n); else parts.push([n]);
  });
  return parts;
}

// « 1 support (tube de charbon actif) » / « 2 supports » d'un prélèvement à plusieurs agents (premier jour réalisé)
function regSupportsTexte(p) {
  var sb = (p.subPrelevements || []).filter(function (s) { return !s.nonRealise; })[0] || (p.subPrelevements || [])[0];
  if (!sb) return '';
  var noms = regNoms(p).filter(function (n) { return !isAnalyseurAgent(n); }), vus = {}, n = 0;
  noms.forEach(function (a) {
    if (vus[a]) return;
    var g = getCoPrelGroupMembers(sb, a).filter(function (x) { return noms.indexOf(x) !== -1; });
    (g.length > 1 ? g : [a]).forEach(function (x) { vus[x] = true; });
    n++;
  });
  if (!n) return '';
  var ag = getAgentFromDB(noms[0]), sup = ag ? String(ag['Support de prélèvement'] || '').replace(/\s+/g, ' ').trim() : '';
  return n === 1 ? '1 support' + (sup ? ' (' + sup + ')' : '') : n + ' supports';
}

// Ce qui empêche un regroupement d'être « sûr » : saisies en conflit (gardées : celles du premier prélèvement),
// nombres de jours ou jours prévus différents, réf. d'échantillon différentes pour des agents d'un même support.
function regAnalyse(prels) {
  var r = { pertes: [], raisons: [] }, garde = prels[0];
  var nb = prels.map(function (p) { return p.subPrelevements.length; });
  if (nb.some(function (x) { return x !== nb[0]; })) r.raisons.push('Nombre de prélèvements différent (' + nb.join(' / ') + ') : les jours en plus sont ajoutés');
  for (var s = 0; s < nb[0]; s++) {
    var jp = prels.map(function (p) { return (p.subPrelevements[s] || {}).jourPrevu || ''; }).filter(Boolean);
    if (jp.some(function (x) { return x !== jp[0]; })) { r.raisons.push('Jours prévus au plan différents (J' + (s + 1) + ' : ' + jp.join(' / ') + ')'); break; }
  }
  prels.slice(1).forEach(function (o) {
    var qui = '« ' + regNoms(o).join(' + ') + ' »';
    o.subPrelevements.forEach(function (b, s) {
      var a = garde.subPrelevements[s];
      if (!a) return;
      var j = 'J' + (s + 1) + ' de ' + qui;
      [['operateur', 'opérateur'], ['date', 'date'], ['observations', 'observation'], ['dureeExpo', 'durée d’exposition'], ['epiType', 'EPI']].forEach(function (x) {
        var vb = b[x[0]], va = a[x[0]];
        if (!regVide(x[0], vb) && !regVide(x[0], va) && String(vb).trim() !== String(va).trim()) r.pertes.push(j + ' : ' + x[1] + ' « ' + String(vb).trim().slice(0, 40) + ' » non repris (« ' + String(va).trim().slice(0, 40) + ' » gardé)');
      });
      var pb = regPlages(b), pa = regPlages(a);
      if (pb && pa && pb !== pa) r.pertes.push(j + ' : plages ' + pb + ' non reprises (' + pa + ' gardées)');
      if (!!a.nonRealise !== !!b.nonRealise) r.pertes.push(j + ' : réalisé d’un côté, non réalisé de l’autre (le jour devient à réaliser)');
    });
  });
  // agents d'un même support déjà prélevés sur des supports différents (réf. différentes) : pas de « Même support »
  var noms = []; prels.forEach(function (p) { noms = noms.concat(regNoms(p)); });
  r.supportsSepares = [];
  regPartitionSupport(noms).filter(function (pt) { return pt.length > 1; }).forEach(function (pt) {
    var conflit = false;
    for (var s2 = 0; s2 < nb[0] && !conflit; s2++) {
      var refs = {};
      prels.forEach(function (p) { var sb = p.subPrelevements[s2]; if (!sb) return; pt.forEach(function (n) { var d = sb.agentData && sb.agentData[n], v = d && String(d.refEchantillon || '').trim(); if (v) refs[v] = true; }); });
      if (Object.keys(refs).length > 1) conflit = true;
    }
    if (conflit) { r.supportsSepares.push(pt); r.raisons.push(pt.join(' + ') + ' : réf. d’échantillon différentes, supports séparés gardés'); }
  });
  r.sur = !r.pertes.length && !r.raisons.length;
  return r;
}

// Regroupe `prels` (même GEH, même type, même statut) dans le premier. Renvoie le prélèvement gardé.
function regrouperPrelevements(m, prels) {
  var garde = prels[0], an = regAnalyse(prels);
  prels.slice(1).forEach(function (o) {
    (o.agents || []).forEach(function (a) { if (!garde.agents.some(function (x) { return x.name === a.name; })) garde.agents.push(a); });
    o.subPrelevements.forEach(function (b, s) {
      var a = garde.subPrelevements[s];
      if (!a) { garde.subPrelevements.push(b); return; }
      if (!a.agentData) a.agentData = {};
      Object.keys(b.agentData || {}).forEach(function (n) { if (!a.agentData[n]) a.agentData[n] = b.agentData[n]; });
      REG_CHAMPS.forEach(function (f) { if (regVide(f, a[f]) && !regVide(f, b[f])) a[f] = b[f]; });
      if (!regPlages(a) && regPlages(b)) a.plages = b.plages;
      (b.coPrelGroups || []).forEach(function (g) { if (!a.coPrelGroups) a.coPrelGroups = []; a.coPrelGroups.push(g.slice()); });
      mergeSupportsSupp(a, b);
      a.completed = !!(a.completed && b.completed);
      a.nonRealise = !!(a.nonRealise && b.nonRealise);
    });
    if (!garde.plagePrevue && o.plagePrevue) garde.plagePrevue = o.plagePrevue;
    if (!garde.justifNb && o.justifNb) garde.justifNb = o.justifNb;
    var i = m.prelevements.indexOf(o);
    if (i !== -1) m.prelevements.splice(i, 1);
  });
  regMemeSupport(garde, an.supportsSepares);
  return garde;
}

// « Même support » pour les agents que la base place sur le même support, tous les jours (supports successifs compris) ;
// pompe, débits, réf. et lot recopiés entre eux (première valeur saisie)
function regMemeSupport(p, exclus) {
  var cles = function (pt) { return pt.slice().sort().join('|'); }, ex = (exclus || []).map(cles);
  var parts = regPartitionSupport(regNoms(p)).filter(function (pt) { return pt.length > 1 && ex.indexOf(cles(pt)) === -1; });
  if (!parts.length) return;
  p.subPrelevements.forEach(function (sb) {
    var groupes = (sb.coPrelGroups || []).map(function (g) { return g.slice(); }).concat(parts.map(function (pt) { return pt.slice(); }));
    // groupes qui se recoupent réunis
    var fini = false;
    while (!fini) {
      fini = true;
      for (var i = 0; i < groupes.length && fini; i++) for (var j = i + 1; j < groupes.length && fini; j++) {
        if (groupes[i].some(function (n) { return groupes[j].indexOf(n) !== -1; })) {
          groupes[i] = groupes[i].concat(groupes[j].filter(function (n) { return groupes[i].indexOf(n) === -1; }));
          groupes.splice(j, 1); fini = false;
        }
      }
    }
    sb.coPrelGroups = groupes.filter(function (g) { return g.length > 1; });
    expandSubSupports(sb).forEach(function (s) {
      if (!s.agentData) s.agentData = {};
      sb.coPrelGroups.forEach(function (g) {
        REG_SYNC.forEach(function (f) {
          var v = null;
          g.forEach(function (n) { var d = s.agentData[n]; if (v === null && d && String(d[f] || '').trim()) v = d[f]; });
          if (v === null) return;
          g.forEach(function (n) { if (!s.agentData[n]) s.agentData[n] = {}; if (!String(s.agentData[n][f] || '').trim()) s.agentData[n][f] = v; });
        });
      });
    });
  });
}

// Propositions par GEH × type × statut : [{ titre, cartes: [{ id, nature: 'support' | 'geh', ids, texte }] , prels }]
function regPropositions(m) {
  var parCle = {}, ordre = [];
  (m.prelevements || []).forEach(function (p) {
    var k = regCle(p);
    if (!parCle[k]) { parCle[k] = []; ordre.push(k); }
    parCle[k].push(p);
  });
  var gehDe = function (id) { return (m.gehs || []).filter(function (g) { return String(g.id) === String(id); })[0]; };
  return ordre.filter(function (k) { return parCle[k].length > 1; }).map(function (k) {
    var ps = parCle[k], p0 = ps[0], g = gehDe(p0.gehId), cartes = [];
    // agents d'un même support : prélèvements dont tous les agents partagent le support du premier
    var restants = ps.slice();
    while (restants.length) {
      var ref = restants.shift(), r0 = regNoms(ref).filter(function (n) { return !isAnalyseurAgent(n); })[0];
      if (!r0 || regNoms(ref).some(function (n) { return n !== r0 && !agentsShareSamePhysicalSupport(r0, n); })) continue;
      var avec = restants.filter(function (p) { return regNoms(p).every(function (n) { return !isAnalyseurAgent(n) && agentsShareSamePhysicalSupport(r0, n); }); });
      if (!avec.length) continue;
      restants = restants.filter(function (p) { return avec.indexOf(p) === -1; });
      var groupe = [ref].concat(avec), ag = getAgentFromDB(r0), sup = ag ? String(ag['Support de prélèvement'] || '').replace(/\s+/g, ' ').trim() : 'même support';
      cartes.push({ id: 's' + ref.id, nature: 'support', ids: groupe.map(function (p) { return p.id; }), texte: 'Même support dans la base (' + sup + ') : 1 support par jour au lieu de ' + groupe.length });
    }
    // tout le GEH sur un même opérateur, seulement si c'est sûr
    var a = regAnalyse(ps);
    if (a.sur && !(cartes.length === 1 && cartes[0].ids.length === ps.length)) {
      var noms = []; ps.forEach(function (p) { noms = noms.concat(regNoms(p)); });
      var nSup = regPartitionSupport(noms.filter(function (n) { return !isAnalyseurAgent(n); })).length;
      cartes.push({ id: 'g' + k, nature: 'geh', ids: ps.map(function (p) { return p.id; }), texte: 'Tout le GEH : même opérateur, mêmes jours et horaires ; ' + nSup + ' support' + (nSup > 1 ? 's' : '') + ' par jour au lieu de ' + ps.length });
    }
    return { cle: k, titre: (g ? 'GEH ' + g.num + ' – ' + g.name : 'GEH') + ' · ' + (p0.type === 'CT' ? 'CT' : '8h') + (p0.isReglementaire ? '' : ' · non régl.'), prels: ps, cartes: cartes };
  });
}

// Actions de « Tout regrouper » : par GEH, « tout le GEH » s'il est proposé, sinon les regroupements de support sûrs
function regActionsGlobales(m) {
  var out = [];
  regPropositions(m).forEach(function (b) {
    var geh = b.cartes.filter(function (c) { return c.nature === 'geh'; })[0];
    if (geh) { out.push({ id: geh.id, titre: b.titre, ids: geh.ids, texte: geh.texte }); return; }
    b.cartes.forEach(function (c) {
      var ps = c.ids.map(function (id) { return m.prelevements.filter(function (p) { return p.id === id; })[0]; });
      if (regAnalyse(ps).sur) out.push({ id: c.id, titre: b.titre, ids: c.ids, texte: c.texte });
    });
  });
  return out;
}

// ---------- Écran ----------
function ouvrirRegroupement() {
  state.reg = { exclus: {}, choix: {}, global: null };
  state.view = 'regroupement';
  render();
  window.scrollTo(0, 0);
}

function regIds(ps) { return '[' + ps.map(function (p) { return typeof p.id === 'number' ? p.id : '\'' + escapeJs(String(p.id)) + '\''; }).join(',') + ']'; }
function regPrels(m, ids) { return ids.map(function (id) { return m.prelevements.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean); }
function regLibelle(p) { return regNoms(p).join(' + ') + ' · ' + p.subPrelevements.length + ' prél.'; }

function regAvertissements(a) {
  var l = a.raisons.concat(a.pertes);
  if (!l.length) return '';
  return '<div class="reg-alerte">' + l.slice(0, 6).map(escapeHtml).join('<br>') + (l.length > 6 ? '<br>… et ' + (l.length - 6) + ' autre(s)' : '') + '</div>';
}

function renderRegroupement() {
  var m = getCurrentMission();
  if (!m) { state.view = 'terrain-list'; return renderTerrainList(); }
  if (!state.reg) state.reg = { exclus: {}, choix: {}, global: null };
  var R = state.reg, blocs = regPropositions(m), actions = regActionsGlobales(m);
  var h = '<button class="back-btn" onclick="state.view=\'terrain-mission\';state.reg=null;render();">' + ICONS.arrowLeft + ' Mission</button>';
  h += '<div class="card"><h1>' + ICONS.merge + ' Regrouper des prélèvements</h1>';
  h += '<p class="subtitle">Plusieurs agents d’un même GEH suivis sur le même opérateur, les mêmes jours et aux mêmes horaires. Les agents d’un même support partagent un seul support (« Même support » coché pour tous les jours). « Séparer », dans la liste de la mission, défait un regroupement.</p>';
  if (actions.length) h += '<button class="btn btn-primary mt-12" onclick="state.reg.global={};render();">' + ICONS.zap + ' Tout regrouper (' + actions.length + ' proposition' + (actions.length > 1 ? 's' : '') + ' sûre' + (actions.length > 1 ? 's' : '') + ')</button>';
  h += '</div>';
  if (!blocs.length) return h + '<div class="empty-state"><p>Aucun regroupement possible : il faut au moins deux prélèvements d’un même GEH et d’un même type.</p></div>';

  blocs.forEach(function (b) {
    if (!b.cartes.length) return;
    h += '<div class="section-title">' + escapeHtml(b.titre) + '</div>';
    b.cartes.forEach(function (c) {
      var ex = R.exclus[c.id] || {}, ps = regPrels(m, c.ids.filter(function (id) { return !ex[id]; })), a = ps.length > 1 ? regAnalyse(ps) : null;
      h += '<div class="card reg-carte' + (c.nature === 'support' ? ' reg-support' : '') + '">';
      c.ids.forEach(function (id) {
        var p = regPrels(m, [id])[0]; if (!p) return;
        h += '<label class="reg-ligne"><input type="checkbox"' + (ex[id] ? '' : ' checked') + ' onchange="state.reg.exclus[\'' + c.id + '\']=state.reg.exclus[\'' + c.id + '\']||{};state.reg.exclus[\'' + c.id + '\'][\'' + id + '\']=!this.checked;render();"> ' + escapeHtml(regLibelle(p)) + '</label>';
      });
      h += '<p class="reg-texte">' + escapeHtml(c.texte) + '</p>';
      if (a) h += regAvertissements(a);
      h += '<button class="btn ' + (a && a.sur ? 'btn-success' : 'btn-gray') + ' btn-small mt-8" ' + (ps.length < 2 ? 'disabled' : '') + ' onclick="regValider(' + regIds(ps) + ');">' + (a && !a.sur ? 'Regrouper quand même' : 'Regrouper') + '</button>';
      h += '</div>';
    });
  });

  // choix libre
  h += '<div class="section-title">Choisir moi-même</div><div class="card"><p class="subtitle" style="margin-bottom:6px;">Cocher au moins deux prélèvements d’un même GEH et d’un même type.</p>';
  blocs.forEach(function (b) {
    var choisis = b.prels.filter(function (p) { return R.choix[p.id]; });
    h += '<div class="reg-libre"><div class="reg-libre-titre">' + escapeHtml(b.titre) + '</div>';
    b.prels.forEach(function (p) { h += '<label class="reg-ligne"><input type="checkbox"' + (R.choix[p.id] ? ' checked' : '') + ' onchange="state.reg.choix[\'' + p.id + '\']=this.checked;render();"> ' + escapeHtml(regLibelle(p)) + (p.agents.length > 1 ? ' <span class="reg-deja">' + escapeHtml(regSupportsTexte(p)) + '</span>' : '') + '</label>'; });
    if (choisis.length > 1) {
      var a2 = regAnalyse(choisis);
      h += regAvertissements(a2);
      h += '<button class="btn ' + (a2.sur ? 'btn-success' : 'btn-gray') + ' btn-small mt-8" onclick="regValider(' + regIds(choisis) + ');">' + (a2.sur ? 'Regrouper' : 'Regrouper quand même') + ' (' + choisis.length + ')</button>';
    }
    h += '</div>';
  });
  h += '</div>';

  if (R.global) h += renderRegroupementGlobal(m, actions);
  return h;
}

function renderRegroupementGlobal(m, actions) {
  var sel = state.reg.global, n = actions.filter(function (a) { return sel[a.id] !== false; }).length;
  var h = '<div class="modal show" onclick="if(event.target===this){state.reg.global=null;render();}"><div class="modal-content" style="max-height:90vh;overflow-y:auto;"><div class="modal-header"><h2>Tout regrouper</h2><button class="close-btn" onclick="state.reg.global=null;render();">×</button></div>';
  h += '<p class="subtitle" style="margin-bottom:8px;">Seules les propositions sans risque sont listées (aucune saisie en conflit, mêmes jours). Décochez celles qui ne correspondent pas au terrain.</p>';
  actions.forEach(function (a) {
    var ps = regPrels(m, a.ids);
    h += '<label class="reg-ligne reg-global"><input type="checkbox"' + (sel[a.id] === false ? '' : ' checked') + ' onchange="state.reg.global[\'' + a.id + '\']=this.checked;render();"><span><strong>' + escapeHtml(a.titre) + '</strong><br>' + escapeHtml(ps.map(function (p) { return regNoms(p).join(' + '); }).join(' · ')) + '<br><span class="reg-deja">' + escapeHtml(a.texte) + '</span></span></label>';
  });
  h += '<div class="row mt-12"><button class="btn btn-gray" onclick="state.reg.global=null;render();">Annuler</button><button class="btn btn-success" ' + (n ? '' : 'disabled') + ' onclick="regValiderGlobal();">Regrouper (' + n + ')</button></div></div></div>';
  return h;
}

function regValider(ids) {
  var m = getCurrentMission(); if (!m) return;
  var ps = regPrels(m, ids);
  if (ps.length < 2) return;
  if (ps.some(function (p) { return regCle(p) !== regCle(ps[0]); })) { alert('Regroupement impossible : les prélèvements doivent être du même GEH, du même type (8h / CT) et du même statut réglementaire.'); return; }
  var a = regAnalyse(ps);
  if (!a.sur && !confirm('À vérifier avant de regrouper :\n\n- ' + a.raisons.concat(a.pertes).join('\n- ') + '\n\nRegrouper quand même ?')) return;
  regrouperPrelevements(m, ps);
  saveData('vlep_missions_v3', state.missions);
  state.reg.exclus = {}; state.reg.choix = {};
  render();
}

function regValiderGlobal() {
  var m = getCurrentMission(); if (!m) return;
  var actions = regActionsGlobales(m), sel = state.reg.global || {}, n = 0;
  actions.forEach(function (a) {
    if (sel[a.id] === false) return;
    var ps = regPrels(m, a.ids);
    if (ps.length > 1 && regAnalyse(ps).sur) { regrouperPrelevements(m, ps); n++; }
  });
  saveData('vlep_missions_v3', state.missions);
  state.reg.global = null;
  render();
  alert(n + ' regroupement' + (n > 1 ? 's' : '') + ' fait' + (n > 1 ? 's' : '') + '. « Séparer », dans la liste de la mission, défait un regroupement.');
}

console.log('✓ Regroupement chargé');
