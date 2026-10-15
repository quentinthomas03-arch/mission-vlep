// releves-analyseur.js - Import des relevés d'un analyseur portable (CO, CO2…) et onglet Acquisition
// © 2025 Quentin THOMAS
//
// Le technicien importe le fichier exporté par l'appareil (.csv ou .txt) depuis l'écran de terrain.
// Formats reconnus (détection automatique) :
//   - enregistreur CO2 :  « Index;Date;Température;Hygrométrie;Pression;CO2;CO2 Compensé;COV »
//     (séparateur « ; », dates « JJ/MM/AAAA hh:mm » ou « AAAA-MM-JJ hh:mm:ss ») — colonne CO2 brute ;
//   - détecteur CO :      « 25385,Time,CO(ppm),Warning Level,… » puis « n°,AAAA-MM-JJ hh:mm:ss,valeur,… ».
// Les relevés sont gardés tels quels (avec leur date) ; ceux compris dans les plages du prélèvement donnent
// la moyenne affichée et vont dans l'onglet Acquisition de la feuille de calcul.

var RELEVES_MAX = 5000;

// Texte du fichier : UTF-8, sinon Windows-1252 (accents des en-têtes des enregistreurs)
function relevesDecoder(buffer) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch (e) { return new TextDecoder('windows-1252').decode(buffer); }
}

function relevesNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

// Colonne du gaz mesuré pour l'agent (CO ≠ CO2 ; CO2 brut plutôt que compensé)
function relevesColonneGaz(entetes, agentName) {
  var co2 = /dioxyde de carbone|co2/i.test(agentName || '');
  var noms = entetes.map(relevesNorm);
  var i;
  if (co2) {
    i = noms.findIndex(function (h) { return /^co2(\s*\(ppm\))?$/.test(h); });
    if (i === -1) i = noms.findIndex(function (h) { return h.indexOf('co2') === 0; });
  } else {
    i = noms.findIndex(function (h) { return /^co(\s*\(ppm\))?$/.test(h) || /^co\(ppm\)$/.test(h); });
    if (i === -1) i = noms.findIndex(function (h) { return /^co\b/.test(h) && h.indexOf('co2') === -1; });
  }
  return i;
}

// Date + heure d'une case : renvoie « AAAA-MM-JJ hh:mm:ss » ou null
function relevesDate(s) {
  s = String(s || '').trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) return m[1] + '-' + m[2] + '-' + m[3] + ' ' + (m[4].length < 2 ? '0' : '') + m[4] + ':' + m[5] + ':' + (m[6] || '00');
  m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) return m[3] + '-' + m[2] + '-' + m[1] + ' ' + (m[4].length < 2 ? '0' : '') + m[4] + ':' + m[5] + ':' + (m[6] || '00');
  return null;
}

