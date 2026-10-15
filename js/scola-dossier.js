// scola-dossier.js - En-tête Scol@ du dossier (onglet « Scol@ » de la feuille de calcul)
// © 2025 Quentin THOMAS
//
// Le fichier XML envoyé à Scol@ commence par le dossier : site géographique accrédité (SOCOTEC57A…), année,
// n° de dossier, observations et établissement (SIRET, code postal, effectif, NAF en découlent dans la feuille).
// L'appli les saisit en préparation et remplit l'onglet Scol@. Les listes (sites accrédités, établissements
// connus de Scol@) sont lues dans le modèle au moment voulu : aucun nom de client dans le code de l'appli.

var SCOLA_SITE_KEY = 'vlep_scola_site';
var _scolaDossierCache = null;

// Listes de l'onglet caché Liste_Scola : sites (F/G) et établissements (L nom, M SIRET, P NAF, Q code postal)
function scolaDossierListes() {
  if (_scolaDossierCache) return Promise.resolve(_scolaDossierCache);
  return fcChargerModele().then(function (data) { return XlsmMoteur.Classeur.charger(data); })
    .then(function (wb) { return wb.onglet('Liste_Scola'); })
    .then(function (s) {
      var sites = [], etabs = [];
      Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (r) {
        if (r < 6) return;
        var code = s.text('F' + r).trim();
        if (code && r <= 50) sites.push({ code: code, nom: s.text('G' + r).trim() });
        var nom = s.text('L' + r).trim();
        if (nom) etabs.push({ nom: nom, siret: s.text('M' + r).trim(), naf: s.text('P' + r).trim(), cp: s.text('Q' + r).trim() });
      });
      _scolaDossierCache = { sites: sites, etablissements: etabs };
      return _scolaDossierCache;
    });
}

function scolaSiteParDefaut() { try { return localStorage.getItem(SCOLA_SITE_KEY) || ''; } catch (e) { return ''; } }

// ---------- Préparation ----------

function renderScolaDossierPrepa(m) {
  if (!m.scolaSite && scolaSiteParDefaut()) { m.scolaSite = scolaSiteParDefaut(); saveData('vlep_missions_v3', state.missions); }
  var h = '<div class="card"><h2>Scol@ du dossier</h2>';
  h += '<p class="subtitle">Repris dans l’onglet Scol@ de la feuille de calcul (en-tête du fichier XML).</p>';
  h += '<div class="field"><label class="label">N° de dossier</label><input type="text" class="input" value="' + escapeHtml(m.scolaDossier || '') + '" placeholder="Ex. n° d’affaire" onchange="scolaDossierMaj(\'scolaDossier\',this.value);"></div>';
  h += '<div class="field"><label class="label">Établissement (liste Scol@)</label>';
  if (m.scolaEtablissement) {
    h += '<div style="display:flex;gap:6px;align-items:center;background:var(--primary-pale);border-radius:8px;padding:6px 8px;font-size:12px;"><span style="flex:1;">' + escapeHtml(m.scolaEtablissement) + (m.scolaEtablissementInfo ? '<br><span style="color:var(--text-muted);">' + escapeHtml(m.scolaEtablissementInfo) + '</span>' : '') + '</span>';
    h += '<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="scolaDossierMaj(\'scolaEtablissement\',\'\');">Changer</button></div>';
  } else {
    h += '<input type="text" class="input" placeholder="Nom, SIRET ou code postal…" oninput="scolaEtabRechercher(this.value);"><div id="scola-etab-res"></div>';
  }
  h += '</div><div class="field"><label class="label">Site géographique accrédité</label><div id="scola-site-zone"><button class="btn btn-gray btn-small" style="width:auto;" onclick="scolaSitesAfficher();">' + (m.scolaSite ? escapeHtml(m.scolaSite) + ' (changer)' : 'Choisir le site') + '</button></div></div>';
  return h + '</div>';
}

function scolaDossierMaj(champ, v) {
  var m = getCurrentMission(); if (!m) return;
  m[champ] = String(v || '').trim();
  if (champ === 'scolaEtablissement' && !m[champ]) delete m.scolaEtablissementInfo;
  saveData('vlep_missions_v3', state.missions);
  render();
}

