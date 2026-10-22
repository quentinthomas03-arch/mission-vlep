// veolia.js - Missions Véolia : reproduit l'assistant « Choix Site » de la feuille de calcul
// © 2025 Quentin THOMAS
//
// Les protocoles (sites, onglets, supports, agents) sont lus dans l'onglet caché VEOLIA du modèle au moment
// où l'appli en a besoin : aucune donnée Véolia n'est recopiée dans le code de l'appli.
// Comme la macro, à l'export d'une mission Véolia :
//   - un onglet par ligne du protocole du site (« Plomb », « Chrome VI »…), copié du modèle indiqué, avec le
//     nombre de blocs prévu, support / lot / agent préécrits ;
//   - les onglets modèles génériques sont supprimés ;
//   - « GEH X - Site » ne garde que les colonnes du site et devient « GEH X - <site> » ; VEOLIA!A1 = site.

var VEOLIA_MODELES_GENERIQUES = ['Cyclone silice Reg (séq)', 'CIP10 silice Reg (séq)', 'Cassette Reg', 'Cassette Reg (séq)', 'Cassette Reg (multi)',
  'Tube Reg', 'Tube Reg (séq)', 'Tube Reg (multi)', 'Cassette+tube Reg', 'Fibres Reg', 'Fibres Reg (séq)', 'CIP10 silice Reg', 'CIP10 silice Reg (séq)',
  'CIP10 sf silice Reg', 'CIP10 sf silice Reg (séq)', 'Cassette', 'Cassette (séq)', 'Tube', 'Tube (séq)', 'Cassette+tube', 'Fibres', 'Fibres (séq)',
  'CIP10 silice', 'CIP10 silice (séq)', 'CIP10 sf silice', 'CIP10 sf silice (séq)', 'Analyseurs', 'Acquisition'];

var _veoliaCache = null;

// Lit la table VEOLIA : { sites: [noms], protocoles: { site: [ {modele, nom, nbBlocs, valeurs:[{col, label, valeur}], agents:[{bloc, nom}]} ] } }
function veoliaLireTable(wb) {
  return wb.onglet('VEOLIA').then(function (s) {
    var C = XlsmMoteur.colStr, N = XlsmMoteur.normLabel;
    var lignes = Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; });
    function ligneDe(lib) { for (var i = 0; i < lignes.length; i++) if (N(s.text('B' + lignes[i])) === N(lib)) return lignes[i]; return null; }
    var rOnglet = ligneDe('Onglet'), rNom = ligneDe('Renommer Onglet'), rNb = ligneDe('Nombre GEH ou prélèvement');
    if (!rOnglet || !rNom || !rNb) throw new Error('Table VEOLIA du modèle non reconnue.');
    var maxC = 0;
    lignes.forEach(function (r) { Object.keys(s.rows[r].cells).forEach(function (c) { if (+c > maxC) maxC = +c; }); });
    var sites = [], protocoles = {};
    for (var c = 3; c <= maxC; c++) {
      var site = s.text(C(c) + '1').trim();
      if (!site) continue;
      if (!protocoles[site]) { protocoles[site] = []; sites.push(site); }
      var e = { modele: s.text(C(c) + rOnglet).trim(), nom: s.text(C(c) + rNom).trim(), nbBlocs: parseInt(s.text(C(c) + rNb), 10) || 1, valeurs: [], agents: [] };
      lignes.forEach(function (r) {
        if (r <= rNb) return;
        var v = s.text(C(c) + r);
        if (v === '') return;
        var colDep = parseInt(s.text('A' + r), 10) || 3, lab = s.text('B' + r);
        // libellé identique à la ligne au-dessus : la macro écrit dans l'occurrence suivante de l'onglet
        e.valeurs.push({ col: colDep, label: lab, valeur: v, bloc: Math.floor((colDep - 3) / 6), memeQueDessus: N(s.text('B' + (r - 1))) === N(lab) });
        if (N(lab) === 'agent chimique') e.agents.push({ bloc: Math.floor((colDep - 3) / 6), nom: v });
      });
      if (e.modele && e.nom) protocoles[site].push(e);
    }
    return { sites: sites, protocoles: protocoles };
  });
}

