// Tests automatiques de l'appli VLEP (garde-fous) — à lancer avant chaque commit :
//   node outils/tests/run.js
// Charge les vrais fichiers de l'appli dans Node et vérifie les calculs, le moteur Excel et, si le modèle
// de feuille de calcul est présent (modele/feuille-calcul-vlep.xlsm, hors git), l'export de bout en bout :
// la feuille générée est relue et chaque valeur contrôlée à sa place (y compris Scol@, Eurofins, Véolia).
// Sortie : liste des tests en échec et code de retour 1 s'il y en a un.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const racine = path.join(__dirname, '..', '..');
const MODELE = path.join(racine, 'modele', 'feuille-calcul-vlep.xlsm');

// ---------- Contexte « navigateur » avec les fichiers de l'appli ----------
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error: console.error }, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Uint8Array, ArrayBuffer,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {} }; } },
  navigator: {}, alert() {}, confirm: () => true
};
ctx.window = ctx;
vm.createContext(ctx);
ctx.JSZip = require(path.join(racine, 'js', 'jszip.min.js'));
['js/icons.js', 'js/database.js', 'js/scola-listes.js', 'js/state.js', 'js/prepa.js', 'js/terrain.js', 'js/consignes-agents.js', 'js/releves-analyseur.js', 'js/echantillons.js', 'js/xlsm-moteur.js', 'js/feuille-calcul.js', 'js/veolia.js', 'js/scola-dossier.js', 'js/export-word.js', 'js/docx-moteur.js', 'js/rapport.js', 'js/rapport-resultats.js', 'js/nouveautes.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(racine, f), 'utf8'), ctx, { filename: f }));
vm.runInContext('state.agentsDB = JSON.parse(JSON.stringify(BUILTIN_DB));', ctx);
vm.runInContext(`var _gen = XlsmMoteur.Classeur.prototype.generer; XlsmMoteur.Classeur.prototype.generer = function(t){ return _gen.call(this, t === 'blob' ? 'nodebuffer' : t); };`, ctx);
const G = ctx;

// ---------- Mini-cadre de test ----------
let nOk = 0; const echecs = [];
function egal(nom, obtenu, attendu) {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) nOk++; else echecs.push(nom + '\n      obtenu  : ' + JSON.stringify(obtenu) + '\n      attendu : ' + JSON.stringify(attendu));
}
function vrai(nom, cond) { egal(nom, !!cond, true); }

// ---------- 1. Calculs de l'appli ----------
function sub(o) { return Object.assign({ date: '2026-10-15', plages: [], agentData: {} }, o); }
egal('durée prélèvement : 2 plages', G.dureePrelevementMin(sub({ plages: [{ debut: '08:00', fin: '10:00' }, { debut: '13:00', fin: '15:30' }] })), 270);
egal('durée prélèvement : plages des supports suivants comptées', G.dureePrelevementMin(sub({ plages: [{ debut: '08:00', fin: '10:00' }], supportsSupp: [{ plages: [{ debut: '10:00', fin: '12:00' }], agentData: {} }] })), 240);
egal('durée exposition 8h saisie', G.dureeExpositionMin({ type: '8h' }, sub({ dureeExpo: '07:30' })), 450);
egal('durée exposition CT = durée prélèvement', G.dureeExpositionMin({ type: 'CT' }, sub({ plages: [{ debut: '09:00', fin: '09:15' }] })), 15);
egal('durée exposition 8h non saisie', G.dureeExpositionMin({ type: '8h' }, sub({})), null);
egal('format h:min', G.formatHeuresMinutes(450), '7h30');
egal('expandSubSupports : 1 + 2 supports', G.expandSubSupports(sub({ supportsSupp: [{ plages: [] }, { plages: [] }] })).map(s => s.supportNum), [1, 2, 3]);
egal('type débitmètre par défaut = massique', G.getDebitmetreType({}), 'massique');
egal('type débitmètre piston', G.getDebitmetreType({ debitmetreType: 'piston' }), 'piston');

// Base collée à la main (Importer) : remplacée si la base intégrée a changé depuis l'import
store['vlep_database'] = JSON.stringify([{ 'Agent chimique': 'agent collé' }]); store['vlep_database_base'] = 'Version 1';
vm.runInContext('loadData()', ctx);
egal('base collée ancienne remplacée par la base intégrée', G.state.agentsDB.length, G.BUILTIN_DB.length);
egal('base collée ancienne effacée', store['vlep_database'], undefined);
store['vlep_database'] = JSON.stringify([{ 'Agent chimique': 'agent collé' }]); store['vlep_database_base'] = G.BUILTIN_DB_VERSION;
vm.runInContext('loadData()', ctx);
egal('base collée sur la base en vigueur conservée', G.state.agentsDB.length, 1);
delete store['vlep_database']; delete store['vlep_database_base'];
vm.runInContext('state.missions = []; state.agentsDB = JSON.parse(JSON.stringify(BUILTIN_DB));', ctx);

// Recherche d'agents : le bon agent en tête (l'écran terrain n'affiche que les 6 premiers)
egal('recherche « éthanol » : éthanol en premier', G.searchAgentsDB('éthanol')[0], 'éthanol');
egal('recherche « ethanol » sans accent', G.searchAgentsDB('ethanol')[0], 'éthanol');
egal('recherche « methanol »', G.searchAgentsDB('methanol')[0], 'méthanol');
egal('recherche « tolu »', G.searchAgentsDB('tolu')[0], 'toluène');
vrai('recherche à plusieurs mots', G.searchAgentsDB('silice quartz').indexOf('fraction alvéolaire de silice cristalline (quartz)') !== -1);
vrai('recherche : un mot qui commence par la saisie avant le reste', G.searchAgentsDB('éthanol').indexOf('éthanolamine (2-aminoethanol)') < G.searchAgentsDB('éthanol').indexOf('2-butoxyéthanol (butylglycol)'));

