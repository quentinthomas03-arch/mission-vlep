// feuille-calcul.js - Export direct dans la feuille de calcul « Contrôle des VLEP » (fin de la double saisie)
// © 2025 Quentin THOMAS
//
// Un onglet par GEH et par type de support, copié du modèle comme le bouton « Ajouter onglet »
// (« GEH 1 - Tube Reg », « GEH 4 - Cassette »…). Les champs sont repérés par leur libellé
// (colonne A ou B), pas par un numéro de ligne : une nouvelle version du modèle reste compatible
// tant que les libellés ne changent pas.
//   - onglet Reg : un bloc de 6 colonnes par série (agent ou agents d'un même support), J1-J3 en C, E, G ;
//   - onglet non Reg : 2 colonnes par prélèvement ;
//   - « (séq) » : prélèvement fractionné, supports empilés (tube n°1, n°2…) dans la même colonne ;
//   - « (multi) » : plusieurs agents sur un même support (Reg).
// Ce qui n'est pas saisi dans l'appli (durée d'exposition, masses du labo…) reste à compléter dans Excel.

var FC_MODELE_URL = 'modele/feuille-calcul-vlep.xlsm';
var FC_LIB_MASSIQUE = 'débitmètre massique';
var FC_LIB_LAME = 'débitmètre à lame de savon ou à piston';
var FC_LABORATOIRES = ["EUROFINS Analyses de l'air", 'TERA-Environnement', 'TOXILABO', 'Eurofins Analyses pour le Bâtiment', 'CARSO', 'ITGA'];

// ---------- Choix du modèle ----------

function fcSupport(agentName) {
  var ag = getAgentFromDB(agentName);
  return ag ? String(ag['Support de prélèvement'] || '').toLowerCase() : '';
}
function fcEstCip10(agentName) {
  var sup = fcSupport(agentName);
  return sup.indexOf('cip') !== -1 || sup.indexOf('coupelle rotative') !== -1;
}
// Silice cristalline sur CIP10 (quartz, cristobalite, tridymite) : onglet « CIP10 silice »
function fcEstSilice(agentName) {
  return /silice cristalline/i.test(agentName || '') && fcEstCip10(agentName);
}

// Famille de modèle d'après le support de la base : Tube, Cassette, Cassette+tube, CIP10 silice, CIP10 sf silice, Fibres
function fcFamille(agentName) {
  if (typeof isAnalyseurAgent === 'function' && isAnalyseurAgent(agentName)) return 'Analyseurs';
  if (fcEstSilice(agentName)) return 'CIP10 silice';
  if (fcEstCip10(agentName)) return 'CIP10 sf silice';
  if (/amiante|fibres? (céramiques?|minérales?|de verre)/i.test(agentName || '')) return 'Fibres';
  var sup = fcSupport(agentName);
  var tube = /\btube|orbo|anasorb|xad|tenax|florisil|tamis mol/.test(sup);
  var filtre = /filtre|cassette|membrane/.test(sup);
  if (tube && filtre) return 'Cassette+tube';
  if (tube) return 'Tube';
  if (filtre) return 'Cassette';
  return null;
}

// Séries d'un prélèvement : un agent seul, ou les agents liés sur un même support
function fcSeries(p) {
  var sb0 = p.subPrelevements[0] || {};
  var vus = {}, series = [];
  // CIP10 silice : fractions de silice et poussières alvéolaires du prélèvement sur le même CIP10
  var silice = p.agents.filter(function (a) { return fcEstSilice(a.name); });
  if (silice.length) {
    var grp = p.agents.filter(function (a) { return fcEstSilice(a.name) || (fcEstCip10(a.name) && /alvéolaire/i.test(a.name)); });
    series.push({ agents: grp.map(function (a) { return a.name; }) });
    grp.forEach(function (a) { vus[a.name] = true; });
  }
  p.agents.forEach(function (a) {
    if (vus[a.name]) return;
    var grp = getCoPrelGroupMembers(sb0, a.name);
    var noms = grp.length > 1 ? p.agents.map(function (x) { return x.name; }).filter(function (n) { return grp.indexOf(n) !== -1; }) : [a.name];
    noms.forEach(function (n) { vus[n] = true; });
    series.push({ agents: noms });
  });
  return series;
}

function fcModele(famille, isReg, multi, seq) {
  if (famille === 'Analyseurs') return 'Analyseurs'; // un seul modèle, un essai par colonne
  var nom = famille + (isReg ? ' Reg' : '');
  if (seq) return nom + ' (séq)';
  if (multi && isReg && (famille === 'Tube' || famille === 'Cassette')) return nom + ' (multi)';
  return nom;
}

// Plan : onglets à créer, chacun avec ses colonnes (une par sous-prélèvement)
function fcPlan(m) {
  var onglets = {}, ordre = [], alertes = [];
  var gehs = (m.gehs || []).slice().sort(function (a, b) { return a.num - b.num; });
  gehs.forEach(function (g) {
    m.prelevements.filter(function (p) { return p.gehId === g.id; }).forEach(function (p) {
      fcSeries(p).forEach(function (s) {
        var fam = fcFamille(s.agents[0]);
        if (!fam) { alertes.push('Support inconnu pour « ' + s.agents[0] + ' » (GEH ' + g.num + ') : non exporté.'); return; }
        var seq = p.subPrelevements.some(function (sb) { return getSupportsSupp(sb).length > 0; });
        var multi = s.agents.length > 1 && fam !== 'CIP10 silice';
        var modele = fcModele(fam, p.isReglementaire, multi, seq);
        if (multi && !/\(multi\)/.test(modele)) alertes.push('« ' + s.agents.join(' + ') + ' » (GEH ' + g.num + ') : pas de modèle multi-agents pour ' + modele + ', un agent par colonne.');
        var cle = g.id + '|' + modele;
        if (!onglets[cle]) { onglets[cle] = { geh: g, modele: modele, reg: !!p.isReglementaire && fam !== 'Analyseurs', seq: seq && fam !== 'Analyseurs', series: [] }; ordre.push(cle); }
        if (multi && !/\(multi\)/.test(modele)) s.agents.forEach(function (n) { onglets[cle].series.push({ p: p, agents: [n] }); });
        else onglets[cle].series.push({ p: p, agents: s.agents });
      });
    });
  });
  return { onglets: ordre.map(function (k) { return onglets[k]; }), alertes: alertes };
}

