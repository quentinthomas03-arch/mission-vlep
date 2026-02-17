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
            // Nouvelle version disponible et prête
            console.log('[PWA] Nouvelle version prête, rechargement dans 2s...');
            
            // Notification discrète
            var banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#0066b3;color:white;padding:12px;text-align:center;font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
            banner.innerHTML = '🔄 Mise à jour disponible... Rechargement automatique dans 2s';
            document.body.appendChild(banner);
            
            // Rechargement automatique après 2 secondes
            setTimeout(() => {
              window.location.reload();
            }, 2000);
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

console.log('✓ App chargé');