// Consignes de la base : chaque règle retrouve son extrait dans le commentaire de l'agent (sinon : base modifiée, règle à revoir)
G.CONSIGNES_AGENTS.forEach(r => r.agents.forEach(n => {
  vrai('consigne « ' + r.type + ' » : agent présent dans la base : ' + n, !!G.getAgentFromDB(n));
  vrai('consigne « ' + r.type + ' » : extrait toujours dans le commentaire de ' + n, r.cle.test(G.consigneCommentaire(n)));
}));
vrai('agents sans laboratoire repérés (au moins 15)', G.BUILTIN_DB.filter(a => G.consigneSansLabo(a['Agent chimique'])).length >= 15);
const cn = (agent, type, plagesParSupport, deb) => {
  const sb = { date: '2026-10-15', plages: plagesParSupport[0], agentData: { [agent]: { debitInitial: deb, debitFinal: deb } },
    supportsSupp: plagesParSupport.slice(1).map(pl => ({ plages: pl, agentData: { [agent]: { debitInitial: deb, debitFinal: deb } } })) };
  return G.consignesAgent({ agents: [] }, { type, agents: [{ name: agent }] }, sb, agent);
};
const alerte = l => l.some(x => x.niveau === 'alerte');
vrai('méthanol 3 h sur un tube : alerte et fractionnement proposé', alerte(cn('méthanol', '8h', [[{ debut: '08:00', fin: '11:00' }]], '0,1')) && /Fractionnez/.test(cn('méthanol', '8h', [[{ debut: '08:00', fin: '11:00' }]], '0,1').map(x => x.texte).join()));
vrai('méthanol 2 x 2 h (2 supports) : pas d\'alerte', !alerte(cn('méthanol', '8h', [[{ debut: '08:00', fin: '10:00' }], [{ debut: '10:00', fin: '12:00' }]], '0,1')));
vrai('éthanol 6 h à 0,05 L/min (18 L) : alerte volume', alerte(cn('éthanol', '8h', [[{ debut: '08:00', fin: '14:00' }]], '0,05')));
vrai('éthanol 4 h à 0,05 L/min (12 L) : pas d\'alerte', !alerte(cn('éthanol', '8h', [[{ debut: '08:00', fin: '12:00' }]], '0,05')));
vrai('MDI CT de 15 min : alerte (5 min imposées)', alerte(cn("4,4' MDI ( méthylène diphényl diisocyanate)", 'CT', [[{ debut: '09:00', fin: '09:15' }]], '1')));
vrai('hydrazine 300 min : alerte (361 min minimum)', alerte(cn('Hydrazine', '8h', [[{ debut: '08:00', fin: '13:00' }]], '0,8')));
vrai('agent sans laboratoire : alerte', alerte(cn('diéthylènetriamine', '8h', [[]], '')));
vrai('toluène : aucune alerte', !alerte(cn('toluène', '8h', [[{ debut: '08:00', fin: '16:00' }]], '0,1')));

// Relevés d'analyseur : formats des appareils (exemples synthétiques)
const csvCO2 = 'Index;Date;Température;Hygrométrie;Pression;CO2;CO2 Compensé;COV\r\n1;15/10/2026 08:00;250;50;1001;500;510;\r\n2;15/10/2026 08:10;250;50;1001;700;712;\r\n3;15/10/2026 09:00;250;50;1001;900;915;';
const txtCO = '25385,Time,CO(ppm),Warning Level,Serial Number\r\n1,2026-10-14 11:39:26,0.0,200.0,000021892\r\n\r\n2,2026-10-15 08:00:26,1.5,200.0\r\n3,2026-10-15 08:10:26,2.5,200.0';
const lCO2 = G.relevesLire(csvCO2, 'dioxyde de carbone'), lCO = G.relevesLire(txtCO, 'oxyde de carbone');
egal('relevés CO2 : colonne brute (pas compensée)', [lCO2.colonne, lCO2.releves.length, lCO2.releves[1]], ['CO2', 3, ['2026-10-15 08:10:00', 700]]);
egal('relevés CO : format détecteur, n° de série', [lCO.colonne, lCO.appareil, lCO.releves.length], ['CO(ppm)', '25385', 3]);
const resCO = G.relevesResume({ date: '2026-10-15', plages: [{ debut: '08:00', fin: '08:10' }] }, { releves: lCO.releves });
egal('relevés CO : moyenne sur les plages (dernière minute incluse, autre jour exclu)', [resCO.n, resCO.moy], [2, 2]);
vrai('relevés : fichier sans colonne du gaz refusé', !!G.relevesLire('a;b;c\r\n1;2;3', 'oxyde de carbone').erreur);
vrai('relevés : plage qui passe minuit repérée', G.relevesResume({ date: '2026-10-15', plages: [{ debut: '22:00', fin: '02:00' }] }, { releves: [['2026-10-15 23:00:00', 5]] }).minuit);