// Lit le fichier : {releves: [[« AAAA-MM-JJ hh:mm:ss », valeur], …], colonne, appareil} ou {erreur}
function relevesLire(texte, agentName) {
  var lignes = String(texte || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
  if (!lignes.length) return { erreur: 'Fichier vide.' };
  // ligne d'en-tête : celle qui contient une colonne de temps et le gaz
  var sep = null, iEntete = -1, entetes = null, iGaz = -1, iTemps = -1;
  for (var k = 0; k < Math.min(lignes.length, 15) && iEntete === -1; k++) {
    [';', ',', '\t'].some(function (sp) {
      var cols = lignes[k].split(sp);
      if (cols.length < 3) return false;
      var t = cols.map(relevesNorm).findIndex(function (h) { return h === 'date' || h === 'time' || h === 'heure' || h === 'date/heure'; });
      var g = relevesColonneGaz(cols, agentName);
      if (t !== -1 && g !== -1) { sep = sp; iEntete = k; entetes = cols; iGaz = g; iTemps = t; return true; }
      return false;
    });
  }
  if (iEntete === -1) return { erreur: 'Format non reconnu : il faut une colonne Date (ou Time) et une colonne ' + (/co2|dioxyde/i.test(agentName) ? 'CO2' : 'CO') + '.' };
  var appareil = (entetes[0] || '').trim();
  var releves = [];
  for (var i = iEntete + 1; i < lignes.length && releves.length < RELEVES_MAX; i++) {
    var c = lignes[i].split(sep);
    var d = relevesDate(c[iTemps]);
    var v = parseFloat(String(c[iGaz] === undefined ? '' : c[iGaz]).replace(',', '.'));
    if (d && isFinite(v)) releves.push([d, v]);
  }
  if (!releves.length) return { erreur: 'Aucun relevé lisible dans le fichier.' };
  releves.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return { releves: releves, colonne: entetes[iGaz].trim(), appareil: /^\d+$/.test(appareil) ? appareil : '' };
}

// Bornes des plages du prélèvement en « AAAA-MM-JJ hh:mm:ss » (une plage qui finit avant de commencer passe minuit)
function relevesBornes(sb) {
  if (!sb.date) return [];
  return (sb.plages || []).filter(function (p) { return p.debut && p.fin; }).map(function (p) {
    var fin = sb.date;
    if (p.fin < p.debut) { var d = new Date(sb.date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); fin = d.toISOString().slice(0, 10); }
    return [sb.date + ' ' + p.debut + ':00', fin + ' ' + p.fin + ':59']; // toute la dernière minute
  });
}

function relevesDansPlages(sb, releves) {
  var bornes = relevesBornes(sb);
  return (releves || []).filter(function (r) { return bornes.some(function (b) { return r[0] >= b[0] && r[0] <= b[1]; }); });
}

// Résumé affiché au technicien
function relevesResume(sb, ad) {
  var rel = ad && ad.releves;
  if (!rel || !rel.length) return null;
  var dedans = relevesDansPlages(sb, rel);
  var moy = dedans.length ? dedans.reduce(function (s, r) { return s + r[1]; }, 0) / dedans.length : null;
  var bornes = relevesBornes(sb);
  return {
    total: rel.length, n: dedans.length, moy: moy,
    debut: rel[0][0], fin: rel[rel.length - 1][0],
    minuit: bornes.some(function (b) { return b[0].slice(0, 10) !== b[1].slice(0, 10); })
  };
}

// ---------- Écran de terrain ----------

function renderRelevesAnalyseur(p, idx, an, sb, ad) {
  var id = 'releves-' + p.id + '-' + idx + '-' + an.replace(/[^a-z0-9]/gi, '');
  var h = '<div style="margin:6px 0;">';
  h += '<input type="file" id="' + id + '" accept=".csv,.txt,text/csv,text/plain" style="display:none;" onchange="relevesImporter(' + p.id + ',' + idx + ',\'' + escapeJs(an) + '\',this);">';
  h += '<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="document.getElementById(\'' + id + '\').click();">' + (ad.releves && ad.releves.length ? 'Remplacer les relevés de l’appareil' : 'Importer les relevés de l’appareil (.csv, .txt)') + '</button>';
  var r = relevesResume(sb, ad);
  if (r) {
    var f = function (s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + ' ' + s.slice(11, 16); };
    h += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">' + r.total + ' relevés (' + escapeHtml(ad.relevesColonne || '') + ') du ' + f(r.debut) + ' au ' + f(r.fin) + '</div>';
    if (r.n) h += '<div style="font-size:12px;font-weight:600;color:#047857;margin-top:2px;">Moyenne sur les plages : ' + (Math.round(r.moy * 10) / 10).toString().replace('.', ',') + ' ppm (' + r.n + ' relevés)</div>';
    else h += '<div style="font-size:11px;color:#b45309;margin-top:2px;">⚠️ Aucun relevé dans les plages saisies : vérifier la date, les plages ou l’heure de l’appareil.</div>';
    if (r.minuit) h += '<div style="font-size:11px;color:#b45309;margin-top:2px;">⚠️ Mesure à cheval sur minuit : la feuille de calcul ne sait pas faire la moyenne sur ces plages, à vérifier dans l’onglet Acquisition.</div>';
  }
  return h + '</div>';
}

function relevesImporter(pid, idx, an, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var lecteur = new FileReader();
  lecteur.onload = function () {
    var res = relevesLire(relevesDecoder(new Uint8Array(lecteur.result)), an);
    if (res.erreur) { alert('Import impossible : ' + res.erreur); return; }
    var m = getCurrentMission(); if (!m) return;
    var p = m.prelevements.find(function (x) { return x.id === pid; });
    var sb = p.subPrelevements[idx];
    if (!sb.agentData) sb.agentData = {};
    if (!sb.agentData[an]) sb.agentData[an] = {};
    var ad = sb.agentData[an];
    ad.releves = res.releves; ad.relevesColonne = res.colonne; ad.relevesFichier = file.name;
    if (res.appareil && !ad.numPompe) ad.numPompe = res.appareil; // n° de série de l'appareil en tête de fichier
    saveData('vlep_missions_v3', state.missions);
    render();
  };
  lecteur.readAsArrayBuffer(file);
}

console.log('✓ Relevés analyseur chargés');
