// guide.js - Guide d'utilisation intégré (accueil > Guide)
// © 2025 Quentin THOMAS
//
// Parcours en cinq étapes (préparation, terrain, feuille de calcul, rapport, outils), points dépliables,
// recherche dans tout le guide et questions fréquentes. Ne décrit que ce que l'appli fait réellement :
// à mettre à jour à chaque fonction qui change un écran.

var GUIDE_PHASES = [
  {
    icon: 'building', court: 'Préparation', titre: 'Préparer la mission', quand: 'Au bureau, avant la visite',
    ouvrir: { label: 'Ouvrir la préparation', vue: 'prepa-list' },
    points: [
      { t: 'Créer la mission', ou: ['Accueil', 'Préparation mission', 'Nouvelle mission'],
        d: 'Renseigner le client et le site, le préleveur et le débitmètre.',
        n: 'Choisir le type de débitmètre (massique ou piston / lame de savon) : les débits et le volume de la feuille de calcul en dépendent.' },
      { t: 'Importer le devis', ou: ['Préparation', 'Mission', 'Prépa automatique'],
        d: 'Copier le tableau du devis dans Excel et le coller, avec la liste des GEH. L’appli crée les GEH, les agents, les affectations et le nombre de prélèvements.' },
      { t: 'Définir les GEH', ou: ['Préparation', 'Mission', 'GEH'],
        d: 'Un numéro et un intitulé par groupe d’exposition homogène.' },
      { t: 'Ajouter les agents chimiques', ou: ['Préparation', 'Mission', 'Agents'],
        d: 'Rechercher l’agent dans la base intégrée : support, méthode, débit et VLEP sont repris.',
        n: 'Un agent saisi à la main que la base connaît sous le même nom (aux accents et majuscules près) est rattaché à sa fiche.' },
      { t: 'Affecter les agents aux GEH', ou: ['Préparation', 'Mission', 'Affectations'],
        d: 'Pour chaque agent, cocher les GEH concernés. Le statut réglementaire (VLEP contraignante ou indicative) vient de la base. Le nombre de prélèvements se règle sur chaque affectation.',
        n: 'En réglementaire, moins de 3 prélèvements demande une justification, saisie sur le terrain.' },
      { t: 'Valider la mission', ou: ['Préparation', 'Mission', 'Valider'],
        d: 'Les prélèvements sont générés et la mission passe en saisie terrain.',
        n: 'Revenir en préparation pour modifier un GEH ou un agent conserve la saisie terrain déjà faite.' }
    ]
  },
  {
    icon: 'clipboard', court: 'Terrain', titre: 'Saisir sur site', quand: 'Pendant les prélèvements',
    ouvrir: { label: 'Ouvrir la saisie terrain', vue: 'terrain-list' },
    points: [
      { t: 'Ouvrir la mission', ou: ['Accueil', 'Saisie terrain', 'Mission'],
        d: 'En tête de mission : Feuille de calcul, Rapport Word, Échantillons, et le menu ⋯ (activité pour le rapport, envoi par e-mail, fichier .json, fusion, ajout de GEH).' },
      { t: 'Saisir un prélèvement', ou: ['Mission', 'Prélèvement', 'Onglet du jour'],
        d: 'Opérateur, date, n° de pompe, débits initial et final, plages horaires.',
        n: 'Virgule ou point acceptés. Le clavier numérique s’ouvre sur les champs chiffrés.' },
      { t: 'Opérateur ou poste fixe', ou: ['Mission', 'Prélèvement'],
        d: 'Le prélèvement est « Opérateur » par défaut. Choisir « Poste fixe » pour une mesure d’ambiance : la feuille de calcul et le rapport le reprennent.' },
      { t: 'Durée d’exposition', ou: ['Mission', 'Prélèvement'],
        d: 'À saisir sur les prélèvements 8 h. Elle est reprise dans la feuille de calcul et dans l’annexe des tâches du rapport.' },
      { t: 'Protection respiratoire', ou: ['Mission', 'Prélèvement'],
        d: 'Choisir l’EPI dans la liste (FFP3, demi-masque avec filtre, TH3…) et la durée de port en minutes. Le FPA est celui de la liste.' },
      { t: 'Ventilation et Scol@', ou: ['Mission', 'Prélèvement'],
        d: 'Environnement, ventilation générale, captage localisé, puis tâche, métier et type de procédé Scol@, repris dans la feuille de calcul.' },
      { t: 'Valider le prélèvement', ou: ['Mission', 'Prélèvement', 'Valider'],
        d: 'Bouton « Valider » en bas de l’écran ; l’onglet du jour est coché.' },
      { t: 'Prélèvement non réalisé', ou: ['Mission', 'Prélèvement', 'Non réalisé'],
        d: 'Pour un prélèvement prévu mais pas fait (pas d’exposition ce jour-là…). Il sort du compteur, de la feuille de calcul, du rapport et des échantillons. L’observation peut en donner la raison.',
        n: '« Annuler » le remet à faire.' },
      { t: 'Co-prélèvement sur un même support', ou: ['Mission', 'Prélèvement', 'Même support'],
        d: 'Cocher les agents prélevés sur le même support et valider : le regroupement s’applique à tous les jours. « Délier » retire un agent.',
        n: 'Un badge signale les agents que la base place sur le même support.' },
      { t: 'Conditions ambiantes', ou: ['Mission', 'Conditions ambiantes'],
        d: 'Température, pression et humidité, initiales et finales, une entrée par jour.' },
      { t: 'N° de lot des supports', ou: ['Mission', 'Prélèvement', 'N° de lot'],
        d: 'Saisi sous la réf. de l’échantillon. Il est repris dans la feuille de calcul et dans la demande d’analyse Eurofins.',
        n: 'Pour ne pas le ressaisir : bouton J-1 (lot de la veille), lots déjà saisis proposés en liste, ou Échantillons › « N° de lot… » pour l’appliquer en une fois aux échantillons et blancs cochés (raccourcis : tout, sans lot, par agent).' },
      { t: 'Blancs terrain', ou: ['Mission', 'Échantillons', '+ Blanc terrain'],
        d: 'Référence, date, n° de lot et agent(s) du blanc. La liste des blancs indique sur combien d’échantillons sa réf. sera reportée.',
        n: 'La réf. du blanc n’est écrite dans la feuille de calcul (« réf. du témoin ») que sur les échantillons du même agent chimique et du même n° de lot. Sous le n° de lot d’un prélèvement, l’appli affiche le blanc associé.' },
      { t: 'Liste des échantillons', ou: ['Mission', 'Échantillons'],
        d: 'Références par agent avec la date, le lot et le blanc associé, blancs compris. La commande au laboratoire se fait par la feuille de calcul (onglet Eurofins).' }
    ]
  },
  {
    icon: 'sheet', court: 'Feuille', titre: 'Feuille de calcul', quand: 'Export Excel et résultats du laboratoire',
    points: [
      { t: 'Générer la feuille', ou: ['Mission', 'Feuille de calcul'],
        d: 'Un bandeau « en cours » s’affiche quelques secondes. Le modèle est chargé d’avance à l’ouverture de l’appli.' },
      { t: 'Alertes à la génération',
        d: 'Avant le téléchargement, l’appli liste les points à vérifier : type de débitmètre non choisi, modèle absent, échantillons sans blanc du même agent et du même lot (réf. du témoin vide). La feuille est générée quand même.' },
      { t: 'Contenu du fichier',
        d: 'Un onglet par GEH et par support, les analyseurs et l’onglet Acquisition, la demande d’analyse Eurofins et l’en-tête Scol@. Les onglets modèles vides sont masqués ; le premier GEH s’affiche à l’ouverture.' },
      { t: 'Ouvrir le fichier',
        d: 'Ouvrir le .xlsm et activer les macros.',
        n: 'Si Excel affiche « Risque de sécurité » : fermer Excel, clic droit sur le fichier › Propriétés › cocher « Débloquer » › OK, puis rouvrir.' },
      { t: 'Saisir les résultats du laboratoire',
        d: 'Reporter les résultats d’analyse dans la feuille, puis l’enregistrer dans Excel.',
        n: 'L’enregistrement dans Excel est indispensable : c’est lui qui calcule les résultats repris dans le rapport Word.' }
    ]
  },
  {
    icon: 'fileText', court: 'Rapport', titre: 'Rapport Word', quand: 'Au bureau, une fois la feuille complétée',
    points: [
      { t: 'Ouvrir l’écran Rapport Word', ou: ['Mission', 'Rapport Word'],
        d: 'L’écran regroupe les données du dossier Scol@ (n° de dossier, établissement, site accrédité) et la carte Rapport, à part de la préparation.' },
      { t: 'Renseigner la carte Rapport', ou: ['Rapport Word', 'Rapport'],
        d: 'Chrono, contrat, interlocuteur, rédacteur, valideur, agence ; type de rapport (campagne, contrôle périodique…) et agents contrôlés, comme dans le formulaire de la trame.',
        n: 'En 1re campagne : auteur et référence du rapport de stratégie.' },
      { t: 'Campagne et contrôle périodique ensemble', ou: ['Rapport Word', 'Rapport'],
        d: 'Si les deux sont cochés, choisir la partie de chaque GEH (ou de chaque agent) : les résultats et les EPI y sont placés.' },
      { t: 'Générer le rapport', ou: ['Rapport Word', 'Générer le rapport Word'],
        d: 'Joindre la feuille de calcul complétée et enregistrée dans Excel : les tableaux de résultats sont placés en images (réglementaire, hors arrêté, poste fixe, annexe des résultats détaillés).' },
      { t: 'Ce que l’appli remplit',
        d: 'Couverture, pieds de page (n° d’affaire, chrono), période de mission, laboratoires, tableaux des accréditations et des méthodes, EPI par GEH (« Sans objet » à défaut), annexe des tâches (prélèvements réalisés, par ordre chronologique).' },
      { t: 'Ce qui reste à rédiger',
        d: 'Écarts au contrat et à la stratégie, conclusion, commentaires, annexe du diagnostic U, rapport du laboratoire.',
        n: 'À l’ouverture, Word propose de mettre à jour les champs : répondre Oui.' }
    ]
  },
  {
    icon: 'tool', court: 'Outils', titre: 'Fonctions utiles', quand: 'À tout moment',
    ouvrir: { label: 'Ouvrir la base de données', vue: 'db-terrain' },
    points: [
      { t: 'Bouton J-1', ou: ['Mission', 'Prélèvement'],
        d: 'Reprend la valeur du prélèvement de la veille (opérateur, durée d’exposition) sur un prélèvement de plusieurs jours.' },
      { t: 'Fusion de prélèvements', ou: ['Mission', 'Menu ⋯', 'Fusion'],
        d: 'Regroupe les prélèvements d’un même opérateur sur plusieurs jours en un seul prélèvement multi-jours.' },
      { t: 'Base de données', ou: ['Accueil', 'Base de données'],
        d: 'Tous les agents avec débit, support, conservation, VLEP et consignes.' },
      { t: 'Transférer une mission', ou: ['Mission', 'Menu ⋯', 'Envoyer par e-mail'],
        d: 'Envoyer la mission par e-mail ou l’enregistrer en .json pour la reprendre sur un autre appareil (Accueil › Importer une mission).' },
      { t: 'Installer l’appli',
        d: 'Android (Chrome) : menu › Ajouter à l’écran d’accueil. iPhone (Safari) : Partager › Sur l’écran d’accueil.',
        n: 'Installée sur l’écran d’accueil, l’appli protège mieux les missions de l’effacement automatique du navigateur.' },
      { t: 'Mises à jour',
        d: 'Une nouvelle version s’installe au deuxième lancement. La carte « Quoi de neuf » de l’accueil la présente ; l’historique est en bas de ce guide.' }
    ]
  }
];