// Table Véolia du modèle intégré, chargée une fois
function veoliaTable() {
  if (_veoliaCache) return Promise.resolve(_veoliaCache);
  return fcChargerModele().then(function (data) { return XlsmMoteur.Classeur.charger(data); }).then(veoliaLireTable).then(function (t) { _veoliaCache = t; return t; });
}

// ---------- Préparation : choix du site et agents du protocole ----------

function veoliaAgentsDuSite(table, site) {
  var vus = {}, out = [];
  (table.protocoles[site] || []).forEach(function (e) {
    e.agents.forEach(function (a) {
      var n = String(a.nom).trim();
      var db = state.agentsDB.find(function (x) { return XlsmMoteur.normLabel(x['Agent chimique']) === XlsmMoteur.normLabel(n); });
      // « poussières de silice cristalline » (libellé de l'onglet CIP10 silice) : les fractions sur CIP10 de la base
      var fractions = !db && /silice cristalline/i.test(n) ? state.agentsDB.filter(function (x) { return fcEstSilice(x['Agent chimique']); }) : [];
      if (fractions.length) {
        fractions.forEach(function (x) { var fn = x['Agent chimique']; if (!vus[fn]) { vus[fn] = true; out.push({ nom: fn, connu: true, onglet: e.nom }); } });
        return;
      }
      var nom = db ? db['Agent chimique'] : n;
      if (!vus[nom]) { vus[nom] = true; out.push({ nom: nom, connu: !!db, onglet: e.nom }); }
    });
  });
  return out;
}

function renderVeoliaPrepa(m) {
  var h = '<div class="card"><h2>Mission Véolia</h2>';
  if (!m.veoliaSite) {
    h += '<p class="subtitle">Pour un site Véolia, l’appli suit le protocole de la feuille de calcul (« Choix Site ») : agents du site, onglets par substance.</p>';
    h += '<button class="btn btn-gray" onclick="veoliaOuvrirChoix();">Choisir un site Véolia</button>';
  } else {
    h += '<p>Site : <strong>' + escapeHtml(m.veoliaSite) + '</strong></p>';
    h += '<div class="row"><button class="btn btn-gray btn-small" onclick="veoliaOuvrirChoix();">Changer de site</button>';
    h += '<button class="btn btn-gray btn-small" onclick="veoliaRetirer();">Pas une mission Véolia</button></div>';
  }
  h += '<div id="veolia-choix"></div></div>';
  return h;
}

function veoliaOuvrirChoix() {
  var box = document.getElementById('veolia-choix');
  if (box) box.innerHTML = '<p class="subtitle">Lecture des sites dans la feuille de calcul…</p>';
  veoliaTable().then(function (t) {
    var m = getCurrentMission(); if (!m || !box) return;
    var h = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">';
    t.sites.forEach(function (s) {
      h += '<button class="btn ' + (m.veoliaSite === s ? 'btn-primary' : 'btn-gray') + '" onclick="veoliaChoisirSite(\'' + escapeJs(s) + '\');">' + escapeHtml(s) + ' <span style="opacity:.7;font-weight:400;">(' + t.protocoles[s].length + ' onglets)</span></button>';
    });
    box.innerHTML = h + '</div>';
  }).catch(function (e) { if (box) box.innerHTML = '<p style="color:#dc2626;">' + escapeHtml(e.message) + '</p>'; });
}

function veoliaChoisirSite(site) {
  var m = getCurrentMission(); if (!m) return;
  veoliaTable().then(function (t) {
    m.veoliaSite = site;
    var agents = veoliaAgentsDuSite(t, site), ajoutes = [], inconnus = [];
    agents.forEach(function (a) {
      if (!a.connu) { inconnus.push(a.nom); return; }
      if (m.agents.some(function (x) { return x.name === a.nom; })) return;
      var h8 = hasVLEP8h(a.nom), hct = hasVLEPCT(a.nom);
      m.agents.push({ name: a.nom, is8h: h8 || (!h8 && !hct), isCT: false, isManual: false });
      ajoutes.push(a.nom);
    });
    saveData('vlep_missions_v3', state.missions);
    render();
    var msg = 'Site Véolia : ' + site + '\n\n' + (ajoutes.length ? ajoutes.length + ' agent(s) du protocole ajouté(s) à la mission (à affecter aux GEH) :\n- ' + ajoutes.join('\n- ') : 'Les agents du protocole sont déjà dans la mission.');
    if (inconnus.length) msg += '\n\nAbsents de la base de l’appli (à ajouter à la main si besoin) :\n- ' + inconnus.join('\n- ');
    alert(msg);
  });
}

