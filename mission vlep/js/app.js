/*
 * VLEP Mission v3.8 - app.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module App (point d'entrée) :
 * - loadData() : chargement localStorage + BUILTIN_DB fallback
 * - repairMissions() : migration et réparation des données
 * - restoreTimers() : restauration des chronomètres CT
 * - Splash screen dismiss
 * - PWA Service Worker registration
 */

// ===== CHARGEMENT DES DONNÉES =====
function loadData(){
  try{
    var m=localStorage.getItem('vlep_missions_v3');
    var d=localStorage.getItem('vlep_database');
    if(m)state.missions=JSON.parse(m);
    if(d)state.agentsDB=JSON.parse(d);
    else state.agentsDB=JSON.parse(JSON.stringify(BUILTIN_DB));
    repairMissions();
  }catch(e){
    console.error('[VLEP] Erreur chargement données:',e);
  }
}

// ===== RÉPARATION / MIGRATION DONNÉES =====
function repairMissions(){
  state.missions.forEach(function(m){
    // Initialiser les champs manquants
    if(!m.blancs)m.blancs=[];
    if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
    if(!m.cipAgents)m.cipAgents=[];
    if(!m.agentColors)m.agentColors={};
    if(!m.affectations)m.affectations={};
    if(!m.prelevements)m.prelevements=[];
    // Réparer les prélèvements
    m.prelevements.forEach(function(p){
      if(!p.agents)p.agents=[];
      if(!p.subPrelevements)p.subPrelevements=[];
      p.subPrelevements.forEach(function(sb){
        if(!sb.agentData)sb.agentData={};
        if(!sb.plages)sb.plages=[{debut:'',fin:''}];
        p.agents.forEach(function(a){
          if(!sb.agentData[a.name])sb.agentData[a.name]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
        });
      });
    });
    // Migration : déplacer isReg vers isReg8h et isRegCT
    if(m.affectations){
      for(var an in m.affectations){
        var af=m.affectations[an];
        if(af.gehs){
          for(var gid in af.gehs){
            var gaf=af.gehs[gid];
            var oldIsReg=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:true);
            if(gaf.isReg8h===undefined)gaf.isReg8h=oldIsReg;
            if(gaf.isRegCT===undefined)gaf.isRegCT=oldIsReg;
          }
        }
      }
    }
  });
  saveData('vlep_missions_v3',state.missions);
}

// ===== INITIALISATION =====
loadData();
restoreTimers();
render();

// ===== SPLASH SCREEN DISMISS =====
setTimeout(function(){
  var splash=document.getElementById('splash');
  if(splash){
    splash.classList.add('fade-out');
    setTimeout(function(){splash.remove();},600);
  }
},1800);

// ===== PWA SERVICE WORKER =====
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js').then(function(registration){
      console.log('[PWA] Service Worker enregistré');
      // Vérifier les mises à jour toutes les 30 minutes
      setInterval(function(){
        registration.update();
        console.log('[PWA] Vérification mise à jour...');
      },30*60*1000);
      // Détecter une nouvelle version disponible
      registration.addEventListener('updatefound',function(){
        var newWorker=registration.installing;
        newWorker.addEventListener('statechange',function(){
          if(newWorker.state==='activated'){
            if(confirm('🔄 Nouvelle version de VLEP Mission disponible !\n\nVoulez-vous recharger pour mettre à jour ?')){
              window.location.reload();
            }
          }
        });
      });
    }).catch(function(err){
      console.log('[PWA] Erreur SW:',err);
    });
  });
}