var GUIDE_FAQ = [
  { t: 'Excel affiche « Risque de sécurité » à l’ouverture de la feuille',
    d: 'Fermer Excel, clic droit sur le fichier › Propriétés › cocher « Débloquer » › OK, puis rouvrir le fichier.' },
  { t: 'Un prélèvement prévu n’a pas pu être fait',
    d: 'Dans le prélèvement, « Non réalisé ». Il sort de la feuille de calcul, du rapport et des échantillons ; « Annuler » le remet à faire.' },
  { t: 'Il faut ajouter un GEH ou un agent après validation',
    d: 'Repasser la mission en préparation : la saisie terrain déjà faite est conservée. Un GEH peut aussi s’ajouter depuis le menu ⋯ de la mission.' },
  { t: 'La réf. du blanc n’apparaît pas dans la feuille de calcul',
    d: 'Le blanc doit porter le même agent chimique et le même n° de lot que l’échantillon. La colonne « Blanc associé » de la liste des échantillons et les alertes à la génération de la feuille montrent les échantillons concernés ; corriger le lot sous la réf. de l’échantillon ou dans Échantillons › « N° de lot… ».' },
  { t: 'Le rapport Word n’a pas les résultats',
    d: 'La feuille de calcul jointe doit avoir été enregistrée dans Excel après la saisie des résultats du laboratoire.' },
  { t: 'L’appli n’affiche pas la dernière version',
    d: 'Fermer complètement l’appli puis la rouvrir : la nouvelle version s’installe au deuxième lancement.' },
  { t: 'Protéger les missions en cours',
    d: 'Installer l’appli sur l’écran d’accueil, ne pas utiliser la navigation privée ni vider les données du navigateur, et enregistrer le .json de la mission (menu ⋯) avant toute manipulation.' }
];

