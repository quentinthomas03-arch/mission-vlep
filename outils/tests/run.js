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
['js/icons.js', 'js/database.js', 'js/scola-listes.js', 'js/state.js', 'js/prepa.js', 'js/terrain.js', 'js/consignes-agents.js', 'js/releves-analyseur.js', 'js/echantillons.js', 'js/xlsm-moteur.js', 'js/feuille-calcul.js', 'js/veolia.js', 'js/scola-dossier.js', 'js/activite.js', 'js/docx-moteur.js', 'js/rapport.js', 'js/rapport-resultats.js', 'js/nouveautes.js', 'js/guide.js', 'js/quick-entry.js', 'js/import-export.js', 'js/fusion-missions.js', 'js/fiche-supports.js', 'js/regroupement.js', 'js/timers.js']
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
  vrai('menu ⋯ : e-mail, .json, regrouper, fichier d’un collègue, GEH, modifier, supprimer', ['sendMissionByMail', 'exportMissionJSON', 'ouvrirRegroupement', 'declencherFusionFichier', 'addGehTerrain', 'editMissionFromTerrain', 'deleteMissionTerrain'].every(x => h2.indexOf(x) !== -1));
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
{
  // prélèvement « non réalisé » hors exports ; agent saisi sans accent remplacé par la fiche de la base
  const mn = { agents: [{ name: 'epichlorhydrine', isManual: true }], prelevements: [
    { gehId: 1, agents: [{ name: 'epichlorhydrine' }], subPrelevements: [{ completed: true, agentData: { epichlorhydrine: { refEchantillon: 'E1' } } }, { nonRealise: true }] },
    { gehId: 1, agents: [{ name: 'acétone' }], subPrelevements: [{ nonRealise: true }] }] };
  const c = G.missionRealisee(mn);
  egal('non réalisé : sorti des exports, agent de la base retrouvé', [c.prelevements.length, c.prelevements[0].subPrelevements.length, c.prelevements[0].agents[0].name, Object.keys(c.prelevements[0].subPrelevements[0].agentData)[0], mn.prelevements.length, G.agentBaseProche('acétone')],
    [1, 1, 'épichlorhydrine', 'épichlorhydrine', 2, null]);
  // écarts : seuls les non réalisés classés par le technicien, justification reprise
  const me = { gehs: [{ id: 1, num: 2, name: 'Soudeurs' }], prelevements: [
    { gehId: 1, type: '8h', agents: [{ name: 'acétone' }], subPrelevements: [{ completed: true }, { nonRealise: true, ecart: 'strategie', ecartMotif: 'Pas d’activité de soudage ce jour-là.' }, { nonRealise: true, ecart: 'strategie', ecartMotif: 'Pas d’activité de soudage ce jour-là.' }] },
    { gehId: 1, type: 'CT', agents: [{ name: 'acétone' }], subPrelevements: [{ nonRealise: true, ecart: 'contrat' }] },
    { gehId: 1, type: '8h', agents: [{ name: 'toluène' }], subPrelevements: [{ nonRealise: true }] }] };
  egal('écarts : phrases rédigées d\'après le choix du technicien', [G.rapportEcarts(me, 'strategie'), G.rapportEcarts(me, 'contrat')], [
    ['Les mesures d’acétone (8h) pour le GEH 2 « Soudeurs » ne sont pas complètes. Seule 1 mesure sur les 3 prévues a été réalisée (pas d’activité de soudage ce jour-là).'],
    ['La mesure d’acétone (CT) pour le GEH 2 « Soudeurs » n’a pas été réalisée.']]);
}
// gravimétrie : 2 blancs attendus par lot (même agent, même lot), plusieurs lots par mission
{
  const pi = 'fraction inhalable de la pollution particulaire (poussières inhalables sur filtre PVC)';
  const mg = { blancs: [{ ref: 'B1', agents: [pi], lot: 'L1', date: '2026-10-15' }, { ref: 'B2', agents: [pi], lot: 'L2' }, { ref: 'B3', agents: [pi], lot: 'L2' }, { ref: 'B4', agents: ['toluène'], lot: 'L1' }],
    prelevements: [{ agents: [{ name: pi }, { name: 'toluène' }], subPrelevements: [
      { date: '2026-10-15', agentData: { [pi]: { refEchantillon: 'E1', lot: 'L1' }, 'toluène': { refEchantillon: 'T1', lot: 'L1' } } },
      { date: '2026-10-16', agentData: { [pi]: { refEchantillon: 'E2', lot: 'L2' } } },
      { date: '2026-10-17', agentData: { [pi]: { refEchantillon: 'E3', lot: 'L3' } } },
      { nonRealise: true, agentData: { [pi]: { refEchantillon: 'E4', lot: 'L4' } } }] }] };
  egal('gravimétrie : agents reconnus d\'après la base', [G.estGravimetrie(pi), G.estGravimetrie('Aérosols de fluide d\'usinage (Brouillard d\'huiles)'), G.estGravimetrie('toluène')], [true, true, false]);
  egal('gravimétrie : lots à moins de 2 blancs', G.blancsGraviManquants(mg).map(g => [g.lot, g.blancs.length]), [['L1', 1], ['L3', 0]]);
  egal('gravimétrie : alerte d\'export pour le lot à 1 blanc', G.fcAlertesBlancsGravi(mg).length, 1);
  G.state.missions = [Object.assign({ id: 77 }, mg)]; G.state.currentMissionId = 77;
  const _r = G.render; G.render = () => {}; G.ajouterBlancDuLot(0); G.render = _r;
  egal('gravimétrie : 2e blanc prérempli (agent, lot, date)', [G.state.showModal, G.state.blancAgents, G.state.blancLot, G.state.blancDate, G.state.blancRef], ['addBlanc', [pi], 'L1', '2026-10-15', '']);
  G.state.showModal = null; G.state.missions = []; G.state.currentMissionId = null;
}
// agents fusionnés sur un même support (même réf.) : le blanc saisi avec l'un d'eux vaut pour le support
{
  const mf = { blancs: [{ ref: 'BL1', agents: ['acétone'], lot: 'L9', date: '2026-10-15' }],
    prelevements: [{ agents: [{ name: 'toluène' }, { name: 'acétone' }, { name: 'xylènes' }], subPrelevements: [
      { date: '2026-10-15', agentData: { 'toluène': { refEchantillon: 'S1', lot: 'L9' }, 'acétone': { refEchantillon: 'S1' }, 'xylènes': { refEchantillon: 'S2', lot: 'L9' } } }] }] };
  const p0 = mf.prelevements[0], sb0 = p0.subPrelevements[0];
  egal('fusion : agents du même support', G.agentsMemeRef(p0, sb0, 'toluène'), ['toluène', 'acétone']);
  egal('fusion : blanc d\'un autre agent du support retrouvé (lot du support)', (G.findBlancForSupport(mf, sb0, ['toluène', 'acétone']) || {}).ref, 'BL1');
  egal('fusion : colonne de la feuille liée au blanc', (G.findBlancForSupport(mf, sb0, G.fcAgentsDuSupport(p0, sb0, ['toluène'])) || {}).ref, 'BL1');
  egal('fusion : seul le support sans blanc signalé', G.fcAlertesBlancs(mf).length === 1 && /xylènes/.test(G.fcAlertesBlancs(mf)[0]), true);
  egal('blanc : agents de la mission et supports à plusieurs agents proposés', G.blancChoixMission(mf), { agents: ['toluène', 'acétone', 'xylènes'], supports: [['toluène', 'acétone']] });
}
// « À vérifier » : oublis des prélèvements commencés seulement (un prélèvement à faire n'est pas un oubli)
{
  const mv = { gehs: [{ id: 1, num: 3, name: 'Peintres' }], blancs: [], conditions: [],
    prelevements: [{ id: 41, gehId: 1, type: '8h', agents: [{ name: 'toluène' }], subPrelevements: [
      { date: '2026-10-15', operateur: 'A', plages: [{ debut: '08:00', fin: '12:00' }], agentData: { 'toluène': { numPompe: 'P1', debitInitial: '', debitFinal: '', refEchantillon: 'T1' } } },
      { date: '2026-10-16', plages: [], agentData: {} },
      { nonRealise: true, plages: [], agentData: {} }] }] };
  const av = G.aVerifierMission(mv, '2026-10-16').map(x => x.t);
  vrai('à vérifier : prélèvement arrêté non validé, ce qui manque', av.some(t => /^GEH 3 · toluène · J1 : non validé, manque Débit initial/.test(t)));
  vrai('à vérifier : conditions ambiantes du jour commencé seulement', av.some(t => /Conditions ambiantes non saisies : 15\/10\/2026$/.test(t)));
  vrai('à vérifier : échantillon sans blanc', av.some(t => /Aucun blanc terrain saisi/.test(t)));
  vrai('à vérifier : non réalisé sans écart (facultatif)', av.some(t => /1 prélèvement non réalisé sans écart indiqué/.test(t)));
  egal('à vérifier : rien sur le prélèvement pas encore commencé', av.filter(t => /J2/.test(t)).length, 0);
  egal('à vérifier : bandeau absent quand rien à signaler', G.renderAVerifier({ gehs: [], prelevements: [] }), '');
}
// fusion d'une même mission saisie sur deux téléphones
{
  const base = { id: 500, clientSite: 'Site', preleveur: '', gehs: [{ id: 1, num: 1, name: 'Peintres' }], agents: [{ name: 'toluène' }], blancs: [], conditionsAmbiantes: [],
    prelevements: [{ id: 51, gehId: 1, type: '8h', agents: [{ name: 'toluène' }], subPrelevements: [1, 2, 3].map(i => ({ id: 510 + i, operateur: '', date: '', plages: [{ debut: '', fin: '' }], observations: '', completed: false, agentData: { 'toluène': { refEchantillon: '', numPompe: '', debitInitial: '', debitFinal: '' } } })) }] };
  G.daterSaisies([base]);
  egal('fusion : première empreinte sans date de saisie', [!!base.prelevements[0].subPrelevements[0]._sig, base.prelevements[0].subPrelevements[0]._mod], [true, undefined]);
  const A = JSON.parse(JSON.stringify(base)), B = JSON.parse(JSON.stringify(base));
  const saisir = (m, i, op, ref) => { const sb = m.prelevements[0].subPrelevements[i]; sb.operateur = op; sb.date = '2026-10-2' + i; sb.agentData['toluène'].refEchantillon = ref; G.daterSaisies([m]); };
  saisir(A, 0, 'Alice', 'A1'); saisir(B, 1, 'Bob', 'B2'); saisir(A, 2, 'Alice', 'A3'); saisir(B, 2, 'Bob', 'B3');
  A.prelevements[0].subPrelevements[2]._mod = 1000; B.prelevements[0].subPrelevements[2]._mod = 2000; // B a saisi J3 après A
  B.preleveur = 'Bob'; B.blancs.push({ ref: 'BL', agents: ['toluène'], lot: '' }); B.conditionsAmbiantes.push({ date: '2026-10-21', temperature: '20' });
  B.prelevements.push({ id: 52, gehId: 1, type: 'CT', agents: [{ name: 'toluène' }], subPrelevements: [] });
  const r = G.fusionnerMissionDans(A, B), s = A.prelevements[0].subPrelevements;
  egal('fusion : saisies des deux côtés réunies, la plus récente gardée', [s[0].operateur, s[1].operateur, s[2].operateur], ['Alice', 'Bob', 'Bob']);
  egal('fusion : jour saisi des deux côtés signalé', r.conflits.length === 1 && /J3 : version reçue gardée/.test(r.conflits[0]), true);
  egal('fusion : blanc, conditions, prélèvement ajouté, champ vide complété', [A.blancs.length, A.conditionsAmbiantes.length, A.prelevements.length, A.preleveur], [1, 1, 2, 'Bob']);
  { const A2 = { id: 'M', gehs: [], agents: [], blancs: [], conditionsAmbiantes: [], prelevements: [{ id: 1, agents: [{ name: 'a' }], subPrelevements: [{ operateur: 'X', date: '2026-10-14' }, {}] }] };
    const B2 = { id: 'M', gehs: [], agents: [], prelevements: [{ id: 1, agents: [{ name: 'a' }], subPrelevements: [{ operateur: 'X', date: '2026-10-14' }, { operateur: 'Y', date: '2026-10-15' }] }] };
    G.fusionnerMissionDans(A2, B2);
    egal('fusion : jours sans identifiant (ancienne mission) rapprochés par leur rang', A2.prelevements[0].subPrelevements.map(s => s.operateur || ''), ['X', 'Y']); }
  egal('fusion : refaire la même fusion ne change rien', G.fusionnerMissionDans(A, JSON.parse(JSON.stringify(A))).repris, 0);
  egal('fusion : fichier reconnu (format .json et QR)', [!!G.missionDepuisDonnees({ _format: 'VLEP_Mission_JSON', mission: A }), !!G.missionDepuisDonnees({ _f: 'VLEP', m: A }), G.missionDepuisDonnees({ x: 1 })], [true, true, null]);
}
// prépa automatique : nom de la base sur deux lignes dans la cellule du devis (Butanol (Toxilabo), support PVC)
egal('prépa devis : précision entre parenthèses rattachée à l\'agent', G.parseAgentNames('Butanol\n(Toxilabo)\nacétone\r\nargent métallique\n(support PVC)\nAnalyse TOXILABO'),
  ['Butanol\n(Toxilabo)', 'acétone', 'argent métallique\n(support PVC)']);
