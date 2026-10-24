// tournee.js - Tournée du jour : poser, arrêter (pause) et relancer plusieurs pompes d'un coup
// © 2025 Quentin THOMAS
//
// Une carte par prélèvement 8h du jour (les court-terme gardent leur chrono), ses supports dessous : n° de pompe,
// débit (ou vitesse CIP10) initial et final, tapés par le technicien. « Démarrer » / « Arrêter » posent l'heure choisie
// (maintenant par défaut) sur les prélèvements cochés : début de la 1re plage, fin de la plage en cours, et une
// nouvelle plage à la reprise (pause de midi). Rien n'est déduit : l'appli range les saisies là où l'écran du
// prélèvement les met (mêmes fonctions), le reste (EPI, observations, validation) se fait dans le prélèvement.

function tourneeHeureMaintenant() {
  var d = new Date();
  return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

// Jour (indice du sous-prélèvement) concerné par la tournée du `date` : déjà daté de ce jour, sinon le premier jour
// encore vierge (ni date, ni heure, ni validé, ni « non réalisé »)
function tourneeJour(p, date) {
  var subs = p.subPrelevements || [], i;
  for (i = 0; i < subs.length; i++) if (subs[i].date === date && !subs[i].nonRealise) return i;
  for (i = 0; i < subs.length; i++) {
    var sb = subs[i];
    if (!sb.nonRealise && !sb.completed && !sb.date && !(sb.plages || []).some(function (pl) { return pl.debut; })) return i;
  }
  return -1;
}

// Supports d'un jour : un par agent, sauf les agents d'un même support (le 1er porte les saisies, comme l'écran du
// prélèvement) ; les analyseurs (ni pompe ni débit) restent dans leur prélèvement
function tourneeSupports(p, sb) {
  var out = [];
  (p.agents || []).forEach(function (a) {
    if (isAnalyseurAgent(a.name)) return;
    var gi = getCoPrelGroupIndex(sb, a.name);
    if (gi !== -1) {
      var grp = p.agents.filter(function (x) { return sb.coPrelGroups[gi].indexOf(x.name) !== -1; });
      if (grp[0].name !== a.name) return;
      out.push({ agent: a.name, noms: grp.map(function (x) { return x.name; }) });
    } else out.push({ agent: a.name, noms: [a.name] });
  });
  return out;
}

// Prélèvements de la tournée, par GEH : { p, idx, sb, geh, supports }
function tourneeLignes(m, date) {
  var gehNum = function (p) { var g = (m.gehs || []).filter(function (x) { return x.id === p.gehId; })[0]; return g ? g.num : 999; };
  var l = [];
  (m.prelevements || []).forEach(function (p) {
    if (p.type === 'CT') return;
    var idx = tourneeJour(p, date);
    if (idx === -1) return;
    var sb = p.subPrelevements[idx], supports = tourneeSupports(p, sb);
    if (!supports.length) return;
    l.push({ p: p, idx: idx, sb: sb, geh: gehNum(p), supports: supports });
  });
  return l.sort(function (a, b) { return a.geh - b.geh; });
}

// État d'un jour : 'attente' (pas commencé), 'cours' (une plage ouverte), 'pause' (plages fermées), 'valide'
function tourneeEtat(sb) {
  if (sb.completed) return 'valide';
  var pl = sb.plages || [];
  if (!pl.some(function (x) { return x.debut; })) return 'attente';
  return pl.some(function (x) { return x.debut && !x.fin; }) ? 'cours' : 'pause';
}

// Démarrer : 1re plage vide, sinon nouvelle plage (reprise) ; rien si une plage est déjà en cours
function tourneeDemarrerJour(sb, date, heure) {
  if (sb.completed || tourneeEtat(sb) === 'cours') return false;
  if (!sb.plages || !sb.plages.length) sb.plages = [{ debut: '', fin: '' }];
  var vide = sb.plages.filter(function (x) { return !x.debut && !x.fin; })[0];
  if (vide) vide.debut = heure;
  else if (sb.plages.length < 10) sb.plages.push({ debut: heure, fin: '' });
  else return false;
  if (!sb.date) sb.date = date;
  return true;
}

// Arrêter : fin de la plage en cours (prélèvement fractionné : la plage en cours peut être celle d'un support suivant)
function tourneeArreterJour(sb, heure) {
  if (sb.completed) return false;
  var plages = (sb.plages || []).slice();
  getSupportsSupp(sb).forEach(function (s) { plages = plages.concat(s.plages || []); });
  var ouverte = plages.filter(function (x) { return x.debut && !x.fin; }).pop();
  if (!ouverte) return false;
  ouverte.fin = heure;
  return true;
}

function tourneeEtatTexte(sb) {
  var e = tourneeEtat(sb), pl = (sb.plages || []).filter(function (x) { return x.debut; });
  if (e === 'attente') return 'Pas commencé';
  if (e === 'valide') return 'Validé';
  var der = pl[pl.length - 1];
  if (e === 'cours') return 'En cours depuis ' + der.debut;
  return 'Arrêté à ' + der.fin + (getDureeTotale(sb.plages) ? ' · ' + getDureeTotale(sb.plages) : '');
}

// ---------- Conditions ambiantes du jour (mêmes données que l'écran « Conditions ambiantes ») ----------

var TOURNEE_CONDITIONS = [['temp', 'Température (°C)'], ['pression', 'Pression (hPa)'], ['humidite', 'Humidité (%)']];
function tourneeConditions(m, date) {
  return (m.conditionsAmbiantes || []).filter(function (c) { return c.date === date; })[0] || null;
}
// Champs manquants du jour : « matin » (I) et « soir » (F) ; aucune fiche = tout manque
function tourneeConditionsManquantes(m, date) {
  var c = tourneeConditions(m, date) || {}, l = [];
  [['I', 'matin'], ['F', 'soir']].forEach(function (x) {
    var manque = TOURNEE_CONDITIONS.filter(function (k) { return !String(c[k[0] + x[0]] || '').trim(); });
    if (manque.length) l.push(x[1] + ' (' + manque.map(function (k) { return k[1].split(' ')[0].toLowerCase(); }).join(', ') + ')');
  });
  return l;
}
function tourneeSaisirCondition(f, v) {
  var m = getCurrentMission(); if (!m) return;
  var date = state.tournee.date, c = tourneeConditions(m, date);
  if (!c) {
    if (!m.conditionsAmbiantes) m.conditionsAmbiantes = [];
    c = { date: date, tempI: '', tempF: '', pressionI: '', pressionF: '', humiditeI: '', humiditeF: '' };
    m.conditionsAmbiantes.push(c);
    m.conditionsAmbiantes.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  }
  c[f] = v;
  saveData('vlep_missions_v3', state.missions);
}
function renderTourneeConditions(m, date) {
  var c = tourneeConditions(m, date) || {};
  var h = '<div class="card tournee-cond"><div class="tournee-cond-titre">' + ICONS.thermometer + ' Conditions du jour</div>';
  h += '<div class="tournee-cond-grille"><span></span><span>Matin</span><span>Soir</span>';
  TOURNEE_CONDITIONS.forEach(function (k) {
    h += '<span class="tournee-cond-lib">' + k[1] + '</span>';
    ['I', 'F'].forEach(function (s) {
      h += '<input type="text" inputmode="decimal" class="input" value="' + escapeHtml(c[k[0] + s] || '') + '" onchange="tourneeSaisirCondition(\'' + k[0] + s + '\',this.value);">';
    });
  });
  return h + '</div></div>';
}

// ---------- « Avant de partir » : ce qui manque pour ce jour ----------
// Mêmes contrôles que « Valider » (getMissingFields), plus : prélèvement encore en cours, pas commencé, durée
// d'exposition (8h), conditions du jour, sauvegarde de la mission. Chaque point ouvre l'écran où le compléter.
function tourneeBilan(m, date) {
  var l = [], gehs = m.gehs || [];
  var nomGeh = function (p) { var g = gehs.filter(function (x) { return x.id === p.gehId; })[0]; return g ? 'GEH ' + g.num : ''; };
  var court = function (n) { return n.length > 28 ? n.slice(0, 28) + '…' : n; };
  (m.prelevements || []).forEach(function (p) {
    var idx = -1;
    (p.subPrelevements || []).forEach(function (sb, i) { if (idx === -1 && sb.date === date && !sb.nonRealise) idx = i; });
    if (idx === -1 && p.type !== 'CT') idx = tourneeJour(p, date);
    if (idx === -1) return;
    var sb = p.subPrelevements[idx];
    if (sb.completed) return;
    var qui = nomGeh(p) + ' · ' + court((p.agents || []).map(function (a) { return a.name; }).join(' + ')) + (p.type === 'CT' ? ' · CT' : '') + ' · J' + (idx + 1);
    var go = 'openPrel(' + p.id + ');state.activeSubIndex=' + idx + ';state.lastDayIndex=' + idx + ';render();';
    var etat = tourneeEtat(sb);
    if (etat === 'attente') { l.push({ t: qui + ' : pas commencé (à faire, ou « Non réalisé »)', go: go }); return; }
    // une ligne par prélèvement ; le nom de l'agent n'est répété que s'il y a plusieurs supports
    var unSupport = tourneeSupports(p, sb).length <= 1 && !getSupportsSupp(sb).length;
    var manque = getMissingFields(p, sb).map(function (x) {
      x = unSupport ? x.replace(/ · .*$/, '') : x;
      return x.charAt(0).toLowerCase() + x.slice(1);
    }), parts = [];
    if (etat === 'cours') {
      var der = (sb.plages || []).filter(function (x) { return x.debut && !x.fin; }).pop();
      parts.push('en cours' + (der ? ' depuis ' + der.debut : ''));
      manque = manque.filter(function (x) { return x !== 'plage horaire (début + fin)'; });
    }
    if (p.type !== 'CT' && !String(sb.dureeExpo || '').trim()) manque.push('durée d’exposition');
    if (manque.length) parts.push('manque ' + manque.slice(0, 3).join(', ') + (manque.length > 3 ? ' (+' + (manque.length - 3) + ')' : ''));
    if (parts.length) l.push({ t: qui + ' : ' + parts.join(' ; '), go: go });
  });
  var cond = tourneeConditionsManquantes(m, date);
  if (cond.length) l.push({ t: 'Conditions du jour : ' + cond.join(' ; '), go: 'window.scrollTo(0,0);' });
  return l;
}
function renderTourneeBilan(m, date) {
  var l = tourneeBilan(m, date);
  var h = '<div class="card tournee-bilan"><div class="tournee-cond-titre">' + ICONS.clipboard + ' Avant de partir</div>';
  if (!l.length) h += '<div class="tournee-bilan-ok">Rien ne manque pour ce jour.</div>';
  else l.forEach(function (x) { h += '<button type="button" class="a-verifier-item" onclick="' + x.go + '">' + escapeHtml(x.t) + '</button>'; });
  if (typeof sauvegardeEnRetard === 'function' && sauvegardeEnRetard(m))
    h += '<button type="button" class="a-verifier-item" onclick="exportMissionJSON(' + m.id + ');render();">Mission pas encore enregistrée hors du téléphone : enregistrer (.json)</button>';
  return h + '</div>';
}

// ---------- Écran ----------

function ouvrirTournee() {
  state.tournee = { date: getTodayDate(), heure: '', coches: {} };
  state.view = 'tournee';
  render();
  window.scrollTo(0, 0);
}

function renderTournee() {
  var m = getCurrentMission();
  if (!m) { state.view = 'terrain-list'; return renderTerrainList(); }
  var t = state.tournee || (state.tournee = { date: getTodayDate(), heure: '', coches: {} });
  var lignes = tourneeLignes(m, t.date);
  var h = '<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">' + ICONS.arrowLeft + ' Mission</button>';
  h += '<div class="card"><h1>' + ICONS.clock + ' Tournée du jour</h1><p class="subtitle">Posez ou arrêtez plusieurs pompes d’un coup. EPI, observations et validation restent dans chaque prélèvement.</p>';
  h += '<div class="tournee-barre"><label>Jour<input type="date" class="input" value="' + escapeHtml(t.date) + '" onchange="state.tournee.date=this.value;state.tournee.coches={};render();"></label>';
  h += '<label>Heure<input type="time" class="input" value="' + escapeHtml(t.heure) + '" placeholder="maintenant" onchange="state.tournee.heure=this.value;"></label></div>';
  h += '<div class="tournee-aide">Heure vide = l’heure au moment du clic. Une heure saisie ne sert qu’une fois.</div></div>';
  h += renderTourneeConditions(m, t.date);
  if (!lignes.length) {
    h += '<div class="empty-state"><p>Aucun prélèvement 8 h à faire ce jour-là.</p><p style="font-size:13px;margin-top:8px;">Les court-terme se font avec leur chrono, dans le prélèvement.</p></div>';
    return h + renderTourneeBilan(m, t.date);
  }
  var nCoches = lignes.filter(function (l) { return t.coches[l.p.id]; }).length;
  h += '<div class="tournee-actions"><button class="btn btn-gray btn-small" onclick="tourneeToutCocher(' + (nCoches < lignes.length) + ');">' + (nCoches < lignes.length ? 'Tout cocher' : 'Tout décocher') + '</button>';
  h += '<button class="btn btn-primary btn-small"' + (nCoches ? '' : ' disabled') + ' onclick="tourneeAppliquer(\'demarrer\');">' + ICONS.play + ' Démarrer (' + nCoches + ')</button>';
  h += '<button class="btn btn-primary btn-small"' + (nCoches ? '' : ' disabled') + ' onclick="tourneeAppliquer(\'arreter\');">' + ICONS.clock + ' Arrêter (' + nCoches + ')</button></div>';
  var gehCourant = null;
  lignes.forEach(function (l) {
    if (l.geh !== gehCourant) {
      gehCourant = l.geh;
      var g = (m.gehs || []).filter(function (x) { return x.id === l.p.gehId; })[0];
      h += '<div class="tournee-geh">GEH ' + escapeHtml(g ? g.num + ' · ' + (g.name || '') : '?') + '</div>';
    }
    var p = l.p, sb = l.sb, idx = l.idx, etat = tourneeEtat(sb), coche = !!t.coches[p.id];
    h += '<div class="tournee-carte tournee-' + etat + (coche ? ' coche' : '') + '">';
    h += '<div class="tournee-tete" onclick="tourneeCocher(' + p.id + ');"><span class="tournee-case">' + (coche ? '✓' : '') + '</span>';
    h += '<span class="tournee-titre">' + escapeHtml(sb.operateur || (sb.posteFixe ? 'Poste fixe' : 'Opérateur ?')) + ' · J' + (idx + 1) + (p.isReglementaire ? ' · Régl.' : '') + '</span>';
    h += '<span class="tournee-etat">' + escapeHtml(tourneeEtatTexte(sb)) + '</span></div>';
    l.supports.forEach(function (s) {
      var ad = (sb.agentData && sb.agentData[s.agent]) || {}, tachy = isTachymetreAgent(s.agent), u = tachy ? 'tr/min' : 'L/min';
      var champ = function (f, ph, im) {
        return '<input type="text" class="input"' + (im ? ' inputmode="decimal"' : '') + ' value="' + escapeHtml(ad[f] || '') + '" placeholder="' + ph + '" onchange="tourneeSaisir(' + p.id + ',' + idx + ',\'' + escapeJs(s.agent) + '\',\'' + f + '\',this.value);">';
      };
      var variation = tachy ? null : calcDebitVariation(ad.debitInitial, ad.debitFinal);
      h += '<div class="tournee-support"><div class="tournee-agent">' + escapeHtml(s.noms.join(' + ')) + '</div>';
      h += '<div class="tournee-champs"><label>Pompe' + champ('numPompe', 'n°') + '</label><label>' + (tachy ? 'Vit. init.' : 'Débit init.') + champ('debitInitial', u, true) + '</label><label>' + (tachy ? 'Vit. finale' : 'Débit final') + champ('debitFinal', u, true) + '</label></div>';
      if (variation !== null && variation > 5) h += '<div class="tournee-alerte">Écart débit initial / final ' + variation.toFixed(1) + ' % (> 5 %)</div>';
      h += '</div>';
    });
    h += '<button class="btn btn-gray btn-small tournee-ouvrir" onclick="openPrel(' + p.id + ');state.activeSubIndex=' + idx + ';state.lastDayIndex=' + idx + ';render();">Ouvrir le prélèvement ' + ICONS.chevronRight + '</button>';
    h += '</div>';
  });
  return h + renderTourneeBilan(m, t.date);
}

function tourneeCocher(pid) { var c = state.tournee.coches; c[pid] = !c[pid]; render(); }
function tourneeToutCocher(oui) {
  var m = getCurrentMission(), c = state.tournee.coches = {};
  if (oui) tourneeLignes(m, state.tournee.date).forEach(function (l) { c[l.p.id] = true; });
  render();
}

// Pompe et débits : la date du jour de la tournée d'abord (sinon la saisie daterait du jour du téléphone)
function tourneeSaisir(pid, idx, an, f, v) {
  var m = getCurrentMission(); if (!m) return;
  var p = m.prelevements.find(function (x) { return x.id === pid; });
  if (!p) return;
  if (!p.subPrelevements[idx].date) p.subPrelevements[idx].date = state.tournee.date;
  // pas de render() ici : il reconstruirait l'écran pendant que le technicien passe au champ suivant (clavier fermé)
  updateAgentDataSynced(pid, idx, an, f, v);
}

function tourneeAppliquer(action) {
  var m = getCurrentMission(); if (!m) return;
  var t = state.tournee, heure = t.heure || tourneeHeureMaintenant(), n = 0, ignores = [];
  tourneeLignes(m, t.date).forEach(function (l) {
    if (!t.coches[l.p.id]) return;
    var ok = action === 'demarrer' ? tourneeDemarrerJour(l.sb, t.date, heure) : tourneeArreterJour(l.sb, heure);
    if (ok) n++; else ignores.push(l);
  });
  if (n) saveData('vlep_missions_v3', state.missions);
  // heure saisie valable pour ce clic seulement : à l'arrêt suivant, « maintenant » (et non l'heure du matin)
  t.coches = {}; t.heure = '';
  render();
  var quoi = action === 'demarrer' ? 'démarré' : 'arrêté';
  var msg = n + ' prélèvement' + (n > 1 ? 's' : '') + ' ' + quoi + (n > 1 ? 's' : '') + ' à ' + heure + '.';
  if (ignores.length) msg += '\n' + ignores.length + ' laissé' + (ignores.length > 1 ? 's' : '') + ' tel' + (ignores.length > 1 ? 's' : '') + ' quel' + (ignores.length > 1 ? 's' : '') + ' (' + (action === 'demarrer' ? 'déjà en cours ou validé' : 'pas en cours ou validé') + ').';
  if (ignores.length) alert(msg);
}

console.log('✓ Tournée chargée');
