// rapport.js - Rapport Word pré-rempli depuis la trame « Contrôle des VLEP - Modèle de rapport »
// © 2025 Quentin THOMAS
//
// Étape 1 : carte « Rapport » de l'écran Rapport Word (hors préparation). Elle reprend le formulaire de la macro AutoNew de la trame
// (agence, type de rapport, catégories d'agents), choisi par le technicien, plus les champs de couverture
// (chrono, contrat, interlocuteur, rédacteur, valideur) et le choix « mesures à poste fixe ».
// La partie stratégie de la trame n'est pas proposée : elle ne relève pas d'une appli de mesure.

var RAPPORT_AGENCE_KEY = 'vlep_rapport_agence';

// Agences de la macro AutoNew (même texte, même n° d'accréditation)
var RAPPORT_AGENCES = [
  { id: 'ivry', nom: 'Agence Environnement Ile De France Mesures', adresse: ['90-112 Avenue de la liberté', '94700 Maisons-Alfort'] },
  { id: 'seclin', nom: 'Agence Environnement Nord Normandie Mesures', adresse: ['4-6,rue des Ormes', '59810 Lesquin'] },
  { id: 'woippy', nom: 'Agence Environnement Grand est Mesures', adresse: ['Parc des Varimonts', '10, route de Thionville', '57140 Woippy'] },
  { id: 'angers', nom: 'Agence Environnement Loire Bretagne Mesures', adresse: ['7, rue Bouché Thomas', '49000 Angers'] },
  { id: 'vitrolles', nom: 'Agence Environnement Méditerranée Mesures', adresse: ['ZAC du Petit Arbois', 'Avenue Louis Philibert', '13290 Aix-En-Provence'] },
  { id: 'merignac', nom: 'Agence Environnement Sud-Ouest Mesures', adresse: ['Domaine du Millénium', '3,impasse Henri Le Chatelier', '33692 Mérignac Cedex'] },
  { id: 'lyon', nom: 'Agence Environnement Auvergne Rhône-Alpes Mesures', adresse: ['3 rue Paul Rieupeyroux', '69800 Saint Priest'] }
];
var RAPPORT_NUM_ACCREDITATION = '1-7125';

// Cases du formulaire de la macro (mêmes libellés que la trame)
var RAPPORT_TYPES = [
  { id: 'campagne1', label: '1ère campagne' },
  { id: 'campagne2', label: '2ème campagne' },
  { id: 'campagne3', label: '3ème campagne' },
  { id: 'periodique', label: 'Contrôle périodique' },
  { id: 'erc', label: 'Évaluation des risques (ERC)' }
];
var RAPPORT_CATEGORIES = [
  { id: 'contraignantes', label: 'VLEP contraignantes' },
  { id: 'indicatives', label: 'VLEP indicatives' },
  { id: 'admises', label: 'VLEP admises' },
  { id: 'cmr', label: 'CMR à VLEP non réglementaire' },
  { id: 'poussieres', label: 'Poussières inhalables / alvéolaires' },
  { id: 'horsArrete', label: 'Hors arrêté du 15/12/09' },
  { id: 'silice', label: 'Silice cristalline' }
];

var RAPPORT_CHAMPS = [
  { cle: 'chrono', label: 'N° chrono du rapport', ph: 'Référence du rapport' },
  { cle: 'contrat', label: 'N° de contrat', ph: 'Contrat référencé dans l’objectif' },
  { cle: 'interlocuteur', label: 'Interlocuteur client', ph: 'A l’attention de…' },
  { cle: 'redacteur', label: 'Rapport rédigé par', ph: 'Nom' },
  { cle: 'valideur', label: 'Rapport validé par', ph: 'Nom' },
  { cle: 'strategieAuteur', label: 'Stratégie de prélèvement réalisée par', ph: 'SOCOTEC', si: 'campagne1' },
  { cle: 'strategieRef', label: 'Référence du rapport de stratégie', ph: 'Ex. EK2L0/26/055', si: 'campagne1' }
];

// ---------- Partie du rapport de chaque GEH × agent réglementaire ----------
// Rapport réunissant évaluation initiale et contrôle périodique (Bruker 2026 : GEH 3 et 5 en 1ère campagne, les autres
// en contrôle périodique) : le technicien choisit la partie de chaque agent ; résultats, EPI et écarts y sont placés.
// « ei » : partie Évaluation initiale (campagne 1, 2 ou 3) ; « cp » : partie Contrôle périodique.
function rapportDeuxParties(r) { var t = (r && r.types) || {}; return !!((t.campagne1 || t.campagne2 || t.campagne3) && t.periodique); }
function rapportEtape(m, gehId, agent) {
  var r = rapportDonnees(m), t = r.types || {};
  if (!rapportDeuxParties(r)) return t.periodique && !(t.campagne1 || t.campagne2 || t.campagne3) ? 'cp' : 'ei';
  return (r.etapes || {})[String(gehId) + '|' + agent] || 'cp';
}
// Couples GEH × agents réglementaires de la mission, dans l'ordre des GEH
function rapportCouplesReg(m) {
  var out = [];
  (m.gehs || []).forEach(function (g) {
    var agents = [];
    (m.prelevements || []).forEach(function (p) {
      if (String(p.gehId) === String(g.id) && p.isReglementaire) (p.agents || []).forEach(function (a) { if (agents.indexOf(a.name) === -1) agents.push(a.name); });
    });
    if (agents.length) out.push({ geh: g, agents: agents });
  });
  return out;
}
// Prélèvement placé dans une partie si l'un de ses agents y est
function rapportPrelDansEtape(m, p, etape) {
  return (p.agents || []).some(function (a) { return rapportEtape(m, p.gehId, a.name) === etape; });
}
// Partie d'un groupe de colonnes de la feuille de calcul (n° de GEH, noms d'agents de la feuille)
function rapportEtapeAgentFeuille(m, gehNum, agentsFeuille) {
  var g = (m.gehs || []).filter(function (x) { return String(x.num) === String(gehNum); })[0];
  if (!g) return null;
  var c = rapportCouplesReg(m).filter(function (x) { return x.geh === g; })[0];
  if (!c) return null;
  var ets = [];
  agentsFeuille.forEach(function (af) {
    var n = rapportNorm(af);
    var a = c.agents.filter(function (x) { var k = rapportNorm(x); return k === n || k.indexOf(n) === 0 || n.indexOf(k) === 0; })[0];
    if (a) ets.push(rapportEtape(m, g.id, a));
  });
  if (!ets.length) ets = c.agents.map(function (a) { return rapportEtape(m, g.id, a); });
  return ets.indexOf('ei') !== -1 ? 'ei' : ets[0];
}
function rapportBasculeEtape(gehId, agent) {
  var m = getCurrentMission(); if (!m) return;
  var r = rapportDonnees(m);
  if (!r.etapes) r.etapes = {};
  r.etapes[String(gehId) + '|' + agent] = rapportEtape(m, gehId, agent) === 'ei' ? 'cp' : 'ei';
  saveData('vlep_missions_v3', state.missions);
  render();
}
function rapportEtapeGeh(gehId, etape) {
  var m = getCurrentMission(); if (!m) return;
  var r = rapportDonnees(m);
  if (!r.etapes) r.etapes = {};
  rapportCouplesReg(m).forEach(function (c) { if (String(c.geh.id) === String(gehId)) c.agents.forEach(function (a) { r.etapes[String(gehId) + '|' + a] = etape; }); });
  saveData('vlep_missions_v3', state.missions);
  render();
}

// ---------- Utilitaires ----------
function rapportNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim(); }
// Fiche de la base : nom exact, sinon sans accents ni casse (agent saisi à la main « epichlorhydrine »)
function rapportAgentDB(an) {
  var ag = getAgentFromDB(an);
  if (ag) return ag;
  var n = rapportNorm(an);
  return (state.agentsDB || []).filter(function (a) { return rapportNorm(a['Agent chimique']) === n; })[0] || null;
}
// Prélèvement réalisé (les prélèvements prévus non faits restent vides dans l'appli)
function rapportSbFait(sb) {
  return !!(sb && (sb.completed || (sb.plages || []).some(function (pl) { return pl.debut && pl.fin; })));
}
function rapportListe(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1]; }
var RAPPORT_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// « 26 mai 2026 », « du 26 au 28 mai 2026 », « du 30 mai au 2 juin 2026 »
function rapportPeriode(d1, d2) {
  var p = function (iso) { var x = String(iso).split('-'); return { a: x[0], m: RAPPORT_MOIS[+x[1] - 1], j: +x[2] === 1 ? '1er' : String(+x[2]) }; };
  var a = p(d1);
  if (!d2 || d1 === d2) return a.j + ' ' + a.m + ' ' + a.a;
  var b = p(d2);
  if (a.a !== b.a) return 'du ' + a.j + ' ' + a.m + ' ' + a.a + ' au ' + b.j + ' ' + b.m + ' ' + b.a;
  if (a.m !== b.m) return 'du ' + a.j + ' ' + a.m + ' au ' + b.j + ' ' + b.m + ' ' + b.a;
  return 'du ' + a.j + ' au ' + b.j + ' ' + b.m + ' ' + b.a;
}
// Remplace un texte contenu dans un seul w:t du nœud ; renvoie vrai si fait
function rapportRemplacerTexte(n, avant, apres) {
  var X = D_();
  return X.trouverTous(n, 'w:t').some(function (t) {
    var s = X.texte(t);
    if (s.indexOf(avant) === -1) return false;
    var tn = X.texteNode(s.replace(avant, apres)); tn.parent = t;
    t.kids = [tn]; t.attrs = ' xml:space="preserve"'; t.auto = false;
    return true;
  });
}
function rapportEstRouge(run) {
  var X = D_(), rpr = X.enfant(run, 'w:rPr'), c = rpr && X.enfant(rpr, 'w:color');
  return !!(c && /^(FF0000|C00000)$/i.test(X.attr(c, 'w:val') || ''));
}

