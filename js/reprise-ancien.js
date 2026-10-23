// reprise-ancien.js - Reprise de la feuille de calcul de l'an dernier pour préparer la mission
// © 2025 Quentin THOMAS
//
// Même principe que « Extraire les données de l'ancien fichier » (choix 3) de la feuille : tout ce qui n'est pas une
// mesure est repris (GEH, agents, type de VLEP, réglementaire ou non, durée d'exposition, EPI, bloc Scol@ : tâche,
// métier, procédé, lieu, ventilation, captage) ; opérateurs, pompes, dates, heures, débits, réf. et résultats ne le
// sont pas. Le résultat a la forme du plan de la prépa automatique (appliquerPlanPrepa) : GEH, agents, affectations,
// avec en plus, par affectation, les saisies Scol@ / EPI / durée d'exposition de chaque prélèvement (gaf.reprise8h,
// gaf.repriseCT), recopiées dans les prélèvements à la validation de la mission (generatePrelevements).
// En Reg, le Scol@ n'est souvent rempli que sur un bloc du GEH : les autres blocs du même GEH le reprennent.

var RA_TYPES = /^(Cassette\+tube|Cassette|Tube|Fibres|CIP10 sf silice|CIP10 silice|Cyclone silice)( Reg)?( \((séq|multi)\))?$|^Analyseurs$/;
var RA_SCOLA = { 'Tâche *': 'scolaTache', 'Métier *': 'scolaMetier', 'Type de procédé *': 'scolaProcede', 'Type de Lieu de Travail *': 'ventEnv', 'Ventilation global *': 'ventGenerale', 'Protection Collective *': 'ventCaptage' };
var RA_CHAMPS_SCOLA = ['scolaTache', 'scolaMetier', 'scolaProcede', 'ventEnv', 'ventGenerale', 'ventCaptage'];
// Par prélèvement (colonne) : dispositif et méthode (propres à l'agent), efficacité de la protection respiratoire
var RA_COLONNE = { 'Type de dispositif *': 'scolaDispositif', 'Méthode de prélèvement *': 'scolaMethode', 'Protection individuelle *': 'scolaApr' };
// Repris au niveau du GEH (écran « Scol@ par GEH ») : circonstances et efficacité de la protection
var RA_CHAMPS_GEH = RA_CHAMPS_SCOLA.concat(['scolaApr']);

// Valeur saisie : vide, « / » et textes d'attente des formules Scol@ (« VIDE ? », « Substance non sélectionné ») écartés
function raVal(s, col, r) {
  if (!r) return '';
  var t = String(s.text(XlsmMoteur.colStr(col) + r) || '').replace(/\s+/g, ' ').trim();
  return !t || t === '/' || t === '0' || /^VIDE\b|non sélectionn|^#/.test(t) ? '' : t;
}
// Libellé Scol@ de la feuille -> valeur de l'appli (inverse des tables de l'export, FC_SCOLA)
function raScolaAppli(champ, v) {
  if (!v) return '';
  var table = champ === 'ventEnv' ? FC_SCOLA.lieu : champ === 'ventGenerale' ? FC_SCOLA.ventilation : champ === 'ventCaptage' ? FC_SCOLA.captage : null;
  if (!table) return v;
  for (var k in table) if (table[k] === v) return k;
  return '';
}
// Durée d'exposition : fraction de jour (ou « 07:30:00 ») -> « 07:30 »
function raDuree(v) {
  if (!v) return '';
  var m = /^(\d{1,2}):(\d{2})/.exec(v);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  var n = parseFloat(v);
  if (!isFinite(n) || n <= 0 || n >= 1) return '';
  var min = Math.round(n * 1440);
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + min % 60).slice(-2);
}
// Nom d'agent de la feuille -> agent de la base (même nom, ou à l'accent / la casse près)
function raAgent(n) {
  if (!n) return '';
  if (getAgentFromDB(n)) return n;
  return agentBaseProche(n) || n;
}

