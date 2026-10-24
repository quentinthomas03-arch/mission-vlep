// app.js - Point d'entrée application
// © 2025 Quentin THOMAS
// Render principal, navigation, initialisation, splash screen

function render(){
  var h='';
  switch(state.view){
    case'home':h=renderHome();break;
    case'prepa-list':h=renderPrepaList();break;
    case'prepa-mission':h=renderPrepaMission();break;
    case'prepa-agents':h=renderPrepaAgents();break;
    case'prepa-affectations':h=renderPrepaAffectations();break;
    case'prepa-geh':h=renderPrepaGeh();break;
    case'terrain-list':h=renderTerrainList();break;
    case'terrain-mission':h=renderTerrainMission();break;
    case'terrain-prel':h=renderTerrainPrel();break;
    case'conditions':h=renderConditions();break;
    case'db-terrain':h=renderDbTerrain();break;
    case'liste-echantillons':h=renderListeEchantillons();break;
    case'rapport-donnees':h=renderRapportDonnees();break;
    case'quick-entry':h=renderQuickEntry();break;
    case'tutoriel':h=renderTutoriel();break;
    case'fiche-supports':h=renderFicheSupports();break;
    case'regroupement':h=renderRegroupement();break;
    case'scola-geh':h=renderScolaGeh();break;
    case'tournee':h=renderTournee();break;
    default:h=renderHome();
  }
  document.getElementById('app').innerHTML=h;
  if(state.view==='prepa-agents'){var src=document.getElementById('search-results-container');if(src)attachSearchResultListeners(src);}
  if(state.view==='quick-entry'){var qsrc=document.getElementById('quick-search-results');if(qsrc)attachQuickSearchListeners(qsrc);setTimeout(function(){var i=document.getElementById('quick-agent-search');if(i)i.focus();},50);}
  if(state.view==='db-terrain')setTimeout(updateDbResults,50);
}


// === SPLASH SCREEN DISMISS ===
// Animation complète à la première ouverture de la journée ; ensuite (l'appli est rouverte souvent sur le terrain)
// le splash ne fait que passer : l'appli est prête en quelques dixièmes de seconde.
(function(){
  var cle='vlep_splash_jour',auj=getTodayDate(),complet=true;
  try{complet=localStorage.getItem(cle)!==auj;localStorage.setItem(cle,auj);}catch(e){}
  var splash=document.getElementById('splash');
  if(splash&&!complet)splash.classList.add('splash-court');
  setTimeout(function(){
    if(!splash)return;
    splash.classList.add('fade-out');
    setTimeout(function(){splash.remove();},complet?600:250);
  },complet?1800:300);
})();

// Stockage persistant : sans lui, Safari (iPhone) peut effacer les données d'un site peu ouvert, missions comprises
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted().then(function (deja) {
    if (!deja) return navigator.storage.persist();
  }).then(function (ok) { if (ok !== undefined) console.log('[Stockage] persistant : ' + ok); }).catch(function () {});
}

// ═══════════════════════════════════════════════════════════
// Mise à jour de l'appli : jamais sous les doigts du technicien
// ═══════════════════════════════════════════════════════════
// Le nouveau service worker prend la main tout de suite, mais le code déjà chargé continue de fonctionner : le
// rechargement attend un moment sûr (accueil sans saisie en cours, ou retour dans l'appli après l'avoir quittée),
// ou le bouton « Mettre à jour » du bandeau. Jamais pendant une dictée. La saisie en cours est validée avant.
var _miseAJourEnAttente = false;
function miseAJourSure() {
  var a = document.activeElement, saisie = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  return !saisie && !(typeof activeDictation !== 'undefined' && activeDictation) && !state.showModal;
}
function appliquerMiseAJour() {
  var a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur(); // « change » : la saisie est enregistrée
  setTimeout(function () { window.location.reload(); }, 50);
}
function miseAJourPrete() {
  if (_miseAJourEnAttente) return;
  _miseAJourEnAttente = true;
  if (state.view === 'home' && miseAJourSure()) { appliquerMiseAJour(); return; }
  var b = document.createElement('div');
  b.id = 'bandeau-maj';
  b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:10px;background:#0c1220;color:white;padding:10px 12px;border-radius:12px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 10px 30px -6px rgba(0,0,0,0.4);';
  b.innerHTML = '<span style="flex:1;">Nouvelle version prête. Vos saisies sont conservées.</span><button type="button" style="background:#00ACE8;color:white;border:none;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer;" onclick="appliquerMiseAJour();">Mettre à jour</button>';
  document.body.appendChild(b);
}
// retour dans l'appli (après l'avoir quittée ou mis le téléphone en veille) : moment sûr pour recharger
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && _miseAJourEnAttente && miseAJourSure()) appliquerMiseAJour();
});