function fcNomOnglet(geh, modele, pris) {
  var base = ('GEH ' + geh.num + ' - ' + modele).replace(/[\[\]:*?\/\\]/g, '').slice(0, 31);
  var nom = base, i = 2;
  while (pris[nom]) { nom = base.slice(0, 28) + ' ' + i; i++; }
  pris[nom] = true;
  return nom;
}

// ---------- Valeurs ----------

function fcHeure(hhmm) {
  var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? (+m[1] * 60 + +m[2]) / 1440 : null;
}
function fcNombre(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : String(v);
}
function fcLabo(ag) {
  var l = ag ? String(ag['Laboratoire sous-traitant'] || '').toLowerCase() : '';
  if (!l) return null;
  for (var i = 0; i < FC_LABORATOIRES.length; i++) {
    var c = FC_LABORATOIRES[i].toLowerCase();
    if (c === l || c.indexOf(l) !== -1 || l.indexOf(c) !== -1) return FC_LABORATOIRES[i];
  }
  if (l.indexOf('eurofins') !== -1 && l.indexOf('air') !== -1) return FC_LABORATOIRES[0];
  return null;
}

// ---------- Repérage des lignes d'un onglet ----------

function fcLignes(s) {
  var N = XlsmMoteur.normLabel;
  var rs = Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; });
  var lab = rs.map(function (r) { return { r: r, a: N(s.text('A' + r)), b: N(s.text('B' + r)), cF: /<f>/.test((s.cell('C' + r) || {}).inner || '') }; });
  // première ligne (après « depuis ») dont le libellé A ou B satisfait test, cellule C saisissable
  function find(test, opts) {
    opts = opts || {};
    for (var i = 0; i < lab.length; i++) {
      var L = lab[i];
      if (opts.depuis && L.r <= opts.depuis) continue;
      if (opts.avant && L.r >= opts.avant) break;
      if (!opts.formuleOk && L.cF) continue;
      var t = opts.col === 'B' ? L.b : opts.col === 'A' ? L.a : null;
      if (t !== null ? test(t) : (test(L.a) || test(L.b))) return L.r;
    }
    return null;
  }
  var eg = function (x) { x = N(x); return function (t) { return t === x; }; };
  var debut = function (x) { x = N(x); return function (t) { return t.indexOf(x) === 0; }; };
  var R = { find: find, eg: eg, debut: debut };
  R.preleveur = find(eg('nom du préleveur'), { formuleOk: true });
  R.site = find(eg('site'), { formuleOk: true });
  R.geh = find(eg('GEH'), { col: 'A' });
  R.numId = find(eg("n° d'identification"), { col: 'A', formuleOk: true });
  R.massique = find(debut('Volume prélevé avec pompe - Vérification du débit avec débitmètre massique'), { formuleOk: true });
  R.lame = find(debut('Volume prélevé avec pompe - Vérification du débit avec débitmètre à lame de savon'), { formuleOk: true });
  R.volumeFin = R.lame ? find(eg('Volume prélevé (L)'), { depuis: R.lame, formuleOk: true }) : null;
  R.resultats = find(eg("Résultats du laboratoire d'analyse"), { formuleOk: true });
  // fin du bloc lame de savon : « Volume prélevé (L) », sinon (séquentiel) la ligne avant les résultats du labo
  R.finLame = R.volumeFin || (R.resultats ? R.resultats - 1 : null);
  // dernière ligne propre au bloc lame de savon (les « Volume prélevé » finaux restent visibles)
  R.finBlocLame = null;
  if (R.lame) for (var i = 0; i < lab.length; i++) {
    if (lab[i].r <= R.lame) continue;
    if (R.resultats && lab[i].r >= R.resultats) break;
    if (lab[i].a.indexOf('volume prélevé corrigé') === 0) R.finBlocLame = lab[i].r;
  }
  R.duree = find(debut('durée du prélèvement (h)'), { formuleOk: true }) || find(debut('durée totale de prélèvement'), { formuleOk: true }) || find(debut('durée des mesures (h)'), { formuleOk: true });
  return R;
}

// Colonnes déjà prêtes dans l'onglet (blocs du modèle)
function fcCapacite(s, R, largeur) {
  var last = s.lastCol(R.duree || 1);
  return Math.max(1, Math.floor((last - 2 + (largeur === 6 ? 2 : 1)) / largeur));
}

// ---------- Remplissage ----------