// Lignes repérées par leur libellé (colonne A, ou B pour les sous-libellés), première occurrence
function raLignes(s) {
  var N = XlsmMoteur.normLabel, L = { a: {}, b: {}, multi: [], fractions: {} };
  var rs = Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; });
  var resultats = null, scola = null;
  rs.forEach(function (r) {
    var a = N(s.text('A' + r)), b = N(s.text('B' + r));
    if (a && L.a[a] === undefined) L.a[a] = r;
    if (b && L.b[b] === undefined) L.b[b] = r;
    if (a === 'resultats' && !resultats) resultats = r;
    if (a === "description de la mesure d'exposition" && !scola) scola = r;
    var k = /^agent chimique n°(\d+)_/.exec(a);
    if (k && !L.multi[+k[1] - 1]) L.multi[+k[1] - 1] = r;
    // CIP10 silice : masses des fractions (« quartz », « cristobalite »… sous « masse dans l'échantillon »)
    if (/^(quartz|cristobalite|tridymite)$/.test(b) && !L.fractions[b] && !resultats) L.fractions[b] = r;
  });
  var premier = function (lib, depuis) { lib = N(lib); for (var i = 0; i < rs.length; i++) { if (depuis && rs[i] <= depuis) continue; if (N(s.text('A' + rs[i])) === lib) return rs[i]; } return null; };
  var commence = function (lib) { lib = N(lib); for (var i = 0; i < rs.length; i++) if (N(s.text('A' + rs[i])).indexOf(lib) === 0) return rs[i]; return null; };
  L.geh = L.a['geh'] || null;
  L.prel = L.a['prélèvement n°'] || null;
  L.agent = L.a['agent chimique'] || null;
  L.type = L.a['type de vlep'] || null;
  L.typePrel = L.a['type de prélèvement'] || null;
  L.operateur = L.a['opérateur'] || null;
  L.date = L.a['date de prélèvement'] || L.a['date'] || null;
  L.ref = commence("référence de l'échantillon") || L.a['n° essai :'] || null;
  L.epi = commence("type d'epi");
  L.expo = L.a["durée d'exposition (h:min) - vlep 8h"] || null;
  L.multi = L.multi.filter(Boolean); // 1re occurrence : la saisie (les lignes du bloc RESULTATS la reprennent)
  L.scola = {};
  if (scola) Object.keys(RA_SCOLA).forEach(function (lib) { L.scola[RA_SCOLA[lib]] = premier(lib, scola - 1); });
  L.colonne = {};
  if (scola) Object.keys(RA_COLONNE).forEach(function (lib) { L.colonne[RA_COLONNE[lib]] = premier(lib, scola - 1); });
  return L;
}

// Agents d'une colonne : agent chimique, agents n°k (multi), fractions de silice d'un onglet CIP10 / cyclone silice
function raAgentsColonne(s, L, col, modele, cols) {
  var noms = [];
  if (/silice/i.test(modele) && /CIP10 silice|Cyclone/.test(modele)) {
    var cyclone = /Cyclone/.test(modele);
    ['quartz', 'cristobalite', 'tridymite'].forEach(function (f) {
      var r = L.fractions[f];
      // fraction analysée l'an dernier (une masse, « < » compris) ; quartz par défaut si aucune masse lue
      var lu = r && cols.some(function (c) { var v = raVal(s, c, r) || raVal(s, c + 1, r); return v && !/^nd$/i.test(v); });
      if (lu) noms.push('fraction alvéolaire de silice cristalline (' + f + ')' + (cyclone ? ' (cyclone GK2.69)' : ''));
    });
    if (!noms.length) noms.push('fraction alvéolaire de silice cristalline (quartz)' + (cyclone ? ' (cyclone GK2.69)' : ''));
    return noms;
  }
  if (L.multi.length) L.multi.forEach(function (r) { var v = raVal(s, col, r); if (v) noms.push(v); });
  if (!noms.length) { var v = raVal(s, col, L.agent); if (v) noms.push(v); }
  return noms.map(raAgent).filter(function (n, i, t) { return n && t.indexOf(n) === i; });
}

