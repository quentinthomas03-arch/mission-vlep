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
    case'db-full':h=renderDbFull();break;
    case'liste-echantillons':h=renderListeEchantillons();break;
    case'quick-entry':h=renderQuickEntry();break;
    default:h=renderHome();
  }
  document.getElementById('app').innerHTML=h;
  if(state.view==='db-terrain')setTimeout(updateDbResults,50);
  if(state.view==='quick-entry')setTimeout(function(){var i=document.getElementById('quick-agent-search');if(i)i.focus();},50);
}


// === SPLASH SCREEN DISMISS ===
setTimeout(function(){
  var splash=document.getElementById('splash');
  if(splash){
    splash.classList.add('fade-out');
    setTimeout(function(){splash.remove();},600);
  }
},1800);

// ═══════════════════════════════════════════════════════════
// PWA - Service Worker Registration & Update Management
// ═══════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('[PWA] Service Worker enregistré');
      
      // Vérifier les mises à jour toutes les 30 minutes
      setInterval(() => {
        registration.update();
        console.log('[PWA] Vérification mise à jour...');
      }, 30 * 60 * 1000);
      
      // Détecter une nouvelle version disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // Afficher notification de mise à jour
            if (confirm('🔄 Nouvelle version de VLEP Mission disponible !\n\nVoulez-vous recharger pour mettre à jour ?')) {
              window.location.reload();
            }
          }
        });
      });
    }).catch(err => {
      console.log('[PWA] Erreur SW:', err);
    });
  });
}

console.log('✓ App chargé');