function fcRemplirColonne(s, R, col, ctx) {
  if (ctx.modele === 'Analyseurs') return fcRemplirAnalyseur(s, R, col, ctx);
  var m = ctx.m, sb = ctx.sb, agents = ctx.agents, an = agents[0];
  var ag = getAgentFromDB(an);
  var ad = (sb.agentData && sb.agentData[an]) || {};
  var tachy = isTachymetreAgent(an);
  var f = R.find, eg = R.eg, debut = R.debut;
  function set(row, v) { if (row && v !== null && v !== undefined && v !== '') s.set(col + row, v); }
  var regionHaut = R.resultats || 9999;

  set(f(eg('opérateur'), { col: 'A' }), sb.operateur || '');
  // onglets non réglementaires : « individuel » (opérateur, par défaut) ou « à poste fixe »
  set(f(eg('type de prélèvement'), { col: 'A' }), sb.posteFixe ? 'à poste fixe' : 'individuel');
  // onglet Véolia : agent et support viennent du protocole du site
  if (!ctx.protocole && (agents.length === 1 || /CIP10 silice/.test(ctx.modele))) {
    set(f(eg('agent chimique'), { col: 'A', avant: regionHaut }), /CIP10 silice/.test(ctx.modele) ? 'silice cristalline' : an);
  }
  // agents empilés (multi) : « agent chimique n°k_ »
  if (agents.length > 1 && /\(multi\)/.test(ctx.modele)) {
    agents.forEach(function (n, k) { set(f(eg('agent chimique n°' + (k + 1) + '_'), { col: 'A', depuis: R.resultats || 0 }), n); });
  }
  if (R.numId) {
    set(R.numId, ad.numPompe || '');
    set(R.numId + 1, tachy ? (m.tachymetre || '') : (m.debitmetre || ''));
  }
  if (!ctx.protocole) set(f(eg('nature et marque'), { col: 'B' }), ag ? (ag['Support de prélèvement'] || '') : '');
  // n° de lot : celui de l'échantillon (celui du blanc associé pour une ancienne saisie sans lot sur l'échantillon)
  var lotEch = ctx.lot || (ctx.blanc && ctx.blanc.lot) || '';
  if (lotEch) set(f(eg('n° de lot'), { col: 'B' }), lotEch);
  // vraie date Excel (format jj/mm/aa du modèle), pas un texte
  set(f(eg('date de prélèvement'), { col: 'A', avant: regionHaut }), fcDateExcel(sb.date));

  // Supports : 1 seul (onglet normal) ou empilés (séq, « C2-P1 »…)
  var supports = ctx.seq ? expandSubSupports(sb) : [sb];
  supports.forEach(function (sp, k) {
    var K = 'n°c' + (k + 1) + '-p';
    var sad = (sp.agentData && sp.agentData[an]) || {};
    (sp.plages || []).slice(0, 10).forEach(function (pl, j) {
      var tag = K + (j + 1) + '_';
      set(f(function (t) { return t.indexOf('heure début') !== -1 && t.indexOf(tag) !== -1; }), fcHeure(pl.debut));
      set(f(function (t) { return t.indexOf('heure fin') !== -1 && t.indexOf(tag) !== -1; }), fcHeure(pl.fin));
    });
    var suff = ctx.seq ? ' n°' + (k + 1) + '_' : '';
    // EPI (par support en séq)
    var rEpi = ctx.seq ? f(function (t) { return t.indexOf("type d'epi") === 0 && t.indexOf('n°' + (k + 1) + '_') !== -1; }) : f(debut("type d'EPI"), { col: 'A' });
    set(rEpi, sb.epiType || 'sans objet');
    var rPort = ctx.seq ? f(function (t) { return t.indexOf("durée de port de l'epi") === 0 && t.indexOf('n°' + (k + 1) + '_') !== -1; }) : f(debut("durée de port de l'EPI"), { col: 'A' });
    set(rPort, (sb.epiType || 'sans objet') === 'sans objet' ? 0 : fcNombre(sb.epiDuree) || 0);
    // Débits / vitesses
    if (tachy) {
      set(f(eg('vitesse de rotation (tr/min)'), { col: 'B' }), fcNombre(sad.debitRef));
      var rv = f(eg('vitesse de rotation (tr/min)'), { col: 'A' });
      set(rv, fcNombre(sad.debitInitial)); set(rv && rv + 1, fcNombre(sad.debitFinal));
    } else if (k === 0) {
      // Débit de la pompe : un contrôle au début et à la fin ; en séquentiel, avant le 1er tube et après le dernier
      var piston = getDebitmetreType(m) === 'piston';
      var de = piston ? R.lame : R.massique, a = piston ? (R.finLame || 9999) : (R.lame || 9999);
      var dernier = supports[supports.length - 1];
      var dad = (dernier.agentData && dernier.agentData[an]) || {};
      var match = function (lib) { return function (t) { return t.indexOf(lib) === 0 && t.indexOf('corrigé') === -1; }; };
      if (de) {
        set(f(match('débit initial de la pompe'), { depuis: de, avant: a }), fcNombre(sad.debitInitial));
        set(f(match('débit final de la pompe'), { depuis: de, avant: a }), fcNombre(dad.debitFinal));
      }
    }
    // Référence d'échantillon (par support en séq)
    var rRef = ctx.seq ? f(function (t) { return t.indexOf("référence de l'échantillon") === 0 && t.indexOf('n°' + (k + 1) + '_') !== -1; }, { avant: (R.find(eg('RESULTATS'), { formuleOk: true }) || 9999) })
      : f(eg("référence de l'échantillon"), { col: 'A' });
    set(rRef, sad.refEchantillon || '');
  });

  // Durée d'exposition (h:min), une par prélèvement
  var expo = dureeExpositionMin(ctx.p, sb);
  if (expo !== null) set(f(eg("durée d'exposition (h:min) - VLEP 8h"), { col: 'A' }), expo / 1440);

  // Conditions ambiantes du jour
  var cond = getConditionsForPrel(m, sb);
  if (cond) {
    var rt = f(eg('température ambiante (°C)'), { col: 'A' }), rp = f(eg('pression atmosphérique (hPa)'), { col: 'A' }), rh = f(eg('humidité relative (%)'), { col: 'A' });
    set(rt, fcNombre(cond.tempI)); set(rt && rt + 1, fcNombre(cond.tempF));
    set(rp, fcNombre(cond.pressionI)); set(rp && rp + 1, fcNombre(cond.pressionF));
    set(rh, fcNombre(cond.humiditeI)); set(rh && rh + 1, fcNombre(cond.humiditeF));
  }
  var labo = fcLabo(ag);
  if (labo) set(f(eg('nom du laboratoire'), { col: 'A', formuleOk: true }), labo);
  set(f(eg('type de VLEP'), { col: 'A' }), ctx.type === 'CT' ? 'court-terme' : '8h');
  if (ctx.blanc && ctx.blanc.ref) set(f(eg('référence du témoin'), { col: 'A' }), ctx.blanc.ref);
  // commentaire : seulement la justification d'un réglementaire prévu à moins de 3 prélèvements (l'activité saisie
  // sur le terrain n'a pas sa place dans la feuille de calcul : elle va dans l'annexe des tâches du rapport)
  var pc = ctx.p || {}, nbPrevus = pc.nbPrevus || (pc.subPrelevements || []).length;
  if (pc.isReglementaire && nbPrevus < 3 && pc.justifNb) set(f(eg('commentaire'), { col: 'A' }), pc.justifNb);

  fcScola(s, R, col, ctx, supports);
}

