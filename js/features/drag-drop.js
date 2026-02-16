/*
 * VLEP Mission v3.8 - drag-drop.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module drag & drop pour réorganiser l'ordre des prélèvements
 */

// État du drag & drop
var dragDropState={
  draggedPrelId:null,
  draggedGehId:null,
  dropTargetPrelId:null,
  enabled:false
};

// Activer le mode réorganisation
function enableDragDropMode(){
  dragDropState.enabled=true;
  render();
}

// Désactiver le mode réorganisation
function disableDragDropMode(){
  dragDropState.enabled=false;
  dragDropState.draggedPrelId=null;
  dragDropState.draggedGehId=null;
  dragDropState.dropTargetPrelId=null;
  render();
}

// Rendu de la vue mission avec drag & drop
function renderTerrainMissionWithDragDrop(){
  // Cette fonction modifie le rendu standard pour ajouter les attributs drag & drop
  var m=getCurrentMission();
  if(!m)return'';
  
  var h='';
  
  // Bouton pour activer/désactiver le mode réorganisation
  if(!dragDropState.enabled){
    h+='<button class="btn btn-gray btn-small" onclick="enableDragDropMode();">🔄 Réorganiser l\'ordre</button>';
  }else{
    h+='<div class="info-box info-box-warning mb-12"><p><strong>Mode réorganisation actif</strong></p><p>Glissez-déposez les prélèvements pour changer leur ordre</p></div>';
    h+='<div class="row mb-12"><button class="btn btn-success" onclick="disableDragDropMode();">✓ Terminer</button></div>';
  }
  
  return h;
}

// Ajouter les attributs draggable aux prélèvements
function makePrelDraggable(prelId,gehId){
  if(!dragDropState.enabled)return'';
  
  return ' draggable="true" ondragstart="handlePrelDragStart(event,'+prelId+','+gehId+')" ondragend="handlePrelDragEnd(event)" ondragover="handlePrelDragOver(event,'+prelId+')" ondrop="handlePrelDrop(event,'+prelId+','+gehId+')" ';
}

// Handler début du drag
function handlePrelDragStart(event,prelId,gehId){
  dragDropState.draggedPrelId=prelId;
  dragDropState.draggedGehId=gehId;
  event.target.style.opacity='0.5';
  event.dataTransfer.effectAllowed='move';
  event.dataTransfer.setData('text/html',event.target.innerHTML);
}

// Handler fin du drag
function handlePrelDragEnd(event){
  event.target.style.opacity='1';
  dragDropState.draggedPrelId=null;
  dragDropState.draggedGehId=null;
  dragDropState.dropTargetPrelId=null;
  
  // Retirer les classes de highlight
  var items=document.querySelectorAll('.prel-item');
  items.forEach(function(item){
    item.classList.remove('drag-over');
  });
}

// Handler drag over
function handlePrelDragOver(event,prelId){
  if(event.preventDefault){
    event.preventDefault();
  }
  
  event.dataTransfer.dropEffect='move';
  
  // Highlight de la zone de drop
  var target=event.target;
  while(target&&!target.classList.contains('prel-item')){
    target=target.parentElement;
  }
  
  if(target){
    target.classList.add('drag-over');
    dragDropState.dropTargetPrelId=prelId;
  }
  
  return false;
}

// Handler drop
function handlePrelDrop(event,targetPrelId,targetGehId){
  if(event.stopPropagation){
    event.stopPropagation();
  }
  
  event.preventDefault();
  
  var draggedId=dragDropState.draggedPrelId;
  var draggedGehId=dragDropState.draggedGehId;
  
  if(!draggedId||draggedId===targetPrelId)return false;
  
  // Vérifier que c'est le même GEH
  if(draggedGehId!==targetGehId){
    alert('Impossible de déplacer entre différents GEH');
    return false;
  }
  
  // Réorganiser les prélèvements
  var m=getCurrentMission();
  if(!m)return false;
  
  var prelList=m.prelevements.filter(function(p){return p.gehId===targetGehId;});
  var draggedPrel=m.prelevements.find(function(p){return p.id===draggedId;});
  var targetPrel=m.prelevements.find(function(p){return p.id===targetPrelId;});
  
  if(!draggedPrel||!targetPrel)return false;
  
  // Trouver les indices dans la liste complète
  var draggedIdx=m.prelevements.indexOf(draggedPrel);
  var targetIdx=m.prelevements.indexOf(targetPrel);
  
  // Retirer l'élément dragué
  m.prelevements.splice(draggedIdx,1);
  
  // Réinsérer à la nouvelle position
  var newTargetIdx=m.prelevements.indexOf(targetPrel);
  m.prelevements.splice(newTargetIdx,0,draggedPrel);
  
  // Sauvegarder
  saveData('vlep_missions_v3',state.missions);
  
  // Re-render
  render();
  
  return false;
}

