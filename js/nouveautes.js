// nouveautes.js - « Quoi de neuf dans l'appli » (même principe que l'appli Aération)
// © 2025 Quentin THOMAS
//
// Après une mise à jour, une carte sur l'accueil résume ce qui a changé ; « J'ai compris » la masque
// jusqu'à la version suivante. L'historique complet est en bas du Tutoriel.
// À CHAQUE NOUVELLE FONCTION : ajouter une entrée en tête de NOUVEAUTES, monter APP_VERSION,
// et monter VERSION / CACHE_NAME dans sw.js à la même valeur.

var APP_VERSION = '2.46';

// Du plus récent au plus ancien. Une entrée par version publiée aux techniciens.
var NOUVEAUTES = [
  { version: '2.46', date: '23/10/2026', items: [
    'Scol@ par GEH (écran de la mission, sous « Conditions ambiantes ») : tâche, métier, procédé, lieu, ventilation et captage saisis une fois pour le GEH et recopiés dans tous ses prélèvements, y compris ceux ajoutés ensuite. Un prélèvement changé à la main garde sa valeur (« Appliquer à tous » pour l’aligner). La ligne indique les GEH encore à compléter.',
    'Préparation : « Reprendre la feuille de calcul de l’an dernier ». Choisissez la feuille de calcul (.xlsm) de la campagne précédente : GEH, agents, 8h / CT, réglementaire ou non, nombre de prélèvements, EPI, durée d’exposition et Scol@ (tâche, métier, procédé, lieu, ventilation, captage) sont repris, comme « Extraire les données de l’ancien fichier » de la feuille. Le Scol@ rempli sur un seul bloc d’un GEH est recopié sur ses autres prélèvements. Rien des mesures (opérateurs, pompes, heures, débits, réf.) n’est repris.',
    'Feuille de calcul : plus de colonnes vides. Les blocs du modèle non utilisés (« 2 - intitulé », prélèvements en trop) sont retirés, et un jour prévu sans aucune saisie (ni heures, ni réf., ni débit) n’est plus écrit : il est signalé à l’export (à marquer « Non réalisé » s’il n’a pas été fait).',
    'Saisie Scol@ dans Excel : les onglets modèles vierges (« Tube Reg », « Cassette »…) ne sont plus proposés, ils sont supprimés comme le fait le formulaire « Ajouter » de la feuille.',
    'Rapport Word : les jours sans référence d’échantillon d’un GEH ne sont plus repris dans les tableaux de résultats.'
  ] },
  { version: '2.45', date: '23/10/2026', items: [
    'Dictée vocale des observations sur Android : les phrases ne se répètent plus (Chrome sur Android envoie des morceaux cumulés, désormais fusionnés) ; « virgule » et « point » collés au mot précédent.',
    'Même support : la fenêtre coche d’office les agents que la base place sur le même support, et prévient si un agent coché a un autre support dans la base.',
    'Ajouter un prélèvement sur le terrain : statut réglementaire tiré de la base et nombre de prélèvements au choix (1, 2 ou 3), comme en préparation.',
    'Conditions ambiantes : un bouton ajoute d’un coup les jours de prélèvement qui n’ont pas encore de conditions (avant : toujours la date du jour).',
    'Affectations : « Régl. / Non régl. » et « 3 prél. » écrits en clair, le GEH sur sa ligne.',
    'Nettoyage : envoi par QR code (jamais branché) et ancien écran d’import de la base retirés ; icônes de l’appli à la place des emojis (chrono CT, avertissements).'
  ] },
  { version: '2.44', date: '23/10/2026', items: [
    'Regrouper des prélèvements (menu ⋯, remplace « Fusionner intelligemment » et « Fusion manuelle ») : par GEH, les agents d’un même support (un seul support par jour, « Même support » coché d’office) puis « tout le GEH » quand c’est sans risque ; « Tout regrouper » applique en une fois les propositions sûres, après une liste à cocher. Saisies en conflit et jours différents sont affichés avant de valider ; rien n’est perdu : les jours en plus sont ajoutés, les champs vides complétés.',
    'Liste de la mission : un prélèvement regroupé indique « 1 support (tube de charbon actif) » ou « 2 supports », avec un bouton « Séparer » en clair. « Fusionner le fichier d’un collègue » devient « Réunir le fichier d’un collègue ».',
    'Prépa automatique : un poste fixe n’est jamais réglementaire (hors accréditation) ; l’aperçu compte tous les agents d’une ligne (3 agents × 3 prélèvements = 9).',
    'Corrections : carte « Quoi de neuf » limitée aux 5 dernières nouveautés (le reste dans l’historique du guide) ; dates en jj/mm/aaaa dans Échantillons ; « CT » précisé dans le bandeau « À vérifier » ; un poste fixe ne coche plus « Hors arrêté » dans le rapport.',
    'Date du prélèvement : remplie à la première saisie (opérateur, plage, débit, chronomètre, validation…) et non plus à la simple ouverture du prélèvement ; un prélèvement consulté au bureau ne prend plus la date du jour.'
  ] },
  { version: '2.43', date: '23/10/2026', items: [
    'Prépa automatique, format 3 : coller l’onglet « Plan d’échantillonnage » de l’annexe (Jour | Agents | GEH | Nb | Type | Plage horaire). GEH écrit en numéro, en nom ou « 1 - Nom » ; partie « Postes fixes » reconnue.',
    'Les jours prévus (J1, J2…) et la plage horaire sont rappelés sur chaque prélèvement, et la fiche supports donne les pompes, CIP10 et analyseurs par jour.',
    'Prépa automatique : le nombre de prélèvements est lu tel quel (un « 2 » devenait 3) ; un même agent sur un même GEH écrit sur deux lignes additionne ses prélèvements au lieu d’écraser la première ligne.'
  ] },
  { version: '2.42', date: '23/10/2026', items: [
    'Fiche supports (préparation, et menu ⋯ sur le terrain) : par polluant, le support, sa réf. et son code, le laboratoire, les débits, la conservation et le commentaire de la base ; puis les supports à prévoir (échantillons + blancs, 2 blancs par lot de 15 en gravimétrie) et les prélèvements à équiper (pompes, CIP10, analyseurs). Une aide à la préparation, pas un bon de commande : imprimable, avec un commentaire libre (marge, stock…).',
    'La fiche indique les agents qui peuvent partager un même support : les regrouper d’abord (fusion puis « Même support ») réduit le nombre de supports.'
  ] },
  { version: '2.41', date: '23/10/2026', items: [
    'Rapport Word, tableaux de résultats : le bloc vierge « 2 - intitulé » d’un onglet à un seul GEH et les prélèvements non utilisés ne sont plus repris ; dans un tableau multi-agents, les agents non utilisés (n°3, n°4…) sont masqués, comme le fait la macro de la feuille.',
    'Rapport Word : « Agents contrôlés » précochés d’après chaque prélèvement (réglementaire ou non) ; un agent à VLEP réglementaire mesuré hors contrôle réglementaire coche « Hors arrêté », pour que ses résultats aient leur partie.',
    'Rapport Word : le titre « 3. » resté vide (partie évaluation initiale retirée) n’apparaît plus dans le rapport ni dans le sommaire.',
    'Fusion du fichier d’un collègue : une mission d’une ancienne version (jours de prélèvement sans identifiant) est réunie jour par jour, sans mélanger les jours.'
  ] },
  { version: '2.40', date: '22/10/2026', items: [
    'À plusieurs sur une mission : menu ⋯ › « Fusionner le fichier d’un collègue » (proposé aussi quand on importe une mission déjà présente). Les saisies des deux téléphones sont réunies jour par jour, avec les blancs, les conditions ambiantes et les prélèvements ajoutés ; un jour saisi des deux côtés garde la saisie la plus récente et est signalé dans le bilan.',
    'Mission : bandeau « À vérifier » en haut de la page (replié, touchez pour l’ouvrir). Il liste les oublis des prélèvements commencés : prélèvement arrêté mais non validé (ce qui manque), débit hors tolérance, conditions ambiantes du jour, blancs manquants, réf. en double, n° de lot oublié. Chaque ligne ouvre l’écran à corriger ; rien n’est bloquant.',
    'Prélèvement non réalisé : choix « Écart à la stratégie », « Écart au contrat » ou « Aucun », avec un champ de justification. Le rapport Word rédige la phrase dans le paragraphe d’écarts correspondant, justification comprise (à relire).',
    'Prépa automatique (devis) : les agents écrits sur deux lignes dans l’annexe, comme « Butanol (Toxilabo) » ou les agents « (support PVC) », sont maintenant reconnus dans la base.',
    'Gravimétrie (poussières inhalables, alvéolaires, brouillard d’huile…) : 2 blancs attendus par lot. Échantillons signale les lots incomplets, avec un bouton « Ajouter le 2e blanc du lot » (agent, lot et date déjà remplis, seule la réf. reste à taper) ; rappel aussi à la génération de la feuille de calcul.',
    'Blanc terrain : les agents de la mission se choisissent en un toucher, et « Tout le support » ajoute d’un coup les agents prélevés sur le même support (même réf.). Pour ces agents fusionnés, le blanc saisi avec l’un d’eux est maintenant repris comme témoin de tout le support dans la feuille de calcul.'
  ] },
  { version: '2.39', date: '21/10/2026', items: [
    'Rapport Word : « Agents contrôlés » et « Mesures à poste fixe » cochés d’après la mission (modifiables) ; les champs de la carte Rapport restés vides sont rappelés après la génération.',
    'Fusion de prélèvements : avant de fusionner, l’appli liste les saisies qui ne seraient pas reprises (jour en trop, autre opérateur, autres plages, observation) et demande confirmation.',
    'Saisie rapide : statut réglementaire tiré de la base, comme en préparation ; messages corrigés (icône affichée en code, puces « ? »).'
  ] },
  { version: '2.38', date: '21/10/2026', items: [
    'Feuille de calcul : nouvelles alertes après la génération — jours sans conditions ambiantes, réf. d’échantillon utilisée sur plusieurs supports (un seul partirait dans la commande Eurofins), prélèvements 8 h sans durée d’exposition.',
    'Réf. d’échantillon déjà utilisée sur un autre support : signalée sous le champ.',
    'Valider un prélèvement demande la réf. de l’échantillon (comme sur les supports fractionnés). La durée d’exposition n’est jamais exigée : un rappel s’affiche, elle peut être complétée au bureau.',
    'L’ancien export « Activité (Word) » du menu ⋯ est retiré (repris par l’annexe des tâches du rapport Word) : l’appli s’ouvre plus vite.'
  ] },
  { version: '2.37', date: '21/10/2026', items: [
    'Guide : il s’ouvre sur un sommaire des cinq catégories (les quatre étapes de la mission, puis les fonctions utilisables à tout moment) ; chaque point mène directement à son explication.'
  ] },
  { version: '2.36', date: '21/10/2026', items: [
    'N° de lot : les lots déjà saisis sur la mission sont proposés en liste (échantillon, blanc, lot en une fois) et le bouton J-1 reprend celui de la veille.',
    'Feuille de calcul : alerte avant le téléchargement pour les échantillons sans blanc du même agent et du même lot (réf. du témoin vide), par agent et par lot.',
    'Liste des échantillons : colonne « Blanc associé » à la place du code analytique (la commande au laboratoire se fait par l’onglet Eurofins de la feuille de calcul).'
  ] },
  { version: '2.35', date: '21/10/2026', items: [
    'Blancs terrain : la réf. du blanc n’est reportée dans la feuille de calcul (« réf. du témoin ») que sur les échantillons du même agent chimique et du même n° de lot.',
    'Champ « N° de lot » sous la réf. de chaque échantillon, avec le blanc associé affiché dessous ; le lot est repris dans la feuille de calcul et la demande d’analyse Eurofins.',
    'Échantillons › « N° de lot… » : un lot saisi une fois s’applique à plusieurs échantillons et/ou blancs cochés (raccourcis : tout, sans lot, par agent). La liste des blancs indique sur combien d’échantillons chaque réf. sera reportée.'
  ] },
  { version: '2.34', date: '21/10/2026', items: [
    'Guide d’utilisation refait : parcours en cinq étapes (préparation, terrain, feuille de calcul, rapport, outils), chaque point se déplie avec son chemin dans l’appli, recherche dans tout le guide et questions fréquentes.'
  ] },
  { version: '2.33', date: '16/10/2026', items: [
    'Feuille de calcul, onglets hors arrêté : le GEH (« 3 - Soudure TIG ») est écrit dans la ligne « Prélèvement n° », repris dans le tableau RESULTATS et donc dans le rapport.'
  ] },
  { version: '2.32', date: '16/10/2026', items: [
    'Feuille de calcul vérifiée champ par champ contre la feuille Bruker remplie à la main : toutes les saisies et tous les calculs (durées, débits, volumes, VLEP, FPA) concordent, aucune formule du modèle n’est écrasée.',
    'Date de prélèvement écrite en vraie date Excel (jj/mm/aa du modèle) au lieu d’un texte.',
    'Alerte à l’export si le type de débitmètre (massique ou piston / lame de savon) n’est pas choisi dans les infos de la mission : les débits et le volume en dépendent.'
  ] },
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
  // après une longue période sans mise à jour, la carte ne repousse pas l'accueil : les 5 plus récentes, le reste
  // dans l'historique du guide
  var MAX = 5, reste = lignes.length - MAX;
  lignes.slice(0, MAX).forEach(function (t) { h += '<li>' + escapeHtml(t) + '</li>'; });
  h += '</ul>';
  if (reste > 0) h += '<button class="btn btn-gray btn-small" onclick="dismissNouveautes();state.view=\'tutoriel\';state.guidePhase=null;state.guideQ=\'\';render();setTimeout(function(){var e=document.querySelector(\'.section-title.mt-12:last-of-type\');if(e)e.scrollIntoView();},50);">+ ' + reste + ' autre' + (reste > 1 ? 's' : '') + ' nouveauté' + (reste > 1 ? 's' : '') + ' (historique du guide)</button>';
  h += '<button class="btn btn-gray btn-small" onclick="dismissNouveautes();">J’ai compris</button></div>';
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
