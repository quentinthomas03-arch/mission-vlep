// nouveautes.js - « Quoi de neuf dans l'appli » (même principe que l'appli Aération)
// © 2025 Quentin THOMAS
//
// Après une mise à jour, une carte sur l'accueil résume ce qui a changé ; « J'ai compris » la masque
// jusqu'à la version suivante. L'historique complet est en bas du Tutoriel.
// À CHAQUE NOUVELLE FONCTION : ajouter une entrée en tête de NOUVEAUTES, monter APP_VERSION,
// et monter VERSION / CACHE_NAME dans sw.js à la même valeur.

var APP_VERSION = '2.31';

// Du plus récent au plus ancien. Une entrée par version publiée aux techniciens.
var NOUVEAUTES = [
  { version: '2.31', date: '16/10/2026', items: [
    'Feuille de calcul : sur les onglets créés par l’appli, l’agent chimique et le type d’EPI se choisissent de nouveau dans la liste (liste déroulante de la cellule ; le double-clic du modèle reste réservé aux onglets d’origine, sa macro ne pouvant pas être recopiée).'
  ] },
  { version: '2.30', date: '16/10/2026', items: [
    'Feuille de calcul : l’activité saisie sur le terrain n’est plus écrite dans la case « commentaire ». Seule la justification d’un réglementaire prévu à moins de 3 prélèvements y reste. L’activité reste dans l’annexe des tâches du rapport Word.'
  ] },
  { version: '2.29', date: '16/10/2026', items: [
    'Guide d’utilisation mis à jour : écran Rapport Word, prélèvement non réalisé, opérateur ou poste fixe, durée d’exposition, nombre de prélèvements par affectation, agent reconnu dans la base, installation et mises à jour.'
  ] },
  { version: '2.28', date: '15/10/2026', items: [
    'Missions protégées : l’appli demande au navigateur de garder ses données de façon permanente (Safari sur iPhone peut sinon effacer les données d’un site peu ouvert).'
  ] },
  { version: '2.27', date: '15/10/2026', items: [
    'Saisie : bouton « Non réalisé » pour un prélèvement prévu mais pas fait (pas d’exposition ce jour-là…). Il sort du compteur de la mission, de la feuille de calcul, du rapport et de la liste des échantillons ; l’observation peut en donner la raison. « Annuler » le remet à faire.',
    'Agent ajouté à la main : si la base le connaît au même nom (accents ou majuscules près, ex. « epichlorhydrine »), l’appli propose sa fiche (support, méthode, VLEP). Les missions déjà saisies sont reprises de la même façon à l’export.',
    'Modèle de la feuille de calcul et trame du rapport chargés en arrière-plan à l’ouverture, puis gardés : exports plus rapides, surtout en 4G.'
  ] },
  { version: '2.26', date: '15/10/2026', items: [
    'Bouton « Rapport Word » en haut de la mission, à côté de « Feuille de calcul » : il ouvre un écran à part avec les données du rapport et du dossier Scol@ (retirées de la préparation) et le bouton de génération.',
    'Export de la feuille de calcul de nouveau rapide (la v2.21 réécrivait tous les onglets du classeur) ; bandeau « en cours » pendant la génération.',
    'Mise à jour de l’appli : les fichiers sont revérifiés auprès du serveur, une nouvelle version n’est plus masquée par d’anciens fichiers gardés par le navigateur.'
  ] },
  { version: '2.25', date: '15/10/2026', items: [
    'Rapport Word comparé à un rapport réellement rendu (Bruker 2026) et rapproché de lui :',
    'Rapport réunissant 1ère campagne et contrôle périodique : dans la carte « Rapport », choix de la partie de chaque GEH (ou de chaque agent) ; résultats et EPI y sont placés. Les écarts (contrat, stratégie) restent rédigés par le technicien.',
    'EPI : « Sans objet. » quand aucun EPI n’est porté dans la partie ; texte comme la trame (« un demi-masque filtrant de type FFP3 »).',
    'Stratégie (1ère campagne) : auteur et référence du rapport de stratégie saisis dans la carte « Rapport ».',
    'Annexe des tâches : prélèvements réalisés seulement, ordre chronologique, prélèvements simultanés réunis, cellules identiques fusionnées, horaires « 09h07 – 09h22 », durées « 15 min ».',
    'Divers : période « du 26 au 28 mai 2026 », laboratoires sans doublon, agents classés par ordre alphabétique, agent saisi sans accent retrouvé dans la base, phrase du périmètre sur les VLEP non réglementaires remplie, onglet modèle rempli sans être renommé repris.'
  ] },
  { version: '2.24', date: '15/10/2026', items: [
    'Saisie : choix « Opérateur » (par défaut) ou « Poste fixe » pour chaque prélèvement ; la feuille de calcul reçoit le type de prélèvement (« individuel » ou « à poste fixe »).',
    'Rapport Word : en joignant la feuille de calcul complétée (résultats du laboratoire saisis, enregistrée dans Excel), les résultats sont placés automatiquement : blocs RESULTATS dans « Résultats des mesures » (réglementaire, hors arrêté), postes fixes sous leur texte dans les commentaires, détail de chaque onglet dans l’annexe des résultats détaillés. Images de la feuille comme avec la macro « Extraire résultats » (valeurs d’Excel, non modifiables), plus de copier-coller.'
  ] },
  { version: '2.23', date: '15/10/2026', items: [
    'Rapport Word pré-rempli depuis la trame (menu ⋯ de la mission) : les parties sont retenues selon les choix de la carte « Rapport », comme le formulaire de la trame ; couverture, n° chrono et n° d’affaire en pied de page, identification de l’entreprise, tableau des accréditations et annexe des méthodes (base de données), équipes et laboratoire, EPI et FPA par GEH, annexe de description des tâches et partie poste fixe sont remplis. Restent à compléter : résultats, conclusion, commentaires.'
  ] },
  { version: '2.22', date: '15/10/2026', items: [
    'Préparation : nouvelle carte « Rapport » (n° chrono, contrat, interlocuteur, rédacteur, valideur, agence retenue pour les missions suivantes, type de rapport, agents contrôlés, mesures à poste fixe). Ces choix serviront au rapport Word pré-rempli, en préparation.'
  ] },
  { version: '2.21', date: '15/10/2026', items: [
    'Feuille de calcul : les onglets modèles non remplis sont masqués à l’ouverture, le premier onglet GEH s’affiche directement.',
    'Statut réglementaire tiré de la base (VLEP contraignante ou indicative), indépendamment du nombre de prélèvements : un devis à 1 prélèvement reste réglementaire si l’agent l’est. Le nombre (×3, ×1, ×2) se règle dans les affectations ; avec moins de 3 prélèvements, une justification est demandée sur le terrain et reprise dans le commentaire de la feuille de calcul.',
    'L’ancien export Excel est retiré (remplacé par la feuille de calcul). L’export Word se trouve dans le menu ⋯ de la mission.',
    'Macros bloquées à l’ouverture de la feuille (« Risque de sécurité ») : clic droit sur le fichier › Propriétés › cocher « Débloquer » › OK, puis rouvrir. Rappelé après chaque export et dans le Guide.',
    'Retour en préparation après le début de la saisie (Modifier la mission, ← Prépa) : revalider garde tout ce qui a été saisi et n’ajoute que les nouveaux prélèvements. Un prélèvement déjà saisi dont le GEH ou l’agent a été retiré n’est supprimé qu’après confirmation.'
  ] },
  { version: '2.20', date: '15/10/2026', items: [
    'Nouvelle présentation, la même que l’appli Aération : écran plus clair, une seule couleur pour l’action principale.',
    'Mission terrain : en-tête bleu avec l’avancement (prélèvements terminés), Feuille de calcul et Échantillons en un toucher, les autres actions (e-mail, .json, Word, fusions, ajouter un GEH, modifier) dans le menu ⋯.'
  ] },
  { version: '2.19', date: '15/10/2026', items: [
    'Sur téléphone, les débits, vitesses de rotation et durée de port de l’EPI ouvrent directement le clavier numérique. Virgule ou point : les deux sont acceptés partout.'
  ] },
  { version: '2.18', date: '15/10/2026', items: [
    { modele: true, t: 'Scol@ du dossier (préparation) : n° de dossier, établissement cherché dans la liste Scol@ (nom, SIRET ou code postal) et site géographique accrédité, retenu pour les missions suivantes. L’onglet Scol@ de la feuille de calcul est rempli : il ne reste qu’à générer le XML une fois les résultats du laboratoire reçus.' }
  ] },
  { version: '2.17', date: '15/10/2026', items: [
    'Analyseurs (CO, CO2) : « Importer les relevés de l’appareil » lit directement le fichier exporté (.csv de l’enregistreur CO2, .txt du détecteur CO). La moyenne sur les plages s’affiche aussitôt et le n° d’analyseur est repris du fichier.',
    { modele: true, t: 'Feuille de calcul : les relevés remplissent l’onglet Acquisition et la concentration moyenne se calcule seule dans l’onglet Analyseurs (un bloc par agent, J1 à J3), comme dans vos feuilles.' }
  ] },
  { version: '2.16', date: '15/10/2026', items: [
    'Consignes de la base sous chaque agent : l’appli contrôle les limites (2 h maximum par tube pour le méthanol, 15 L maximum pour l’éthanol, durée CT imposée, durée minimale…) et propose de fractionner avec « + Support ». Rappels de matériel affichés (H2S, fluide d’usinage, capteur CO/CO2…), remarque complète consultable.',
    'Agents qu’aucun laboratoire n’analyse : signalés dès la préparation et sur le terrain.'
  ] },
  { version: '2.15', date: '15/10/2026', items: [
    'Recherche d’agent : le bon agent sort en premier (« éthanol » avant « 2-butoxyéthanol » ou « diéthanolamine »), même sans accent (« ethanol ») et avec plusieurs mots.',
    'Base de données des agents mise à jour (version 86) : classement CMR, VLEP du béryllium, méthode du méthanethiol, commentaire du chrome VI.'
  ] },
  { version: '2.14', date: '15/10/2026', items: [
    'Mesures avec analyseur portable (CO, CO2) : plus de pompe ni de débit à saisir. Le bloc demande le n° d’analyseur et le n° d’essai, avec un volet facultatif pour les contrôles (bouteilles, gaz étalon, zéro et sensibilité avant / après) et un J-1 qui reprend l’analyseur et les bouteilles.',
    { modele: true, t: 'Feuille de calcul : les mesures par analyseur remplissent l’onglet Analyseurs (un essai par colonne, contrôles, plages, durée d’exposition, Scol@). Les relevés de l’appareil restent à coller dans l’onglet Acquisition.' }
  ] },
  { version: '2.13', date: '15/10/2026', items: [
    { modele: true, t: 'Missions Véolia : en préparation, « Choisir un site Véolia » ajoute les agents du protocole du site (lu dans la feuille de calcul).' },
    { modele: true, t: 'À l’export, la feuille de calcul est organisée comme le fait le bouton « Choix Site » de l’Excel : un onglet par substance du protocole (supports et agents préremplis, un bloc par GEH), modèles génériques retirés, onglet de synthèse réduit au site. Un agent hors protocole part dans un onglet GEH habituel, avec un avertissement.' }
  ] },
  { version: '2.12', date: '15/10/2026', items: [
    { modele: true, t: 'Feuille de calcul : l’onglet Eurofins (commande au labo) est rempli : références des échantillons et des blancs, dates, n° de lot des blancs, priorité et matrice. Plus besoin du bouton « Listes des références échantillons ».' }
  ] },
  { version: '2.11', date: '15/10/2026', items: [
    { modele: true, t: 'Scol@ : sous Ventilation et captage, la tâche et le métier (recherche dans les listes Scol@) et le type de procédé. Avec la ventilation, le captage, le lieu et l’EPI déjà saisis, ils remplissent le bloc Scol@ de la feuille de calcul : plus besoin de passer par le formulaire Scol@ de l’Excel.' },
    { modele: true, t: 'Le bloc Scol@ reprend aussi seul le n° de prélèvement, la date, la représentativité (8h ou CT), la méthode quand elle est sans ambiguïté (pompe, badge, CIP10), la durée, le débit moyen et le facteur de protection calculés par la feuille.' }
  ] },
  { version: '2.10', date: '15/10/2026', items: [
    'Durée d’exposition (VLEP 8h) à saisir sous les plages horaires, avec J-1 et « = durée du prélèvement » : elle est reprise dans les exports (Word, Excel). En court-terme, c’est la durée du prélèvement, sans saisie.',
    'Export Word : la colonne « Durée d’exposition » affichait par erreur la durée de port de l’EPI ; elle affiche maintenant la vraie durée d’exposition.'
  ] },
  { version: '2.9', date: '15/10/2026', items: [
    { modele: true, t: 'Fini la double saisie : le bouton « Feuille de calcul » (liste des échantillons) sort directement la feuille de calcul Contrôle des VLEP (v74), avec ses formules et ses macros, déjà remplie : un onglet par GEH (« GEH 1 - Tube Reg », « GEH 2 - Cassette »…), préleveur, site, opérateurs, pompes, débitmètre, dates, plages, EPI, conditions du jour, débits, références, blanc et commentaires.' },
    { modele: true, t: 'Le bon modèle d’onglet est choisi seul : Reg ou non, tube, cassette, cassette + tube, CIP10 silice ou non, « (multi) » pour plusieurs agents sur un même tube, « (séq) » pour un prélèvement fractionné.' },
    { modele: true, t: 'Il ne reste à saisir dans Excel que la durée d’exposition et les résultats du laboratoire.' }
  ] },
  { version: '2.8', date: '15/10/2026', items: [
    'Prélèvement 8h fractionné (ex. 6 h de méthanol en 3 supports de 2 h) : « + Support » ajoute un support avec ses plages, ses débits et sa référence. Chaque support a sa propre colonne dans l’Excel et sa propre ligne d’échantillon.',
    'Agents sur le même support : un seul bloc de saisie, les agents en pastilles (× pour délier, « + Agent » pour en ajouter).',
    'EPI : la liste de l’onglet FPA de la feuille de calcul (FFP3, masque complet P3, TH3…), avec le FPA affiché.',
    'Ventilation, captage et EPI : bouton J-1 pour recopier le jour précédent, ou « Prél. précédent » pour reprendre un autre prélèvement du même GEH le même jour.',
    'Bouton « Envoyer par e-mail » à côté de « Export JSON » : le mail s’ouvre avec le fichier de la mission, il ne reste qu’à saisir le destinataire.'
  ] },
  { version: '2.6', date: '15/10/2026', items: [
    'Contrôle du débit : la moyenne du débit initial et du débit final est comparée au débit attendu, à ± 5 %. Un débit comme 1,998 L/min pour 2 L/min n’est plus signalé à tort.',
    'Type de débitmètre (massique ou lame de savon / piston) à choisir dans les infos mission : les débits vont dans le bon bloc de la feuille de calcul.',
    'Chrono CT : il continue après une mise en veille ou un rechargement de l’appli.',
    'Blancs terrain : n° de lot à saisir (repris dans l’Excel), et chaque prélèvement est rattaché au blanc de son jour.',
    'Conditions ambiantes : seules celles du jour du prélèvement sont reprises à l’export, jamais celles d’un autre jour.'
  ] }
];