function rapportDonnees(m) {
  if (!m.rapport) m.rapport = { types: {}, categories: {} };
  if (!m.rapport.types) m.rapport.types = {};
  if (!m.rapport.categories) m.rapport.categories = {};
  rapportPrecocher(m, m.rapport);
  return m.rapport;
}

// Agents des prélèvements réalisés (ou à réaliser), non réalisés exclus
function rapportAgentsMission(m) {
  var out = [];
  (m.prelevements || []).forEach(function (p) {
    if (!(p.subPrelevements || []).some(function (sb) { return !sb.nonRealise; })) return;
    (p.agents || []).forEach(function (a) { if (out.indexOf(a.name) === -1) out.push(a.name); });
  });
  return out;
}
// Catégories de la carte « Agents contrôlés », d'après chaque prélèvement réalisé (ou à réaliser) : un prélèvement
// réglementaire va dans la partie de l'arrêté (contraignantes / indicatives selon la base), un prélèvement non
// réglementaire dans la partie hors arrêté (poussières, CMR, admises, ou « hors arrêté » pour un agent à VLEP
// réglementaire mesuré hors contrôle réglementaire) : les résultats de la feuille ont ainsi toujours leur partie.
function rapportCategoriesAuto(m) {
  var c = {};
  (m.prelevements || []).forEach(function (p) {
    var faits = (p.subPrelevements || []).filter(function (sb) { return !sb.nonRealise; });
    if (!faits.length) return;
    // poste fixe : partie « Mesures à poste fixe » (case dédiée), pas une catégorie d'agents contrôlés
    if (faits.every(function (sb) { return sb.posteFixe; })) return;
    (p.agents || []).forEach(function (a) {
      var an = a.name, ag = rapportAgentDB(an);
      if (/silice cristalline/i.test(an)) c.silice = true;
      if (!ag) return;
      var cat = rapportCategorie(ag), pouss = /pollution particulaire/i.test(an);
      if (p.isReglementaire) {
        if (cat === 'indicative') c.indicatives = true; else c.contraignantes = true;
        if (pouss) c.poussieres = true;
        return;
      }
      if (pouss) { c.poussieres = true; return; }
      if (cat !== 'admise') { c.horsArrete = true; return; }
      var cmr = String(ag['CMR (règlement CLP)'] || '').trim();
      if (cmr && cmr !== '-') { c.cmr = true; return; }
      if (ag['VLEP 8h (mg/m3)'] || ag['VLEP CT (mg/m3)']) c.admises = true; else c.horsArrete = true;
    });
  });
  return c;
}
// Précochage tant que le technicien n'a pas touché aux cases (une mission où des cases étaient déjà cochées à la
// main avant cette fonction n'est pas modifiée). Toucher une case arrête le précochage de ce groupe.
function rapportPrecocher(m, r) {
  if (r.categoriesAuto === undefined) r.categoriesAuto = !Object.keys(r.categories).some(function (k) { return r.categories[k]; });
  if (r.categoriesAuto) r.categories = rapportCategoriesAuto(m);
  if (r.posteFixeAuto === undefined) r.posteFixeAuto = r.posteFixe === undefined;
  if (r.posteFixeAuto) r.posteFixe = (m.prelevements || []).some(function (p) { return (p.subPrelevements || []).some(function (sb) { return sb.posteFixe && !sb.nonRealise; }); });
}

// Champs de la carte Rapport laissés vides (couverture, pieds de page), signalés après la génération
function rapportChampsVides(m) {
  var r = rapportDonnees(m), vides = [];
  RAPPORT_CHAMPS.forEach(function (c) { if ((!c.si || r.types[c.si]) && !String(r[c.cle] || '').trim()) vides.push(c.label); });
  if (!r.agence) vides.push('Agence');
  return vides;
}

function rapportAgenceParDefaut() { try { return localStorage.getItem(RAPPORT_AGENCE_KEY) || ''; } catch (e) { return ''; } }
function rapportAgence(r) { return RAPPORT_AGENCES.filter(function (a) { return a.id === r.agence; })[0] || null; }

// ---------- Préparation ----------