// ---------- Bloc Scol@ (bas de l'onglet, rempli d'habitude par le formulaire Scol@_Prélèvement) ----------
var FC_SCOLA = {
  representativite: {
    '8h': "VLEP 8h : mesures de l'exposition réalisées sur tout le poste de travail pour comparaison avec une VLEP 8h",
    'CT': "VLEP CT : mesures de l'exposition réalisées pendant une durée <= 15 mn pour comparaison avec une VLEP court terme"
  },
  lieu: {
    'Local standard industriel': 'Local standard industriel (local couvert muni de portes et fenêtres, quelle que soit la taille du local)',
    'Lieu de travail en plein air': 'Lieu de travail en plein air (plateforme de chimie, poste de chargement, carrières à ciel ouvert...)',
    'Autre': 'Autres types de lieux non codifiés par ailleurs'
  },
  ventilation: { oui: "Présence d'une ventilation générale et mécanique", non: 'Absence de ventilation mécanique' },
  captage: {
    'Non': 'Absence de captage localisé',
    'Inducteur': 'Présence de captage localisé inducteur (non enveloppant)',
    'Enveloppant': 'Présence de captage localisé enveloppant',
    'Cabine ventilée de grande dimension': 'Cabine ventilée de grandes dimensions'
  }
};

// Méthode de prélèvement Scol@ : déduite seulement quand elle est sans ambiguïté (sinon laissée au technicien)
function fcScolaMethode(an) {
  var sup = fcSupport(an);
  if (fcEstCip10(an)) return /inhalable/i.test(an + ' ' + sup) ? 'Prélèvement de la fraction inhalable avec CIP10-I' : 'Prélèvement de la fraction alvéolaire avec CIP10-A';
  if (/badge/.test(sup)) return 'Prélèvement passif réalisé avec un badge';
  if (/\btube|orbo|anasorb|xad|tenax|florisil|tamis mol/.test(sup) && !/filtre|cassette/.test(sup)) return 'Prélèvement actif réalisé avec une pompe';
  return null;
}

function fcScola(s, R, col, ctx, supports, methodeImposee) {
  var f = R.find, eg = R.eg, sb = ctx.sb, an = ctx.agents[0];
  var depuis = f(eg("DESCRIPTION DE LA MESURE D'EXPOSITION"), { col: 'A', formuleOk: true });
  if (!depuis) return; // modèle sans bloc Scol@
  function ligne(lib) { return f(eg(lib), { col: 'A', depuis: depuis - 1, formuleOk: true }); }
  function set(lib, v) { var r = ligne(lib); if (r && v !== null && v !== undefined && v !== '') s.set(col + r, v); }
  var sad = (supports[0].agentData && supports[0].agentData[an]) || {};
  set('N° de prélèvement *', sad.refEchantillon || '');
  set('Date de prélèvement *', formatDateFR(sb.date) || '');
  set('Représentativité *', FC_SCOLA.representativite[ctx.type === 'CT' ? 'CT' : '8h']);
  set('Méthode de prélèvement *', methodeImposee || fcScolaMethode(an));
  var duree = dureePrelevementMin(sb);
  if (duree > 0) set('Durée *', duree);
  // Débit moyen : celui calculé par la feuille (débit corrigé si lame de savon, CIP10 sinon)
  var rDeb = null;
  if (methodeImposee) rDeb = null; // analyseur : pas de débit
  else if (isTachymetreAgent(an)) rDeb = f(eg('débit moyen du CIP10 (L/min)'), { col: 'A', formuleOk: true });
  else {
    var piston = getDebitmetreType(ctx.m) === 'piston';
    var de = piston ? R.lame : R.massique;
    if (de) rDeb = f(eg('débit moyen de la pompe (L/min)'), { col: 'A', depuis: de, avant: piston ? (R.finLame || 9999) : (R.lame || 9999), formuleOk: true });
  }
  var rScolaDeb = ligne('Débit moyen *');
  if (rDeb && rScolaDeb) s.setFormula(col + rScolaDeb, 'IF(' + col + rDeb + '="","",' + col + rDeb + ')');
  // Circonstances d'exposition
  set('GES *', ctx.geh ? ctx.geh.num + ' - ' + (ctx.geh.name || '') : '');
  set('Tâche *', sb.scolaTache || '');
  set('Métier *', sb.scolaMetier || '');
  set('Type de Lieu de Travail *', FC_SCOLA.lieu[sb.ventEnv || 'Local standard industriel'] || null);
  set('Ventilation global *', FC_SCOLA.ventilation[sb.ventGenerale || 'non'] || null);
  set('Protection Collective *', FC_SCOLA.captage[sb.ventCaptage || 'Non'] || null);
  set('Type de procédé *', sb.scolaProcede || '');
  // Protection respiratoire : seule l'absence se déduit ; l'efficacité de l'APR reste au jugement du technicien
  if ((sb.epiType || 'sans objet') === 'sans objet') set('Protection individuelle *', 'Absence de protection respiratoire');
  var rFpa = f(function (t) { return t.indexOf('facteur de protection assigné (fpa)') === 0; }, { col: 'A', formuleOk: true });
  var rScolaFpa = ligne('Facteur de protection *');
  if (rFpa && rScolaFpa) s.setFormula(col + rScolaFpa, 'IF(' + col + rFpa + '="","",' + col + rFpa + ')');
}

// ---------- Onglet Analyseurs (mesure en continu, un essai par colonne) ----------
function fcDateExcel(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000 : null;
}