// Un onglet -> lignes {geh, agents, type, reg, posteFixe, jours:[{…saisies d'un prélèvement}], multi}
function raLireOnglet(s, nom, modele) {
  var L = raLignes(s), reg = / Reg\b/.test(modele) || modele === 'Analyseurs', out = [];
  var der = 0; Object.keys(s.rows).forEach(function (r) { Object.keys(s.rows[r].cells).forEach(function (c) { if (+c > der) der = +c; }); });
  var fait = function (c) { return !!(raVal(s, c, L.ref) || raVal(s, c, L.operateur) || raVal(s, c, L.date)); };
  var jour = function (c, colScola) {
    var j = { epiType: raVal(s, c, L.epi) };
    var d = raDuree(raVal(s, c, L.expo)); if (d) j.dureeExpo = d;
    RA_CHAMPS_SCOLA.forEach(function (k) { var v = raScolaAppli(k, raVal(s, colScola, L.scola[k])); if (v) j[k] = v; });
    Object.keys(L.colonne).forEach(function (k) { var v = raVal(s, c, L.colonne[k]) || raVal(s, colScola, L.colonne[k]); if (v && !(k === 'scolaApr' && /^Absence/.test(v))) j[k] = v; });
    return j;
  };
  var pas = reg ? 6 : 2;
  for (var c0 = 3; c0 <= der; c0 += pas) {
    var cols = reg ? [c0, c0 + 2, c0 + 4] : [c0];
    // bloc vierge du modèle (« 2 - intitulé », prélèvement non utilisé, agent par défaut du modèle) : ni réf., ni opérateur, ni date
    var faits = cols.filter(fait);
    if (!faits.length) continue;
    var agents = raAgentsColonne(s, L, c0, modele, cols.concat(cols.map(function (c) { return c + 1; })));
    if (!agents.length) continue;
    var gehTxt = raVal(s, c0, reg ? (L.geh || L.prel) : (L.prel || L.geh));
    if (/intitulé$/.test(gehTxt)) gehTxt = '';
    var type = /court/i.test(raVal(s, c0, L.type)) ? 'CT' : '8h';
    var jours = faits.map(function (c) { return jour(c, reg ? c0 : c); });
    out.push({ onglet: nom, gehTexte: gehTxt, agents: agents, type: type, reg: reg && modele !== 'Analyseurs' ? true : (modele === 'Analyseurs' ? null : false),
      // poste fixe : « type de prélèvement », ou GEH « PF - … » comme dans la prépa automatique
      posteFixe: /poste fixe/i.test(raVal(s, c0, L.typePrel)) || /^PF\b/i.test(gehTxt), jours: jours, nbFaits: faits.length, multi: agents.length > 1 && !/silice/i.test(modele) });
  }
  return out;
}

// GEH « 3 - Soudure TIG » (ou « GEH 3 - … ») -> {num:3, name:'Soudure TIG'} ; sinon le texte entier comme nom
// (« 1.1 - Cariste », « S23 - Doseuse » : numéro attribué ensuite)
function raGeh(t) {
  var m = /^\s*(?:GEH\s*)?(\d+)\s*-\s*(.+?)\s*$/i.exec(t || '');
  if (m) return { num: +m[1], name: m[2] };
  var n = /^\s*(?:GEH\s*)?(\d+)\s*$/i.exec(t || '');
  return n ? { num: +n[1], name: '' } : { num: null, name: String(t || '').trim() };
}