function renderRapportPrepa(m) {
  var r = rapportDonnees(m);
  if (!r.agence && rapportAgenceParDefaut()) { r.agence = rapportAgenceParDefaut(); saveData('vlep_missions_v3', state.missions); }
  var puce = function (actif, onclick, label) {
    return '<button type="button" class="btn btn-small ' + (actif ? 'btn-primary' : 'btn-gray') + '" style="margin:0;" onclick="' + onclick + '">' + escapeHtml(label) + '</button>';
  };
  var h = '<div class="card"><h2>' + ICONS.fileText + ' Rapport</h2>';
  h += '<p class="subtitle">Repris dans le rapport Word (couverture, pieds de page, parties retenues comme le formulaire de la trame).</p>';
  RAPPORT_CHAMPS.forEach(function (c) {
    if (c.si && !r.types[c.si]) return;
    h +='<div class="field" style="margin-top:8px;"><label class="label">' + c.label + '</label><input type="text" class="input" value="' + escapeHtml(r[c.cle] || '') + '" placeholder="' + escapeHtml(c.ph) + '" onchange="rapportMaj(\'' + c.cle + '\',this.value);"></div>';
  });
  h += '<div class="field"><label class="label">Agence</label><select class="input" onchange="rapportAgenceChoisir(this.value);"><option value="">Choisir l’agence</option>';
  RAPPORT_AGENCES.forEach(function (a) { h += '<option value="' + a.id + '"' + (r.agence === a.id ? ' selected' : '') + '>' + escapeHtml(a.nom) + '</option>'; });
  h += '</select></div>';
  h += '<div class="field"><label class="label">Type de rapport</label><div class="row">';
  RAPPORT_TYPES.forEach(function (t) { h += puce(r.types[t.id], 'rapportBascule(\'types\',\'' + t.id + '\');', t.label); });
  h += '</div></div>';
  if (rapportDeuxParties(r)) {
    var libEi = RAPPORT_TYPES.filter(function (t) { return /^campagne/.test(t.id) && r.types[t.id]; }).map(function (t) { return t.label; }).join(' / ');
    h += '<div class="field"><label class="label">Partie du rapport de chaque agent</label><p class="subtitle" style="margin:0 0 6px;">Résultats, EPI et écarts sont placés dans la partie choisie.</p>';
    rapportCouplesReg(m).forEach(function (c) {
      var ets = c.agents.map(function (a) { return rapportEtape(m, c.geh.id, a); });
      h += '<div style="margin-bottom:8px;"><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;"><strong style="font-size:12px;flex:1;min-width:140px;">GEH ' + escapeHtml(String(c.geh.num)) + ' – ' + escapeHtml(c.geh.name) + '</strong>';
      h += puce(ets.every(function (e) { return e === 'ei'; }), 'rapportEtapeGeh(' + c.geh.id + ',\'ei\');', libEi);
      h += puce(ets.every(function (e) { return e === 'cp'; }), 'rapportEtapeGeh(' + c.geh.id + ',\'cp\');', 'Contrôle périodique') + '</div>';
      if (c.agents.length > 1) {
        h += '<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px;">';
        c.agents.forEach(function (a, i) {
          h += '<button type="button" class="btn btn-small btn-gray" style="margin:0;font-size:11px;" onclick="rapportBasculeEtape(' + c.geh.id + ',\'' + escapeJs(a) + '\');">' + escapeHtml(a) + ' : <strong>' + (ets[i] === 'ei' ? escapeHtml(libEi) : 'contrôle périodique') + '</strong></button>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</div>';
  }
  h += '<div class="field"><label class="label">Agents contrôlés</label>' + (r.categoriesAuto ? '<p class="subtitle" style="margin:0 0 6px;">Cochés d’après les prélèvements de la mission (réglementaires ou non) et la base des agents ; modifiables.</p>' : '') + '<div class="row">';
  RAPPORT_CATEGORIES.forEach(function (c) { h += puce(r.categories[c.id], 'rapportBascule(\'categories\',\'' + c.id + '\');', c.label); });
  h += '</div></div><div class="field" style="margin-bottom:0;"><label class="label">Autres mesures</label><div class="row">';
  h += puce(r.posteFixe, 'rapportMaj(\'posteFixe\',' + (r.posteFixe ? 'false' : 'true') + ');render();', 'Mesures à poste fixe (hors accréditation)');
  h += '</div></div></div>';
  return h;
}

// Écran « Rapport Word » (hors préparation) : données Scol@ du dossier, carte Rapport, puis génération
function renderRapportDonnees() {
  var m = getCurrentMission();
  if (!m) { state.view = 'terrain-list'; return renderTerrainList(); }
  var h = '<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">' + ICONS.arrowLeft + ' Mission</button>';
  h += '<div class="card"><h1>' + ICONS.fileText + ' Rapport Word</h1><p class="subtitle">Données du rapport et du dossier Scol@, à part de la préparation de la mission.</p>';
  h += '<button class="btn btn-primary" style="margin-bottom:0;" onclick="exportRapportWord();">' + ICONS.fileText + ' Générer le rapport Word</button></div>';
  if (typeof renderScolaDossierPrepa === 'function' && typeof FC_MODELE_DISPO !== 'undefined' && FC_MODELE_DISPO === true) h += renderScolaDossierPrepa(m);
  h += renderRapportPrepa(m);
  return h;
}

function rapportMaj(cle, v) {
  var m = getCurrentMission(); if (!m) return;
  var r = rapportDonnees(m);
  r[cle] = typeof v === 'string' ? v.trim() : v;
  if (cle === 'posteFixe') r.posteFixeAuto = false;
  saveData('vlep_missions_v3', state.missions);
}

function rapportBascule(groupe, id) {
  var m = getCurrentMission(); if (!m) return;
  var r = rapportDonnees(m);
  r[groupe][id] = !r[groupe][id];
  if (groupe === 'categories') r.categoriesAuto = false;
  saveData('vlep_missions_v3', state.missions);
  render();
}

function rapportAgenceChoisir(id) {
  var m = getCurrentMission(); if (!m) return;
  rapportDonnees(m).agence = id;
  try { localStorage.setItem(RAPPORT_AGENCE_KEY, id); } catch (e) {} // même agence pour les missions suivantes
  saveData('vlep_missions_v3', state.missions);
}

// ---------- Génération du rapport Word (étape 2 : sans les résultats) ----------
// La trame .dot est convertie une fois en .docx (outils/trame-rapport/convertir.ps1) et livrée dans modele/.

var RAPPORT_TRAME_URL = 'modele/trame-rapport-vlep.docx';
var D_ = function () { return DocxMoteur; };

// trame gardée en mémoire : téléchargée une fois (en arrière-plan à l'ouverture), pas à chaque rapport
var _rapportTrame = null;
function rapportChargerTrame() {
  if (_rapportTrame) return _rapportTrame;
  _rapportTrame = fetch(RAPPORT_TRAME_URL).then(function (r) {
    if (!r.ok) throw new Error('Trame de rapport introuvable dans l’appli (' + RAPPORT_TRAME_URL + ').');
    return r.arrayBuffer();
  });
  _rapportTrame.catch(function () { _rapportTrame = null; });
  return _rapportTrame;
}

// Macro AutoNew de la trame (module AutoNew, Sub MAIN), traduite telle quelle. Stratégie toujours décochée.
function rapportAppliquerMacro(doc, r) {
  var t = r.types || {}, c = r.categories || {};
  var Strat = false, P1 = !!t.campagne1, P2 = !!t.campagne2, P3 = !!t.campagne3, CP = !!t.periodique, ERC = !!t.erc;
  var contraignantes = !!c.contraignantes, indicatives = !!c.indicatives, admises = !!c.admises, CMR = !!c.cmr;
  var pouss = !!c.poussieres, Hors = !!c.horsArrete, silice = !!c.silice, indicHors = false;
  var del = function () { for (var i = 0; i < arguments.length; i++) doc.supprimer(arguments[i]); };
  var lignes = function (n) { doc.supprimerLignes(n); };
  // Titre « Rapport (…) » : la macro écrit un texte par case cochée au même signet, et Word les empile
  // (« (contrôle périodique)(première campagne de mesures) ») ; les techniciens les réunissent à la main en
  // « (contrôle périodique et première campagne de mesures) ». L'appli écrit directement cette forme.
  var natures = [];
  var nature = function (txt) { natures.push(txt); };

  if (!ERC) del('ERC');
  if (ERC) del('ERC5');
  if (!Strat) del('Stratégie');
  if (!Strat) del('mention_logo_stratégie', 'Paragraphe_Stratégie', 'Croix_Stratégie');
  if (!Strat && !P1 && !P2 && !P3 && !CP) nature('de mesures');
  if (P1 || P2 || P3 || CP || contraignantes || indicHors || admises || CMR || pouss || Hors || ERC) {
    if (!P1 && !P2 && !P3 && (admises || CMR || pouss || Hors) && CP) del('hors_arrêté_doublon');
    if (P1 || P2 || (P3 && CP)) del('controle_perio_doublon');          // VBA : And avant Or
    if (P1 || P2 || (P3 && (admises || CMR || pouss || Hors))) del('hors_arrêté_doublon');
    if (!P1) { del('Croix_Première_Campagne', 'numéro_première_campagne', 'Première_campagne'); lignes('tableau_conclusion_campagne1'); }
    if (!Strat && P1) nature('(première campagne de mesures)');
    if (P2) nature('(deuxième campagne de mesures)');
    if (P3) nature('(troisième campagne de mesures)');
    if (!P2) { del('Croix_Deuxième_campagne', 'numéro_deuxième_campagne', 'Deuxième_campagne'); lignes('tableau_conclusion_campagne2'); }
    if (!P3) { del('Croix_Troisième_campagne', 'numéro_troisième_campagne', 'Troisième_campagne'); lignes('tableau_conclusion_campagne3'); }
    if (!Strat && !P1 && !P2 && !P3) del('évaluation_initiale');
    if (!CP) { del('Croix_Contrôle_Périodique', 'controle_perio'); lignes('tableau_conclusion_controle_perio'); }
    if (CP) nature('(contrôle périodique)');
    if (!P3 && !CP) del('Annexe_Diagnostic');
    if (!silice) del('silice', 'additivité');
    if (!admises && !CMR && !pouss && !Hors && !ERC) del('chapitre_hors_arrêté');
    if (ERC) del('ERC1', 'ERC2', 'ERC4');
    if (!ERC) del('ERC3');
    if (!admises) del('admises5', 'admises6');
    if (!CMR) del('CMR', 'CMR1');
    if (!pouss) del('Poussières', 'Poussières1');
    if (!Hors) del('Hors_arrêté_15_12_09_1', 'Hors_arrêté_15_12_09_2');
    if (!contraignantes && !indicatives) {
      del('Arrêté_15_12_09_1', 'Arrêté_15_12_09_2', 'numéro_première_campagne', 'numéro_deuxième_campagne', 'numéro_troisième_campagne', 'diagnostic');
    }
    if (!admises) del('admises2', 'admises4');
    if (!admises && !CMR && !pouss && !Hors && !silice) del('mention_logo_conclusion_hors_arrêté', 'titre_conclusion_hors_arrêté');
  }
  if (natures.length) doc.ecrire('Nature_rapport', rapportTitreNature(natures));
}

function rapportTitreNature(natures) {
  if (natures.length === 1) return natures[0];
  var parts = natures.map(function (n) { return n.replace(/^\(|\)$/g, ''); });
  var periodique = parts.filter(function (p) { return /contrôle périodique/.test(p); });
  var campagnes = parts.filter(function (p) { return /campagne/.test(p); }).map(function (p) { return p.replace(/ de mesures$/, ''); });
  var liste = periodique.concat(campagnes);
  return '(' + liste.slice(0, -1).join(', ') + (liste.length > 1 ? ' et ' : '') + liste[liste.length - 1] + (campagnes.length ? ' de mesures' : '') + ')';
}

// Contexte d'un champ : texte qui le précède dans son paragraphe, cellule de tableau et cellule précédente
function rapportCtxChamp(doc, ch) {
  var X = D_(), p = X.ancetre(ch.debut, 'w:p'), tc = X.ancetre(ch.debut, 'w:tc');
  var avant = p ? X.texte({ kids: p.kids.slice(0, p.kids.indexOf(ch.debut)) }) : '';
  var ctx = { avant: avant.replace(/\s+/g, ' ').trim(), affiche: doc.texteChamp(ch).trim(), nom: ch.nom || '', cell: -1, cellPrec: '', tableau: '' };
  if (tc) {
    var tr = tc.parent, cells = tr.kids.filter(function (k) { return k.name === 'w:tc'; });
    ctx.cell = cells.indexOf(tc);
    ctx.cellPrec = ctx.cell > 0 ? X.texte(cells[ctx.cell - 1]).replace(/\s+/g, ' ').trim() : '';
    var tbl = X.ancetre(tc, 'w:tbl');
    ctx.tableau = tbl ? X.texte(tbl.kids.filter(function (k) { return k.name === 'w:tr'; })[0] || { kids: [] }).replace(/\s+/g, ' ').trim() : '';
  }
  return ctx;
}

// Données de la mission pour le rapport
function rapportInfos(m) {
  // seuls les prélèvements réalisés comptent (les prévus non faits gardent une date prévue, sans plage horaire)
  var r = rapportDonnees(m), dates = [], labos = [], agents = [];
  (m.prelevements || []).forEach(function (p) {
    var faits = (p.subPrelevements || []).filter(rapportSbFait);
    faits.forEach(function (sb) { if (sb.date) dates.push(sb.date); });
    if (!faits.length) return;
    (p.agents || []).forEach(function (a) {
      if (agents.indexOf(a.name) === -1) agents.push(a.name);
      var ag = rapportAgentDB(a.name), l = ag && ag['Laboratoire sous-traitant'];
      if (l && !(typeof isAnalyseurAgent === 'function' && isAnalyseurAgent(a.name))) {
        String(l).split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) {
          if (!labos.some(function (y) { return rapportNorm(y) === rapportNorm(x); })) labos.push(x); // « Toxilabo » / « TOXILABO »
        });
      }
    });
  });
  dates.sort();
  agents.sort(function (a, b) { return rapportNorm(a).localeCompare(rapportNorm(b)); });
  var periode = !dates.length ? '' : rapportPeriode(dates[0], dates[dates.length - 1]);
  var info = String(m.scolaEtablissementInfo || '');
  return {
    r: r, agence: rapportAgence(r), periode: periode, labos: labos, agents: agents,
    client: m.clientSite || '', etablissement: m.scolaEtablissement || m.clientSite || '',
    siret: (/SIRET\s+(\d{14})/.exec(info) || [])[1] || '', naf: (/NAF\s+([0-9A-Z.]+)/.exec(info) || [])[1] || '',
    dossier: m.scolaDossier || '', preleveur: m.preleveur || ''
  };
}

// Champs de formulaire de la trame : remplis d'après leur libellé (jamais d'après leur position)
function rapportRemplirChamps(doc, m, I) {
  var r = I.r, X = D_();
  var regles = [
    [function (c) { return c.nom === 'demandeur2'; }, I.client],
    [function (c) { return c.affiche === 'Nom' && /Intervention sur site/.test(c.tableau) && c.cell === 0; }, I.preleveur],
    [function (c) { return c.affiche === 'Nom' && /Intervention sur site/.test(c.tableau) && c.cell === 1; }, r.redacteur],
    [function (c) { return c.affiche === 'Nom' && /Intervention sur site/.test(c.tableau) && c.cell === 2; }, r.valideur],
    [function (c) { return c.nom === 'NuméroChrono'; }, r.chrono],
    [function (c) { return c.nom === 'tache' || /d’affaire\s*:?$/.test(c.avant); }, I.dossier],
    [function (c) { return /Mission réalisée le$/.test(c.avant); }, I.periode],
    [function (c) { return c.affiche === 'Adresse Agence'; }, I.agence ? [I.agence.nom].concat(I.agence.adresse).join('\n') : ''],
    [function (c) { return /Accréditation n°$/.test(c.avant); }, I.agence ? RAPPORT_NUM_ACCREDITATION : ''],
    [function (c) { return /contrat référencé$/.test(c.avant); }, r.contrat],
    [function (c) { return c.cellPrec === 'Nom :'; }, I.etablissement],
    [function (c) { return c.cellPrec === 'Code NAF :'; }, I.naf],
    [function (c) { return c.cellPrec === 'SIRET :'; }, I.siret],
    [function (c) { return c.cellPrec === 'Contact sur le site :'; }, r.interlocuteur],
    [function (c) { return /prélèvements ont été réalisés par$/.test(c.avant); }, I.preleveur],
    [function (c) { return /sous-traitées au laboratoire$/.test(c.avant); }, rapportListe(I.labos)],
    [function (c) { return /réalisée sous accréditation par$/.test(c.avant); }, r.strategieAuteur || (r.strategieRef ? 'SOCOTEC' : '')],
    [function (c) { return /\(rapport référencé\s*:$/.test(c.avant); }, r.strategieRef],
    // consignes « Copier/coller le tableau établi dans l'offre » : les tableaux sont remplis par l'appli
    [function (c) { return /^Copier\/coller le tableau établi dans l/.test(c.affiche); }, '\u0000']
  ];
  doc.champs().forEach(function (ch) {
    if (ch.type !== 'FORMTEXT') return;
    var c = rapportCtxChamp(doc, ch);
    for (var i = 0; i < regles.length; i++) {
      if (!regles[i][0](c)) continue;
      var v = regles[i][1];
      if (v === '\u0000') doc.remplacerChamp(ch, '');
      else if (v) doc.remplacerChamp(ch, String(v));
      return;
    }
  });
  X.trouverTous(doc.corps(), 'w:p').forEach(function (p) {
    var t = X.texte(p);
    // « Mission réalisée le du 26 au 28 mai 2026 » : « le » seulement devant une date unique
    if (/Mission réalisée le\s+du /.test(t)) rapportRemplacerTexte(p, 'réalisée le ', 'réalisée ');
    // plusieurs laboratoires : « Les rapports d’analyses référencés … sont joints »
    if (I.labos.length > 1 && /^Les analyses ont été sous-traitées au laboratoire/.test(t) && /Le rapport d’analyses référencé/.test(t)) {
      rapportRemplacerTexte(p, '. Le ', '. Les ') || rapportRemplacerTexte(p, 'Le rapport', 'Les rapport');
      rapportRemplacerTexte(p, 'rapport d’analyse', 'rapports d’analyse');
      rapportRemplacerTexte(p, ' référencé ', ' référencés ');
      rapportRemplacerTexte(p, ' est joint', ' sont joints');
      rapportRemplacerTexte(p, 'au laboratoire ', 'aux laboratoires ');
    }
  });
  // consigne « Si 1ère campagne (à remplir obligatoirement) » : remplie par l'appli
  if (r.strategieRef) X.trouverTous(doc.corps(), 'w:p').forEach(function (p) { if (/^Si 1ère campagne \(à remplir obligatoirement\)$/.test(X.texte(p).trim())) rapportRetirerParagraphe(p); });
  if (r.interlocuteur && doc.existe('Interlocuteur_client')) doc.ecrire('Interlocuteur_client', ' ' + r.interlocuteur);
  // pieds de page : n° d'affaire (macro : signets tachePied1 à 7) et n° chrono après « N° chrono : »
  for (var k = 1; k <= 7; k++) if (I.dossier && doc.existe('tachePied' + k)) doc.ecrire('tachePied' + k, I.dossier);
  // pieds de page sans signet tachePied (la macro les laisse vides) : n° d'affaire inséré de la même façon
  if (I.dossier) doc.pieds().forEach(function (arbre) {
    X.trouverTous(arbre, 'w:p').forEach(function (p) {
      if (!/N° d’affaire/.test(X.texte(p)) || X.trouverTous(p, 'w:bookmarkStart').some(function (b) { return /^tachePied/i.test(X.attr(b, 'w:name') || ''); })) return;
      if (X.texte(p).indexOf(I.dossier) !== -1) return;
      var cumul = '';
      X.trouverTous(p, 'w:r').some(function (run) {
        cumul += X.texte(run);
        if (!/N° d’affaire\s*:/.test(cumul)) return false;
        X.insererApres(run, X.run(' ' + I.dossier, X.enfant(run, 'w:rPr')));
        return true;
      });
    });
  });
  // « N° chrono : » peut être découpé en plusieurs runs : le n° est inséré après le run qui termine les deux-points
  if (r.chrono) doc.pieds().forEach(function (arbre) {
    X.trouverTous(arbre, 'w:p').forEach(function (p) {
      if (!/N° chrono/.test(X.texte(p))) return;
      var cumul = '';
      X.trouverTous(p, 'w:r').some(function (run) {
        cumul += X.texte(run);
        if (!/N° chrono\s*:/.test(cumul)) return false;
        X.insererApres(run, X.run(' ' + r.chrono, X.enfant(run, 'w:rPr')));
        return true;
      });
    });
  });
}

// Titres vidés par les suppressions (plage arrêtée au début d'un titre) : ils feraient des lignes vides au sommaire
function rapportTitresVides(doc) {
  var X = D_();
  X.trouverTous(doc.corps(), 'w:p').forEach(function (p) {
    var ppr = X.enfant(p, 'w:pPr'), st = ppr && X.enfant(ppr, 'w:pStyle'), v = st ? X.attr(st, 'w:val') || '' : '';
    if (!/^(Titre|Heading)\d$/i.test(v)) return;
    if (X.texte(p).trim() || X.trouverTous(p, 'w:drawing').length || X.trouverTous(p, 'w:sectPr').length) return;
    // repères de signets encore utiles : reportés au début du paragraphe suivant
    // (repères de signets posés entre deux paragraphes, comme après le titre 3 vidé par la macro, sautés)
    var freres = p.parent.kids, k0 = freres.indexOf(p) + 1;
    while (k0 < freres.length && (freres[k0].name === 'w:bookmarkStart' || freres[k0].name === 'w:bookmarkEnd')) k0++;
    var suivant = freres[k0];
    var reperes = p.kids.filter(function (k) { return k.name === 'w:bookmarkStart' || k.name === 'w:bookmarkEnd'; });
    if (reperes.length && (!suivant || suivant.name !== 'w:p')) return;
    reperes.reverse().forEach(function (k) { X.retirer(k); var ppr2 = X.enfant(suivant, 'w:pPr'); if (ppr2) X.insererApres(ppr2, k); else { k.parent = suivant; suivant.kids.unshift(k); } });
    X.retirer(p);
  });
}

// Retire un paragraphe en reportant ses repères de signets au paragraphe suivant
function rapportRetirerParagraphe(p) {
  var X = D_(), suivant = p.parent.kids[p.parent.kids.indexOf(p) + 1];
  var reperes = X.trouverTous(p, 'w:bookmarkStart').concat(X.trouverTous(p, 'w:bookmarkEnd'));
  if (reperes.length && suivant && suivant.name === 'w:p') {
    reperes.reverse().forEach(function (k) { X.retirer(k); var ppr = X.enfant(suivant, 'w:pPr'); if (ppr) X.insererApres(ppr, k); else { k.parent = suivant; suivant.kids.unshift(k); } });
  } else if (reperes.length) return; // rien pour les recevoir : paragraphe gardé
  X.retirer(p);
}
// Paragraphe cloné sur un modèle, texte en noir (consigne rouge de la trame devenue contenu)
function rapportParagrapheNoir(modele, txt) {
  var X = D_(), np = X.cloner(modele);
  X.trouverTous(np, 'w:bookmarkStart').concat(X.trouverTous(np, 'w:bookmarkEnd')).forEach(X.retirer);
  rapportParagrapheTexte(np, txt);
  X.trouverTous(np, 'w:color').forEach(X.retirer);
  return np;
}

// ----- Parties du rapport -----
function rapportStyleTitre1(p) {
  var X = D_(), ps = X.enfant(p, 'w:pPr'), st = ps && X.enfant(ps, 'w:pStyle');
  return /^(Titre|Heading)1$/i.test(st ? X.attr(st, 'w:val') || '' : '');
}
// Partie (titre de niveau 1) d'un paragraphe : « ei », « cp », « hors » ou null
function rapportPartieDe(paras, p) {
  var X = D_();
  for (var k = paras.indexOf(p); k >= 0; k--) {
    if (!rapportStyleTitre1(paras[k])) continue;
    var t = X.texte(paras[k]);
    return /hors arrêté/i.test(t) ? 'hors' : (/contrôle périodique/i.test(t) ? 'cp' : (/Evaluation initiale/i.test(t) ? 'ei' : null));
  }
  return null;
}
function rapportFiltrePartie(m, partie) {
  if (partie === 'hors') return function (p) { return !p.isReglementaire; };
  if (partie === 'ei' || partie === 'cp') return function (p) { return p.isReglementaire && rapportPrelDansEtape(m, p, partie); };
  return null;
}

// « de X » / « d’X »
function rapportDe(nom) {
  var n = /^[A-Z][a-zé]/.test(nom) ? nom.charAt(0).toLowerCase() + nom.slice(1) : nom; // « Azote (dioxyde d') » → « azote… »
  return (/^[aeiouyhéèêàâîïôû]/i.test(n) ? 'd’' : 'de ') + n;
}

// ----- Écarts : prélèvements « non réalisés » que le technicien a classés en écart (stratégie ou contrat) -----
// Rien n'est déduit : seuls les choix du technicien sont rédigés, avec sa justification.
// Une phrase par GEH et par situation (n réalisés sur n prévus), agents réunis, comme dans les rapports rendus
function rapportEcartMotif(t) {
  t = String(t || '').replace(/\s*\n\s*/g, ' ').trim().replace(/\.+$/, '');
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; // « Pas d'activité » → « pas… », sigles gardés
}
function rapportEcarts(m, type, filtre) {
  var groupes = [], index = {};
  (m.prelevements || []).forEach(function (p) {
    if (filtre && !filtre(p)) return;
    var subs = p.subPrelevements || [];
    var ec = subs.filter(function (sb) { return sb.nonRealise && sb.ecart === type; });
    if (!ec.length) return;
    var prevu = subs.length, fait = subs.filter(function (sb) { return !sb.nonRealise; }).length, raisons = [];
    ec.forEach(function (sb) { var o = rapportEcartMotif(sb.ecartMotif); if (o && raisons.indexOf(o) === -1) raisons.push(o); });
    var cle = [p.gehId, fait, prevu, raisons.join(' ; ')].join('|');
    if (!index[cle]) {
      index[cle] = { geh: (m.gehs || []).filter(function (g) { return String(g.id) === String(p.gehId); })[0], fait: fait, prevu: prevu, raison: raisons.join(' ; '), agents: [] };
      groupes.push(index[cle]);
    }
    (p.agents || []).forEach(function (a) {
      var e = index[cle].agents.filter(function (x) { return x.nom === a.name; })[0], t = p.type === 'CT' ? 'CT' : '8h';
      if (!e) { e = { nom: a.name, types: [] }; index[cle].agents.push(e); }
      if (e.types.indexOf(t) === -1) e.types.push(t);
    });
  });
  return groupes.map(function (g) {
    var ags = rapportListe(g.agents.map(function (a) { return rapportDe(a.nom) + ' (' + a.types.sort().join(' et ') + ')'; }));
    var geh = g.geh ? ' pour le GEH ' + g.geh.num + ' « ' + g.geh.name + ' »' : '';
    var raison = g.raison ? ' (' + g.raison + ')' : '';
    var une = g.agents.length === 1 && g.agents[0].types.length === 1 && g.prevu === 1;
    if (!g.fait) return (une ? 'La mesure ' + ags + geh + ' n’a pas été réalisée' : 'Les mesures ' + ags + geh + ' n’ont pas été réalisées') + raison + '.';
    return 'Les mesures ' + ags + geh + ' ne sont pas complètes. ' + (g.fait === 1 ? 'Seule 1 mesure sur les ' + g.prevu + ' prévues a été réalisée' : 'Seules ' + g.fait + ' mesures sur les ' + g.prevu + ' prévues ont été réalisées') + raison + '.';
  });
}
// m : mission complète (avec les prélèvements non réalisés)
function rapportRemplirEcarts(doc, m) {
  var X = D_(), paras = X.trouverTous(doc.corps(), 'w:p');
  // objectif : « Ecart au contrat : Sans objet. » → écarts au contrat
  var contrat = rapportEcarts(m, 'contrat', null);
  paras.filter(function (p) { return /^Ecart au contrat\s*:\s*Sans objet\.?$/.test(X.texte(p).trim()); }).forEach(function (p) {
    if (!contrat.length) return;
    rapportRemplacerTexte(p, 'Sans objet.', '') || rapportRemplacerTexte(p, 'Sans objet', '');
    var ancre = p;
    contrat.forEach(function (t) { var np = rapportParagrapheNoir(p, t); X.trouverTous(np, 'w:b').forEach(X.retirer); X.insererApres(ancre, np); ancre = np; });
  });
  // parties réglementaires : « Aucun écart… » → écarts à la stratégie de la partie (une partie sans paragraphe
  // d'écarts, comme le contrôle périodique réuni à une campagne dans la trame V18, voit ses écarts dans la première)
  var cibles = paras.filter(function (p) { return /^Aucun écart\. Les conditions lors des prélèvements/.test(X.texte(p).trim()); })
    .map(function (p) { return { p: p, partie: rapportPartieDe(paras, p) }; }).filter(function (c) { return c.partie === 'ei' || c.partie === 'cp'; });
  cibles.forEach(function (c, i) {
    var parties = [c.partie];
    if (i === 0) ['ei', 'cp'].forEach(function (x) { if (!cibles.some(function (y) { return y.partie === x; })) parties.push(x); });
    var liste = rapportEcarts(m, 'strategie', function (p) { return p.isReglementaire && parties.some(function (x) { return rapportPrelDansEtape(m, p, x); }); });
    if (!liste.length) return;
    var ancre = c.p;
    liste.forEach(function (t) { var np = rapportParagrapheNoir(c.p, t); X.insererApres(ancre, np); ancre = np; });
    rapportParagrapheTexte(c.p, 'Les points suivants dérogent au plan d’échantillonnage :');
  });
}
// ----- Périmètre : prélèvements d'agents à VLEP non réglementaire (consigne « A votre demande, x prélèvements… ») -----
function rapportPerimetre(doc, m) {
  var X = D_(), n = 0, agents = [];
  (m.prelevements || []).forEach(function (p) {
    if (p.isReglementaire) return;
    var adm = (p.agents || []).filter(function (a) { return rapportCategorie(rapportAgentDB(a.name)) === 'admise'; });
    if (!adm.length) return;
    var k = (p.subPrelevements || []).filter(function (sb) { return rapportSbFait(sb) && !sb.posteFixe; }).length;
    if (!k) return;
    n += k;
    adm.forEach(function (a) { if (agents.indexOf(a.name) === -1) agents.push(a.name); });
  });
  X.trouverTous(doc.corps(), 'w:p').forEach(function (p) {
    if (!/A votre demande,\s*x\s*prélèvements\s*individuels/.test(X.texte(p).replace(/\s+/g, ' '))) return;
    if (!n) { rapportRetirerParagraphe(p); return; }
    var np = rapportParagrapheNoir(p, 'A votre demande, ' + n + (n > 1 ? ' prélèvements individuels ' : ' prélèvement individuel ') + rapportListe(agents.map(rapportDe)) +
      ' à VLEP non réglementaire ' + (n > 1 ? 'ont également été pris' : 'a également été pris') + ' en compte.');
    X.insererApres(p, np); rapportRetirerParagraphe(p);
  });
}

// ----- Tableaux -----
function rapportLignes(tbl) { return tbl.kids.filter(function (k) { return k.name === 'w:tr'; }); }
function rapportCellules(tr) { return tr.kids.filter(function (k) { return k.name === 'w:tc'; }); }
// Texte d'une cellule : premier paragraphe gardé (sa mise en forme), lignes séparées par des retours à la ligne
function rapportTexteCellule(tc, txt, rPrSecours) {
  var X = D_(), ps = tc.kids.filter(function (k) { return k.name === 'w:p'; });
  var p = ps[0], rpr = null;
  X.trouverTous(tc, 'w:r').some(function (r) { rpr = X.enfant(r, 'w:rPr'); return !!rpr; });
  if (!rpr) rpr = rPrSecours || null;
  ps.slice(1).forEach(X.retirer);
  p.kids.filter(function (k) { return k.name !== 'w:pPr'; }).forEach(X.retirer);
  if (txt !== '' && txt !== null && txt !== undefined) { var r = X.run(String(txt), rpr); r.parent = p; p.kids.push(r); }
}
function rapportCategorie(ag) {
  if (ag && ag['VLEP Reglementaire contraignante'] === 'X') return 'contraignante';
  if (ag && ag['VLEP Reglementaire Indicative'] === 'X') return 'indicative';
  return 'admise';
}
function rapportNombre(v) {
  if (v === undefined || v === null || v === '') return '-';
  return String(v).replace('.', ',');
}
// Remplace les lignes d'exemple d'un tableau de la trame par une ligne par agent, mise en forme selon la catégorie
// de VLEP (gras noir : contraignante, gras bleu : indicative, normal : admise, comme le code couleur de la trame)
function rapportTableauAgents(doc, signet, agents, colonnes) {
  var X = D_(), s = doc.signet(signet);
  if (!s) return;
  var tbl = X.ancetre(s.debut, 'w:tbl'), lignes = rapportLignes(tbl);
  var exemples = lignes.filter(function (tr) { var t = X.texte(rapportCellules(tr)[0]).trim(); return t && t !== 'Agent chimique'; });
  if (!exemples.length) return;
  var modele = { contraignante: null, indicative: null, admise: null };
  exemples.forEach(function (tr) {
    var r = X.trouverTous(rapportCellules(tr)[0], 'w:r')[0], rpr = r && X.enfant(r, 'w:rPr'), xml = rpr ? X.serialiser(rpr) : '';
    var cat = /w:color w:val="0000FF"/.test(xml) ? 'indicative' : (/<w:b\/>|<w:b /.test(xml) ? 'contraignante' : 'admise');
    if (!modele[cat]) modele[cat] = tr;
  });
  var defaut = modele.contraignante || modele.indicative || modele.admise;
  var secours = null;
  exemples.some(function (tr) { var c = rapportCellules(tr), r = c.length > 5 && X.trouverTous(c[5], 'w:r')[0]; secours = r && X.enfant(r, 'w:rPr'); return !!secours; });
  var ancre = exemples[exemples.length - 1];
  agents.forEach(function (an) {
    var ag = rapportAgentDB(an), cat = rapportCategorie(ag), tr = X.cloner(modele[cat] || defaut);
    var cells = rapportCellules(tr), vals = colonnes(an, ag || {});
    cells.forEach(function (tc, i) { if (i < vals.length) rapportTexteCellule(tc, vals[i], secours); });
    X.insererApres(ancre, tr); ancre = tr;
  });
  exemples.forEach(X.retirer);
}

// Annexe des méthodes : seuls les principes de mesure des supports de la mission sont gardés
function rapportPrincipes(doc, agents) {
  var vus = { tube: false, filtre: false, cip10: false, cyclone: false };
  agents.forEach(function (an) {
    var ag = rapportAgentDB(an) || {}, s = String(ag['Support de prélèvement'] || '').toLowerCase(), pr = String(ag['Principe du prélèvement'] || '').toLowerCase();
    if (typeof isAnalyseurAgent === 'function' && isAnalyseurAgent(an)) return;
    if (/cyclone/.test(s + ' ' + pr)) vus.cyclone = true;
    if (/coupelle|mousse|cip/.test(s)) vus.cip10 = true;
    if (/tube/.test(s)) vus.tube = true;
    if (/filtre|cassette|membrane/.test(s) && !/cyclone/.test(s + ' ' + pr)) vus.filtre = true;
  });
  if (!vus.tube && !vus.filtre && !vus.cip10 && !vus.cyclone) return; // rien de reconnu : on laisse tout au technicien
  if (!vus.tube) doc.supprimer('Principe_tube');
  if (!vus.filtre) doc.supprimer('Principe_filtre');
  if (!vus.cip10) doc.supprimer('Principe_CIP10');
  if (!vus.cyclone) doc.supprimer('Principe_cyclone');
}

// ----- EPI portés : un paragraphe par EPI, avec les GEH qui le portent -----
function rapportEpi(court) {
  var e = (typeof EPI_FPA !== 'undefined' ? EPI_FPA : []).filter(function (x) { return x.court === court; })[0];
  if (!e) return { type: court, code: '', norme: '…', fpa: '…' };
  var lw = e.long.trim().split(/\s+/), cw = e.court.trim().split(/\s+/), n = 0;
  while (n < lw.length - 1 && n < cw.length && lw[lw.length - 1 - n] === cw[cw.length - 1 - n]) n++;
  return { type: lw.slice(0, lw.length - n).join(' '), code: n ? lw.slice(lw.length - n).join(' ') : e.court, norme: e.norme, fpa: String(e.fpa) };
}
function rapportEpiParGeh(m, filtre) {
  var groupes = {}, ordre = [];
  (m.prelevements || []).forEach(function (p) {
    if (filtre && !filtre(p)) return;
    var g = (m.gehs || []).filter(function (x) { return String(x.id) === String(p.gehId); })[0];
    (p.subPrelevements || []).forEach(function (sb) {
      if (!rapportSbFait(sb)) return;
      var e = String(sb.epiType || '').trim();
      if (!e || e === 'sans objet' || e === 'Autre') return;
      if (!groupes[e]) { groupes[e] = []; ordre.push(e); }
      var lib = g ? g.num + ' « ' + g.name + ' »' : '';
      if (lib && groupes[e].indexOf(lib) === -1) groupes[e].push(lib);
    });
  });
  return ordre.map(function (e) { return { epi: e, gehs: groupes[e] }; });
}
function rapportParagrapheTexte(p, txt) {
  var X = D_(), rpr = null;
  X.trouverTous(p, 'w:r').some(function (r) { var x = X.enfant(r, 'w:rPr'); if (x) { rpr = X.cloner(x); rpr.kids = rpr.kids.filter(function (k) { return k.name !== 'w:shd' && k.name !== 'w:highlight' && k.name !== 'w:noProof'; }); } return !!rpr; });
  p.kids.filter(function (k) { return k.name !== 'w:pPr'; }).forEach(X.retirer);
  var r = X.run(txt, rpr); r.parent = p; p.kids.push(r);
}
// « un demi-masque filtrant de type FFP3 », comme le texte de la trame
function rapportEpiTexte(court) {
  var e = rapportEpi(court), f = (typeof EPI_FPA !== 'undefined' ? EPI_FPA : []).filter(function (x) { return x.court === court; })[0];
  if (f && f.long === f.court) return 'un ' + f.long;
  if (!e.type) return 'un EPI de type ' + e.code;
  return 'un ' + e.type.replace(/^appareils filtrants/, 'appareil filtrant') + ' de type ' + e.code;
}
function rapportRemplirEpi(doc, m) {
  var X = D_(), corps = doc.corps();
  var paras = X.trouverTous(corps, 'w:p');
  paras.filter(function (p) { return /Pendant les phases d’exposition, les opérateurs portent un/.test(X.texte(p)); }).forEach(function (p) {
    // partie qui précède : réglementaire (évaluation initiale, contrôle périodique) ou hors arrêté
    var filtre = rapportFiltrePartie(m, rapportPartieDe(paras, p));
    var groupes = rapportEpiParGeh(m, filtre);
    var pFpa = null, k = paras.indexOf(p) + 1;
    while (k < paras.length && !pFpa && k < paras.indexOf(p) + 4) { if (/Facteur de Protection Assigné/.test(X.texte(paras[k]))) pFpa = paras[k]; k++; }
    if (!groupes.length) {
      // prélèvements réalisés dans la partie, aucun EPI saisi : « Sans objet. » (sinon paragraphe laissé au technicien)
      var faits = (m.prelevements || []).some(function (x) { return (!filtre || filtre(x)) && (x.subPrelevements || []).some(rapportSbFait); });
      if (!faits || !filtre) return;
      var suiv = pFpa ? paras[paras.indexOf(pFpa) + 1] : null;
      rapportParagrapheTexte(p, 'Sans objet.');
      if (pFpa) X.retirer(pFpa);
      if (suiv && /^Il a été observé lors de l'intervention que les EPI étaient portés/.test(X.texte(suiv).trim())) X.retirer(suiv);
      return;
    }
    var suiteFpa = pFpa ? X.texte(pFpa).replace(/^.*?égal à\s*\S+\s*\.?/, '') : '';
    var ancre = pFpa || p;
    groupes.forEach(function (g, i) {
      var e = rapportEpi(g.epi);
      var qui = g.gehs.length ? (g.gehs.length > 1 ? 'les opérateurs des GEH ' : 'les opérateurs du GEH ') + rapportListe(g.gehs) : 'les opérateurs';
      var np = X.cloner(p), nf = pFpa ? X.cloner(pFpa) : null;
      rapportParagrapheTexte(np, 'Pendant les phases d’exposition, ' + qui + ' portent ' + rapportEpiTexte(g.epi) + ' répondant à la norme ' + e.norme + '.');
      if (nf) rapportParagrapheTexte(nf, 'Le Facteur de Protection Assigné (FPA) à cet EPI est égal à ' + e.fpa + '.' + (suiteFpa ? ' ' + suiteFpa.trim() : ''));
      X.insererApres(ancre, np); ancre = np;
      if (nf) { X.insererApres(ancre, nf); ancre = nf; }
    });
    X.retirer(p); if (pFpa) X.retirer(pFpa);
  });
}

// ----- Annexe « Description des tâches » : le tableau d'activité de l'appli, un tableau par GEH -----
function rapportAnnexeTaches(doc, m) {
  var X = D_(), corps = doc.corps();
  if (typeof activiteParGeh !== 'function') return;
  var gehs = activiteParGeh(m);
  if (!gehs.length) return;
  var pGeh = X.trouverTous(corps, 'w:p').filter(function (p) { return /^GEH\s*:\s*…/.test(X.texte(p).trim()); })[0];
  if (!pGeh) return;
  var corpsKids = pGeh.parent.kids, tbl = null;
  for (var i = corpsKids.indexOf(pGeh) + 1; i < corpsKids.length && !tbl; i++) if (corpsKids[i].name === 'w:tbl') tbl = corpsKids[i];
  if (!tbl) return;
  var lignes = rapportLignes(tbl), vide = lignes[1];
  // en-têtes : exemples en rouge « (ex : demi-masque filtrant FFP2…) » retirés, le tableau est rempli
  X.trouverTous(lignes[0], 'w:r').filter(rapportEstRouge).forEach(X.retirer);
  var ancre = tbl, texteGeh = X.texte(pGeh), modeleP = X.cloner(pGeh), modeleT = X.cloner(tbl);
  var heure = function (s) { return String(s || '').replace(/(\d{1,2}):(\d{2})/g, '$1h$2').replace(/ - /g, ' – '); };
  var duree = function (mn, txt) { return mn === null || mn === undefined ? (txt || '') : (mn < 60 ? mn + ' min' : formatHeuresMinutes(mn)); };
  var nGeh = 0;
  gehs.forEach(function (g) {
    // prélèvements réalisés seulement, dans l'ordre chronologique ; même opérateur, même plage, même type : une ligne
    var rows = [];
    g.rows.filter(function (r) { return r.fait !== false; }).sort(function (a, b) {
      return (a.dateIso + a.debut + (a.vlep === 'CT' ? 1 : 0)).localeCompare(b.dateIso + b.debut + (b.vlep === 'CT' ? 1 : 0));
    }).forEach(function (r) {
      var meme = rows.filter(function (x) { return x.operateur === r.operateur && x.dateIso === r.dateIso && x.heures === r.heures && x.vlep === r.vlep; })[0];
      if (!meme) { rows.push(Object.assign({}, r)); return; }
      meme.agents += ' / ' + r.agents;
      if (r.taches && meme.taches.indexOf(r.taches) === -1) meme.taches = meme.taches ? meme.taches + '\n' + r.taches : r.taches;
    });
    if (!rows.length) return;
    var np = nGeh === 0 ? pGeh : X.cloner(modeleP);
    rapportParagrapheTexte(np, texteGeh.replace(/GEH\s*:\s*…+/, 'GEH ' + g.gehNum + ' : ' + g.gehNom + '   '));
    var nt = nGeh === 0 ? tbl : X.cloner(modeleT);
    rapportLignes(nt).slice(1).forEach(X.retirer);
    var modeleLigne = vide; // ligne vide de la trame, clonée pour chaque prélèvement
    var prec = null, trs = [];
    rows.forEach(function (row) {
      var tr = X.cloner(modeleLigne), cells = rapportCellules(tr);
      var vals = [row.operateur, (prec && prec.date === row.date ? [] : [row.date]).concat(heure(row.heures).split(' / ')).filter(Boolean).join('\n'), duree(row.dureeMin, row.duree), row.agents, row.vlep,
        row.epi && row.epi !== 'sans objet' ? row.epi : '/', [row.ventEnv, row.ventGen, row.ventCapt].filter(Boolean).join('\n'), row.taches || '', '/'];
      cells.forEach(function (tc, k) { if (k < vals.length) rapportTexteCellule(tc, vals[k]); });
      tr.parent = nt; nt.kids.push(tr);
      trs.push({ cells: cells, vals: vals });
      prec = row;
    });
    // cellules identiques à celle du dessus fusionnées (opérateur, durée, agents, VLEP, EPI, ventilation), comme les rapports rendus
    [0, 2, 3, 4, 5, 6].forEach(function (k) {
      for (var i = 1; i < trs.length; i++) {
        if (!trs[i].vals[k] || trs[i].vals[k] !== trs[i - 1].vals[k]) continue;
        var debut = i - 1; while (debut > 0 && trs[debut].continue && trs[debut].continue[k]) debut--;
        rapportVMerge(trs[debut].cells[k], 'restart');
        rapportVMerge(trs[i].cells[k], 'continue'); rapportTexteCellule(trs[i].cells[k], '');
        (trs[i].continue = trs[i].continue || {})[k] = true;
      }
    });
    if (nGeh++ > 0) {
      X.insererApres(ancre, np);
      X.insererApres(np, nt);
    }
    ancre = nt;
  });
}

// Fusion verticale d'une cellule (w:vMerge, placé après w:tcW / w:gridSpan dans w:tcPr)
function rapportVMerge(tc, val) {
  var X = D_(), tcPr = X.enfant(tc, 'w:tcPr');
  if (!tcPr) { tcPr = X.el('w:tcPr', '', []); tcPr.parent = tc; tc.kids.unshift(tcPr); tcPr.auto = false; }
  var ex = X.enfant(tcPr, 'w:vMerge'); if (ex) X.retirer(ex);
  var vm = X.el('w:vMerge', val === 'restart' ? 'w:val="restart"' : ''), ref = null;
  tcPr.kids.forEach(function (k) { if (k.name === 'w:tcW' || k.name === 'w:gridSpan' || k.name === 'w:hMerge') ref = k; });
  if (ref) X.insererApres(ref, vm); else { vm.parent = tcPr; tcPr.kids.unshift(vm); }
  tcPr.auto = false;
}

// ----- Mesures à poste fixe : partie ajoutée en tête des commentaires -----
var RAPPORT_TEXTE_POSTE_FIXE = 'À votre demande, des mesures d’ambiance ont été réalisées à poste fixe. Contrairement aux prélèvements individuels, réalisés dans la zone respiratoire de l’opérateur, ces mesures caractérisent la concentration de l’air en un point donné de la zone de travail. Elles ne tiennent compte ni des déplacements de l’opérateur, ni de sa position par rapport aux sources d’émission, ni de son geste professionnel. Leurs résultats ne représentent donc pas l’exposition d’un travailleur et ne sont pas comparés aux valeurs limites d’exposition professionnelle (VLEP). Réalisées hors accréditation, ces mesures sont données à titre indicatif, par exemple pour suivre l’évolution d’une ambiance de travail, repérer une source d’émission ou apprécier l’efficacité d’un dispositif de ventilation.';
function rapportPosteFixe(doc) {
  var X = D_(), paras = X.trouverTous(doc.corps(), 'w:p');
  var titre = paras.filter(function (p) { return /^COMMENTAIRES/.test(X.texte(p).trim()); })[0];
  if (!titre) return;
  var suivant = paras[paras.indexOf(titre) + 1];
  var modele = suivant || titre;
  var pT = X.cloner(modele), pX = X.cloner(modele), pV = X.cloner(modele);
  rapportParagrapheTexte(pT, 'Mesures à poste fixe (hors accréditation)');
  var rT = X.trouverTous(pT, 'w:r')[0], rpr = X.enfant(rT, 'w:rPr');
  if (!rpr) { rpr = X.el('w:rPr', '', []); rpr.parent = rT; rT.kids.unshift(rpr); }
  if (!X.enfant(rpr, 'w:b')) { var b = X.el('w:b'); b.parent = rpr; rpr.kids.unshift(b); rpr.auto = false; }
  rapportParagrapheTexte(pX, RAPPORT_TEXTE_POSTE_FIXE);
  pV.kids.filter(function (k) { return k.name !== 'w:pPr'; }).forEach(X.retirer);
  X.insererApres(titre, pT); X.insererApres(pT, pX); X.insererApres(pX, pV);
}

// Réglages : protection « formulaires » retirée (la macro fait Unprotect), champs mis à jour à l'ouverture
// (sommaire, numéros d'annexes), modèle d'origine détaché
function rapportReglages(doc) {
  var X = D_(), st = doc.arbres['word/settings.xml'];
  if (!st) return;
  var settings = X.enfant(st, 'w:settings');
  ['w:documentProtection', 'w:attachedTemplate'].forEach(function (n) { var e = X.enfant(settings, n); if (e) X.retirer(e); });
  if (!X.enfant(settings, 'w:updateFields')) {
    var uf = X.el('w:updateFields', 'w:val="true"'), apres = ['w:hdrShapeDefaults', 'w:footnotePr', 'w:endnotePr', 'w:compat', 'w:docVars', 'w:rsids', 'm:mathPr', 'w:attachedSchema', 'w:themeFontLang', 'w:clrSchemeMapping', 'w:doNotIncludeSubdocsInStats', 'w:doNotAutoCompressPictures', 'w:forceUpgrade', 'w:captions', 'w:readModeInkLockDown', 'w:smartTagType', 'sl:schemaLibrary', 'w:shapeDefaults', 'w:doNotEmbedSmartTags', 'w:decimalSymbol', 'w:listSeparator'];
    var ref = null;
    settings.kids.some(function (k) { if (apres.indexOf(k.name) !== -1) { ref = k; return true; } return false; });
    if (ref) X.insererAvant(ref, uf); else { uf.parent = settings; settings.kids.push(uf); }
  }
}

// Rapport : renvoie { blob, filename, resultats }. donneesFeuille (facultatif) : feuille de calcul complétée et
// enregistrée par Excel ; ses tableaux de résultats sont alors placés dans le rapport (rapport-resultats.js).
function construireRapport(m, donneesTrame, type, donneesFeuille) {
  var mComplete = m;
  if (typeof missionRealisee === 'function') m = missionRealisee(m);
  var I = rapportInfos(m), resume = null;
  return DocxMoteur.Document.charger(donneesTrame).then(function (doc) {
    rapportAppliquerMacro(doc, I.r);
    rapportTitresVides(doc);
    rapportRemplirChamps(doc, m, I);
    rapportTableauAgents(doc, 'Tableau_accréditations', I.agents, function (an, ag) {
      return [an, ag['N° CAS'] || '-', rapportNombre(ag['VLEP 8h (mg/m3)']).replace(/^-$/, ''), rapportNombre(ag['VLEP CT (mg/m3)']).replace(/^-$/, ''), ag['CMR (règlement CLP)'] || '',
        ag['Accréditation prélèvement'] === 'X' ? 'X' : '', ag['Accréditation analyse'] === 'X' ? 'X' : ''];
    });
    rapportTableauAgents(doc, 'Tableau_méthodes', I.agents, function (an, ag) {
      return [an, ag['N° CAS'] || '-', ag['Méthode'] || '', ag['Principe du prélèvement'] || ''];
    });
    rapportPrincipes(doc, I.agents);
    rapportRemplirEpi(doc, m);
    rapportRemplirEcarts(doc, mComplete);
    rapportPerimetre(doc, m);
    rapportAnnexeTaches(doc, m);
    if (I.r.posteFixe) rapportPosteFixe(doc);
    rapportReglages(doc);
    if (!donneesFeuille || typeof rapportInsererResultats !== 'function') return doc;
    return XlsmMoteur.Classeur.charger(donneesFeuille).then(function (wb) { return rapportInsererResultats(doc, wb, m); })
      .then(function (r) { resume = r; return doc; });
  }).then(function (doc) { return doc.generer(type || 'blob'); }).then(function (blob) {
    var safe = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
    return { blob: blob, filename: safe + ' - Rapport VLEP.docx', resultats: resume };
  });
}

function exportRapportWord() {
  var m = getCurrentMission();
  if (!m) { alert('Aucune mission'); return; }
  var r = rapportDonnees(m), t = r.types || {};
  if (!Object.keys(t).some(function (k) { return t[k]; })) {
    if (!confirm('Aucun type de rapport choisi dans la carte « Rapport » ci-dessous (campagne, contrôle périodique…). Générer quand même ?')) return;
  }
  if (!confirm('Joindre la feuille de calcul complétée (résultats du laboratoire saisis, fichier enregistré dans Excel) ?\n\nOK : choisir le fichier .xlsm, les tableaux de résultats seront repris.\nAnnuler : rapport sans les résultats.')) { rapportGenerer(m, null); return; }
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsm,.xlsx';
  inp.onchange = function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    var lecteur = new FileReader();
    lecteur.onload = function () { rapportGenerer(m, lecteur.result, f.name); };
    lecteur.readAsArrayBuffer(f);
  };
  inp.click();
}

function rapportGenerer(m, feuille, nomFeuille) {
  if (typeof afficherAttente === 'function') afficherAttente('Rapport Word en cours…');
  rapportChargerTrame().then(function (data) { return construireRapport(m, data, 'blob', feuille); }).then(function (res) {
    if (typeof afficherAttente === 'function') afficherAttente(null);
    downloadBlob(res.blob, res.filename);
    var msg = 'Rapport généré : ' + res.filename + '\n\nÀ l’ouverture, Word propose de mettre à jour les champs (sommaire, numéros d’annexes) : répondre Oui.';
    var vides = rapportChampsVides(m);
    if (vides.length) msg += '\n\nVides dans la carte « Rapport » (couverture et pieds de page à compléter dans Word) :\n- ' + vides.join('\n- ');
    var r = res.resultats;
    if (r) {
      msg += '\n\nRésultats repris de « ' + nomFeuille + ' » : ' + r.reg + ' tableau(x) réglementaire(s), ' + r.horsArrete + ' hors arrêté, ' + r.posteFixe + ' poste fixe ; ' + r.annexe + ' image(s) dans l’annexe des résultats détaillés. Résultats insérés en images de la feuille, comme avec la macro (non modifiables).';
      if (r.alertes.length) msg += '\n\nÀ vérifier :\n- ' + r.alertes.join('\n- ');
      msg += '\n\nÀ compléter : conclusion, commentaires, annexe du diagnostic U.';
    } else msg += '\n\nÀ compléter : résultats (feuille de calcul), conclusion, commentaires.';
    alert(msg);
  }).catch(function (e) { if (typeof afficherAttente === 'function') afficherAttente(null); alert('Rapport impossible :\n\n' + e.message); });
}

console.log('✓ Rapport chargé');