var SEEN_VERSION_KEY = 'vlep_seen_version_v1';

function nvGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function nvSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function versionGreater(a, b) {
  var pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// Une ligne peut dépendre du modèle de feuille de calcul (« { modele: true, t: … } ») : elle n'est montrée
// que si le modèle est présent dans l'appli (FC_MODELE_DISPO, voir feuille-calcul.js), et une seule fois
// le jour où il arrive, même si la version a déjà été vue.
var SEEN_MODELE_KEY = 'vlep_seen_modele_v1';
function nvTexte(it) { return typeof it === 'string' ? it : it.t; }
function nvDepModele(it) { return typeof it !== 'string' && !!it.modele; }
function nvModeleDispo() { return typeof FC_MODELE_DISPO !== 'undefined' && FC_MODELE_DISPO === true; }

function renderNouveautesCard() {
  var seen = nvGet(SEEN_VERSION_KEY), modeleVu = nvGet(SEEN_MODELE_KEY) === '1', dispo = nvModeleDispo();
  // Tout premier lancement (aucune mission) : pas de « nouveautés » pour quelqu'un qui découvre l'appli
  if (!seen && !state.missions.length) { nvSet(SEEN_VERSION_KEY, APP_VERSION); if (dispo) nvSet(SEEN_MODELE_KEY, '1'); return ''; }
  var lignes = [];
  NOUVEAUTES.forEach(function (n) {
    var nouvelle = seen !== APP_VERSION && (!seen || versionGreater(n.version, seen));
    n.items.forEach(function (it) {
      if (nvDepModele(it)) { if (dispo && !modeleVu) lignes.push(nvTexte(it)); }
      else if (nouvelle) lignes.push(nvTexte(it));
    });
  });
  if (!lignes.length) { if (seen !== APP_VERSION) nvSet(SEEN_VERSION_KEY, APP_VERSION); return ''; }
  var h = '<div class="card news-card"><div class="news-head"><span class="news-badge">Nouveau</span>' +
    '<span class="news-title">Quoi de neuf dans l’appli</span></div><ul class="news-list">';
  lignes.forEach(function (t) { h += '<li>' + escapeHtml(t) + '</li>'; });
  h += '</ul><button class="btn btn-gray btn-small" onclick="dismissNouveautes();">J’ai compris</button></div>';
  return h;
}

function dismissNouveautes() {
  nvSet(SEEN_VERSION_KEY, APP_VERSION);
  if (nvModeleDispo()) nvSet(SEEN_MODELE_KEY, '1');
  render();
}

function renderNouveautesHistorique() {
  var h = '<div class="section-title mt-12">Historique des nouveautés</div>';
  var dispo = nvModeleDispo();
  NOUVEAUTES.forEach(function (n) {
    var items = n.items.filter(function (it) { return dispo || !nvDepModele(it); });
    if (!items.length) return;
    h += '<div class="card"><div style="font-weight:600;">Version ' + escapeHtml(n.version) + ' <span class="subtitle">· ' + escapeHtml(n.date) + '</span></div><ul class="news-list">';
    items.forEach(function (it) { h += '<li>' + escapeHtml(nvTexte(it)) + '</li>'; });
    h += '</ul></div>';
  });
  return h;
}

console.log('✓ Nouveautés chargées');