// Débit moyen ± 5 % (acide fluorhydrique : 2 L/min dans la base)
const hf = 'acide fluorhydrique';
egal('débit 1,998 / 1,998 accepté (virgule)', G.checkDebitMoyen(hf, '8h', '1,998', '1,998').horsTolerance, false);
egal('débit moyen 1,91 accepté', G.checkDebitMoyen(hf, '8h', '1,9', '1,92').horsTolerance, false);
egal('débit moyen 1,895 refusé', G.checkDebitMoyen(hf, '8h', '1,89', '1,90').horsTolerance, true);
egal('débit moyen 2,115 refusé', G.checkDebitMoyen(hf, '8h', '2,11', '2,12').horsTolerance, true);
egal('débit incomplet : pas de contrôle', G.checkDebitMoyen(hf, '8h', '2', ''), null);
{
  const mh = { id: 1, clientSite: 'Site', preleveur: 'QT', debitmetre: '12345', scolaDossier: 'D-1', prelevements: [
    { subPrelevements: [{ completed: true, date: '2026-10-14' }, { completed: false, date: '2026-10-15' }, { completed: false }] }] };
  G.state.missionMenuOpen = false;
  const h1 = G.renderMissionHead(mh);
  vrai('en-tête de mission : dossier, avancement 1/3 et période', /Dossier D-1/.test(h1) && />1\/3</.test(h1) && /14\/10\/2026 → 15\/10\/2026/.test(h1));
  vrai('en-tête de mission : menu ⋯ fermé par défaut', h1.indexOf('mission-menu') === -1);
  G.state.missionMenuOpen = true;
  const h2 = G.renderMissionHead(mh);
  vrai('menu ⋯ : e-mail, .json, Word, fusions, GEH, modifier, supprimer', ['sendMissionByMail', 'exportMissionJSON', 'exportActiviteWord', 'showSmartFusionModal', 'startFusionMode', 'addGehTerrain', 'editMissionFromTerrain', 'deleteMissionTerrain'].every(x => h2.indexOf(x) !== -1));
  G.state.missionMenuOpen = false;
}
{
  const db = G.state.agentsDB;
  const reg = db.find(a => a['VLEP Reglementaire contraignante'] === 'X')['Agent chimique'];
  const nonReg = db.find(a => !a['VLEP Reglementaire contraignante'] && !a['VLEP Reglementaire Indicative'])['Agent chimique'];
  egal('statut réglementaire lu dans la base (contraignante / ni l’une ni l’autre)', [G.agentEstReglementaire(reg), G.agentEstReglementaire(nonReg)], [true, false]);
  egal('nombre prévu : devis sinon 3 en réglementaire, 1 sinon', [G.nbPrelPrevu({ isReg8h: true, nb8h: 1 }, '8h'), G.nbPrelPrevu({ isReg8h: true }, '8h'), G.nbPrelPrevu({ isRegCT: false }, 'CT')], [1, 3, 1]);
  const mg = { gehs: [{ id: 7, num: 1, name: 'G' }], agentColors: {}, agents: [{ name: reg }], affectations: {} };
  mg.affectations[reg] = { gehs: { 7: { has8h: true, hasCT: false, isReg8h: true, nb8h: 1 } } };
  G.generatePrelevements(mg);
  const p1 = mg.prelevements[0];
  egal('réglementaire à 1 prélèvement : reste réglementaire, 1 sous-prélèvement, justification préremplie', [p1.isReglementaire, p1.subPrelevements.length, p1.justifNb], [true, 1, G.JUSTIF_NB_DEFAUT]);
}
{
  const ag = G.state.agentsDB[0]['Agent chimique'];
  const mr = { gehs: [{ id: 1, num: 1, name: 'A' }], agentColors: {}, agents: [{ name: ag }], affectations: {} };
  mr.affectations[ag] = { gehs: { 1: { has8h: true, hasCT: false, isReg8h: true } } };
  G.generatePrelevements(mr);
  const p0 = mr.prelevements[0];
  p0.subPrelevements[0].operateur = 'QT'; p0.subPrelevements[0].agentData[ag].refEchantillon = 'R-1';
  // retour en préparation : nouveau GEH affecté, puis revalidation
  mr.gehs.push({ id: 2, num: 2, name: 'B' });
  mr.affectations[ag].gehs[2] = { has8h: true, hasCT: false, isReg8h: true };
  const retires = G.generatePrelevements(mr);
  egal('revalidation : saisie gardée, nouveau GEH ajouté, rien à retirer', [mr.prelevements.length, mr.prelevements[0] === p0, p0.subPrelevements[0].agentData[ag].refEchantillon, retires.length], [2, true, 'R-1', 0]);
  // GEH 1 supprimé alors qu'il est saisi : signalé avant suppression ; GEH 2 vierge retiré sans question
  mr.gehs = [{ id: 3, num: 3, name: 'C' }];
  const r2 = G.generatePrelevements(mr);
  egal('revalidation : prélèvement saisi sans GEH signalé, vierge retiré', [r2.length, r2[0] === p0, mr.prelevements.length], [1, true, 0]);
}
{
  const mr = { id: 1, rapport: { types: { campagne1: true }, categories: {}, posteFixe: true, chrono: 'C-1' } };
  const h = G.renderRapportPrepa(mr);
  vrai('carte Rapport : chrono, agences de la trame, types et catégories, poste fixe', /C-1/.test(h) && G.RAPPORT_AGENCES.length === 7 && G.RAPPORT_AGENCES.every(a => h.indexOf(a.nom) !== -1) && /1ère campagne/.test(h) && /Silice cristalline/.test(h) && /poste fixe/.test(h));
  vrai('carte Rapport : pas de case stratégie (hors appli de mesure)', !/rapportBascule\('types','strat/i.test(h) && /Référence du rapport de stratégie/.test(h));
}
{
  // rapport réunissant 1ère campagne et contrôle périodique (Bruker 2026) : partie choisie par GEH × agent
  const sbF = (o) => Object.assign({ completed: true, date: '2026-05-26', plages: [{ debut: '08:00', fin: '15:00' }] }, o);
  const sbV = (o) => Object.assign({ completed: false, date: '', plages: [{ debut: '', fin: '' }], observations: '' }, o);
  const mr = { id: 2, gehs: [{ id: 10, num: 3, name: 'Soudure TIG' }, { id: 20, num: 7, name: 'Peintre' }],
    prelevements: [
      { gehId: 10, type: '8h', isReglementaire: true, agents: [{ name: 'chrome VI et ses composés' }], subPrelevements: [sbF(), sbF(), sbF()] },
      { gehId: 20, type: '8h', isReglementaire: true, agents: [{ name: 'o-xylène' }, { name: 'acétone' }], subPrelevements: [sbF(), sbV(), sbV()] },
      { gehId: 20, type: 'CT', isReglementaire: false, agents: [{ name: 'acide sulfurique' }], subPrelevements: [sbV({ observations: 'Pas d’utilisation' })] }],
    rapport: { types: { campagne1: true, periodique: true }, categories: {}, etapes: { '10|chrome VI et ses composés': 'ei' } } };
  G.state.missions = [mr]; G.state.currentMissionId = 2;
  egal('rapport : partie de chaque agent (choisie, sinon contrôle périodique)', [G.rapportEtape(mr, 10, 'chrome VI et ses composés'), G.rapportEtape(mr, 20, 'o-xylène'), G.rapportEtapeAgentFeuille(mr, 3, ['chrome VI et ses compo']), G.rapportEtapeAgentFeuille(mr, '7', ['o-xylène'])], ['ei', 'cp', 'ei', 'cp']);
  vrai('carte Rapport : choix de la partie par agent affiché', /Partie du rapport de chaque agent/.test(G.renderRapportPrepa(mr)));
  egal('rapport : période de mission en toutes lettres', [G.rapportPeriode('2026-05-26', '2026-05-28'), G.rapportPeriode('2026-05-30', '2026-06-02'), G.rapportPeriode('2026-06-01', '2026-06-01')], ['du 26 au 28 mai 2026', 'du 30 mai au 2 juin 2026', '1er juin 2026']);
  egal('rapport : texte EPI comme la trame', [G.rapportEpiTexte('FFP3'), G.rapportEpiTexte('masque complet P3'), G.rapportEpiTexte('TH3')], ['un demi-masque filtrant de type FFP3', 'un masque complet P3', 'un appareil filtrant à ventilation assistée avec cagoule ou casque de type TH3']);
  vrai('rapport : agent saisi sans accent retrouvé dans la base', !!G.rapportAgentDB('epichlorhydrine'));
}
egal('résultats : formats Excel affichés à la française', [G.rrFormater(98.2210432, '0.00'), G.rrFormater(0.20462, '0.0%'), G.rrFormater(0.000123, '0.0E+00'), G.rrFormater(1234.5, '#,##0.0'), G.rrFormater(46197, 'dd/mm/yy'), G.rrFormater(46197, 'dd/mm/yyyy'), G.rrFormater(0.5, 'h:mm'), G.rrFormater(12.2776304, 'General'), G.rrFormater(600, '0.00000')],
  ['98,22', '20,5\u00a0%', '1,2E-04', '1\u00a0234,5', '24/06/26', '24/06/2026', '12:00', '12,2776304', '600,00000']);
egal('débit : virgule ou point, même résultat', G.checkDebitMoyen(hf, '8h', '1.9', '1.92').moy, G.checkDebitMoyen(hf, '8h', '1,9', '1,92').moy);
egal('variation de débit : virgule ou point', G.calcDebitVariation('0.1', '0.104'), G.calcDebitVariation('0,1', '0,104'));
{
  const src = fs.readFileSync(path.join(racine, 'js', 'terrain.js'), 'utf8');
  const champs = src.split('\n').filter(l => /<input type="text"[^>]*placeholder="(L\/min|tr\/min|'\+u\+')"/.test(l) || l.indexOf('Durée de port (min)') !== -1);
  vrai('clavier numérique sur tous les débits, vitesses et durée de port (' + champs.length + ' champs)', champs.length >= 9 && champs.every(l => /inputmode="(decimal|numeric)"/.test(l)));
}
egal('écart initial/final en %', Math.round(G.calcDebitVariation('2', '1,9') * 10) / 10, 5);

// Conditions du jour, blanc du jour
const mC = { conditionsAmbiantes: [{ date: '2026-10-14', tempI: '20' }, { date: '2026-10-15', tempI: '25' }],
  blancs: [{ ref: 'B1', date: '2026-10-14', lot: 'L14', agents: ['toluène'] }, { ref: 'B2', date: '2026-10-15', lot: 'L15', agents: ['toluène'] }, { ref: 'B3', date: '2026-10-14', agents: ['o-xylène'] }] };
egal('conditions du jour', G.getConditionsForPrel(mC, { date: '2026-10-15' }).tempI, '25');
egal('conditions : jamais celles d\'un autre jour', G.getConditionsForPrel(mC, { date: '2026-10-16' }), null);
egal('blanc du jour', G.getBlancForAgent(mC, 'toluène', '2026-10-15'), 'B2');
egal('blanc : plusieurs blancs d\'autres jours -> aucun', G.getBlancForAgent(mC, 'toluène', '2026-10-16'), '');
egal('blanc unique de l\'agent sur la mission', G.getBlancForAgent(mC, 'o-xylène', '2026-10-15'), 'B3');
egal('lot du blanc', G.findBlancForAgent(mC, 'toluène', '2026-10-14').lot, 'L14');

// Champs manquants : supports suivants, supports liés comptés une fois
const pM = { agents: [{ name: 'toluène' }, { name: 'o-xylène' }] };
const sbM = sub({ operateur: 'X', plages: [{ debut: '08:00', fin: '10:00' }], coPrelGroups: [['toluène', 'o-xylène']],
  agentData: { 'toluène': { numPompe: '1', debitInitial: '0,1', debitFinal: '0,1' }, 'o-xylène': { numPompe: '1', debitInitial: '0,1', debitFinal: '0,1' } },
  supportsSupp: [{ plages: [{ debut: '10:00', fin: '' }], agentData: {} }] });
const manquants = G.getMissingFields(pM, sbM);
vrai('manquants : plage du support n°2 signalée', manquants.some(x => /Plage horaire · support n°2/.test(x)));
vrai('manquants : support lié signalé une seule fois', manquants.filter(x => /Débit initial · support n°2/.test(x)).length === 1);

// Nouveautés : APP_VERSION = version la plus récente, et égale à celle du service worker
const sw = fs.readFileSync(path.join(racine, 'sw.js'), 'utf8');
egal('nouveautés : APP_VERSION = première entrée', G.NOUVEAUTES[0].version, G.APP_VERSION);
egal('service worker à la même version', (/const VERSION = '([^']+)'/.exec(sw) || [])[1], G.APP_VERSION);
vrai('service worker : tous les js chargés par index.html sont en cache', (() => {
  const idx = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
  return [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].every(m => sw.indexOf("'./" + m[1] + "'") !== -1);
})());

// ---------- 2. Moteur Excel ----------
const M = G.XlsmMoteur;
egal('formule : relatif décalé, absolu figé', M.shiftFormula('C17-C16+$B$10', 0, 2), 'E17-E16+$B$10');
egal('formule : chaînes et noms intacts', M.shiftFormula('IF(C5="C5",VLOOKUP(C40,Plage_FPA_2,3,FALSE),LOG10(C2))', 0, 2), 'IF(E5="C5",VLOOKUP(E40,Plage_FPA_2,3,FALSE),LOG10(E2))');
egal('formule : onglet entre apostrophes', M.shiftFormula("'Tube Reg'!C6+C6", 0, 6), "'Tube Reg'!I6+I6");
egal('formule : plage et ligne figée', M.shiftFormula('AVERAGE(C44:C45)+C$102', 1, 2), 'AVERAGE(E45:E46)+E$102');
const xml = '<?xml version="1.0"?><worksheet><dimension ref="A1:D3"/><cols><col min="3" max="4" width="10" customWidth="1"/></cols><sheetData>' +
  '<row r="1"><c r="A1" t="inlineStr"><is><t>GEH</t></is></c><c r="C1" s="5"><f t="shared" ref="C1:D1" si="0">C2*$B$2</f><v>1</v></c><c r="D1" s="5"><f t="shared" si="0"/><v>1</v></c></row>' +
  '<row r="2"><c r="C2"><f>IF(C$1="","",C$1)</f></c></row></sheetData><mergeCells count="1"><mergeCell ref="C3:D3"/></mergeCells></worksheet>';
const sh = new M.Sheet(xml);
vrai('formule partagée dépliée (D1)', /<f>D2\*\$B\$2<\/f>/.test(sh.toXml()));
sh.copyColumns(3, 2, 5);
const out = sh.toXml();
vrai('copie de colonnes : formule décalée en E1', /<c r="E1" s="5"><f>E2\*\$B\$2<\/f><\/c>/.test(out));
vrai('copie de colonnes : « $1 » d\'une formule conservé (bug String.replace)', /<f>IF\(E\$1=&quot;&quot;,&quot;&quot;,E\$1\)<\/f>/.test(out));
vrai('copie de colonnes : fusion recopiée', /<mergeCell ref="E3:F3"\/>/.test(out) && /count="2"/.test(out));
vrai('copie de colonnes : largeurs recopiées', /<col min="5" max="5"/.test(out));
sh.set('C4', 'texte & "guillemets"'); sh.set('D4', 0.25);
vrai('écriture texte échappée', /<c r="C4" t="inlineStr"><is><t xml:space="preserve">texte &amp; &quot;guillemets&quot;<\/t><\/is><\/c>/.test(sh.toXml()));
egal('relecture de la valeur écrite', sh.text('C4'), 'texte & "guillemets"');

// XML bien formé (contrôle léger : balises équilibrées)
function bienForme(x) {
  const pile = []; const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g; let m;
  const corps = x.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(corps))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') { if (pile.pop() !== m[2]) return false; } else pile.push(m[2]);
  }
  return pile.length === 0;
}
vrai('XML produit bien formé (onglet de test)', bienForme(out));