// Classeur de l'an dernier -> plan de la prépa automatique + infos de la mission
function repriseLireFeuille(data, JSZipImpl) {
  return XlsmMoteur.Classeur.charger(data, JSZipImpl).then(function (wb) {
    var etats = {};
    (wb.workbookXml.match(/<sheet\b[^>]*\/>/g) || []).forEach(function (x) {
      var n = /\bname="([^"]*)"/.exec(x), st = /\bstate="([^"]*)"/.exec(x);
      if (n) etats[n[1].replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"')] = st ? st[1] : 'visible';
    });
    var noms = (wb._ordre ? wb._ordre() : Object.keys(wb.paths)).filter(function (n) { return wb.paths[n] && etats[n] !== 'hidden' && etats[n] !== 'veryHidden'; });
    var lignes = [], infos = {}, chain = Promise.resolve();
    noms.forEach(function (n) {
      chain = chain.then(function () { return wb.onglet(n); }).then(function (s) {
        var a1 = String(s.text('A1') || '').trim();
        if (n === 'Scol@') {
          infos.scolaSite = raVal(s, 9, 9); infos.scolaEtablissement = raVal(s, 10, 33);
          var siret = raVal(s, 9, 37), cp = raVal(s, 9, 41), naf = raVal(s, 9, 49);
          infos.scolaEtablissementInfo = [siret ? 'SIRET ' + siret : '', cp, naf ? 'NAF ' + naf : ''].filter(Boolean).join(' · ');
          return;
        }
        if (!RA_TYPES.test(a1)) return;
        var L = raLignes(s);
        if (!infos.clientSite) infos.clientSite = raVal(s, 3, L.a['site']);
        if (!infos.preleveur) infos.preleveur = raVal(s, 3, L.a['nom du préleveur']);
        if (!infos.debitmetreType) {
          var lib = Object.keys(L.b).filter(function (b) { return /^débitmètre (massique|à lame)/.test(b); })[0];
          if (lib) infos.debitmetreType = /massique/.test(lib) ? 'massique' : 'piston';
        }
        raLireOnglet(s, n, a1).forEach(function (l) { lignes.push(l); });
      });
    });
    return chain.then(function () { return repriseConstruirePlan(lignes, infos); });
  });
}

// Lignes lues -> plan {gehs, agents, rows} (forme de la prépa automatique), alertes et résumé pour l'aperçu
function repriseConstruirePlan(lignes, infos) {
  var gehs = [], alertes = [], cle = function (g) { return g.num ? 'n' + g.num : 't' + g.name.toLowerCase(); };
  lignes.forEach(function (l) {
    var g0 = raGeh(l.gehTexte);
    if (!g0.num && !g0.name) g0.name = l.onglet; // GEH non écrit : nom de l'onglet
    var g = gehs.filter(function (x) { return cle(x) === cle(g0); })[0];
    if (!g) { g = { num: g0.num, name: g0.name, posteFixe: false }; gehs.push(g); }
    if (!g.name && g0.name) g.name = g0.name;
    if (l.posteFixe) g.posteFixe = true;
    l.geh = g;
  });
  var pris = {}; gehs.forEach(function (g) { if (g.num) pris[g.num] = true; });
  var suivant = 1; gehs.forEach(function (g) { if (!g.num) { while (pris[suivant]) suivant++; g.num = suivant; pris[suivant] = true; } if (!g.name) g.name = 'GEH ' + g.num; });
  // Scol@ du GEH : premier bloc qui l'a rempli, repris par les blocs restés vides
  var scolaGeh = {};
  lignes.forEach(function (l) {
    var sg = scolaGeh[l.geh.num] = scolaGeh[l.geh.num] || {};
    l.jours.forEach(function (j) { RA_CHAMPS_GEH.forEach(function (k) { if (j[k] && !sg[k]) sg[k] = j[k]; }); });
  });
  var complete = 0;
  lignes.forEach(function (l) {
    var sg = scolaGeh[l.geh.num];
    l.jours.forEach(function (j) { RA_CHAMPS_SCOLA.forEach(function (k) { if (!j[k] && sg[k]) { j[k] = sg[k]; complete++; } }); });
  });
  // une ligne par GEH × agent × type (forme des lignes de la prépa automatique)
  var rows = [], parCle = {}, agents = [], multis = [];
  lignes.forEach(function (l) {
    var txtMulti = 'GEH ' + l.geh.num + ' : ' + l.agents.join(' + ');
    if (l.multi && multis.indexOf(txtMulti) === -1) multis.push(txtMulti);
    l.agents.forEach(function (an) {
      if (agents.indexOf(an) === -1) agents.push(an);
      var reg = (l.reg === null ? agentEstReglementaire(an) : l.reg) && !l.posteFixe;
      var k = l.geh.num + '|' + an + '|' + l.type;
      var r = parCle[k];
      var jours = l.jours.map(function (j) { return JSON.parse(JSON.stringify(j)); });
      if (l.type === 'CT') jours.forEach(function (j) { delete j.dureeExpo; }); // en CT, la durée d'exposition est la durée du prélèvement
      if (!r) { r = parCle[k] = { agentNames: [an], gehNums: [l.geh.num], type: l.type, isReg: reg, posteFixe: l.posteFixe, nb: 0, reprise: [] }; rows.push(r); }
      else if (r.isReg !== reg) {
        // l'appli n'a qu'un statut par agent, GEH et type : le premier onglet lu est gardé
        alertes.push('GEH ' + l.geh.num + ' : « ' + an + ' » ' + l.type + ' mesuré l’an dernier en réglementaire et en non réglementaire : seul le ' + (r.isReg ? 'réglementaire' : 'non réglementaire') + ' est repris (ajouter l’autre sur le terrain).');
        return;
      }
      // Reg : un bloc = 3 prélèvements au plus (deux blocs du même GEH, deux campagnes : le plus grand)
      if (reg) { if (jours.length > r.reprise.length) r.reprise = jours; r.nb = Math.min(3, Math.max(r.nb, l.nbFaits)); }
      else { r.reprise = r.reprise.concat(jours); r.nb += l.nbFaits; }
    });
  });
  agents.filter(function (an) { return !getAgentFromDB(an); }).forEach(function (an) { alertes.push('« ' + an + ' » absent de la base : ajouté comme agent saisi à la main.'); });
  if (multis.length) alertes.push('Agents sur un même support l’an dernier (' + multis.join(' ; ') + ') : repris séparément, à regrouper sur le terrain (menu ⋯ › Regrouper des prélèvements).');
  if (!rows.length) alertes.push('Aucun onglet de prélèvement rempli dans ce fichier.');
  gehs.sort(function (a, b) { return a.num - b.num; });
  var nbScola = rows.filter(function (r) { return r.reprise.some(function (j) { return j.scolaTache || j.scolaMetier; }); }).length;
  return { gehs: gehs.map(function (g) { return { num: g.num, name: g.name, posteFixe: g.posteFixe, scola: scolaGeh[g.num] || {} }; }), agents: agents, rows: rows, infos: infos, alertes: alertes, nbScola: nbScola, scolaComplete: complete };
}

// ---------- Écran ----------

function repriseChoisirFichier() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsm,.xlsx';
  inp.onchange = function () {
    var f = inp.files && inp.files[0]; if (!f) return;
    if (/\.xls$/i.test(f.name)) { alert('Ancien format Excel (.xls) non lu : ouvrez-le dans Excel et enregistrez-le en .xlsm.'); return; }
    state.repriseData = { fichier: f.name, enCours: true };
    state.showModal = 'reprise'; render();
    f.arrayBuffer().then(function (buf) { return repriseLireFeuille(buf); }).then(function (plan) {
      state.repriseData = { fichier: f.name, plan: plan }; render();
    }).catch(function (e) {
      state.repriseData = { fichier: f.name, erreur: 'Fichier non lu : ' + (e && e.message || e) + '. Il faut la feuille de calcul « Contrôle des VLEP » (.xlsm).' }; render();
    });
  };
  inp.click();
}