function scolaEtabRechercher(saisie) {
  var box = document.getElementById('scola-etab-res'); if (!box) return;
  var q = typeof normRecherche === 'function' ? normRecherche(saisie) : String(saisie).toLowerCase();
  if (q.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Recherche…</div>';
  scolaDossierListes().then(function (l) {
    var mots = q.split(' ');
    var res = l.etablissements.filter(function (e) {
      var t = (typeof normRecherche === 'function' ? normRecherche(e.nom) : e.nom.toLowerCase()) + ' ' + e.siret + ' ' + e.cp;
      return mots.every(function (w) { return t.indexOf(w) !== -1; });
    }).slice(0, 8);
    if (!res.length) { box.innerHTML = '<div style="font-size:12px;color:#b45309;padding:4px;">Aucun établissement de ce nom dans la liste Scol@ : il faudra le créer dans Scol@ (ou mettre à jour la liste dans la feuille de calcul).</div>'; return; }
    var h = '<div class="search-results">';
    res.forEach(function (e) {
      var info = [e.siret ? 'SIRET ' + e.siret : '', e.cp, e.naf ? 'NAF ' + e.naf : ''].filter(Boolean).join(' · ');
      h += '<div class="search-result-item" onmousedown="event.preventDefault();" onclick="scolaEtabChoisir(\'' + escapeJs(e.nom) + '\',\'' + escapeJs(info) + '\');">' + escapeHtml(e.nom) + '<br><small style="color:var(--text-muted);">' + escapeHtml(info) + '</small></div>';
    });
    box.innerHTML = h + '</div>';
  }).catch(function (err) { box.innerHTML = '<div style="color:#dc2626;font-size:12px;">' + escapeHtml(err.message) + '</div>'; });
}

function scolaEtabChoisir(nom, info) {
  var m = getCurrentMission(); if (!m) return;
  m.scolaEtablissement = nom; m.scolaEtablissementInfo = info;
  saveData('vlep_missions_v3', state.missions);
  render();
}

function scolaSitesAfficher() {
  var zone = document.getElementById('scola-site-zone'); if (!zone) return;
  zone.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Lecture des sites…</div>';
  scolaDossierListes().then(function (l) {
    var m = getCurrentMission();
    var h = '<div style="display:flex;flex-direction:column;gap:4px;">';
    l.sites.forEach(function (s) {
      h += '<button class="btn btn-small ' + (m && m.scolaSite === s.code ? 'btn-primary' : 'btn-gray') + '" style="text-align:left;" onclick="scolaSiteChoisir(\'' + escapeJs(s.code) + '\');">' + escapeHtml(s.code) + ' <span style="opacity:.75;font-weight:400;">' + escapeHtml(s.nom) + '</span></button>';
    });
    zone.innerHTML = h + '</div>';
  });
}

function scolaSiteChoisir(code) {
  var m = getCurrentMission(); if (!m) return;
  m.scolaSite = code;
  try { localStorage.setItem(SCOLA_SITE_KEY, code); } catch (e) {} // même agence pour les missions suivantes
  saveData('vlep_missions_v3', state.missions);
  render();
}

// ---------- Export : onglet Scol@ ----------

function scolaAnneeMission(m) {
  var dates = [];
  (m.prelevements || []).forEach(function (p) { (p.subPrelevements || []).forEach(function (sb) { if (sb.date) dates.push(sb.date); }); });
  dates.sort();
  return (dates[0] || m.createdAt || new Date().toISOString()).slice(0, 4);
}

function scolaRemplirDossier(wb, m) {
  if (!wb.paths['Scol@']) return Promise.resolve();
  return wb.onglet('Scol@').then(function (s) {
    if (m.scolaSite) s.set('I9', m.scolaSite);
    s.set('I13', +scolaAnneeMission(m));
    if (m.scolaDossier) s.set('I17', m.scolaDossier);
    if (!s.text('I21')) s.set('I21', '/');
    if (m.scolaEtablissement) s.set('J33', m.scolaEtablissement);
  });
}

console.log('✓ Scol@ dossier chargé');