// --- Recherche : comparaison sans accents ni majuscules ---
function guideNorm(s) {
  return String(s || '').split('').map(function (c) { return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || c; }).join('');
}
function guideSurligne(texte, q) {
  if (!q) return escapeHtml(texte);
  var n = guideNorm(texte), nq = guideNorm(q), out = '', i = 0, k;
  while ((k = n.indexOf(nq, i)) !== -1) {
    out += escapeHtml(texte.slice(i, k)) + '<mark>' + escapeHtml(texte.slice(k, k + nq.length)) + '</mark>';
    i = k + nq.length;
  }
  return out + escapeHtml(texte.slice(i));
}

function guidePoint(p, id, num, ouvert, q) {
  var h = '<div class="guide-point' + (ouvert ? ' ouvert' : '') + '">';
  h += '<button class="guide-point-tete" onclick="guideBasculer(\'' + id + '\')">';
  h += '<span class="guide-point-num">' + num + '</span>';
  h += '<span class="guide-point-titre">' + guideSurligne(p.t, q) + '</span>';
  h += '<span class="guide-chevron">' + ICONS.chevronRight + '</span></button>';
  if (ouvert) {
    h += '<div class="guide-point-corps">';
    if (p.ou) h += '<div class="guide-chemin">' + p.ou.map(function (x) { return '<span>' + escapeHtml(x) + '</span>'; }).join('<i>›</i>') + '</div>';
    h += '<p>' + guideSurligne(p.d, q) + '</p>';
    if (p.n) h += '<div class="guide-note">' + guideSurligne(p.n, q) + '</div>';
    h += '</div>';
  }
  return h + '</div>';
}