function renderRepriseModal(m) {
  var d = state.repriseData || {}, fermer = 'state.showModal=null;state.repriseData=null;render();';
  var h = '<div class="modal show" onclick="if(event.target===this){' + fermer + '}"><div class="modal-content" style="max-height:92vh;overflow-y:auto;"><div class="modal-header"><h2>' + ICONS.folder + ' Feuille de l’an dernier</h2><button class="close-btn" onclick="' + fermer + '">×</button></div>';
  h += '<p class="subtitle" style="margin-bottom:8px;">' + escapeHtml(d.fichier || '') + '</p>';
  if (d.enCours) return h + '<div class="info-box"><p>Lecture du fichier…</p></div></div></div>';
  if (d.erreur) return h + '<div class="info-box" style="background:#fef2f2;"><p>' + escapeHtml(d.erreur) + '</p></div><button class="btn btn-gray" onclick="' + fermer + '">Fermer</button></div></div>';
  var p = d.plan;
  h += '<div class="info-box"><p>Repris comme « Extraire les données de l’ancien fichier » de la feuille : GEH, agents, type de VLEP, réglementaire ou non, nombre de prélèvements, durée d’exposition, EPI et Scol@ (tâche, métier, procédé, lieu, ventilation, captage). Pas les opérateurs, pompes, dates, heures, débits, réf. ni résultats.</p></div>';
  p.gehs.forEach(function (g) {
    var rs = p.rows.filter(function (r) { return r.gehNums[0] === g.num; });
    h += '<div class="card" style="padding:8px 10px;margin:6px 0;"><strong>GEH ' + g.num + ' – ' + escapeHtml(g.name) + '</strong>' + (g.posteFixe ? ' <span style="font-size:11px;color:var(--text-muted);">(poste fixe)</span>' : '');
    rs.forEach(function (r) {
      var sc = r.reprise.some(function (j) { return j.scolaTache || j.scolaMetier; });
      h += '<div style="font-size:12px;margin-top:3px;">' + escapeHtml(r.agentNames[0]) + ' · ' + r.type + ' · ' + (r.isReg ? 'Régl.' : 'Non régl.') + ' · ' + r.nb + ' prél.' + (sc ? ' · <span style="color:var(--accent);">Scol@</span>' : '') + '</div>';
    });
    h += '</div>';
  });
  if (p.alertes.length) h += '<div class="info-box" style="background:#fffbeb;">' + p.alertes.map(function (a) { return '<p style="font-size:12px;">' + escapeHtml(a) + '</p>'; }).join('') + '</div>';
  if (p.scolaComplete) h += '<p style="font-size:12px;color:var(--text-muted);">Scol@ rempli sur un seul bloc d’un GEH : recopié sur ses autres prélèvements (à vérifier sur le terrain).</p>';
  h += '<div class="row mt-8"><button class="btn btn-gray" onclick="' + fermer + '">Annuler</button>' + (p.rows.length ? '<button class="btn btn-primary" onclick="repriseAppliquer();">' + ICONS.check + ' Préparer la mission</button>' : '') + '</div>';
  return h + '</div></div>';
}

function repriseAppliquer() {
  var m = getCurrentMission(), d = state.repriseData;
  if (!m || !d || !d.plan) return;
  var p = d.plan;
  if ((m.gehs || []).some(function (g) { return g.name; }) && !confirm('Remplacer les GEH, agents et affectations actuels par ceux de la feuille de l’an dernier ?\n\n' + p.gehs.length + ' GEH · ' + p.agents.length + ' agents')) return;
  appliquerPlanPrepa(m, p);
  var I = p.infos || {};
  ['clientSite', 'preleveur', 'debitmetreType', 'scolaSite', 'scolaEtablissement', 'scolaEtablissementInfo'].forEach(function (k) { if (I[k] && !m[k]) m[k] = I[k]; });
  saveData('vlep_missions_v3', state.missions);
  state.showModal = null; state.repriseData = null;
  render();
  alert('Mission préparée depuis la feuille de l’an dernier.\n\n' + p.gehs.length + ' GEH · ' + p.agents.length + ' agents · ' + countPrelevements(m) + ' prélèvements\n\nVérifiez les affectations, puis validez : les saisies Scol@, EPI et durées d’exposition seront recopiées dans les prélèvements.');
}

console.log('✓ Reprise de l’ancien fichier chargée');