// ═══════════════════════════════════════════════════════════
// PWA - Service Worker Registration & Update Management
// ═══════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('[PWA] Service Worker enregistré');
      
      // Vérifier les mises à jour au démarrage
      registration.update();
      
      // Vérifier les mises à jour toutes les 5 minutes (pour dev)
      // En production, mettre 30 * 60 * 1000 (30 minutes)
      setInterval(() => {
        registration.update();
        console.log('[PWA] Vérification mise à jour...');
      }, 5 * 60 * 1000);
      
      // Détecter une nouvelle version disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] Nouvelle version détectée !');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nouvelle version prête');
            miseAJourPrete();
          }
        });
      });
      
      // Écouter les messages du Service Worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          console.log('[PWA] Message reçu: mise à jour disponible');
        }
      });
      
    }).catch(err => {
      console.log('[PWA] Erreur SW:', err);
    });
  });
}

// === INITIALISATION ===
loadData();
render();

// ═══════════════════════════════════════════════════════════
// Gestion du bouton retour Android (back button)
// ═══════════════════════════════════════════════════════════
window.addEventListener('popstate', function(event) {
  // Empêcher le comportement par défaut (quitter l'app)
  event.preventDefault();
  
  // Navigation dans l'app selon la vue actuelle
  if (state.view === 'home') {
    // Si on est déjà sur l'accueil, on ne fait rien (ou on peut quitter)
    return;
  } else if (state.view.startsWith('prepa-')) {
    // Dans la préparation, retour à la liste des missions
    if (state.view === 'prepa-list') {
      state.view = 'home';
    } else if (state.view === 'prepa-mission') {
      state.view = 'prepa-list';
    } else {
      state.view = 'prepa-mission';
    }
  } else if (state.view.startsWith('terrain-')) {
    // Sur le terrain, retour à la liste
    if (state.view === 'terrain-list') {
      state.view = 'home';
    } else if (state.view === 'terrain-mission') {
      state.view = 'terrain-list';
    } else {
      state.view = 'terrain-mission';
    }
  } else if (state.view === 'conditions' || state.view === 'scola-geh' || state.view === 'tournee' || state.view === 'liste-echantillons' || state.view === 'rapport-donnees') {
    // Depuis conditions ou échantillons, retour à terrain-mission
    state.view = 'terrain-mission';
  } else if (state.view.startsWith('db-') || state.view === 'quick-entry') {
    // Depuis base de données ou saisie rapide, retour à l'accueil
    state.view = 'home';
  } else if (state.view === 'tutoriel') {
    state.view = 'home';
  } else if (state.view === 'regroupement') {
    state.view = 'terrain-mission'; state.reg = null;
  } else if (state.view === 'fiche-supports') {
    state.view = state.ficheSupportsRetour || 'home';
  } else {
    // Par défaut, retour à l'accueil
    state.view = 'home';
  }
  
  render();
});

// Ajouter un état initial dans l'historique pour capturer le bouton retour
history.pushState({view: state.view}, '', '');

console.log('\u2713 App chargé');