// CSS pour le drag & drop (à ajouter au main.css)
/*
.prel-item.drag-over {
  border-top: 3px solid var(--primary);
  margin-top: 2px;
}

.prel-item[draggable="true"] {
  cursor: move;
}

.prel-item[draggable="true"]:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
*/

// Modifier la fonction de rendu des prélèvements pour intégrer le drag & drop
function renderPrelItemWithDragDrop(prel,isSelected,mc){
  var allDone=prel.subPrelevements.every(function(s){return s.completed;});
  var agentNames=prel.agents&&prel.agents.length>0?prel.agents.map(function(a){return escapeHtml(a.name);}).join(' + '):'Agent inconnu';
  var isCoPrel=prel.isCoPrelevement===true;
  var badgeText='';
  
  if(prel.agents.length>1){
    if(isCoPrel)badgeText='<span style="background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:3px;">📦 Même support ×'+prel.agents.length+'</span>';
    else badgeText='<span style="background:var(--primary-pale);color:var(--primary);padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:3px;">🔗 Fusion ×'+prel.agents.length+'</span>';
  }
  
  var dragAttrs=makePrelDraggable(prel.id,prel.gehId);
  
  var h='<div class="prel-item '+(isSelected?'selected':'')+'" style="background:'+lightenColor(mc,0.85)+';" '+dragAttrs+'>';
  
  if(state.fusionMode){
    h+='<div class="prel-checkbox '+(isSelected?'checked':'')+'" onclick="toggleFusionSelect('+prel.id+');">✓</div>';
  }else if(dragDropState.enabled){
    h+='<div class="prel-status" style="cursor:move;">⋮⋮</div>';
  }else{
    h+='<div class="prel-status '+(allDone?'done':'pending')+'" onclick="openPrel('+prel.id+');">✓</div>';
  }
  
  var clickAction=dragDropState.enabled?'':'onclick="'+(state.fusionMode?'toggleFusionSelect('+prel.id+');':'openPrel('+prel.id+');')+'"';
  
  h+='<div class="prel-content" '+clickAction+'><div class="prel-title" style="color:'+mc+';">'+agentNames+'</div><div class="prel-subtitle">'+prel.type+' • '+prel.subPrelevements.length+' sous-prél. '+badgeText+(prel.isReglementaire?'<span class="prel-reg-badge">Régl.</span>':'<span class="prel-nonreg-badge">Non-régl.</span>')+'</div></div>';
  
  if(!state.fusionMode&&!dragDropState.enabled){
    if(isCoPrel)h+='<button class="btn btn-gray btn-icon" style="width:24px;height:24px;font-size:11px;margin-right:2px;" onclick="event.stopPropagation();deCoprelevement('+prel.id+');" title="Dé-co-prélever">📦</button>';
    else if(prel.agents&&prel.agents.length>1)h+='<button class="btn btn-gray btn-icon" style="width:24px;height:24px;font-size:11px;margin-right:2px;" onclick="event.stopPropagation();defusionPrel('+prel.id+');" title="Défusionner">'+ICONS.merge+'</button>';
    h+='<button class="btn btn-danger btn-icon" style="width:24px;height:24px;font-size:11px;margin-right:2px;" onclick="event.stopPropagation();deletePrelTerrain('+prel.id+');">'+ICONS.trash+'</button>';
  }
  
  if(!dragDropState.enabled){
    h+='<div class="prel-arrow" '+clickAction+'>'+ICONS.arrowRight+'</div>';
  }
  
  h+='</div>';
  
  return h;
}