vrai('prépa devis : Butanol (Toxilabo) reconnu dans la base', !!G.getAgentFromDB(G.parseAgentNames('Butanol\n(Toxilabo)')[0]));
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
// blanc associé = même agent ET même n° de lot que l'échantillon
G.getBlancForAgent = (m, a, d, l) => { const b = G.findBlancForAgent(m, a, d, l); return b ? (b.ref || '') : ''; };
egal('blanc : même agent et même lot', G.getBlancForAgent(mC, 'toluène', '2026-10-15', 'L15'), 'B2');
egal('blanc : lot comparé sans espaces ni majuscules', G.getBlancForAgent(mC, 'toluène', '2026-10-15', ' l 14'), 'B1');
egal('blanc : même lot, autre jour -> blanc du lot', G.getBlancForAgent(mC, 'toluène', '2026-10-20', 'L14'), 'B1');
egal('blanc : lot différent -> aucun', G.getBlancForAgent(mC, 'toluène', '2026-10-15', 'L99'), '');
egal('blanc : échantillon sans lot, blancs avec lot -> aucun', G.getBlancForAgent(mC, 'toluène', '2026-10-15'), '');
egal('blanc : bon lot mais autre agent -> aucun', G.getBlancForAgent(mC, 'éthylbenzène', '2026-10-15', 'L15'), '');
egal('blanc sans lot : blanc unique de l\'agent (ancienne saisie)', G.getBlancForAgent(mC, 'o-xylène', '2026-10-15'), 'B3');
egal('blanc sans lot : échantillon avec lot -> aucun', G.getBlancForAgent(mC, 'o-xylène', '2026-10-15', 'L14'), '');
// n° de lot en une fois sur plusieurs échantillons et blancs
{
  const mL = { blancs: [{ ref: 'BL', agents: ['toluène'] }], prelevements: [{ agents: [{ name: 'toluène' }, { name: 'xylène' }], subPrelevements: [
    { date: '2026-10-14', agentData: { 'toluène': { refEchantillon: 'E1' }, 'xylène': { refEchantillon: 'E1' } } },
    { date: '2026-10-15', agentData: { 'toluène': { refEchantillon: 'E2' } }, supportsSupp: [{ agentData: { 'toluène': { refEchantillon: 'E3' } } }] }] }] };
  egal('lot en masse : lignes (réf. distinctes + blanc)', G.lignesLot(mL).map(x => x.cle), ['e:E1', 'e:E2', 'e:E3', 'b:0']);
  egal('lot en masse : nombre appliqué', G.appliquerLot(mL, { 'e:E1': true, 'e:E3': true, 'b:0': true }, 'LX'), 3);
  egal('lot en masse : co-prélèvement, support fractionné et blanc', [mL.prelevements[0].subPrelevements[0].agentData['xylène'].lot, mL.prelevements[0].subPrelevements[1].supportsSupp[0].agentData['toluène'].lot, mL.blancs[0].lot, mL.prelevements[0].subPrelevements[1].agentData['toluène'].lot], ['LX', 'LX', 'LX', undefined]);
  egal('lot en masse : le blanc suit alors l\'échantillon', G.echantillonsDuBlanc(mL, mL.blancs[0]), 2);
  egal('lots déjà saisis proposés (sans doublon)', G.lotsConnus({ prelevements: [{ subPrelevements: [{ agentData: { a: { lot: 'L2' }, b: { lot: ' l2 ' } } }] }], blancs: [{ lot: 'L1' }] }), ['L1', 'L2']);
  // alerte à l'export : E2 (sans lot) n'a pas de blanc, E1/E3 (lot LX) ont BL
  egal('alerte blancs : échantillon sans blanc du même lot', G.fcAlertesBlancs(mL), ['« toluène », sans n° de lot : 1 échantillon sans blanc du même agent et du même lot, réf. du témoin vide.']);
  // réf. en double : co-prélèvement (même support) toléré, deux supports ou échantillon + blanc signalés
  const mD = { gehs: [{ id: 1, num: 1 }], blancs: [{ ref: 'e2', agents: ['toluène'] }], conditionsAmbiantes: [{ date: '2026-10-14' }], prelevements: [{ id: 7, gehId: 1, type: '8h', agents: [{ name: 'toluène' }, { name: 'xylène' }], subPrelevements: [
    { date: '2026-10-14', dureeExpo: '07:00', coPrelGroups: [['toluène', 'xylène']], agentData: { 'toluène': { refEchantillon: 'E1' }, 'xylène': { refEchantillon: 'E1' } } },
    { date: '2026-10-15', agentData: { 'toluène': { refEchantillon: 'E2' }, 'xylène': { refEchantillon: 'E3' } } }] }] };
  egal('réf. en double : seule la réf. sur deux supports est signalée', G.refsEnDouble(mD).map(x => x.ref), ['E2']);
  egal('alerte réf. en double', G.fcAlertesRefDoublons(mD), ['Réf. « E2 » sur 2 échantillons différents (toluène · 15/10/2026 ; blanc toluène) : un seul figure dans la commande Eurofins.']);
  egal('alerte conditions ambiantes manquantes', G.fcAlertesConditions(mD), ['Conditions ambiantes non saisies pour le 15/10/2026 : température, pression et humidité vides dans la feuille.']);
  egal('alerte durée d\'exposition (rappel)', G.fcAlertesDureeExpo(mD), ['1 prélèvement 8 h sans durée d’exposition (GEH 1) : à compléter dans l’appli ou dans la feuille.']);
  vrai('validation : réf. échantillon exigée, durée d\'exposition jamais exigée', (() => { const f = G.getMissingFields(mD.prelevements[0], { date: '2026-10-15', operateur: 'X', plages: [{ debut: '08:00', fin: '09:00' }], agentData: { 'toluène': { numPompe: '1', debitInitial: '1', debitFinal: '1' }, 'xylène': { numPompe: '1', debitInitial: '1', debitFinal: '1', refEchantillon: 'E9' } } }); return f.length === 1 && /Réf\. échantillon · toluène/.test(f[0]); })());
  // regrouper des prélèvements
  {
    const sub = (o) => Object.assign({ id: Math.random(), plages: [{ debut: '', fin: '' }], agentData: {} }, o || {});
    const prel = (id, an, subs) => ({ id: id, gehId: 1, type: '8h', isReglementaire: true, agents: [{ name: an }], subPrelevements: subs.map(sub) });
    const mR = { id: 'R', gehs: [{ id: 1, num: 1, name: 'Peinture' }], prelevements: [prel(1, 'toluène', [{}, {}, {}]), prel(2, 'o-xylène', [{}, {}, {}]), prel(3, 'méthanol', [{}, {}, {}])] };
    const pr = G.regPropositions(mR)[0];
    egal('regrouper : propositions (même support, puis tout le GEH)', pr.cartes.map(c => [c.nature, c.ids]), [['support', [1, 2]], ['geh', [1, 2, 3]]]);
    egal('regrouper : « Tout regrouper » = tout le GEH quand c\'est sûr', G.regActionsGlobales(mR).map(a => a.ids), [[1, 2, 3]]);
    const g = G.regrouperPrelevements(mR, [mR.prelevements[0], mR.prelevements[1]]);
    egal('regrouper : un prélèvement, deux agents, même support tous les jours', [mR.prelevements.length, g.agents.length, g.subPrelevements.map(s => (s.coPrelGroups || []).length)], [2, 2, [1, 1, 1]]);
    vrai('regrouper : liste « 1 support (tube de charbon actif) »', G.regSupportsTexte(g) === '1 support (tube de charbon actif)');
    // conflits : opérateur différent, jour en plus, réf. différentes sur un même support
    const a = prel(4, 'toluène', [{ operateur: 'Paul', agentData: { 'toluène': { refEchantillon: 'T1' } } }]);
    const b = prel(5, 'o-xylène', [{ operateur: 'Marc', observations: 'RAS', agentData: { 'o-xylène': { refEchantillon: 'X1' } } }, { operateur: 'Marc' }]);
    const an = G.regAnalyse([a, b]);
    vrai('regrouper : conflit non sûr (opérateur, nombre de jours, réf. différentes)', !an.sur && an.pertes.some(x => /opérateur « Marc » non repris \(« Paul » gardé\)/.test(x)) && an.raisons.some(x => /Nombre de prélèvements différent/.test(x)) && an.raisons.some(x => /supports séparés gardés/.test(x)));
    const m2 = { prelevements: [a, b] }, g2 = G.regrouperPrelevements(m2, [a, b]);
    egal('regrouper : rien de perdu (jour en plus ajouté, champ vide complété), réf. différentes -> supports séparés', [g2.subPrelevements.length, g2.subPrelevements[0].observations, g2.subPrelevements[0].operateur, (g2.subPrelevements[0].coPrelGroups || []).length], [2, 'RAS', 'Paul', 0]);
    vrai('regrouper : supports séparés affichés « 2 supports »', G.regSupportsTexte(g2) === '2 supports');
    egal('regrouper : GEH différents jamais proposés ensemble', G.regPropositions({ gehs: [], prelevements: [prel(6, 'toluène', [{}]), Object.assign(prel(7, 'o-xylène', [{}]), { gehId: 2 })] }).length, 0);
  }
  // saisie rapide : statut réglementaire de la base
  egal('saisie rapide : réglementaire selon la base', [G.agentEstReglementaire('toluène'), G.agentEstReglementaire('acide acétique')].map(Boolean), [true, !!G.agentEstReglementaire('acide acétique')]);
  vrai('saisie rapide : plus de puces « ? » ni d\'icône dans les messages', !/<p>\? |alert\(''\+ICONS/.test(fs.readFileSync(path.join(racine, 'js', 'quick-entry.js'), 'utf8')));
  // rapport : précochage et champs vides
  {
    const mRp = { prelevements: [{ isReglementaire: true, agents: [{ name: 'toluène' }], subPrelevements: [{ posteFixe: true }] }, { isReglementaire: true, agents: [{ name: 'fraction alvéolaire de silice cristalline (quartz)' }], subPrelevements: [{}] }, { agents: [{ name: 'acétone' }], subPrelevements: [{ nonRealise: true }] }] };
    const rp = G.rapportDonnees(mRp);
    egal('rapport : catégories précochées d\'après la base', Object.keys(rp.categories).sort(), Object.keys(G.rapportCategoriesAuto(mRp)).sort());
    vrai('rapport : silice et poste fixe précochés, agent non réalisé ignoré', rp.categories.silice && rp.posteFixe === true && G.rapportAgentsMission(mRp).indexOf('acétone') === -1);
    if (typeof G.render !== 'function') G.render = () => {};
    const missionsAvant = G.state.missions, courante = G.state.currentMissionId;
    G.state.missions = [mRp]; mRp.id = 'RP'; G.state.currentMissionId = 'RP';
    G.rapportBascule('categories', 'horsArrete'); G.rapportMaj('posteFixe', false);
    mRp.prelevements[0].subPrelevements[0].posteFixe = true;
    vrai('rapport : une case touchée n\'est plus recalculée', G.rapportDonnees(mRp).categories.horsArrete === true && G.rapportDonnees(mRp).posteFixe === false);
    G.state.missions = missionsAvant; G.state.currentMissionId = courante;
    vrai('rapport : mission aux cases déjà cochées à la main non modifiée', (() => { const mm = { rapport: { types: {}, categories: { admises: true } }, prelevements: mRp.prelevements }; const r2 = G.rapportDonnees(mm); return r2.categories.admises && !r2.categories.silice; })());
    egal('rapport : agent à VLEP réglementaire mesuré hors contrôle réglementaire -> « hors arrêté »', G.rapportCategoriesAuto({ prelevements: [{ isReglementaire: false, agents: [{ name: 'toluène' }], subPrelevements: [{}] }] }), { horsArrete: true });
    egal('rapport : prélèvement en poste fixe -> aucune catégorie (partie poste fixe)', G.rapportCategoriesAuto({ prelevements: [{ isReglementaire: false, agents: [{ name: 'toluène' }], subPrelevements: [{ posteFixe: true }] }] }), {});
    egal('rapport : prélèvement réglementaire -> catégorie de la base', G.rapportCategoriesAuto({ prelevements: [{ isReglementaire: true, agents: [{ name: 'toluène' }], subPrelevements: [{}] }] }), { contraignantes: true });
    egal('rapport : champs vides rappelés', G.rapportChampsVides({ rapport: { types: { campagne1: true }, categories: {}, chrono: 'C1', contrat: 'K', interlocuteur: 'I', redacteur: 'R', valideur: 'V', agence: 'woippy' }, prelevements: [] }), ['Stratégie de prélèvement réalisée par', 'Référence du rapport de stratégie']);
  }
  // rapport, tableaux de résultats : groupes sans réf. d'échantillon écartés, agents non utilisés masqués (comme la macro)
  {
    const cases = { A10: 'RESULTATS', A11: 'GEH', C11: '1 - Peinture', I11: '2 - intitulé', A12: 'référence de l\'échantillon', C12: 'T-1', E12: 'T-2', A13: 'agent chimique n°1_', C13: 'toluène',
      A14: 'port d\'un EPI respiratoire n°1_', C14: 'non', A15: 'agent chimique n°2_', A16: 'port d\'un EPI respiratoire n°2_', C16: 'non', A17: 'heure début n°C1-P2_', A20: 'Validation des prélèvements' };
    const sh = { rows: {}, text: ref => cases[ref] || '' };
    const cols12 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    egal('résultats : bloc vierge « 2 - intitulé » écarté (Reg)', G.rrColonnesUtiles(sh, cols12, 10, 20, true), [3, 4, 5, 6, 7, 8]);
    egal('résultats : prélèvements sans réf. écartés (non Reg)', G.rrColonnesUtiles(sh, cols12, 10, 20, false), [3, 4, 5, 6]);
    egal('résultats : dernier agent utilisé', G.rrDernierAgent(sh, [3, 4, 5, 6, 7, 8], 20), 1);
    vrai('résultats : lignes de l\'agent n°2 masquées, y compris « non » calculé', G.rrLigneNumeroteeVide(sh, 16, [3], 1) && G.rrLigneNumeroteeVide(sh, 15, [3], 1) && !G.rrLigneNumeroteeVide(sh, 14, [3], 1));
  }
  // fiche supports : supports à prévoir d'après les affectations (mission en préparation)
  {
    const sil = G.state.agentsDB.find(a => /gravim/i.test(JSON.stringify(a)) && a['Code support'])['Agent chimique'];
    const mF = { id: 'F', status: 'prepa', gehs: [{ id: 1, num: 1, name: 'Peinture' }, { id: 2, num: 2, name: 'Ponçage' }], agents: [], prelevements: [], agentColors: {},
      affectations: { 'toluène': { gehs: { 1: { has8h: true, isReg8h: true } } }, 'o-xylène': { gehs: { 1: { has8h: true, isReg8h: true } } }, 'méthanol': { gehs: { 1: { has8h: true, isReg8h: false } } } } };
    mF.affectations[sil] = { gehs: { 2: { has8h: true, isReg8h: true, nb8h: 16 } } };
    const f = G.ficheSupports(mF), L = c => f.lignes.filter(l => l.agents.indexOf(c) !== -1)[0];
    egal('fiche supports : tubes de charbon actif (toluène + o-xylène, 3 prélèvements chacun)', [L('toluène').ech, L('toluène').blancs, L('toluène').echRegroupe], [6, 1, 3]);
    vrai('fiche supports : même code support = une seule ligne', L('toluène') === L('o-xylène') && L('toluène').code === 'FHL4W');
    egal('fiche supports : méthanol non réglementaire (1 prélèvement), autre support', [L('méthanol').ech, L('méthanol').blancs, L('méthanol').ref], [1, 1, 'AF']);
    egal('fiche supports : gravimétrie, 2 blancs par lot de 15 (16 échantillons -> 4 blancs)', [L(sil).ech, L(sil).blancs], [16, 4]);
    vrai('fiche supports : regroupement proposé (GEH 1, toluène + o-xylène)', f.suggestions.some(s => /GEH 1/.test(s) && /toluène/.test(s) && /o-xylène/.test(s)));
    egal('fiche supports : la mission préparée n\'est pas modifiée', mF.prelevements.length, 0);
    vrai('fiche supports : écran rendu (tableau, commentaire de la base)', (() => { G.state.missions = [mF]; G.state.currentMissionId = 'F'; const h = G.renderFicheSupports(); return /Supports à prévoir/.test(h) && /FHL4W/.test(h) && /Par polluant/.test(h); })());
    egal('fiche supports : blancs, règle', [G.fsBlancs(0, true), G.fsBlancs(15, true), G.fsBlancs(16, true), G.fsBlancs(30, false)], [0, 2, 4, 1]);
  }
  // prépa automatique, format 3 : plan d'échantillonnage (plan fictif)
  {
    const T = '\t';
    const plan = ['Jour' + T + 'Agents chimiques' + T + 'N° GEH' + T + 'Nb total de prélèvements' + T + 'Type de VLEP' + T + 'Plage horaire de prélèvement',
      'J1/J2/J3' + T + '"toluène\r\no-xylène"' + T + '1 - Peintres' + T + '3' + T + '8h' + T + 'En journée',
      'J2' + T + 'méthanol' + T + 'Peintres' + T + '2' + T + 'CT' + T + 'Sur phase d\'exposition',
      'J4/J5/J6' + T + 'méthanol' + T + '3' + T + '1' + T + '8h' + T + 'En journée',
      'J4' + T + 'méthanol' + T + '3' + T + '1' + T + '8h' + T + 'Nettoyage',
      'Postes fixes',
      'J1' + T + 'toluène' + T + 'PF - Cabine' + T + '1' + T + '8h' + T + '8h - 16h'].join('\r\n');
    const pl = G.parsePlanEchantillonnage(plan, '3' + T + 'Mainteneurs');
    egal('plan : GEH en « n - nom », en nom seul (même GEH), en numéro nommé par la liste, poste fixe', pl.gehs.map(g => g.num + ' ' + g.name + (g.posteFixe ? ' PF' : '')), ['1 Peintres', '2 PF - Cabine PF', '3 Mainteneurs']);
    egal('plan : jours de chaque prélèvement (un par jour, un seul jour, à placer)', pl.rows.map(r => r.jours.join(',')), ['J1,J2,J3', 'J2,J2', 'J4/J5/J6', 'J4', 'J1']);
    egal('plan : nombre lu tel quel (2 reste 2)', pl.rows[1].nb, 2);
    egal('plan : deux agents d\'une même cellule', pl.rows[0].agentNames, ['toluène', 'o-xylène']);
    const mP = G.createEmptyMission(); mP.id = 'P'; mP.status = 'prepa';
    const avantM = G.state.missions, avantC = G.state.currentMissionId, avantR = G.render;
    G.state.missions = [mP]; G.state.currentMissionId = 'P'; G.render = () => {};
    G.state.prepaAutoData = { format: '3', parsed: pl }; G.applyPrepaAuto();
    const g3 = mP.gehs.find(g => g.num === 3).id;
    egal('plan : même agent, même GEH, même type sur deux lignes -> prélèvements additionnés', [mP.affectations['méthanol'].gehs[g3].nb8h, mP.affectations['méthanol'].gehs[g3].jours8h], [2, ['J4/J5/J6', 'J4']]);
    const c = JSON.parse(JSON.stringify(mP)); G.generatePrelevements(c);
    const pT = c.prelevements.find(p => p.agents[0].name === 'toluène' && p.subPrelevements.length === 3);
    egal('plan : jour prévu et plage sur les prélèvements générés', [pT.subPrelevements.map(s => s.jourPrevu), pT.plagePrevue], [['J1', 'J2', 'J3'], 'En journée']);
    G.state.missions = [c]; G.state.currentMissionId = c.id;
    vrai('plan : rappel « Prévu au plan » sur le prélèvement', /Prévu au plan : J2 · En journée/.test(G.renderSubPrelForm(pT, pT.subPrelevements[1], 1)));
    G.state.missions = [mP]; G.state.currentMissionId = 'P';
    vrai('plan : partie « Postes fixes » -> prélèvement en poste fixe', c.prelevements.some(p => p.subPrelevements.some(s => s.posteFixe)));
    vrai('plan : poste fixe jamais réglementaire', c.prelevements.filter(p => p.subPrelevements.some(s => s.posteFixe)).every(p => !p.isReglementaire));
    const fp = G.ficheSupports(mP);
    egal('plan : fiche supports, pompes par jour prévu', [fp.parJour.J1.pompe, fp.parJour.J2.pompe, fp.parJour['J4/J5/J6'].pompe], [3, 4, 1]);
    G.state.missions = avantM; G.state.currentMissionId = avantC; G.render = avantR;
    egal('prépa auto : nombre de prélèvements lu dans la cellule', [G.lireNbPrel('2'), G.lireNbPrel('1 prélèvement'), G.lireNbPrel(''), G.lireNbPrel('x6')], [2, 1, 3, 6]);
  }
  // date du prélèvement : à la première saisie, pas à l'ouverture
  {
    const sbD = { id: 'd1', plages: [{ debut: '', fin: '' }], agentData: {} }, pD = { id: 9, type: '8h', agents: [{ name: 'toluène' }], subPrelevements: [sbD] };
    const mD2 = { id: 'D', status: 'validee', gehs: [], prelevements: [pD] }, mPrep = { id: 'E', status: 'prepa', gehs: [], prelevements: [{ id: 8, agents: [], subPrelevements: [{ id: 'e1', operateur: '' }] }] };
    const avM = G.state.missions, avC = G.state.currentMissionId;
    G.state.missions = [mD2, mPrep]; G.state.currentMissionId = 'D';
    G.daterSaisies(G.state.missions);
    G.renderSubPrelForm(pD, sbD, 0);
    egal('date : pas remplie à l\'ouverture du prélèvement', sbD.date || '', '');
    sbD.operateur = 'Paul'; G.daterSaisies(G.state.missions);
    egal('date : remplie à la première saisie', sbD.date, G.getTodayDate());
    mPrep.prelevements[0].subPrelevements[0].operateur = 'X'; G.daterSaisies(G.state.missions);
    egal('date : jamais remplie en préparation', mPrep.prelevements[0].subPrelevements[0].date || '', '');
    G.state.missions = avM; G.state.currentMissionId = avC;
  }
  egal('conditions : jours de prélèvement sans conditions proposés', G.joursSansConditions({ conditionsAmbiantes: [{ date: '2026-10-21' }], prelevements: [{ subPrelevements: [{ date: '2026-10-22' }, { date: '2026-10-21' }, { date: '2026-10-20', nonRealise: true }, {}] }] }), ['2026-10-22']);
  // fenêtre « Même support » : agents de même support précochés ; ajout de prélèvement : statut de la base, nombre au choix
  {
    const avM = G.state.missions, avC = G.state.currentMissionId, avR = G.render;
    G.render = () => {};
    const pM = { id: 31, gehId: 1, type: '8h', isReglementaire: true, agents: [{ name: 'toluène' }, { name: 'o-xylène' }, { name: 'méthanol' }], subPrelevements: [{ agentData: {} }, { agentData: {} }] };
    const mM = { id: 'MS', gehs: [{ id: 1, num: 1, name: 'A' }], prelevements: [pM] };
    G.state.missions = [mM]; G.state.currentMissionId = 'MS';
    G.showLinkAgentModal(31, 0, 'toluène');
    egal('même support : agents de même support précochés', Object.keys(G.state.coPrelSelection), ['o-xylène']);
    vrai('même support : fenêtre claire (pas d\'emoji, avertissement si support différent coché)', (() => { G.state.coPrelSelection['méthanol'] = true; const h = G.renderLinkAgentModal(); return !/🔗|🎯/.test(h) && /support différent dans la base/.test(h) && /Valider \(3 agents\)/.test(h); })());
    G.state.newPrelData = { gehId: 1, agents: [], type: '8h', isReg: true, agentSearch: '' };
    G.addNewPrelAgent('acide acétique');
    egal('ajout de prélèvement : statut tiré de la base', G.state.newPrelData.isReg, !!G.agentEstReglementaire('acide acétique'));
    G.state.newPrelData.nb = 2; G.state.newPrelData.isReg = true; G.addPrelTerrain();
    const pn = mM.prelevements[mM.prelevements.length - 1];
    egal('ajout de prélèvement : nombre choisi, justification si réglementaire à moins de 3', [pn.subPrelevements.length, !!pn.justifNb], [2, true]);
    G.state.missions = avM; G.state.currentMissionId = avC; G.render = avR;
  }
  // dictée : phrases successives (iPhone) et morceaux cumulés (Android) donnent le même texte
  egal('dictée : phrases successives (iPhone)', G.dicteeFusion(['contrôle du poste', 'de peinture']), 'contrôle du poste de peinture');
  egal('dictée : morceaux cumulés (Android)', G.dicteeFusion(['contrôle', 'contrôle du poste', 'contrôle du poste de peinture']), 'contrôle du poste de peinture');
  egal('dictée : ponctuation dictée', G.applyPonctuationCommands('cabine ouverte virgule porte fermée point').trim(), 'cabine ouverte, porte fermée.');
  egal('dictée : répétition ignorée (Android)', G.dicteeFusion(['cabine ouverte', 'cabine ouverte', 'porte fermée']), 'cabine ouverte porte fermée');
  egal('alerte blancs : aucun blanc saisi', G.fcAlertesBlancs({ blancs: [], prelevements: mL.prelevements }), ['Aucun blanc terrain saisi (Échantillons) : la réf. du témoin restera vide.']);
}

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

// Guide d'utilisation : parcours, recherche sans accents, questions fréquentes
vrai('guide : rendu avec le sommaire et les 5 étapes du parcours', (() => { G.state.guideQ = ''; G.state.guidePhase = 0; const h = G.renderTutoriel(); return (h.match(/class="guide-etape[ "]/g) || []).length === 6 && h.indexOf('Créer la mission') !== -1; })());
vrai('guide : sommaire à l\'ouverture, les 5 catégories et la 5e « à tout moment »', (() => { G.state.guidePhase = null; const h = G.guideCorps(); return (h.match(/class="card guide-som/g) || []).length === 5 && /guide-som transverse/.test(h) && h.indexOf('guideAllerPoint(4,0)') !== -1; })());
vrai('guide : la recherche « debloquer » trouve la procédure Excel et la FAQ', (() => { G.state.guideQ = 'debloquer'; const h = G.guideCorps(); G.state.guideQ = ''; return h.indexOf('<mark>Débloquer</mark>') !== -1 && h.indexOf('Questions fréquentes') !== -1; })());
vrai('guide : recherche sans résultat signalée', (() => { G.state.guideQ = 'zzzz'; const h = G.guideCorps(); G.state.guideQ = ''; return h.indexOf('Aucun résultat') !== -1; })());

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
      agents.forEach(function(a){ o.agentData[a]={numPompe:'P-'+(i+1),debitInitial:deb[0],debitFinal:deb[1],refEchantillon:'REF-'+a.slice(0,3)+'-'+(i+1),lot:a==='toluène'?(i===1?'LOT-B':'LOT-A'):''}; }); return o; }
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
  egal('bout en bout : aucune alerte hors blancs', r.alertes.filter(a => !/réf\. du témoin vide/.test(a)), []);
  vrai('bout en bout : alerte du toluène lot LOT-B sans blanc', r.alertes.indexOf('« toluène », lot LOT-B : 1 échantillon sans blanc du même agent et du même lot, réf. du témoin vide.') !== -1);
  vrai('bout en bout : pas d\'alerte pour le lot LOT-A qui a son blanc', !r.alertes.some(a => /LOT-A/.test(a)));
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
  egal('Tube Reg : date (vraie date Excel, 15/10/2026)', await val(tr, 'date de prélèvement', 'G', { col: 'A' }), '46310');
  egal('Tube Reg : plage 1 début (fraction de jour)', Number(await val(tr, 'heure début n°C1-P1_', 'C', { col: 'B' })), 8 / 24);
  egal('Tube Reg : durée d\'exposition', Number(await val(tr, "durée d'exposition (h:min) - VLEP 8h", 'C', { col: 'A' })), 450 / 1440);
  egal('Tube Reg : conditions du jour J2', await val(tr, 'température ambiante (°C)', 'E', { col: 'A' }), '21');
  const sTr = await wb.onglet(tr), Rtr = G.fcLignes(sTr);
  egal('Tube Reg : débit initial dans le bloc lame de savon', sTr.text('C' + Rtr.find(Rtr.debut('débit initial de la pompe'), { depuis: Rtr.lame, formuleOk: true })), '0.102');
  egal('Tube Reg : bloc massique vide', sTr.text('C' + Rtr.find(Rtr.debut('débit initial de la pompe'), { depuis: Rtr.massique, avant: Rtr.lame, formuleOk: true })), '');
  vrai('Tube Reg : lignes du bloc massique masquées', /hidden="1"/.test(sTr.rows[Rtr.massique + 1].attrs));
  egal('Tube Reg : référence', await val(tr, "référence de l'échantillon", 'E', { col: 'A' }), 'REF-tol-2');
  egal('Tube Reg : témoin', await val(tr, 'référence du témoin', 'C', { col: 'A' }), 'BT-1');
  egal('Tube Reg : pas de témoin sur un autre lot', await val(tr, 'référence du témoin', 'E', { col: 'A' }), '');
  egal('Tube Reg : lot de l\'échantillon', await val(tr, 'n° de lot', 'E', { col: 'B' }), 'LOT-B');
  egal('Tube Reg : type de VLEP', await val(tr, 'type de VLEP', 'C', { col: 'A' }), '8h');
  egal('Tube Reg : commentaire vide (l’activité « RAS J1 » ne va pas dans la feuille)', await val(tr, 'commentaire', 'C', { col: 'A' }), '');
  egal('Scol@ : GES', await val(tr, 'GES *', 'C', { col: 'A' }), '1 - Peinture');
  { const sc = await wb.onglet('GEH 1 - Cassette'); const rp = Object.keys(sc.rows).map(Number).sort((x, y) => x - y).find(r => sc.text('A' + r).trim() === 'Prélèvement n°'); egal('non Reg : GEH dans la ligne Prélèvement n°', sc.text('C' + rp), '1 - Peinture'); }
  { const st = (await wb.onglet(tr)).tail; vrai('listes déroulantes : agent (Plage_SubstanceMonDevis) et EPI (Choix_FPA) sur l’onglet créé', st.includes('<formula1>Plage_SubstanceMonDevis</formula1>') && st.includes('<formula1>Choix_FPA</formula1>')); }
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
  egal('Eurofins : 1re ligne', [eur.text('B4'), eur.text('C4'), eur.text('D4'), eur.text('E4'), eur.text('F4')], ['REF-tol-1', '13/10/2026', 'LOT-A', 'Echantillon', 'Standard (J0+9)']);
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
        { id: 2, gehId: 1, type: '8h', isReglementaire: false, agents: [{ name: ag2 }], subPrelevements: [{ operateur: 'A', date: '2026-10-15', plages: [{ debut: '08:00', fin: '12:00' }], agentData: {} }, { nonRealise: true, ecart: 'contrat', ecartMotif: 'Machine à l’arrêt' }] },
        { id: 3, gehId: 1, type: 'CT', isReglementaire: true, agents: [{ name: ag1 }], subPrelevements: [{ nonRealise: true, ecart: 'strategie', ecartMotif: 'Pas de phase de pointe' }] }] };
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
    vrai('rapport : écart au contrat rédigé', paras.some(t => /ne sont pas complètes\. Seule 1 mesure sur les 2 prévues a été réalisée \(machine à l’arrêt\)\.$/.test(t)) && !paras.some(t => /^Ecart au contrat\s*:\s*Sans objet/.test(t)));
    vrai('rapport : écart à la stratégie rédigé dans la partie réglementaire', paras.includes('Les points suivants dérogent au plan d’échantillonnage :') && paras.some(t => /\(CT\) pour le GEH 1 « Peintres » n’a pas été réalisée \(pas de phase de pointe\)\.$/.test(t)));
    vrai('rapport : aucun titre de niveau 1 vide (titre 3 vidé par la macro retiré, signets entre paragraphes compris)', !X.trouverTous(doc.corps(), 'w:p').some(p => { const pp = X.enfant(p, 'w:pPr'), st = pp && X.enfant(pp, 'w:pStyle'); return st && /^Titre1$/.test(X.attr(st, 'w:val')) && !X.texte(p).trim(); }));
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