function fcRemplirAnalyseur(s, R, col, ctx) {
  var m = ctx.m, sb = ctx.sb, an = ctx.agents[0], f = R.find, eg = R.eg;
  var ad = (sb.agentData && sb.agentData[an]) || {};
  function set(row, v) { if (row && v !== null && v !== undefined && v !== '') s.set(col + row, v); }
  var rRes = f(eg('Résultats des mesures'), { col: 'A', formuleOk: true }) || 9999;
  // Matériel et contrôles (haut de l'onglet)
  set(f(eg('n° essai :'), { col: 'A', avant: rRes }), ad.refEchantillon || '');
  set(f(eg('N° analyseur'), { col: 'A' }), ad.numPompe || '');
  var rBout = f(eg('N° bouteille'), { col: 'A', formuleOk: true });
  if (rBout) { set(rBout, ad.bouteilleZero || ''); set(rBout + 1, ad.bouteilleEtalon || ''); }
  set(f(eg('Nature du gaz étalon'), { col: 'A' }), ad.gazEtalon || '');
  var rAtt = f(eg('Valeurs attendues'), { col: 'A', formuleOk: true });
  if (rAtt) { set(rAtt, fcNombre(ad.attenduZero)); set(rAtt + 1, fcNombre(ad.attenduEtalon)); }
  var rAvant = f(eg('Ajustages et contrôles avant échantillonnage'), { col: 'A', formuleOk: true });
  var rApres = f(eg('Contrôles après échantillonnage'), { col: 'A', formuleOk: true });
  if (rAvant) {
    set(f(eg('contrôle du zéro'), { col: 'A', depuis: rAvant, avant: rApres || 9999 }), fcNombre(ad.ctrlZeroAvant));
    set(f(eg('ajustage ou contrôle de la sensibilité'), { col: 'A', depuis: rAvant }), fcNombre(ad.ctrlSensAvant));
  }
  if (rApres) {
    set(f(eg('contrôle du zéro'), { col: 'A', depuis: rApres }), fcNombre(ad.ctrlZeroApres));
    set(f(eg('contrôle de la sensibilité'), { col: 'A', depuis: rApres }), fcNombre(ad.ctrlSensApres));
  }
  // Résultats des mesures
  // GEH et agent : en tête de bloc seulement (les essais 2 et 3 du bloc les reprennent)
  if (ctx.teteDeBloc !== false) set(f(eg('GEH'), { col: 'A', depuis: rRes }), ctx.geh ? ctx.geh.num + ' - ' + (ctx.geh.name || '') : '');
  set(f(eg('Opérateur'), { col: 'A', depuis: rRes }), sb.operateur || '');
  if (ctx.teteDeBloc !== false) set(f(eg('Agent chimique'), { col: 'A', depuis: rRes }), an);
  set(f(eg('Date'), { col: 'A', depuis: rRes }), fcDateExcel(sb.date));
  var depuis = rRes;
  (sb.plages || []).slice(0, 10).forEach(function (pl) {
    var rd = f(eg('heure début (hh:mm:ss)'), { col: 'B', depuis: depuis });
    if (!rd) return;
    set(rd, fcHeure(pl.debut)); set(rd + 1, fcHeure(pl.fin));
    depuis = rd + 1;
  });
  var expo = dureeExpositionMin(ctx.p, sb);
  if (expo !== null) set(f(eg("durée d'exposition (h:min) - VLEP 8h"), { col: 'A' }), expo / 1440);
  set(f(eg('Type de VLEP'), { col: 'A' }), ctx.type === 'CT' ? 'court-terme' : '8h');
  // Scol@ : appareil à lecture directe
  fcScola(s, R, col, ctx, [sb], 'Prélèvement réalisé avec un appareil à lecture directe');
}

// Analyseurs + Acquisition : une paire d'onglets liés (Analyseurs!A149 -> Acquisition, Acquisition!CL2 -> Analyseurs).
// Comme un onglet Reg, l'onglet Analyseurs groupe les essais par blocs de 3 colonnes (C, E, G puis I, K, M) : GEH et
// agent sont saisis en tête de bloc et repris par les essais 2 et 3 ($C$68). Une série (un agent) = un bloc,
// J1 à J3 dans ses colonnes ; 2 blocs par paire. Bloc b, essai k <-> « GEH(b+1)-essai (k+1) » d'Acquisition,
// c'est-à-dire son bloc n° 3b+k (14 colonnes). Paires suivantes : « Analyseurs2 / Acquisition2 »… (noms sans
// espace : une formule du modèle cite l'onglet d'acquisition sans apostrophes).
var FC_BLOCS_PAR_PAIRE = 2, FC_ESSAIS_PAR_BLOC = 3;

// heure du relevé à la minute : la feuille cherche l'heure de début de plage parmi les relevés (recherche croissante),
// un relevé à 06:38:16 ne serait pas trouvé pour une plage commençant à 06:38
function fcHeureSec(iso) { var m = /(\d{2}):(\d{2}):(\d{2})$/.exec(iso || ''); return m ? (+m[1] * 60 + +m[2]) / 1440 : null; }

function fcExporterAnalyseurs(wb, m, onglets, resume, alertes) {
  var blocs = [];
  onglets.forEach(function (o) {
    o.series.forEach(function (se) {
      var subs = se.p.subPrelevements;
      for (var i = 0; i < subs.length; i += FC_ESSAIS_PAR_BLOC) blocs.push({ o: o, se: se, subs: subs.slice(i, i + FC_ESSAIS_PAR_BLOC) });
    });
  });
  if (!blocs.length) return Promise.resolve();
  var paires = [];
  for (var i = 0; i < blocs.length; i += FC_BLOCS_PAR_PAIRE) paires.push(blocs.slice(i, i + FC_BLOCS_PAR_PAIRE));
  var C = XlsmMoteur.colStr, chain = Promise.resolve();
  paires.forEach(function (lot, pi) {
    var nomA = pi === 0 ? 'Analyseurs' : 'Analyseurs' + (pi + 1), nomQ = pi === 0 ? 'Acquisition' : 'Acquisition' + (pi + 1);
    chain = chain.then(function () {
      if (pi === 0) return Promise.all([wb.onglet(nomA), wb.onglet(nomQ)]);
      return wb.copierOnglet('Analyseurs', nomA).then(function (a) { return wb.copierOnglet('Acquisition', nomQ).then(function (q) { return [a, q]; }); });
    }).then(function (sh) {
      var sA = sh[0], sQ = sh[1], R = fcLignes(sA);
      if (R.preleveur) sA.set('C' + R.preleveur, m.preleveur || '');
      // liaison de la paire
      var rLien = R.find(R.eg('Feuille Acquisition'), { col: 'A', formuleOk: true });
      if (rLien) sA.set('A' + (rLien + 1), nomQ);
      sQ.set('CL2', nomA);
      var nEssais = 0, nRel = 0;
      lot.forEach(function (bl, b) {
        bl.subs.forEach(function (sb, k) {
          nEssais++;
          fcRemplirAnalyseur(sA, R, C(3 + b * 6 + k * 2), {
            m: m, p: bl.se.p, geh: bl.o.geh, sb: sb, agents: bl.se.agents, modele: 'Analyseurs', type: bl.se.p.type, teteDeBloc: k === 0
          });
          var an = bl.se.agents[0], ad = (sb.agentData && sb.agentData[an]) || {};
          var rel = typeof relevesDansPlages === 'function' ? relevesDansPlages(sb, ad.releves) : [];
          if (!rel.length) return;
          var dep = 1 + (b * 3 + k) * 14, colGaz = /dioxyde de carbone|co2/i.test(an) ? dep + 5 : (/oxyde de carbone|^co\b/i.test(an) ? dep + 4 : null);
          if (colGaz === null) { alertes.push('Relevés de « ' + an + ' » : l’onglet Acquisition ne prévoit que le CO et le CO2, relevés non reportés.'); return; }
          rel.forEach(function (r, i2) {
            sQ.set(C(dep + 3) + (7 + i2), fcHeureSec(r[0]));
            sQ.set(C(colGaz) + (7 + i2), r[1]);
          });
          nRel += rel.length;
        });
      });
      resume.push(nomA + ' (' + nEssais + ' essai' + (nEssais > 1 ? 's' : '') + ')' + (nRel ? ', ' + nomQ + ' (' + nRel + ' relevés)' : ''));
    });
  });
  return chain;
}