function veoliaRetirer() {
  var m = getCurrentMission(); if (!m) return;
  delete m.veoliaSite;
  saveData('vlep_missions_v3', state.missions);
  render();
}

// ---------- Export au format Véolia ----------

// Remplit le classeur pour le site de la mission ; renvoie les séries non couvertes par le protocole
function veoliaExporter(wb, m, plan, resume) {
  return veoliaLireTable(wb).then(function (t) {
    var site = m.veoliaSite, protocole = t.protocoles[site];
    if (!protocole) throw new Error('Site Véolia « ' + site + ' » absent de la feuille de calcul.');
    var N = XlsmMoteur.normLabel, C = XlsmMoteur.colStr;
    // toutes les séries de la mission, à placer dans les onglets du protocole
    var series = [];
    plan.onglets.forEach(function (o) { o.series.forEach(function (se) { series.push({ o: o, se: se, place: false }); }); });
    var pris = {}; Object.keys(wb.paths).forEach(function (n) { pris[n] = true; });
    var chain = Promise.resolve();
    protocole.forEach(function (e) {
      chain = chain.then(function () {
        if (!wb.paths[e.modele]) { plan.alertes.push('Véolia : modèle « ' + e.modele + ' » absent, onglet « ' + e.nom + ' » non créé.'); return; }
        var nom = e.nom.slice(0, 31), i = 2;
        while (pris[nom]) { nom = e.nom.slice(0, 28) + ' ' + i; i++; }
        pris[nom] = true;
        return wb.copierOnglet(e.modele, nom).then(function (s) {
          var R = fcLignes(s), reg = /Reg/.test(e.modele), largeur = reg ? 6 : 2;
          // nombre de blocs du protocole (Ajouter puis Supprimer GEH)
          var dispo = fcCapacite(s, R, largeur);
          for (var b = dispo; b < e.nbBlocs; b++) s.copyColumns(3, largeur, 3 + b * largeur);
          if (dispo > e.nbBlocs) s.truncateColumns(2 + e.nbBlocs * largeur);
          // séries de la mission pour chaque bloc du protocole (par agent), les GEH suivants en blocs ajoutés
          var blocs = [];
          for (var k = 0; k < e.nbBlocs; k++) blocs.push(null);
          var restants = [];
          series.forEach(function (x) {
            if (x.place || x.o.reg !== reg) return;
            var slot = e.agents.filter(function (a) { return x.se.agents.some(function (n) { return N(n) === N(a.nom); }); })[0];
            if (!slot && /CIP10 silice/.test(e.modele) && /CIP10 silice/.test(x.o.modele)) slot = { bloc: 0 };
            if (!slot) return;
            x.place = true;
            x.slotBloc = slot.bloc;
            if (blocs[slot.bloc] === null) blocs[slot.bloc] = x; else restants.push(x);
          });
          restants.forEach(function (x) { s.copyColumns(3, largeur, 3 + blocs.length * largeur); blocs.push(x); });
          var finProtocole = 2 + e.nbBlocs * largeur;
          // valeurs préécrites du protocole (support, lot, agent), de la colonne de départ à la dernière, comme la macro
          var trouve = null;
          e.valeurs.forEach(function (v) {
            var r = R.find(function (t2) { return t2 === N(v.label); }, { formuleOk: true, depuis: v.memeQueDessus && trouve ? trouve : 0 });
            if (!r) return;
            trouve = N(v.label) === 'agent chimique' ? null : r;
            for (var c = v.col; c <= finProtocole; c += 2) s.set(C(c) + r, v.valeur);
            // blocs ajoutés pour d'autres GEH : mêmes valeurs que le bloc du protocole qu'ils prolongent
            blocs.forEach(function (x, bi) {
              if (bi < e.nbBlocs || !x || x.slotBloc !== v.bloc) return;
              for (var c2 = 3 + bi * largeur; c2 < 3 + (bi + 1) * largeur; c2 += 2) s.set(C(c2) + r, v.valeur);
            });
          });
          if (R.preleveur) s.set('C' + R.preleveur, m.preleveur || '');
          if (R.site) s.set('C' + R.site, m.clientSite || '');
          fcDebitmetre(s, R, m);
          var n = 0;
          blocs.forEach(function (x, bi) {
            if (!x) return;
            if (R.geh) s.set(C(3 + bi * largeur) + R.geh, x.o.geh.num + ' - ' + (x.o.geh.name || ''));
            x.se.p.subPrelevements.forEach(function (sb, si) {
              if (reg && si > 2) return;
              fcRemplirColonne(s, R, C(3 + bi * largeur + si * 2), {
                m: m, p: x.se.p, geh: x.o.geh, sb: sb, agents: x.se.agents, modele: e.modele, seq: /\(séq\)/.test(e.modele), type: x.se.p.type, protocole: true,
                lot: x.se.agents.map(function (an) { return fcLotEchantillon(sb, an); }).filter(Boolean)[0] || '',
                blanc: findBlancForSupport(m, sb, fcAgentsDuSupport(x.se.p, sb, x.se.agents))
              });
              n++;
            });
          });
          resume.push(nom + ' (Véolia, ' + n + ' prélèvement' + (n > 1 ? 's' : '') + ')');
        });
      });
    });
    return chain.then(function () {
      // séries hors protocole : onglets GEH habituels (avant suppression des modèles)
      var hors = {};
      series.filter(function (x) { return !x.place; }).forEach(function (x) {
        var k = x.o.geh.id + '|' + x.o.modele;
        if (!hors[k]) hors[k] = { geh: x.o.geh, modele: x.o.modele, reg: x.o.reg, seq: x.o.seq, series: [] };
        hors[k].series.push(x.se);
      });
      var c2 = Promise.resolve();
      Object.keys(hors).forEach(function (k) {
        var o = hors[k];
        c2 = c2.then(function () {
          if (!wb.paths[o.modele]) return;
          var nomO = fcNomOnglet(o.geh, o.modele, pris);
          plan.alertes.push('Véolia : « ' + o.series.map(function (s) { return s.agents.join(' + '); }).join(', ') + ' » hors protocole du site, mis dans « ' + nomO + ' ».');
          return wb.copierOnglet(o.modele, nomO).then(function (s) { var n = fcRemplirOnglet(s, o, m); resume.push(nomO + ' (' + n + ' prélèvement' + (n > 1 ? 's' : '') + ')'); });
        });
      });
      return c2;
    }).then(function () {
      // modèles génériques supprimés, comme la macro
      var c3 = Promise.resolve();
      VEOLIA_MODELES_GENERIQUES.forEach(function (n) { c3 = c3.then(function () { return wb.supprimerOnglet(n); }); });
      return c3;
    }).then(function () {
      // synthèse : colonnes du site seulement, ligne 1 retirée, onglet renommé
      if (!wb.paths['GEH X - Site']) return;
      return wb.onglet('GEH X - Site').then(function (s) {
        var suppr = [];
        for (var c = 1; c <= 1000; c++) {
          var v = s.text(C(c) + '1');
          if (v === '') break;
          if (v !== site) suppr.push(c);
        }
        s.removeRowsCols(suppr, [1]);
        var nouveau = ('GEH X - ' + site).slice(0, 31);
        wb.renommerOnglet('GEH X - Site', nouveau);
        return wb.recalerCommentaires(nouveau);
      });
    }).then(function () {
      return wb.onglet('VEOLIA').then(function (s) { s.set('A1', site); });
    });
  });
}

console.log('✓ Véolia chargé');