function guideCorps() {
  var q = (state.guideQ || '').trim();
  var h = '';
  if (q.length >= 2) {
    var nq = guideNorm(q), n = 0;
    GUIDE_PHASES.forEach(function (ph, pi) {
      var trouves = ph.points.filter(function (p) { return guideNorm(p.t + ' ' + p.d + ' ' + (p.n || '') + ' ' + (p.ou || []).join(' ')).indexOf(nq) !== -1; });
      if (!trouves.length) return;
      h += '<div class="section-title">' + (pi + 1) + ' · ' + escapeHtml(ph.titre) + '</div><div class="guide-liste">';
      trouves.forEach(function (p) { n++; h += guidePoint(p, 'r' + n, (pi + 1) + '.' + (ph.points.indexOf(p) + 1), true, q); });
      h += '</div>';
    });
    var faq = GUIDE_FAQ.filter(function (f) { return guideNorm(f.t + ' ' + f.d).indexOf(nq) !== -1; });
    if (faq.length) {
      h += '<div class="section-title">Questions fréquentes</div><div class="guide-liste">';
      faq.forEach(function (f) { n++; h += guidePoint(f, 'r' + n, '?', true, q); });
      h += '</div>';
    }
    if (!n) h += '<div class="card guide-vide">Aucun résultat pour « ' + escapeHtml(q) + ' ».</div>';
    return h;
  }

  var pi = state.guidePhase || 0, ph = GUIDE_PHASES[pi];
  h += '<div class="guide-parcours">';
  GUIDE_PHASES.forEach(function (x, i) {
    h += '<button class="guide-etape' + (i === pi ? ' active' : '') + (i < pi ? ' passee' : '') + '" onclick="guideAllerPhase(' + i + ')">';
    h += '<span class="guide-etape-num">' + (i + 1) + '</span><span class="guide-etape-label">' + x.court + '</span></button>';
  });
  h += '</div>';

  h += '<div class="card guide-phase">';
  h += '<div class="guide-phase-tete"><div class="nav-icon">' + getIcon(ph.icon) + '</div><div style="flex:1;min-width:0;">';
  h += '<div class="guide-phase-quand">Étape ' + (pi + 1) + ' sur ' + GUIDE_PHASES.length + ' · ' + escapeHtml(ph.quand) + '</div>';
  h += '<div class="guide-phase-titre">' + escapeHtml(ph.titre) + '</div></div></div>';
  h += '<div class="guide-liste">';
  ph.points.forEach(function (p, i) { var id = pi + '-' + i; h += guidePoint(p, id, (pi + 1) + '.' + (i + 1), state.guideOuvert === id, ''); });
  h += '</div>';
  if (ph.ouvrir) h += '<button class="btn btn-gray mt-12" onclick="state.view=\'' + ph.ouvrir.vue + '\';render();window.scrollTo(0,0);">' + ph.ouvrir.label + ICONS.arrowRight + '</button>';
  h += '<div class="guide-suite">';
  h += pi > 0 ? '<button class="btn btn-gray" onclick="guideAllerPhase(' + (pi - 1) + ')">' + ICONS.arrowLeft + ' ' + GUIDE_PHASES[pi - 1].court + '</button>' : '<span></span>';
  h += pi < GUIDE_PHASES.length - 1 ? '<button class="btn btn-primary" onclick="guideAllerPhase(' + (pi + 1) + ')">' + GUIDE_PHASES[pi + 1].court + ' ' + ICONS.arrowRight + '</button>' : '<span></span>';
  h += '</div></div>';

  h += '<div class="section-title">Questions fréquentes</div><div class="card guide-phase"><div class="guide-liste">';
  GUIDE_FAQ.forEach(function (f, i) { var id = 'f' + i; h += guidePoint(f, id, '?', state.guideOuvert === id, ''); });
  h += '</div></div>';
  return h;
}

function renderTutoriel() {
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.book + ' Guide d’utilisation</h1>';
  h += '<p class="subtitle">Le déroulé d’une mission VLEP, de la préparation au rapport</p>';
  h += '<div class="search-box mt-12"><span class="search-icon">' + ICONS.search + '</span>';
  h += '<input class="search-input" type="search" id="guide-recherche" placeholder="Rechercher : débloquer, poste fixe…" value="' + escapeHtml(state.guideQ || '') + '" oninput="guideRecherche(this.value)"></div></div>';
  h += '<div id="guide-corps">' + guideCorps() + '</div>';
  h += renderNouveautesHistorique();
  return h;
}

function guideRafraichir() { var el = document.getElementById('guide-corps'); if (el) el.innerHTML = guideCorps(); }
function guideRecherche(v) { state.guideQ = v; guideRafraichir(); }
function guideBasculer(id) {
  if (id.charAt(0) === 'r') return;
  state.guideOuvert = state.guideOuvert === id ? null : id;
  guideRafraichir();
}
function guideAllerPhase(i) {
  state.guidePhase = i; state.guideOuvert = null;
  guideRafraichir();
  var el = document.getElementById('guide-corps'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

console.log('✓ Guide chargé');