// Débitmètre de l'onglet : libellé sous « n° d'identification » et lignes de l'autre bloc masquées (macro Afficher_Debitmetre)
function fcDebitmetre(s, R, m) {
  if (!R.numId || !R.massique || !R.lame) return;
  var piston = getDebitmetreType(m) === 'piston';
  s.set('B' + (R.numId + 1), piston ? FC_LIB_LAME : FC_LIB_MASSIQUE);
  var fin = R.finLame || R.lame;
  if (piston) { s.hideRows(R.massique, R.lame - 1, true); s.hideRows(R.lame, fin, false); }
  else { s.hideRows(R.lame, R.finBlocLame || fin - 1, true); s.hideRows(R.massique, R.lame - 1, false); }
}

function fcRemplirOnglet(s, o, m) {
  var R = fcLignes(s);
  var C = XlsmMoteur.colStr;
  var largeur = o.reg ? 6 : 2;
  // colonnes : Reg = un bloc par série (sous-prélèvements en C, E, G) ; non Reg = une colonne par sous-prélèvement
  var cols = [];
  o.series.forEach(function (se, bi) {
    se.p.subPrelevements.forEach(function (sb, si) {
      if (o.reg && si > 2) return;
      cols.push({ serie: se, sb: sb, bloc: bi, idx: o.reg ? bi * 6 + si * 2 : cols.length * 2 });
    });
  });
  var besoin = o.reg ? o.series.length : cols.length;
  var dispo = fcCapacite(s, R, largeur);
  for (var b = dispo; b < besoin; b++) s.copyColumns(3, largeur, 3 + b * largeur);
  if (R.preleveur) s.set('C' + R.preleveur, m.preleveur || '');
  if (R.site) s.set('C' + R.site, m.clientSite || '');
  fcDebitmetre(s, R, m);
  if (o.reg && R.geh) o.series.forEach(function (se, bi) { s.set(C(3 + bi * 6) + R.geh, o.geh.num + ' - ' + (o.geh.name || '')); });
  // onglets non Reg (pas de ligne GEH) : le GEH dans la première ligne « Prélèvement n° » (numéro automatique du
  // modèle remplacé), comme les techniciens le font ; les lignes « Prélèvement n° » suivantes la reprennent (=C7…)
  if (!o.reg) {
    var rPrel = Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; }).filter(function (r) { return /^Prélèvement n°$/.test(s.text('A' + r).trim()); })[0];
    if (rPrel) cols.forEach(function (c) { s.set(C(3 + c.idx) + rPrel, o.geh.num + ' - ' + (o.geh.name || '')); });
  }
  cols.forEach(function (c) {
    fcRemplirColonne(s, R, C(3 + c.idx), {
      m: m, p: c.serie.p, geh: o.geh, sb: c.sb, agents: c.serie.agents, modele: o.modele, seq: o.seq, type: c.serie.p.type,
      lot: fcLotEchantillon(c.sb, c.serie.agents[0]),
      blanc: findBlancForAgent(m, c.serie.agents[0], c.sb.date, fcLotEchantillon(c.sb, c.serie.agents[0]))
    });
  });
  return cols.length;
}

