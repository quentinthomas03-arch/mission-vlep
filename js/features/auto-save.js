/*
 * VLEP Mission v3.8 - auto-save.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module d'auto-sauvegarde visible avec indicateur et toast
 */

// État de l'auto-sauvegarde
var autoSaveState={
  lastSave:null,
  saveInterval:null,
  pendingChanges:false,
  saveInProgress:false
};

// Initialiser l'auto-sauvegarde
function initAutoSave(){
  // Sauvegarder toutes les 30 secondes
  autoSaveState.saveInterval=setInterval(function(){
    if(autoSaveState.pendingChanges&&!autoSaveState.saveInProgress){
      performAutoSave();
    }
  },30000);
  
  // Sauvegarder avant de quitter la page
  window.addEventListener('beforeunload',function(){
    if(autoSaveState.pendingChanges){
      performAutoSave();
    }
  });
  
  // Afficher l'indicateur
  renderAutoSaveIndicator();
}

// Marquer qu'il y a des changements non sauvegardés
function markPendingChanges(){
  autoSaveState.pendingChanges=true;
  renderAutoSaveIndicator();
}

// Effectuer la sauvegarde automatique
function performAutoSave(){
  autoSaveState.saveInProgress=true;
  autoSaveState.pendingChanges=false;
  
  try{
    // Sauvegarder dans localStorage
    localStorage.setItem('vlep_missions_v3',JSON.stringify(state.missions));
    
    // Mettre à jour le timestamp
    autoSaveState.lastSave=new Date();
    autoSaveState.saveInProgress=false;
    
    // Afficher toast de confirmation
    showSaveToast();
    
    // Mettre à jour l'indicateur
    renderAutoSaveIndicator();
    
  }catch(err){
    console.error('Erreur auto-sauvegarde:',err);
    autoSaveState.saveInProgress=false;
    showSaveToast(true); // Erreur
  }
}

// Afficher le toast de sauvegarde
function showSaveToast(error){
  var existing=document.getElementById('save-toast');
  if(existing)existing.remove();
  
  var toast=document.createElement('div');
  toast.id='save-toast';
  toast.className='save-toast '+(error?'error':'success');
  toast.innerHTML=error?'❌ Erreur de sauvegarde':'✓ Sauvegarde automatique';
  
  document.body.appendChild(toast);
  
  // Retirer après 2 secondes
  setTimeout(function(){
    toast.classList.add('fade-out');
    setTimeout(function(){
      if(toast.parentNode)toast.parentNode.removeChild(toast);
    },300);
  },2000);
}

// Rendu de l'indicateur d'auto-sauvegarde
function renderAutoSaveIndicator(){
  var existing=document.getElementById('auto-save-indicator');
  
  // Ne créer l'indicateur que sur les vues terrain
  var terrainViews=['terrain-list','terrain-mission','terrain-prel','conditions','liste-echantillons','quick-entry'];
  if(terrainViews.indexOf(state.view)===-1){
    if(existing)existing.remove();
    return;
  }
  
  if(!existing){
    existing=document.createElement('div');
    existing.id='auto-save-indicator';
    existing.className='auto-save-indicator';
    document.body.appendChild(existing);
  }
  
  var status='';
  var statusClass='';
  
  if(autoSaveState.saveInProgress){
    status='💾 Sauvegarde...';
    statusClass='saving';
  }else if(autoSaveState.pendingChanges){
    status='⏳ Non sauvegardé';
    statusClass='pending';
  }else if(autoSaveState.lastSave){
    var elapsed=Math.floor((Date.now()-autoSaveState.lastSave.getTime())/1000);
    if(elapsed<60){
      status='✓ Sauvegardé il y a '+elapsed+'s';
    }else{
      var minutes=Math.floor(elapsed/60);
      status='✓ Sauvegardé il y a '+minutes+'min';
    }
    statusClass='saved';
  }else{
    status='💾 Prêt';
    statusClass='ready';
  }
  
  existing.className='auto-save-indicator '+statusClass;
  existing.innerHTML='<span class="save-icon"></span><span class="save-text">'+status+'</span>';
  
  // Cliquer pour forcer la sauvegarde
  existing.onclick=function(){
    if(autoSaveState.pendingChanges){
      performAutoSave();
    }
  };
}

// Mettre à jour périodiquement l'indicateur
setInterval(function(){
  renderAutoSaveIndicator();
},1000);

// Surcharger la fonction saveData pour marquer les changements
var originalSaveData=window.saveData;
window.saveData=function(key,data){
  markPendingChanges();
  if(originalSaveData){
    originalSaveData(key,data);
  }else{
    try{
      localStorage.setItem(key,JSON.stringify(data));
    }catch(e){
      console.error('Save error',e);
    }
  }
};

// CSS pour l'indicateur et le toast (à ajouter au main.css)
/*
.auto-save-indicator {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 998;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.auto-save-indicator.saving {
  background: #fef3c7;
  color: #92400e;
  animation: pulse-save 1s infinite;
}

.auto-save-indicator.pending {
  background: #fed7aa;
  color: #c2410c;
}

.auto-save-indicator.saved {
  background: #d1fae5;
  color: #065f46;
}

.auto-save-indicator.ready {
  background: #e0f2fe;
  color: #0c4a6e;
}

.auto-save-indicator:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

@keyframes pulse-save {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.save-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: #065f46;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  animation: slide-up 0.3s ease-out;
}

.save-toast.error {
  background: #dc2626;
}

.save-toast.fade-out {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
  transition: all 0.3s;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
*/