// ---------- 3. Export de bout en bout (si le modèle est présent) ----------
async function finDeBout() {
  if (!fs.existsSync(MODELE)) { console.log('  (modèle absent : tests de bout en bout ignorés)'); return; }
  const data = fs.readFileSync(MODELE);
  G.__data = data;
  // Mission de référence
  G.__mission = vm.runInContext(`(function(){
    var m = createEmptyMission();
    m.clientSite = 'SITE TEST'; m.preleveur = 'Préleveur Test'; m.debitmetre = '24367'; m.tachymetre = 'T-88'; m.debitmetreType = 'piston';
    m.gehs = [{id:1,num:1,name:'Peinture'},{id:2,num:2,name:'Montage'},{id:3,num:3,name:'Ponçage'}];
    var jours = ['2026-10-13','2026-10-14','2026-10-15'];
    m.conditionsAmbiantes = jours.map(function(d,i){ return {date:d,tempI:String(20+i),tempF:String(22+i),pressionI:'1010',pressionF:'1012',humiditeI:'50',humiditeF:'48'}; });
    m.blancs = [{ref:'BT-1',date:'2026-10-13',lot:'LOT-A',agents:['toluène']}];
    function s(i, agents, deb){ var o={id:i+1,operateur:'Opérateur '+(i+1),date:jours[i%3],plages:[{debut:'08:00',fin:'10:00'},{debut:'13:00',fin:'15:00'}],observations:'RAS J'+(i+1),dureeExpo:'07:30',
        ventEnv:'Local standard industriel',ventGenerale:'oui',ventCaptage:'Inducteur',scolaTache:SCOLA_LISTES.tache[0],scolaMetier:SCOLA_LISTES.metier[0],scolaProcede:SCOLA_LISTES.procede[1],epiType:'sans objet',agentData:{}};
      agents.forEach(function(a){ o.agentData[a]={numPompe:'P-'+(i+1),debitInitial:deb[0],debitFinal:deb[1],refEchantillon:'REF-'+a.slice(0,3)+'-'+(i+1)}; }); return o; }
    function p(id,g,type,reg,agents,n,deb){ var x={id:id,gehId:g,type:type,isReglementaire:reg,agents:agents.map(function(a){return {name:a};}),subPrelevements:[]};
      for(var i=0;i<n;i++) x.subPrelevements.push(s(i,agents,deb)); return x; }
    var p1=p(101,1,'8h',true,['toluène'],3,['0,102','0,1']);
    var p2=p(102,1,'8h',false,['acide fluorhydrique'],1,['1,95','1,9']);
    var p3=p(103,2,'8h',true,['o-xylène','éthylbenzène'],3,['0,1','0,1']); p3.subPrelevements.forEach(function(x){ x.coPrelGroups=[['o-xylène','éthylbenzène']]; });
    var p4=p(104,2,'8h',false,['méthanol'],1,['0,1','0,1']); p4.subPrelevements[0].plages=[{debut:'08:00',fin:'10:00'}];
    p4.subPrelevements[0].supportsSupp=[{plages:[{debut:'10:00',fin:'12:00'}],agentData:{'méthanol':{numPompe:'P-1',debitInitial:'0,101',debitFinal:'0,099',refEchantillon:'MET-2'}}}];
    var sil='fraction alvéolaire de silice cristalline (quartz)';
    var p5=p(105,3,'8h',true,[sil],3,['','']); p5.subPrelevements.forEach(function(x){ x.agentData[sil].debitRef='7000'; x.agentData[sil].debitInitial='7010'; x.agentData[sil].debitFinal='6990'; });
    var p6=p(106,1,'8h',false,['oxyde de carbone'],1,['','']);
    Object.assign(p6.subPrelevements[0].agentData['oxyde de carbone'],{numPompe:'25385',refEchantillon:'CO-PF1',bouteilleZero:'Z-1',bouteilleEtalon:'E-9',gazEtalon:'CO 50 ppm',attenduZero:'0',attenduEtalon:'50',ctrlZeroAvant:'0',ctrlSensAvant:'49,5',ctrlZeroApres:'0,2',ctrlSensApres:'48',releves:[['2026-10-13 07:50:00',9],['2026-10-13 08:00:00',4],['2026-10-13 08:10:00',6],['2026-10-13 13:30:00',8],['2026-10-13 16:00:00',9]]});
    m.prelevements=[p1,p2,p3,p4,p5,p6];
    return m;
  })()`, ctx);
  ctx.fcChargerModele = () => Promise.resolve(data);
  const listes = await G.scolaDossierListes();
  vrai('Scol@ dossier : sites accrédités lus dans le modèle', listes.sites.length >= 5 && /^SOCOTEC/.test(listes.sites[0].code));
  vrai('Scol@ dossier : établissements lus dans le modèle', listes.etablissements.length > 1000 && /^\d{14}$/.test(listes.etablissements[0].siret));
  Object.assign(G.__mission, { scolaSite: listes.sites[0].code, scolaDossier: 'DOSSIER-TEST', scolaEtablissement: listes.etablissements[0].nom });
  const r = await vm.runInContext('construireFeuilleCalcul(__mission, __data)', ctx);
  egal('bout en bout : onglets créés', r.onglets, ['GEH 1 - Tube Reg (3 prélèvements)', 'GEH 1 - Cassette (1 prélèvement)', 'GEH 2 - Tube Reg (multi) (3 prélèvements)',
    'GEH 2 - Tube (séq) (1 prélèvement)', 'GEH 3 - CIP10 silice Reg (3 prélèvements)', 'Analyseurs (1 essai), Acquisition (3 relevés)', 'Eurofins (16 références)']);
  egal('bout en bout : aucune alerte', r.alertes, []);
  // Relecture de la feuille générée
  const wb = await M.Classeur.charger(r.blob, ctx.JSZip);
  async function val(onglet, lib, col, opts) {
    const s = await wb.onglet(onglet);
    const R = G.fcLignes(s);
    const row = R.find(R.eg(lib), Object.assign({ formuleOk: true }, opts || {}));
    return row ? s.text(col + row) : '(libellé absent : ' + lib + ')';
  }
  const tr = 'GEH 1 - Tube Reg';
  egal('Tube Reg : préleveur', await val(tr, 'nom du préleveur', 'C'), 'Préleveur Test');
  egal('Tube Reg : GEH', await val(tr, 'GEH', 'C', { col: 'A' }), '1 - Peinture');
  egal('Tube Reg : opérateurs J1-J3', [await val(tr, 'opérateur', 'C', { col: 'A' }), await val(tr, 'opérateur', 'E', { col: 'A' }), await val(tr, 'opérateur', 'G', { col: 'A' })], ['Opérateur 1', 'Opérateur 2', 'Opérateur 3']);
  egal('Tube Reg : libellé du débitmètre', (await wb.onglet(tr)).text('B11'), 'débitmètre à lame de savon ou à piston');
  egal('Tube Reg : n° de débitmètre', await val(tr, 'débitmètre à lame de savon ou à piston', 'C', { col: 'B' }), '24367');
  egal('Tube Reg : lot du blanc', await val(tr, 'n° de lot', 'C', { col: 'B' }), 'LOT-A');
  egal('Tube Reg : date (texte JJ/MM/AAAA)', await val(tr, 'date de prélèvement', 'G', { col: 'A' }), '15/10/2026');
  egal('Tube Reg : plage 1 début (fraction de jour)', Number(await val(tr, 'heure début n°C1-P1_', 'C', { col: 'B' })), 8 / 24);
  egal('Tube Reg : durée d\'exposition', Number(await val(tr, "durée d'exposition (h:min) - VLEP 8h", 'C', { col: 'A' })), 450 / 1440);
  egal('Tube Reg : conditions du jour J2', await val(tr, 'température ambiante (°C)', 'E', { col: 'A' }), '21');
  const sTr = await wb.onglet(tr), Rtr = G.fcLignes(sTr);
  egal('Tube Reg : débit initial dans le bloc lame de savon', sTr.text('C' + Rtr.find(Rtr.debut('débit initial de la pompe'), { depuis: Rtr.lame, formuleOk: true })), '0.102');
  egal('Tube Reg : bloc massique vide', sTr.text('C' + Rtr.find(Rtr.debut('débit initial de la pompe'), { depuis: Rtr.massique, avant: Rtr.lame, formuleOk: true })), '');
  vrai('Tube Reg : lignes du bloc massique masquées', /hidden="1"/.test(sTr.rows[Rtr.massique + 1].attrs));
  egal('Tube Reg : référence', await val(tr, "référence de l'échantillon", 'E', { col: 'A' }), 'REF-tol-2');
  egal('Tube Reg : témoin', await val(tr, 'référence du témoin', 'C', { col: 'A' }), 'BT-1');
  egal('Tube Reg : type de VLEP', await val(tr, 'type de VLEP', 'C', { col: 'A' }), '8h');
  egal('Tube Reg : commentaire', await val(tr, 'commentaire', 'C', { col: 'A' }), 'RAS J1');
  egal('Scol@ : GES', await val(tr, 'GES *', 'C', { col: 'A' }), '1 - Peinture');
  egal('Scol@ : tâche', await val(tr, 'Tâche *', 'C', { col: 'A' }), G.SCOLA_LISTES.tache[0]);
  egal('Scol@ : ventilation', await val(tr, 'Ventilation global *', 'C', { col: 'A' }), "Présence d'une ventilation générale et mécanique");
  egal('Scol@ : protection collective', await val(tr, 'Protection Collective *', 'C', { col: 'A' }), 'Présence de captage localisé inducteur (non enveloppant)');
  egal('Scol@ : durée (min)', await val(tr, 'Durée *', 'C', { col: 'A' }), '240');
  vrai('Scol@ : débit moyen lié par formule', /<f>IF\(C\d+=/.test((sTr.cell('C' + Rtr.find(Rtr.eg('Débit moyen *'), { col: 'A', formuleOk: true })) || {}).inner || ''));
  egal('Cassette : agent', await val('GEH 1 - Cassette', 'agent chimique', 'C', { col: 'A' }), 'acide fluorhydrique');
  egal('Multi : agent n°2', await val('GEH 2 - Tube Reg (multi)', 'agent chimique n°2_', 'C', { col: 'A' }), 'éthylbenzène');
  egal('Séq : tube n°2 début', Number(await val('GEH 2 - Tube (séq)', 'heure début n°C2-P1_', 'C', { col: 'B' })), 10 / 24);
  egal('Séq : référence tube n°2', await val('GEH 2 - Tube (séq)', "référence de l'échantillon n°2_", 'C', { col: 'A' }), 'MET-2');
  egal('CIP10 : vitesse de référence', await val('GEH 3 - CIP10 silice Reg', 'vitesse de rotation (tr/min)', 'C', { col: 'B' }), '7000');
  egal('CIP10 : tachymètre', await val('GEH 3 - CIP10 silice Reg', 'marque', 'C', { col: 'A' }), 'T-88');
  const an = 'Analyseurs';
  const acq = await wb.onglet('Acquisition');
  egal('Acquisition : relevés dans les plages (08:00, 08:10, 13:30), heure et CO en colonnes D / E', [Number(acq.text('D7')), acq.text('E7'), acq.text('E8'), acq.text('E9'), acq.text('E10')], [8 / 24, '4', '6', '8', '']);
  egal('Acquisition : liée à l\'onglet Analyseurs', acq.text('CL2'), 'Analyseurs');
  egal('Analyseurs : liée à l\'onglet Acquisition', (await wb.onglet(an)).text('A149'), 'Acquisition');
  egal('Analyseurs : n° essai', await val(an, 'n° essai :', 'C', { col: 'A' }), 'CO-PF1');
  egal('Analyseurs : n° analyseur', await val(an, 'N° analyseur', 'C', { col: 'A' }), '25385');
  egal('Analyseurs : bouteilles zéro / étalon', [await val(an, 'N° bouteille', 'C', { col: 'A' }), (await wb.onglet(an)).text('C' + (G.fcLignes(await wb.onglet(an)).find(G.fcLignes(await wb.onglet(an)).eg('N° bouteille'), { col: 'A', formuleOk: true }) + 1))], ['Z-1', 'E-9']);
  egal('Analyseurs : gaz étalon', await val(an, 'Nature du gaz étalon', 'C', { col: 'A' }), 'CO 50 ppm');
  egal('Analyseurs : contrôle sensibilité avant', await val(an, 'ajustage ou contrôle de la sensibilité', 'C', { col: 'A' }), '49.5');
  egal('Analyseurs : contrôle sensibilité après', await val(an, 'contrôle de la sensibilité', 'C', { col: 'A' }), '48');
  egal('Analyseurs : agent', await val(an, 'Agent chimique', 'C', { col: 'A' }), 'oxyde de carbone');
  egal('Analyseurs : opérateur', await val(an, 'Opérateur', 'C', { col: 'A' }), 'Opérateur 1');
  egal('Analyseurs : date (numéro de série Excel)', await val(an, 'Date', 'C', { col: 'A' }), '46308');
  egal('Analyseurs : plage 1 début', Number(await val(an, 'heure début (hh:mm:ss)', 'C', { col: 'B' })), 8 / 24);
  egal('Analyseurs : type de VLEP', await val(an, 'Type de VLEP', 'C', { col: 'A' }), '8h');
  egal('Analyseurs : Scol@ méthode lecture directe', await val(an, 'Méthode de prélèvement *', 'C', { col: 'A' }), 'Prélèvement réalisé avec un appareil à lecture directe');
  const eur = await wb.onglet('Eurofins');
  egal('Eurofins : 1re ligne', [eur.text('B4'), eur.text('C4'), eur.text('E4'), eur.text('F4')], ['REF-tol-1', '13/10/2026', 'Echantillon', 'Standard (J0+9)']);
  egal('Eurofins : blanc avec lot', [eur.text('B19'), eur.text('D19'), eur.text('E19')], ['BT-1', 'LOT-A', 'Blanc']);
  // Fichier : calcChain retiré, recalcul forcé, XML des onglets créés bien formés
  const sc = await wb.onglet('Scol@');
  egal('Scol@ dossier : site, année, n° de dossier, observations, établissement', [sc.text('I9'), sc.text('I13'), sc.text('I17'), sc.text('I21'), sc.text('J33')], [listes.sites[0].code, '2026', 'DOSSIER-TEST', '/', listes.etablissements[0].nom]);
  vrai('calcChain retiré', !wb.zip.file('xl/calcChain.xml'));

  // ---------- Poste fixe : type de prélèvement de l'onglet non réglementaire ----------
  {
    const agT = G.state.agentsDB.find(a => /tube/i.test(a['Support de prélèvement'] || '') && !/silice|fibre/i.test(a['Agent chimique']))['Agent chimique'];
    const sbx = (pf, op) => ({ operateur: op, posteFixe: pf, date: '2026-10-15', plages: [{ debut: '08:00', fin: '12:00' }], agentData: { [agT]: { numPompe: '1', debitInitial: '0,1', debitFinal: '0,1', refEchantillon: op } } });
    G.__mpf = { clientSite: 'PF', preleveur: 'QT', gehs: [{ id: 1, num: 1, name: 'Zone' }], conditionsAmbiantes: [], blancs: [],
      prelevements: [{ id: 1, gehId: 1, type: '8h', isReglementaire: false, agents: [{ name: agT }], subPrelevements: [sbx(true, 'PF quai'), sbx(false, 'Opérateur B')] }] };
    const rpf = await vm.runInContext('construireFeuilleCalcul(__mpf, __data)', ctx);
    const wpf = await M.Classeur.charger(rpf.blob, ctx.JSZip);
    const npf = Object.keys(wpf.paths).filter(n => /^GEH 1 - Tube/.test(n))[0], spf = await wpf.onglet(npf);
    const rT = Object.keys(spf.rows).map(Number).find(r => spf.text('A' + r) === 'type de prélèvement');
    egal('poste fixe : type de prélèvement « à poste fixe » / « individuel » (opérateur par défaut)', [spf.text('C' + rT), spf.text('E' + rT)], ['à poste fixe', 'individuel']);
  }

  // ---------- Rapport Word pré-rempli (trame) ----------
  {
    const trame = fs.readFileSync(path.join(racine, 'modele', 'trame-rapport-vlep.docx'));
    const ag1 = G.state.agentsDB.find(a => a['VLEP Reglementaire contraignante'] === 'X' && /tube/i.test(a['Support de prélèvement'] || ''))['Agent chimique'];
    const ag2 = G.state.agentsDB.find(a => !a['VLEP Reglementaire contraignante'] && !a['VLEP Reglementaire Indicative'] && a['N° CAS'])['Agent chimique'];
    G.__mr = { clientSite: 'Client', preleveur: 'QT', scolaDossier: 'DOSSIER-1', gehs: [{ id: 1, num: 1, name: 'Peintres' }],
      rapport: { chrono: 'CHRONO-9', contrat: 'CONTRAT-7', interlocuteur: 'M. X', redacteur: 'R', valideur: 'V', agence: 'woippy', types: { campagne1: true, periodique: true }, categories: { contraignantes: true, admises: true }, posteFixe: true },
      prelevements: [
        { id: 1, gehId: 1, type: '8h', isReglementaire: true, agents: [{ name: ag1 }], subPrelevements: [{ operateur: 'A', date: '2026-10-15', plages: [{ debut: '08:00', fin: '12:00' }], epiType: 'FFP3', agentData: {} }] },
        { id: 2, gehId: 1, type: '8h', isReglementaire: false, agents: [{ name: ag2 }], subPrelevements: [{ operateur: 'A', date: '2026-10-15', plages: [{ debut: '08:00', fin: '12:00' }], agentData: {} }] }] };
    G.__trame = trame;
    const rr = await vm.runInContext('construireRapport(__mr, __trame, "nodebuffer")', ctx);
    const doc = await G.DocxMoteur.Document.charger(rr.blob);
    const X = G.DocxMoteur, paras = X.trouverTous(doc.corps(), 'w:p').map(p => X.texte(p).replace(/\s+/g, ' ').trim());
    vrai('rapport : titre selon les cases (contrôle périodique et 1ère campagne)', paras.includes('Rapport (contrôle périodique et première campagne de mesures)'));
    vrai('rapport : chrono, n° d’affaire, contrat, période, agence', paras.includes('CHRONO-9') && paras.some(t => /d’affaire: DOSSIER-1/i.test(t)) && paras.some(t => /contrat référencé CONTRAT-7/.test(t)) && paras.some(t => /réalisée le 15 octobre 2026/i.test(t)) && paras.some(t => /Grand est Mesures/.test(t)));
    vrai('rapport : partie stratégie et 2ème campagne retirées comme par la macro', !paras.some(t => /établie sous accréditation par/.test(t)) && !paras.some(t => /^Si 2ème campagne/.test(t)));
    const tAcc = X.ancetre(doc.signet('Tableau_accréditations').debut, 'w:tbl'), lAcc = tAcc.kids.filter(k => k.name === 'w:tr').map(tr => X.texte(tr.kids.filter(k => k.name === 'w:tc')[0]).trim());
    egal('rapport : tableau des accréditations = agents de la mission', lAcc.slice(2), [ag1, ag2]);
    vrai('rapport : consignes « copier/coller le tableau » retirées', !paras.some(t => /Copier\/coller le tableau établi/.test(t)));
    vrai('rapport : EPI par GEH (FFP3, FPA 10)', paras.some(t => /GEH 1 « Peintres » portent un demi-masque filtrant de type FFP3/.test(t)) && paras.some(t => /égal à 10\. Ce coefficient/.test(t)));
    vrai('rapport : annexe des tâches remplie', paras.some(t => /^GEH 1 : Peintres/.test(t)));
    vrai('rapport : partie poste fixe dans les commentaires', paras.includes('Mesures à poste fixe (hors accréditation)'));
    const pied = doc.pieds().map(a => X.texte(a)).join(' ');
    vrai('rapport : n° d’affaire et chrono en pied de page', /DOSSIER-1/.test(pied) && /N° chrono\s*:\s*CHRONO-9/.test(pied));
    const st = X.serialiser(doc.arbres['word/settings.xml']);
    vrai('rapport : protection formulaires retirée, champs mis à jour à l’ouverture', !/documentProtection/.test(st) && /w:updateFields w:val="true"/.test(st));
    // feuille de calcul exportée par l'appli mais jamais ouverte dans Excel : aucune valeur calculée, résultats signalés absents
    const rr2 = await vm.runInContext('construireRapport(__mr, __trame, "nodebuffer", __data)', ctx);
    vrai('rapport : feuille sans valeurs calculées signalée (résultats absents)', rr2.resultats && rr2.resultats.alertes.length === 1 && /Aucun résultat/.test(rr2.resultats.alertes[0]));
  }
  vrai('recalcul à l\'ouverture', /fullCalcOnLoad="1"/.test(wb.workbookXml));
  for (const nom of ['GEH 1 - Tube Reg', 'GEH 2 - Tube (séq)', 'Eurofins']) vrai('XML bien formé : ' + nom, bienForme(await wb.zip.file(wb.paths[nom]).async('string')));

  // Véolia : premier site du modèle, sans nom de site écrit dans le test
  const table = await G.veoliaLireTable(await M.Classeur.charger(data, ctx.JSZip));
  const site = table.sites[0];
  const proto = table.protocoles[site];
  const agentProto = proto.map(e => e.agents[0] && e.agents[0].nom).find(n => n && G.getAgentFromDB(n));
  G.__veolia = { site, agent: agentProto };
  const mV = vm.runInContext(`(function(){ var m = JSON.parse(JSON.stringify(__mission)); m.veoliaSite = __veolia.site;
    m.prelevements = [JSON.parse(JSON.stringify(__mission.prelevements[0]))]; m.prelevements[0].agents=[{name:__veolia.agent}];
    m.prelevements[0].subPrelevements.forEach(function(x){ var d=x.agentData['toluène']; x.agentData={}; x.agentData[__veolia.agent]=d; });
    m.blancs=[]; return m; })()`, ctx);
  G.__mV = mV;
  const rV = await vm.runInContext('construireFeuilleCalcul(__mV, __data)', ctx);
  const wbV = await M.Classeur.charger(rV.blob, ctx.JSZip);
  const ordre = wbV._ordre();
  egal('Véolia : un onglet par ligne du protocole', proto.every(e => ordre.indexOf(e.nom.slice(0, 31)) !== -1), true);
  egal('Véolia : modèles génériques supprimés', ordre.filter(n => G.VEOLIA_MODELES_GENERIQUES.indexOf(n) !== -1), []);
  vrai('Véolia : onglet de synthèse renommé', ordre.indexOf(('GEH X - ' + site).slice(0, 31)) !== -1 && ordre.indexOf('GEH X - Site') === -1);
  egal('Véolia : VEOLIA!A1 = site', (await wbV.onglet('VEOLIA')).text('A1'), site);
  vrai('Véolia : prélèvements placés dans un onglet du protocole', rV.onglets.some(o => /\(Véolia, 3 prélèvements\)/.test(o)));
  vrai('Véolia : noms définis locaux toujours valides', [...wbV.workbookXml.matchAll(/localSheetId="(\d+)"/g)].every(m => +m[1] < ordre.length));
}

finDeBout().catch(e => echecs.push('Erreur pendant les tests de bout en bout : ' + (e && e.stack || e))).then(() => {
  console.log('\nTests VLEP : ' + nOk + ' réussis, ' + echecs.length + ' en échec');
  echecs.forEach(e => console.log('  ✗ ' + e));
  process.exit(echecs.length ? 1 : 0);
});