// Listes déroulantes des onglets créés par l'appli. Dans le modèle, un double-clic sur l'agent chimique ou le type
// d'EPI ouvre la liste (macro Worksheet_BeforeDoubleClick de chaque onglet) ; un onglet recopié par l'appli n'a pas
// ce module VBA (impossible à ajouter sans Excel). Même liste, en liste déroulante de cellule : Plage_SubstanceMonDevis
// (agents) et Choix_FPA (EPI), sur les cellules saisies (sans formule) de la zone de saisie, au-dessus de RESULTATS.
function fcListesDeroulantes(s) {
  var lignes = Object.keys(s.rows).map(Number).sort(function (a, b) { return a - b; });
  var fin = lignes.filter(function (r) { return s.text('A' + r).trim() === 'RESULTATS'; })[0] || Infinity;
  var ajouts = [];
  lignes.forEach(function (r) {
    if (r >= fin) return;
    var lib = s.text('A' + r).trim(), liste = /^agent chimique/i.test(lib) ? 'Plage_SubstanceMonDevis' : (/^type d'EPI$/i.test(lib) ? 'Choix_FPA' : null);
    if (!liste) return;
    var refs = Object.keys(s.rows[r].cells).map(Number).filter(function (c) { return c >= 3 && !/<f\b/.test(s.rows[r].cells[c].inner || ''); })
      .sort(function (a, b) { return a - b; }).map(function (c) { return XlsmMoteur.colStr(c) + r; });
    // showErrorMessage="0" : une valeur écrite par l'appli hors de la liste reste acceptée
    if (refs.length) ajouts.push('<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="' + refs.join(' ') + '"><formula1>' + liste + '</formula1></dataValidation>');
  });
  if (!ajouts.length) return;
  var m = /<dataValidations\b[^>]*count="(\d+)"[^>]*>/.exec(s.tail);
  if (m) {
    s.tail = s.tail.replace(m[0], m[0].replace('count="' + m[1] + '"', 'count="' + (+m[1] + ajouts.length) + '"')).replace('</dataValidations>', ajouts.join('') + '</dataValidations>');
    return;
  }
  var bloc = '<dataValidations count="' + ajouts.length + '">' + ajouts.join('') + '</dataValidations>';
  var apres = /<(hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|drawing|legacyDrawing|tableParts|extLst)\b/.exec(s.tail);
  s.tail = apres ? s.tail.slice(0, apres.index) + bloc + s.tail.slice(apres.index) : s.tail.replace('</worksheet>', bloc + '</worksheet>');
}

// N° de lot saisi sous la réf. de l'échantillon (premier support de la colonne)
function fcLotEchantillon(sb, agent) {
  var ad = sb && sb.agentData && sb.agentData[agent];
  return ad ? String(ad.lot || '').trim() : '';
}

// ---------- Onglet Eurofins (macro « Listes des références échantillons ») ----------
// Échantillons analysés par Eurofins (un par support, références dédoublonnées) puis blancs, avec le n° de lot.
function fcListeEurofins(m) {
  var lignes = [], vus = {};
  function ajouter(ref, date, lot, type) {
    var k = String(ref || '').trim().toLowerCase();
    if (!k || vus[k]) return;
    vus[k] = true;
    lignes.push([String(ref).trim(), formatDateFR(date) || '', lot || '', type, 'Standard (J0+9)', 'Air des Lieux de Travail']);
  }
  function chezEurofins(an) {
    if (typeof isAnalyseurAgent === 'function' && isAnalyseurAgent(an)) return false; // mesure sur place, rien au labo
    var l = fcLabo(getAgentFromDB(an)); return !l || /eurofins/i.test(l);
  }
  m.prelevements.forEach(function (p) {
    p.subPrelevements.forEach(function (sb0) {
      expandSubSupports(sb0).forEach(function (sb) {
        p.agents.forEach(function (a) {
          var ad = sb.agentData && sb.agentData[a.name];
          if (ad && chezEurofins(a.name)) ajouter(ad.refEchantillon, sb.date, ad.lot || '', 'Echantillon');
        });
      });
    });
  });
  (m.blancs || []).forEach(function (b) {
    if ((b.agents || []).some(chezEurofins)) ajouter(b.ref, b.date, b.lot, 'Blanc');
  });
  return lignes;
}

function fcRemplirEurofins(s, lignes) {
  var R = fcLignes(s);
  var entete = R.find(R.eg('Votre code échantillon *'), { col: 'B', formuleOk: true }) || 3;
  var cols = ['B', 'C', 'D', 'E', 'F', 'G'];
  lignes.forEach(function (l, i) { cols.forEach(function (c, j) { if (l[j] !== '') s.set(c + (entete + 1 + i), l[j]); }); });
}

// ---------- Point d'entrée ----------

// Modèle gardé en mémoire : téléchargé une fois (en arrière-plan à l'ouverture), pas à chaque export
var _fcModele = null;
function fcChargerModele() {
  if (_fcModele) return _fcModele;
  _fcModele = fetch(FC_MODELE_URL).then(function (r) {
    if (!r.ok) throw new Error('Modèle de feuille de calcul introuvable dans l’appli (' + FC_MODELE_URL + ').');
    return r.arrayBuffer();
  });
  _fcModele.catch(function () { _fcModele = null; }); // échec (hors réseau…) : nouvel essai au prochain export
  return _fcModele;
}

// Onglets modèles laissés vierges (« Tube Reg », « Cassette (séq) »…) : masqués à l'ouverture, comme les macros
// d'extraction qui ne lisent que les onglets visibles. L'onglet affiché est le premier onglet rempli.
var FC_MODELE_RE = /^(Cassette\+tube|Cassette|Tube|Fibres|CIP10 sf silice|CIP10 silice|Cyclone silice)( Reg)?( \((séq|multi)\))?$/;
var FC_ONGLETS_FIXES = ['Hist. Version', 'Eurofins', 'Scol@', 'Scol@_Prélèvement', 'FPA'];
function fcMasquerModeles(wb, analyseursRemplis) {
  var modeles = Object.keys(wb.paths).filter(function (n) {
    return FC_MODELE_RE.test(n) || (!analyseursRemplis && (n === 'Analyseurs' || n === 'Acquisition'));
  });
  wb.masquerOnglets(modeles);
  var visibles = wb.ongletsVisibles().filter(function (n) { return FC_ONGLETS_FIXES.indexOf(n) === -1; });
  var premier = visibles.filter(function (n) { return /^GEH /.test(n); })[0] || visibles[0];
  return premier ? wb.activerOnglet(premier) : null;
}

// Échantillons dont la case « réf. du témoin » restera vide (aucun blanc du même agent et du même n° de lot),
// regroupés par agent et par lot. Avertissement seulement : la feuille est générée telle quelle.
function fcAlertesBlancs(m) {
  var groupes = {}, ordre = [];
  (m.prelevements || []).forEach(function (p) {
    (p.subPrelevements || []).forEach(function (sb) {
      var vus = {};
      (p.agents || []).forEach(function (a) {
        if (typeof isAnalyseurAgent === 'function' && isAnalyseurAgent(a.name)) return; // mesure sur place, pas de blanc
        var ad = sb.agentData && sb.agentData[a.name], ref = ad && String(ad.refEchantillon || '').trim();
        if (!ref || vus[ref]) return;
        vus[ref] = true;
        if (findBlancForAgent(m, a.name, sb.date, ad.lot)) return;
        var lot = String(ad.lot || '').trim(), k = a.name + '|' + normLot(lot);
        if (!groupes[k]) { groupes[k] = { agent: a.name, lot: lot, n: 0 }; ordre.push(k); }
        groupes[k].n++;
      });
    });
  });
  if (!ordre.length) return [];
  if (!(m.blancs || []).length) return ['Aucun blanc terrain saisi (Échantillons) : la réf. du témoin restera vide.'];
  return ordre.map(function (k) {
    var g = groupes[k];
    return '« ' + g.agent + ' »' + (g.lot ? ', lot ' + g.lot : ', sans n° de lot') + ' : ' + g.n + ' échantillon' + (g.n > 1 ? 's' : '') + ' sans blanc du même agent et du même lot, réf. du témoin vide.';
  });
}

// Construit la feuille de calcul remplie ; renvoie {blob, filename, onglets, alertes}
function construireFeuilleCalcul(m, donneesModele) {
  if (typeof missionRealisee === 'function') m = missionRealisee(m);
  var plan = fcPlan(m);
  // type de débitmètre non choisi (Infos mission) : massique par défaut, comme avant, mais signalé
  if (!m.debitmetreType) plan.alertes.push('Type de débitmètre non choisi (Infos mission) : « massique » retenu. Si c’est un débitmètre à piston ou à lame de savon, le choisir et regénérer (débits et volumes en dépendent).');
  fcAlertesBlancs(m).forEach(function (a) { plan.alertes.push(a); });
  if (!plan.onglets.length) return Promise.reject(new Error('Aucun prélèvement exportable dans cette mission.'));
  return XlsmMoteur.Classeur.charger(donneesModele).then(function (wb) {
    var pris = {}; Object.keys(wb.paths).forEach(function (n) { pris[n] = true; });
    var chain = Promise.resolve(), resume = [];
    // Mission Véolia : onglets du protocole du site (assistant « Choix Site »), voir veolia.js
    if (m.veoliaSite && typeof veoliaExporter === 'function') chain = veoliaExporter(wb, m, plan, resume);
    else {
      // analyseurs : paire Analyseurs / Acquisition du modèle (pas un onglet par GEH), voir fcExporterAnalyseurs
      var analyseurs = plan.onglets.filter(function (o) { return o.modele === 'Analyseurs'; });
      if (analyseurs.length && wb.paths['Analyseurs'] && wb.paths['Acquisition']) {
        plan.onglets = plan.onglets.filter(function (o) { return o.modele !== 'Analyseurs'; });
        var analyseursAExporter = analyseurs;
      }
    }
    if (!(m.veoliaSite && typeof veoliaExporter === 'function')) plan.onglets.forEach(function (o) {
      chain = chain.then(function () {
        if (!wb.paths[o.modele]) { plan.alertes.push('Modèle « ' + o.modele + ' » absent de la feuille de calcul : GEH ' + o.geh.num + ' non exporté.'); return; }
        var nom = fcNomOnglet(o.geh, o.modele, pris);
        return wb.copierOnglet(o.modele, nom).then(function (s) {
          var n = fcRemplirOnglet(s, o, m);
          fcListesDeroulantes(s);
          resume.push(nom + ' (' + n + ' prélèvement' + (n > 1 ? 's' : '') + ')');
        });
      });
    });
    if (analyseursAExporter) chain = chain.then(function () { return fcExporterAnalyseurs(wb, m, analyseursAExporter, resume, plan.alertes); });
    return chain.then(function () {
      if (!wb.paths['Eurofins']) return;
      var lignes = fcListeEurofins(m);
      if (!lignes.length) return;
      return wb.onglet('Eurofins').then(function (s) {
        fcRemplirEurofins(s, lignes);
        resume.push('Eurofins (' + lignes.length + ' référence' + (lignes.length > 1 ? 's' : '') + ')');
      });
    }).then(function () {
      // en-tête Scol@ du dossier (site, année, n° de dossier, établissement)
      return typeof scolaRemplirDossier === 'function' ? scolaRemplirDossier(wb, m) : null;
    }).then(function () {
      return fcMasquerModeles(wb, !!analyseursAExporter);
    }).then(function () { return wb.generer('blob'); }).then(function (blob) {
      var safe = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
      return { blob: blob, filename: safe + ' - Contrôle des VLEP - Feuille de calculs.xlsm', onglets: resume, alertes: plan.alertes };
    });
  });
}

// Bandeau « en cours » pendant une génération (quelques secondes sur téléphone)
function afficherAttente(msg) {
  var el = document.getElementById('attente-generation');
  if (!msg) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'attente-generation'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#0f172a;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center;';
  el.textContent = msg;
}

function exportFeuilleCalcul() {
  var m = getCurrentMission();
  if (!m) { alert('Aucune mission'); return; }
  if (typeof JSZip === 'undefined' || typeof XlsmMoteur === 'undefined') { alert('Bibliothèque de génération absente.'); return; }
  afficherAttente('Feuille de calcul en cours…');
  // laisse le bandeau s'afficher avant le calcul
  new Promise(function (ok) { setTimeout(ok, 50); }).then(fcChargerModele).then(function (data) { return construireFeuilleCalcul(m, data); }).then(function (r) {
    afficherAttente(null);
    downloadBlob(r.blob, r.filename);
    var msg = 'Feuille de calcul générée : ' + r.filename + '\n\nOnglets créés :\n- ' + r.onglets.join('\n- ') +
      '\n\nÀ compléter dans Excel : résultats du laboratoire.' +
      '\n\nSi Excel affiche « Risque de sécurité » (macros bloquées) : fermer Excel, clic droit sur le fichier › Propriétés › cocher « Débloquer » en bas › OK, puis rouvrir.';
    if (r.alertes.length) msg += '\n\nÀ vérifier :\n- ' + r.alertes.join('\n- ');
    alert(msg);
  }).catch(function (e) { afficherAttente(null); alert('Export impossible :\n\n' + e.message); });
}

// Le modèle n'est pas publié partout (dépôt public sans le modèle) : les fonctions qui en dépendent
// (bouton « Feuille de calcul », Véolia, saisie Scol@, nouveautés liées) ne s'affichent que s'il est là.
var FC_MODELE_DISPO = null; // null = pas encore vérifié
function fcVerifierModele() {
  fetch(FC_MODELE_URL, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok; })
    .catch(function () { return (typeof caches !== 'undefined') ? caches.match(FC_MODELE_URL).then(function (x) { return !!x; }) : false; })
    .then(function (ok) {
      FC_MODELE_DISPO = !!ok;
      if (FC_MODELE_DISPO && typeof render === 'function') render();
      // chargement d'avance (modèle, trame du rapport), après l'affichage de l'appli
      if (FC_MODELE_DISPO) setTimeout(function () { fcChargerModele().catch(function () {}); if (typeof rapportChargerTrame === 'function') rapportChargerTrame().catch(function () {}); }, 2000);
    });
}
if (typeof window !== 'undefined' && typeof fetch === 'function' && typeof document !== 'undefined' && document.readyState !== undefined) fcVerifierModele();

console.log('✓ Feuille de calcul chargée');
