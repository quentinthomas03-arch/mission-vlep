// terrain.js - Saisie terrain
// © 2025 Quentin THOMAS
// Liste missions, prélèvements, fusion, défusion, timers

function renderTerrainList(){
  var h='<button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button><div class="card"><h1>'+ICONS.clipboard+' Saisie terrain</h1><p class="subtitle">Missions prêtes pour le terrain</p></div>';
  h+='<button class="btn btn-gray mb-12" onclick="openQuickEntry();">'+ICONS.zap+' Saisie rapide (sans prépa)</button>';
  var ml=state.missions.filter(function(m){return m.status==='validee'||m.status==='encours'||m.status==='terminee';});
  if(ml.length===0)h+='<div class="empty-state"><div class="empty-state-icon">'+ICONS.list+'</div><p>Aucune mission validée</p><p style="font-size:13px;margin-top:8px;">Validez d\'abord une mission dans Préparation</p></div>';
  else ml.forEach(function(m){
    var t=0,d=0;
    m.prelevements.forEach(function(p){p.subPrelevements.forEach(function(s){t++;if(s.completed)d++;});});
    var pct=t>0?Math.round(d/t*100):0;
    h+='<div class="mission-card mission-card-'+m.status+'" onclick="goToTerrain('+m.id+');"><div class="mission-title">'+escapeHtml(m.clientSite||'Sans nom')+'<span class="status-badge status-'+m.status+'">'+(m.status==='validee'?'Prête':(m.status==='encours'?'En cours':'Terminée'))+'</span></div><div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;"></div></div><div class="progress-text">'+d+'/'+t+' prélèvements ('+pct+'%)</div></div>';
  });
  return h;
}

function renderTerrainMission(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-list';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'terrain-list\';state.currentMissionId=null;state.missionMenuOpen=false;render();">'+ICONS.arrowLeft+' Missions</button>';
  h+=renderMissionHead(m);
  if(state.fusionMode){
    h+='<div class="info-box info-box-warning mb-12"><p><strong>Fusion manuelle</strong></p><p>Sélectionnez les prélèvements à fusionner (même GEH, même type)</p></div><div class="row mb-12"><button class="btn btn-gray" onclick="cancelFusion();">Annuler</button><button class="btn btn-primary" onclick="doFusion();" '+(state.selectedForFusion.length<2?'disabled':'')+'>Fusionner ('+state.selectedForFusion.length+')</button></div>';
  }
  h+='<div class="row-card" onclick="state.view=\'conditions\';render();">'+ICONS.thermometer+'<span class="row-card-label">Conditions ambiantes</span>'+ICONS.chevronRight+'</div>';
  var byGeh={};
  m.prelevements.forEach(function(p){var k=p.gehId;if(!byGeh[k])byGeh[k]=[];byGeh[k].push(p);});
  m.gehs.filter(function(g){return g.name;}).forEach(function(g){
    var ps=byGeh[g.id]||[];
    var dc=0,tc=0;
    ps.forEach(function(p){p.subPrelevements.forEach(function(s){tc++;if(s.completed)dc++;});});
    var isOpen=state.expandedGeh[g.id];
    h+='<div class="accordion"><div class="accordion-header '+(isOpen?'open':'')+'" onclick="toggleGehAccordion('+g.id+');"><span class="accordion-icon">'+ICONS.chevronRight+'</span><span class="accordion-title">'+g.num+'. '+escapeHtml(g.name)+'</span><span class="accordion-count">'+dc+'/'+tc+'</span><button class="btn btn-danger btn-icon" aria-label="Supprimer le GEH" onclick="event.stopPropagation();deleteGehTerrain('+g.id+');">'+ICONS.trash+'</button><div class="accordion-progress'+(tc&&dc===tc?' done':'')+'"><span style="width:'+(tc?Math.round(dc/tc*100):0)+'%;"></span></div></div><div class="accordion-body '+(isOpen?'open':'')+'">';
    if(ps.length===0){
      h+='<div class="empty-state" style="padding:16px;color:#6b7280;"><p>Aucun prélèvement</p></div>';
    }else{
      ps.forEach(function(p){
        var anyDone=p.subPrelevements.some(function(s){return s.completed;});
        var allDone=p.subPrelevements.every(function(s){return s.completed;});
        var mc=p.agents&&p.agents[0]?p.agents[0].color:'#3b82f6';
        var isSelected=state.selectedForFusion.indexOf(p.id)!==-1;
        var agentNames=p.agents&&p.agents.length>0?p.agents.map(function(a){return escapeHtml(a.name);}).join(' + '):'Agent inconnu';
        h+='<div class="prel-item '+(isSelected?'selected':'')+'" style="--agent-color:'+mc+';">';
        if(state.fusionMode){
          h+='<div class="prel-checkbox '+(isSelected?'checked':'')+'" onclick="toggleFusionSelect('+p.id+');">✓</div>';
        }else{
          h+='<div class="prel-status '+(allDone?'done':'pending')+'" onclick="openPrel('+p.id+');">✓</div>';
        }
        h+='<div class="prel-content" onclick="'+(state.fusionMode?'toggleFusionSelect('+p.id+');':'openPrel('+p.id+');')+'"><div class="prel-title">'+agentNames+'</div><div class="prel-subtitle">'+p.type+' • '+p.subPrelevements.length+' sous-prél. '+(p.isReglementaire?'<span class="prel-reg-badge">Régl.</span>':'<span class="prel-nonreg-badge">Non-régl.</span>')+'</div></div>';
        if(!state.fusionMode){
          if(p.agents&&p.agents.length>1)h+='<button class="btn btn-gray btn-icon" onclick="event.stopPropagation();defusionPrel('+p.id+');" title="Défusionner" aria-label="Défusionner">'+ICONS.merge+'</button>';
          h+='<button class="btn btn-danger btn-icon" onclick="event.stopPropagation();deletePrelTerrain('+p.id+');" aria-label="Supprimer le prélèvement">'+ICONS.trash+'</button>';
        }
        h+='<div class="prel-arrow" onclick="'+(state.fusionMode?'toggleFusionSelect('+p.id+');':'openPrel('+p.id+');')+'">'+ICONS.arrowRight+'</div></div>';
      });
    }
    h+='</div></div>';
  });
  
  if(!state.fusionMode)h+='<button class="add-link" onclick="state.showModal=\'addPrelTerrain\';render();">'+ICONS.plus+' Ajouter un prélèvement</button>';
  // Modals
  if(state.showModal==='addGehTerrain')h+=renderAddGehTerrainModal();
  if(state.showModal==='addPrelTerrain')h+=renderAddPrelTerrainModal();
  if(state.showModal==='smartFusion')h+=renderSmartFusionModal();
  
  return h;
}

function setJustifNb(pid,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){p.justifNb=String(v||'').trim();saveData('vlep_missions_v3',state.missions);}
}

function toggleGehAccordion(gid){state.expandedGeh[gid]=!state.expandedGeh[gid];render();}

// Anneau d'avancement (prélèvements terminés / total), même dessin que l'appli Aération
function missionRingSvg(done,total){
  var r=30,c=2*Math.PI*r,len=total?c*done/total:0;
  return '<svg class="mission-ring" viewBox="0 0 76 76" role="img" aria-label="'+done+' prélèvements terminés sur '+total+'">'+
    '<circle cx="38" cy="38" r="'+r+'" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="7"/>'+
    '<circle cx="38" cy="38" r="'+r+'" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+len.toFixed(1)+' '+(c-len).toFixed(1)+'" transform="rotate(-90 38 38)"/>'+
    '<text x="38" y="40" text-anchor="middle" class="mission-ring-value">'+done+'/'+total+'</text>'+
    '<text x="38" y="53" text-anchor="middle" class="mission-ring-label">terminés</text></svg>';
}

// En-tête de mission : infos, avancement, feuille de calcul et échantillons, le reste dans « ⋯ »
function renderMissionHead(m){
  var t=0,d=0,dates=[];
  m.prelevements.forEach(function(p){p.subPrelevements.forEach(function(s){t++;if(s.completed)d++;if(s.date)dates.push(s.date);});});
  dates.sort();
  var fr=function(x){return x?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):'';};
  var periode=dates.length?(dates[0]===dates[dates.length-1]?fr(dates[0]):fr(dates[0])+' → '+fr(dates[dates.length-1])):'';
  var meta=[periode?'<span>'+ICONS.clock+periode+'</span>':'',m.preleveur?'<span>'+ICONS.user+escapeHtml(m.preleveur)+'</span>':'',m.debitmetre?'<span>'+ICONS.tool+escapeHtml(m.debitmetre)+'</span>':'',m.tachymetre?'<span>'+ICONS.tool+'Tachym. '+escapeHtml(m.tachymetre)+'</span>':''].join('');
  var h='<div class="card mission-head"><div class="mission-hero"><div class="mission-hero-text">';
  h+='<div class="mission-hero-kicker">'+(m.scolaDossier?'Dossier '+escapeHtml(m.scolaDossier):'Mission')+'</div>';
  h+='<h1>'+escapeHtml(m.clientSite||'Sans nom')+'</h1>';
  if(meta)h+='<div class="mission-hero-meta">'+meta+'</div>';
  h+='</div>'+(t?missionRingSvg(d,t):'')+'</div><div class="mission-head-body"><div class="mission-actions">';
  var fc=typeof FC_MODELE_DISPO!=='undefined'&&FC_MODELE_DISPO===true;
  if(fc)h+='<button class="btn btn-primary btn-small" onclick="state.missionMenuOpen=false;exportFeuilleCalcul();">'+ICONS.sheet+' Feuille de calcul</button>';
  h+='<button class="btn btn-primary btn-small" onclick="state.missionMenuOpen=false;state.view=\'rapport-donnees\';render();window.scrollTo(0,0);">'+ICONS.fileText+' Rapport Word</button>';
  h+='<button class="btn '+(fc?'btn-gray':'btn-primary')+' btn-small" onclick="state.missionMenuOpen=false;state.view=\'liste-echantillons\';render();">'+ICONS.list+' Échantillons</button>';
  h+='<button class="btn btn-gray btn-small mission-more-btn'+(state.missionMenuOpen?' active':'')+'" aria-label="Plus d’actions" onclick="state.missionMenuOpen=!state.missionMenuOpen;render();">'+ICONS.more+'</button></div>';
  if(state.missionMenuOpen){
    var item=function(onclick,icon,label,cls){return '<button type="button" class="menu-row'+(cls?' '+cls:'')+'" onclick="state.missionMenuOpen=false;'+onclick+'">'+icon+'<span>'+label+'</span></button>';};
    h+='<div class="mission-menu">'+
      item('render();sendMissionByMail('+m.id+');',ICONS.mail,'Envoyer la mission par e-mail')+
      item('render();exportMissionJSON('+m.id+');',ICONS.download,'Enregistrer la mission (.json)')+
      item('render();exportActiviteWord();',ICONS.fileText,'Activité (Word)')+
      item('showSmartFusionModal();',ICONS.zap,'Fusionner intelligemment')+
      item('startFusionMode();',ICONS.merge,'Fusion manuelle')+
      item('state.showModal=\'addGehTerrain\';render();',ICONS.plus,'Ajouter un GEH')+
      item('editMissionFromTerrain();',ICONS.edit,'Modifier la mission')+
      item('unvalidateMissionFromTerrain();',ICONS.arrowLeft,'Repasser en préparation')+
      item('deleteMissionTerrain();',ICONS.trash,'Supprimer la mission','danger')+
      '</div>';
  }
  return h+'</div></div>';
}

function deleteMissionTerrain(){
  var m=getCurrentMission();if(!m)return;
  if(!confirm('Supprimer la mission "'+m.clientSite+'" ?\n\nToutes les données seront perdues !'))return;
  state.missions=state.missions.filter(function(x){return x.id!==m.id;});
  saveData('vlep_missions_v3',state.missions);
  state.currentMissionId=null;
  state.view='terrain-list';
  render();
}

// ===== AJOUT/SUPPRESSION TERRAIN =====
function renderAddGehTerrainModal(){
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>+ Ajouter un GEH</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<div class="field"><label class="label">Nom du GEH *</label><input type="text" class="input" id="new-geh-name" placeholder="Ex: Atelier peinture"></div>';
  h+='<div class="row"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-primary" onclick="addGehTerrain();">Ajouter</button></div></div></div>';
  return h;
}

function addGehTerrain(){
  var input=document.getElementById('new-geh-name');
  var name=input?input.value.trim():'';
  if(!name){alert('Saisissez un nom de GEH');return;}
  var m=getCurrentMission();if(!m)return;
  var newNum=m.gehs.length+1;
  var newGeh={id:generateId(),num:newNum,name:name};
  m.gehs.push(newGeh);
  state.expandedGeh[newGeh.id]=true;
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  render();
}

function deleteGehTerrain(gehId){
  var m=getCurrentMission();if(!m)return;
  var geh=m.gehs.find(function(g){return g.id===gehId;});
  var prelCount=m.prelevements.filter(function(p){return p.gehId===gehId;}).length;
  var msg='Supprimer le GEH "'+geh.name+'" ?';
  if(prelCount>0)msg+='\n\n'+prelCount+' prélèvement(s) seront également supprimés !';
  if(!confirm(msg))return;
  // Supprimer les prélèvements associés
  m.prelevements=m.prelevements.filter(function(p){return p.gehId!==gehId;});
  // Supprimer le GEH
  m.gehs=m.gehs.filter(function(g){return g.id!==gehId;});
  // Renuméroter
  m.gehs.forEach(function(g,i){g.num=i+1;});
  saveData('vlep_missions_v3',state.missions);
  render();
}

function deletePrelTerrain(prelId){
  var m=getCurrentMission();if(!m)return;
  var prel=m.prelevements.find(function(p){return p.id===prelId;});
  if(!prel)return;
  var agentNames=prel.agents.map(function(a){return a.name;}).join(' + ');
  if(!confirm('Supprimer le prélèvement "'+agentNames+'" ('+prel.type+') ?'))return;
  m.prelevements=m.prelevements.filter(function(p){return p.id!==prelId;});
  updateMissionStatus(m);
  saveData('vlep_missions_v3',state.missions);
  render();
}

function renderAddPrelTerrainModal(){
  var m=getCurrentMission();
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;state.newPrelData=null;render();}"><div class="modal-content" style="max-height:90vh;"><div class="modal-header"><h2>+ Ajouter un prélèvement</h2><button class="close-btn" onclick="state.showModal=null;state.newPrelData=null;render();">×</button></div>';
  
  if(!state.newPrelData){
    state.newPrelData={gehId:null,agents:[],type:'8h',isReg:true,agentSearch:''};
  }
  var d=state.newPrelData;
  
  // Sélection GEH
  h+='<div class="field"><label class="label">GEH *</label><select class="input" onchange="state.newPrelData.gehId=this.value;render();">';
  h+='<option value="">-- Sélectionner --</option>';
  m.gehs.filter(function(g){return g.name;}).forEach(function(g){
    h+='<option value="'+g.id+'" '+(d.gehId==g.id?'selected':'')+'>'+g.num+'. '+escapeHtml(g.name)+'</option>';
  });
  h+='</select></div>';
  
  // Type
  h+='<div class="field"><label class="label">Type de VLEP *</label><div class="row">';
  h+='<button class="btn btn-small '+(d.type==='8h'?'btn-primary':'btn-gray')+'" onclick="state.newPrelData.type=\'8h\';render();">8h</button>';
  h+='<button class="btn btn-small '+(d.type==='CT'?'btn-primary':'btn-gray')+'" onclick="state.newPrelData.type=\'CT\';render();">CT</button>';
  h+='</div></div>';
  
  // Réglementaire
  h+='<div class="field"><label class="label">Statut</label><div class="row">';
  h+='<button class="btn btn-small '+(d.isReg?'btn-success':'btn-gray')+'" onclick="state.newPrelData.isReg=true;render();">Réglementaire</button>';
  h+='<button class="btn btn-small '+(!d.isReg?'btn-orange':'btn-gray')+'" onclick="state.newPrelData.isReg=false;render();">Non-réglementaire</button>';
  h+='</div></div>';
  
  // Agents
  h+='<div class="field"><label class="label">Agent(s) chimique(s) *</label>';
  h+='<input type="text" class="input" id="new-prel-agent-search" placeholder="Rechercher..." value="'+escapeHtml(d.agentSearch||'')+'" oninput="handleNewPrelAgentSearch(this.value);"></div>';
  h+='<div id="new-prel-search-results">';
  if(d.agentSearch&&d.agentSearch.length>=2){
    var results=searchAgentsDB(d.agentSearch);
    var filtered=results.filter(function(x){return!d.agents.some(function(a){return a.name===x;});});
    if(filtered.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      filtered.slice(0,6).forEach(function(x){
        h+='<div class="search-result-item" onmousedown="event.preventDefault();" onclick="addNewPrelAgent(\''+escapeJs(x)+'\');">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  
  if(d.agents.length>0){
    h+='<div class="info-box mt-8"><strong>Agents sélectionnés :</strong><div style="margin-top:4px;">';
    d.agents.forEach(function(a,i){
      h+='<span style="display:inline-block;background:#e5e7eb;padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;">'+escapeHtml(a.name)+' <span style="cursor:pointer;color:#ef4444;" onclick="removeNewPrelAgent('+i+');">×</span></span>';
    });
    h+='</div></div>';
  }
  
  // Nombre de sous-prélèvements
  var subCount=d.isReg&&d.type==='8h'?3:1;
  h+='<div class="info-box info-box-success mt-12"><p>'+subCount+' sous-prélèvement(s) seront créés</p></div>';
  
  var canAdd=d.gehId&&d.agents.length>0;
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.newPrelData=null;render();">Annuler</button><button class="btn btn-primary" '+(canAdd?'':'disabled')+' onclick="addPrelTerrain();">Ajouter</button></div></div></div>';
  return h;
}

function renderSmartFusionModal(){
  if(!state.fusionGroups||state.fusionGroups.length===0)return'';
  
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;state.fusionGroups=null;render();}"><div class="modal-content" style="max-height:90vh;overflow-y:auto;"><div class="modal-header"><h2>'+ICONS.zap+' Fusion intelligente</h2><button class="close-btn" onclick="state.showModal=null;state.fusionGroups=null;render();">×</button></div>';
  
  var selectedCount=state.fusionGroups.filter(function(g){return g.selected;}).length;
  
  h+='<div class="info-box mb-12"><p><strong>'+state.fusionGroups.length+' groupe(s) fusionnable(s) détecté(s)</strong></p><p style="font-size:11px;margin-top:4px;">Décochez les groupes que vous ne souhaitez pas fusionner</p></div>';
  
  // Boutons rapides
  h+='<div class="row mb-12"><button class="btn btn-gray btn-small" onclick="toggleAllGroups(true);">Tout sélectionner</button><button class="btn btn-gray btn-small" onclick="toggleAllGroups(false);">Tout désélectionner</button></div>';
  
  // Liste des groupes
  state.fusionGroups.forEach(function(group){
    var hasWarnings=group.warnings.length>0;
    h+='<div class="card" style="padding:10px;margin-bottom:8px;border-left:4px solid '+(hasWarnings?'var(--warning)':'var(--accent)')+';">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
    h+='<input type="checkbox" '+(group.selected?'checked':'')+' onchange="toggleGroupSelection(\''+group.id+'\');" style="width:18px;height:18px;cursor:pointer;">';
    h+='<div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--text-dark);">'+group.gehNum+'. '+escapeHtml(group.gehName)+'</div>';
    h+='<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+group.type+' • '+(group.isReglementaire?'Réglementaire':'Non-régl.')+'</div></div>';
    h+='<div style="background:var(--primary-pale);color:var(--primary);padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">'+group.prelevements.length+' prél.</div>';
    h+='</div>';
    
    // Agents
    h+='<div style="font-size:12px;color:var(--text-dark);margin-bottom:4px;"><strong>Agents:</strong> '+group.agentNames.map(escapeHtml).join(', ')+'</div>';
    
    // Avertissements
    if(hasWarnings){
      h+='<div style="background:#fef3c7;border-radius:6px;padding:6px 8px;font-size:11px;color:#b45309;"><strong>⚠️ Attention:</strong> '+group.warnings.join(', ')+'</div>';
    }
    
    h+='</div>';
  });
  
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.fusionGroups=null;render();">Annuler</button><button class="btn btn-success" onclick="doSmartFusion();" '+(selectedCount===0?'disabled':'')+'>Fusionner ('+selectedCount+')</button></div>';
  h+='</div></div>';
  return h;
}

function handleNewPrelAgentSearch(value){
  state.newPrelData.agentSearch=value;
  var container=document.getElementById('new-prel-search-results');
  if(!container)return;
  var d=state.newPrelData;
  var h='';
  if(value&&value.length>=2){
    var results=searchAgentsDB(value);
    var filtered=results.filter(function(x){return!d.agents.some(function(a){return a.name===x;});});
    if(filtered.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      filtered.slice(0,6).forEach(function(x){
        h+='<div class="search-result-item" onmousedown="event.preventDefault();" onclick="addNewPrelAgent(\''+escapeJs(x)+'\');">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }
  }
  container.innerHTML=h;
}

function addNewPrelAgent(name){
  if(!state.newPrelData)return;
  if(state.newPrelData.agents.some(function(a){return a.name===name;}))return;
  var color=AGENT_COLORS[state.newPrelData.agents.length%AGENT_COLORS.length];
  state.newPrelData.agents.push({name:name,color:color});
  state.newPrelData.agentSearch='';
  render();
}

function removeNewPrelAgent(i){
  if(!state.newPrelData)return;
  state.newPrelData.agents.splice(i,1);
  render();
}

function addPrelTerrain(){
  var m=getCurrentMission();if(!m)return;
  var d=state.newPrelData;
  if(!d||!d.gehId||d.agents.length===0)return;
  
  var geh=m.gehs.find(function(g){return String(g.id)===String(d.gehId);});
  if(!geh)return;
  
  var subCount=d.isReg&&d.type==='8h'?3:1;
  var newPrel={
    id:generateId(),
    gehId:geh.id,
    gehName:geh.name,
    gehNum:geh.num,
    agents:d.agents.slice(),
    type:d.type,
    isReglementaire:d.isReg,
    subPrelevements:[]
  };
  
  for(var i=0;i<subCount;i++){
    var sub={id:generateId(),operateur:'',date:'',plages:[{debut:'',fin:''}],observations:'',completed:false,agentData:{},epiType:'sans objet',epiDuree:''};
    d.agents.forEach(function(a){
      sub.agentData[a.name]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
    });
    newPrel.subPrelevements.push(sub);
  }
  
  m.prelevements.push(newPrel);
  state.expandedGeh[geh.id]=true;
  updateMissionStatus(m);
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.newPrelData=null;
  render();
}

function startFusionMode(){
  state.fusionMode=true;
  state.selectedForFusion=[];
  var m=getCurrentMission();
  if(m)m.gehs.forEach(function(g){state.expandedGeh[g.id]=true;});
  render();
}



function returnToTerrain(){
  var m=getCurrentMission();
  if(!m)return;
  m.status=state._oldStatus||'validee';
  if(m.status==='prepa')m.status='validee';
  state._returnToTerrain=false;
  state._oldStatus=null;
  state.view='terrain-mission';
  saveData('vlep_missions_v3',state.missions);
  render();
}
function editMissionFromTerrain(){
  var m=getCurrentMission();
  if(!m)return;
  var oldStatus=m.status;
  m.status='prepa';
  state.view='prepa-mission';
  state._returnToTerrain=true;
  state._oldStatus=oldStatus;
  saveData('vlep_missions_v3',state.missions);
  render();
}
function cancelFusion(){state.fusionMode=false;state.selectedForFusion=[];render();}

function toggleFusionSelect(pid){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var i=state.selectedForFusion.indexOf(pid);
  if(i===-1){
    if(state.selectedForFusion.length>0){
      var fp=m.prelevements.find(function(x){return x.id===state.selectedForFusion[0];});
      if(fp.gehId!==p.gehId||fp.type!==p.type||fp.isReglementaire!==p.isReglementaire){
        alert('Les prélèvements doivent être du même GEH, même type et même statut réglementaire');
        return;
      }
    }
    state.selectedForFusion.push(pid);
  }else state.selectedForFusion.splice(i,1);
  render();
}

function doFusion(){
  var m=getCurrentMission();
  if(!m||state.selectedForFusion.length<2)return;
  var tm=m.prelevements.filter(function(p){return state.selectedForFusion.indexOf(p.id)!==-1;});
  if(tm.length<2)return;
  var first=tm[0];
  var errors=[];
  for(var j=1;j<tm.length;j++){
    var o=tm[j];
    if(o.gehId!==first.gehId)errors.push('GEH différent');
    if(o.type!==first.type)errors.push('Type différent (8h/CT)');
    if(o.isReglementaire!==first.isReglementaire)errors.push('Statut réglementaire différent');
  }
  if(errors.length>0){alert('Fusion impossible:\n- '+errors.join('\n- '));return;}
  var mn=tm[0];
  for(var j=1;j<tm.length;j++){
    var o=tm[j];
    o.agents.forEach(function(a){if(!mn.agents.some(function(x){return x.name===a.name;}))mn.agents.push(a);});
    for(var s=0;s<mn.subPrelevements.length&&s<o.subPrelevements.length;s++){
      if(!mn.subPrelevements[s].agentData)mn.subPrelevements[s].agentData={};
      if(o.subPrelevements[s].agentData){
        for(var an in o.subPrelevements[s].agentData){
          if(!mn.subPrelevements[s].agentData[an])mn.subPrelevements[s].agentData[an]=o.subPrelevements[s].agentData[an];
        }
      }
      mergeSupportsSupp(mn.subPrelevements[s],o.subPrelevements[s]);
    }
    var idx=m.prelevements.findIndex(function(x){return x.id===o.id;});
    if(idx!==-1)m.prelevements.splice(idx,1);
  }
  saveData('vlep_missions_v3',state.missions);
  state.fusionMode=false;
  state.selectedForFusion=[];
  render();
}


// ===== DEFUSION =====
function defusionPrel(prelId){
  var m=getCurrentMission();
  if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===prelId;});
  if(!p||!p.agents||p.agents.length<2){alert('Ce prélèvement ne contient qu\'un seul agent, impossible de défusionner.');return;}
  if(!confirm('Défusionner ce prélèvement ?\nChaque agent redeviendra un prélèvement séparé.'))return;
  var newPrels=[];
  p.agents.forEach(function(agent){
    var np={id:generateId(),gehId:p.gehId,gehName:p.gehName,gehNum:p.gehNum,type:p.type,isReglementaire:p.isReglementaire,agents:[agent],subPrelevements:[]};
    p.subPrelevements.forEach(function(sub){
      var ns=JSON.parse(JSON.stringify(sub));
      ns.id=generateId();
      if(ns.agentData){var kept={};if(ns.agentData[agent.name])kept[agent.name]=ns.agentData[agent.name];ns.agentData=kept;}
      (ns.supportsSupp||[]).forEach(function(sp){var k2={};if(sp.agentData&&sp.agentData[agent.name])k2[agent.name]=sp.agentData[agent.name];sp.agentData=k2;});
      delete ns.coPrelGroups;
      np.subPrelevements.push(ns);
    });
    newPrels.push(np);
  });
  var idx=m.prelevements.findIndex(function(x){return x.id===prelId;});
  m.prelevements.splice(idx,1);
  newPrels.forEach(function(np){m.prelevements.splice(idx,0,np);idx++;});
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Nouvelle fonction : Analyse les groupes fusionnables
function analyzeGroupsForFusion(){
  var m=getCurrentMission();
  if(!m)return[];
  
  var groups=[];
  var processed={};
  
  m.prelevements.forEach(function(p){
    if(processed[p.id])return;
    
    // Trouver tous les prélèvements compatibles
    var compatible=m.prelevements.filter(function(x){
      return x.gehId===p.gehId && x.type===p.type && x.isReglementaire===p.isReglementaire && x.id!==p.id && !processed[x.id];
    });
    
    if(compatible.length>0){
      var allInGroup=[p].concat(compatible);
      var gehInfo=m.gehs.find(function(g){return g.id===p.gehId;});
      var agentNames=[];
      allInGroup.forEach(function(pr){
        pr.agents.forEach(function(a){
          if(agentNames.indexOf(a.name)===-1)agentNames.push(a.name);
        });
      });
      
      // Vérifier les différences
      var warnings=[];
      var operators={};
      var dates={};
      var supports={};
      var codesPretrait={};
      
      allInGroup.forEach(function(pr){
        pr.subPrelevements.forEach(function(sub){
          if(sub.operateur)operators[sub.operateur]=true;
          if(sub.date)dates[sub.date]=true;
        });
        pr.agents.forEach(function(a){
          var ag=getAgentFromDB(a.name);
          if(ag){
            var sup=ag['Support de prélèvement']||'';
            var cp=ag['Code prétraitement']||'';
            if(sup)supports[sup]=true;
            if(cp)codesPretrait[cp]=true;
          }
        });
      });
      var opCount=Object.keys(operators).length;
      var dateCount=Object.keys(dates).length;
      if(opCount>1)warnings.push('Opérateurs différents');
      if(dateCount>1)warnings.push('Dates différentes');
      if(Object.keys(supports).length>1)warnings.push('Supports différents: '+Object.keys(supports).join(', '));
      if(Object.keys(codesPretrait).length>1)warnings.push('Codes prétraitement différents: '+Object.keys(codesPretrait).join(', '));
      
      groups.push({
        id:'group_'+p.id,
        gehId:p.gehId,
        gehName:gehInfo?gehInfo.name:'',
        gehNum:gehInfo?gehInfo.num:'',
        type:p.type,
        isReglementaire:p.isReglementaire,
        prelevements:allInGroup,
        agentNames:agentNames,
        warnings:warnings,
        selected:warnings.length===0 // Auto-sélectionner seulement si pas de warnings
      });
      
      allInGroup.forEach(function(pr){processed[pr.id]=true;});
    }
  });
  
  return groups;
}

// Nouvelle fonction : Affiche le modal de fusion intelligente
function showSmartFusionModal(){
  var groups=analyzeGroupsForFusion();
  if(groups.length===0){
    alert('Aucun prélèvement fusionnable trouvé.\n\nLes prélèvements doivent partager :\n- Même GEH\n- Même type (8h ou CT)\n- Même statut réglementaire');
    return;
  }
  state.showModal='smartFusion';
  state.fusionGroups=groups;
  render();
}

// Nouvelle fonction : Effectue la fusion intelligente
function doSmartFusion(){
  var m=getCurrentMission();
  if(!m||!state.fusionGroups)return;
  
  var selectedGroups=state.fusionGroups.filter(function(g){return g.selected;});
  if(selectedGroups.length===0){
    alert('Aucun groupe sélectionné');
    return;
  }
  
  var totalFused=0;
  selectedGroups.forEach(function(group){
    if(group.prelevements.length<2)return;
    
    var first=group.prelevements[0];
    for(var j=1;j<group.prelevements.length;j++){
      var other=group.prelevements[j];
      
      // Fusionner les agents
      other.agents.forEach(function(a){
        if(!first.agents.some(function(x){return x.name===a.name;})){
          first.agents.push(a);
        }
      });
      
      // Fusionner les données de sous-prélèvements
      for(var s=0;s<first.subPrelevements.length&&s<other.subPrelevements.length;s++){
        if(!first.subPrelevements[s].agentData)first.subPrelevements[s].agentData={};
        if(other.subPrelevements[s].agentData){
          for(var an in other.subPrelevements[s].agentData){
            if(!first.subPrelevements[s].agentData[an]){
              first.subPrelevements[s].agentData[an]=other.subPrelevements[s].agentData[an];
            }
          }
        }
        mergeSupportsSupp(first.subPrelevements[s],other.subPrelevements[s]);
      }
      
      // Supprimer l'autre prélèvement
      var idx=m.prelevements.findIndex(function(x){return x.id===other.id;});
      if(idx!==-1){
        m.prelevements.splice(idx,1);
        totalFused++;
      }
    }
  });
  
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.fusionGroups=null;
  render();
  
  alert('Fusion réussie !\n\n'+selectedGroups.length+' groupe(s) fusionné(s)\n'+totalFused+' prélèvement(s) fusionné(s)');
}

// Nouvelle fonction : Toggle sélection groupe
function toggleGroupSelection(groupId){
  if(!state.fusionGroups)return;
  var group=state.fusionGroups.find(function(g){return g.id===groupId;});
  if(group)group.selected=!group.selected;
  render();
}

// Nouvelle fonction : Tout sélectionner/désélectionner
function toggleAllGroups(select){
  if(!state.fusionGroups)return;
  state.fusionGroups.forEach(function(g){g.selected=select;});
  render();
}

function openPrel(pid){
  if(state.fusionMode)return;
  state.currentPrelId=pid;
  // Point 3 : rester sur le dernier jour utilisé (J1/J2/J3) au lieu de retomber sur J1.
  // L'index est borné au nombre de sous-prélèvements du prélèvement ouvert
  // (un prélèvement non-réglementaire n'a qu'un seul jour) sans effacer le jour mémorisé.
  var mOpen=getCurrentMission();
  var pOpen=mOpen?mOpen.prelevements.find(function(x){return x.id===pid;}):null;
  var nbSub=(pOpen&&pOpen.subPrelevements&&pOpen.subPrelevements.length)?pOpen.subPrelevements.length:1;
  var wantedDay=(typeof state.lastDayIndex==='number')?state.lastDayIndex:0;
  state.activeSubIndex=Math.max(0,Math.min(wantedDay,nbSub-1));
  state.view='terrain-prel';
  render();
}

function isTachymetreAgent(agentName){
  var ag=getAgentFromDB(agentName);
  if(!ag)return false;
  var sup=(ag['Support de prélèvement']||'').toLowerCase();
  return sup.indexOf('mousse')!==-1||sup.indexOf('coupelle rotative')!==-1;
}

// Agent mesuré en continu par un analyseur portable (CO, CO2…) : ni pompe ni débit, onglet « Analyseurs »
function isAnalyseurAgent(agentName){
  var ag=getAgentFromDB(agentName);
  if(!ag)return false;
  // « anlyseur » : coquille présente dans la base pour le CO
  return /mesure en continu|an?a?lyseur|lecture directe/i.test(String(ag['Principe du prélèvement']||'')+' '+String(ag['Méthode']||''));
}

// Champs de contrôle de l'analyseur (onglet Analyseurs de la feuille de calcul), tous facultatifs
var ANALYSEUR_CHAMPS=[
  {cle:'bouteilleZero',label:'Bouteille zéro'},
  {cle:'bouteilleEtalon',label:'Bouteille étalon'},
  {cle:'gazEtalon',label:'Gaz étalon'},
  {cle:'attenduZero',label:'Attendu zéro',num:true},
  {cle:'attenduEtalon',label:'Attendu étalon',num:true},
  {cle:'ctrlZeroAvant',label:'Zéro avant',num:true},
  {cle:'ctrlSensAvant',label:'Sensib. avant',num:true},
  {cle:'ctrlZeroApres',label:'Zéro après',num:true},
  {cle:'ctrlSensApres',label:'Sensib. après',num:true}
];

function renderAnalyseurChamps(p,idx,aname,ad,canCopy){
  var call=function(f){return 'updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\''+f+'\',this.value);';};
  var h='<div class="multi-agent-row"><label>N° analyseur';
  if(canCopy)h+='<button class="copy-btn" onclick="copyAnalyseurFromPrevious('+p.id+','+idx+',\''+escapeJs(aname)+'\');">J-1</button>';
  h+='</label><input type="text" class="input" style="flex:1;" value="'+escapeHtml(ad.numPompe||'')+'" placeholder="Ex: 24259" onchange="'+call('numPompe')+'"></div>';
  var rempli=ANALYSEUR_CHAMPS.some(function(c){return ad[c.cle];});
  h+='<details style="margin:4px 0;"'+(rempli?' open':'')+'><summary style="font-size:12px;color:var(--primary);cursor:pointer;">Contrôles de l\'analyseur (facultatif)</summary>';
  ANALYSEUR_CHAMPS.forEach(function(c){
    h+='<div class="multi-agent-row"><label>'+c.label+'</label><input type="text"'+(c.num?' inputmode="decimal"':'')+' class="input" style="flex:1;" value="'+escapeHtml(ad[c.cle]||'')+'" onchange="'+call(c.cle)+'"></div>';
  });
  h+='</details>';
  h+='<div class="multi-agent-row"><label>N° d\'essai</label><input type="text" value="'+escapeHtml(ad.refEchantillon||'')+'" placeholder="Ex: CO2 - PF1" onchange="'+call('refEchantillon')+'"></div>';
  // relevés exportés par l'appareil (onglet Acquisition de la feuille de calcul)
  if(typeof renderRelevesAnalyseur==='function')h+=renderRelevesAnalyseur(p,idx,aname,p.subPrelevements[idx],ad);
  return h;
}

// J-1 : même analyseur, mêmes bouteilles et valeurs attendues (les contrôles du jour restent à saisir)
function copyAnalyseurFromPrevious(pid,idx,an){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  var prev=(p.subPrelevements[idx-1].agentData||{})[an]||{};
  var cur=p.subPrelevements[idx];
  if(!cur.agentData)cur.agentData={};
  if(!cur.agentData[an])cur.agentData[an]={};
  ['numPompe','bouteilleZero','bouteilleEtalon','gazEtalon','attenduZero','attenduEtalon'].forEach(function(f){if(prev[f])cur.agentData[an][f]=prev[f];});
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Plage de débit recommandée par la base de données (null si inconnu ou tachymètre)
// ATTENTION: les clés DB contiennent un DOUBLE ESPACE sur 8h : "débit min  8h (L/min)"
function getDebitRange(agentName,prelType){
  if(isTachymetreAgent(agentName))return null;
  var ag=getAgentFromDB(agentName);
  if(!ag)return null;
  var minKey,maxKey;
  if(prelType==='CT'){
    minKey='débit min CT (L/min)';
    maxKey='débit max CT (L/min)';
  }else{
    minKey='débit min  8h (L/min)';
    maxKey='débit max  8h (L/min)';
  }
  var minV=parseFloat(ag[minKey]);
  var maxV=parseFloat(ag[maxKey]);
  if(!isFinite(minV)||!isFinite(maxV))return null;
  return {min:minV,max:maxV};
}

// Contrôle du débit : moyenne (initial + final) / 2 comparée au débit attendu avec ± 5 %.
// Débit attendu = valeur de la base quand min = max (cas courant) ; si la base donne une
// plage, la tolérance s'applique aux bornes (min − 5 %, max + 5 %).
// Retourne null tant que les deux débits ne sont pas saisis ou que la base ne dit rien.
var DEBIT_TOLERANCE=0.05;
function checkDebitMoyen(agentName,prelType,di,df){
  var range=getDebitRange(agentName,prelType);
  var dI=parseNum(di),dF=parseNum(df);
  if(!range||isNaN(dI)||isNaN(dF))return null;
  var moy=(dI+dF)/2;
  var lo=range.min*(1-DEBIT_TOLERANCE),hi=range.max*(1+DEBIT_TOLERANCE);
  return {moy:moy,range:range,lo:lo,hi:hi,horsTolerance:moy<lo||moy>hi};
}

// Affichage d'un débit sans bruit de virgule flottante (0,1 et non 0,10000000001)
function formatDebit(v){
  return String(Math.round(v*10000)/10000).replace('.',',');
}

// Détection des champs manquants pour validation
function getMissingFields(p,sb){
  var missing=[];
  if(!sb.operateur||!sb.operateur.trim())missing.push('Opérateur');
  if(!sb.date)missing.push('Date');
  // Au moins une plage complète
  var hasCompletePlage=false;
  if(sb.plages&&sb.plages.length){
    sb.plages.forEach(function(pl){
      if(pl.debut&&pl.fin)hasCompletePlage=true;
    });
  }
  if(!hasCompletePlage)missing.push('Plage horaire (début + fin)');
  // Pour chaque agent : N° pompe + débits (ou vitesses pour tachymètre)
  if(p.agents&&p.agents.length){
    p.agents.forEach(function(a){
      var aname=a.name||'Agent inconnu';
      // Support partagé : contrôlé une seule fois, sous le nom du premier agent du groupe
      var grp=getCoPrelGroupMembers(sb,aname);
      if(grp.length>1){
        var premier=p.agents.filter(function(x){return grp.indexOf(x.name)!==-1;})[0];
        if(premier&&premier.name!==aname)return;
      }
      var ad=(sb.agentData&&sb.agentData[aname])||{};
      var shortName=aname.length>25?aname.substring(0,25)+'…':aname;
      if(grp.length>1)shortName+=' + '+(grp.length-1);
      if(isAnalyseurAgent(aname)){
        if(!ad.numPompe||!(''+ad.numPompe).trim())missing.push('N° analyseur · '+shortName);
        return;
      }
      if(!ad.numPompe||!(''+ad.numPompe).trim())missing.push('N° Pompe · '+shortName);
      if(isTachymetreAgent(aname)){
        if(!ad.debitRef||!(''+ad.debitRef).trim())missing.push('Vitesse réf · '+shortName);
        if(!ad.debitInitial||!(''+ad.debitInitial).trim())missing.push('Vitesse initiale · '+shortName);
        if(!ad.debitFinal||!(''+ad.debitFinal).trim())missing.push('Vitesse finale · '+shortName);
      }else{
        if(!ad.debitInitial||!(''+ad.debitInitial).trim())missing.push('Débit initial · '+shortName);
        if(!ad.debitFinal||!(''+ad.debitFinal).trim())missing.push('Débit final · '+shortName);
      }
    });
  }
  getSupportsSupp(sb).forEach(function(s,k){
    var num='support n°'+(k+2);
    var plOk=(s.plages||[]).some(function(pl){return pl.debut&&pl.fin;});
    if(!plOk)missing.push('Plage horaire · '+num);
    (p.agents||[]).forEach(function(a){
      var grp=getCoPrelGroupMembers(sb,a.name);
      if(grp.length>1&&p.agents.filter(function(x){return grp.indexOf(x.name)!==-1;})[0].name!==a.name)return;
      var ad=(s.agentData&&s.agentData[a.name])||{};
      var nm=a.name.length>25?a.name.substring(0,25)+'…':a.name;
      if(!ad.debitInitial||!(''+ad.debitInitial).trim())missing.push('Débit initial · '+num+' · '+nm);
      if(!ad.debitFinal||!(''+ad.debitFinal).trim())missing.push('Débit final · '+num+' · '+nm);
      if(!ad.refEchantillon||!(''+ad.refEchantillon).trim())missing.push('Réf. échantillon · '+num+' · '+nm);
    });
  });
  return missing;
}

// Fusion de prélèvements : réunit les supports suivants de deux sous-prélèvements (même rang)
function mergeSupportsSupp(dst,src){
  var ex=getSupportsSupp(src);
  if(!ex.length)return;
  if(!dst.supportsSupp)dst.supportsSupp=[];
  ex.forEach(function(s,k){
    if(!dst.supportsSupp[k]){dst.supportsSupp[k]=s;return;}
    var d=dst.supportsSupp[k];
    if(!d.agentData)d.agentData={};
    for(var an in (s.agentData||{})){if(!d.agentData[an])d.agentData[an]=s.agentData[an];}
  });
}

function showMissingFieldsModal(pid,idx){
  state.showModal='missingFields';
  state.missingFieldsPid=pid;
  state.missingFieldsIdx=idx;
  render();
}

function closeMissingFieldsModal(){
  state.showModal=null;
  state.missingFieldsPid=null;
  state.missingFieldsIdx=null;
  render();
}

function renderMissingFieldsModal(){
  var m=getCurrentMission();if(!m)return '';
  var p=m.prelevements.find(function(x){return x.id===state.missingFieldsPid;});
  if(!p)return '';
  var sb=p.subPrelevements[state.missingFieldsIdx];
  if(!sb)return '';
  var missing=getMissingFields(p,sb);
  var h='<div class="modal show" onclick="if(event.target===this){closeMissingFieldsModal();}"><div class="modal-content">';
  h+='<div class="modal-header"><h2>⚠️ Champs manquants</h2><button class="close-btn" onclick="closeMissingFieldsModal();">×</button></div>';
  if(missing.length===0){
    h+='<p style="color:#16a34a;text-align:center;padding:16px;">✓ Tous les champs requis sont remplis</p>';
  }else{
    h+='<p style="margin-bottom:10px;color:#475569;">Pour valider ce prélèvement, renseigner :</p>';
    h+='<ul style="list-style:none;padding:0;margin:0;">';
    missing.forEach(function(f){
      h+='<li style="padding:8px 10px;background:#fef3c7;border-left:3px solid #f59e0b;margin-bottom:4px;border-radius:4px;font-size:13px;color:#92400e;">'+escapeHtml(f)+'</li>';
    });
    h+='</ul>';
  }
  h+='<button class="btn btn-gray mt-12" style="width:100%;" onclick="closeMissingFieldsModal();">Fermer</button>';
  h+='</div></div>';
  return h;
}

// Convertit une saisie numérique en nombre en acceptant la virgule décimale
// française (0,2) aussi bien que le point (0.2). Utilisé UNIQUEMENT pour les
// calculs : la valeur stockée/affichée/exportée conserve la virgule.
function parseNum(v){
  if(v===undefined||v===null)return NaN;
  return parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
}
function calcTachyVariation(vitesse,ref){
  var v=parseNum(vitesse),r=parseNum(ref);
  if(isNaN(v)||isNaN(r))return null;
  return Math.abs(v-r);
}

function calcDebitVariation(di,df){
  var dI=parseNum(di),dF=parseNum(df);
  if(isNaN(dI)||isNaN(dF))return null;
  if(dI<=0)return null;
  return Math.abs(dF-dI)/dI*100;
}

function renderTerrainPrel(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-list';render();return'';}
  var p=m.prelevements.find(function(x){return x.id===state.currentPrelId;});
  if(!p){state.view='terrain-mission';render();return'';}
  var mc=p.agents&&p.agents[0]?p.agents[0].color:'#3b82f6';
  var agentNames=p.agents&&p.agents.length>0?p.agents.map(function(a){return escapeHtml(a.name||'???');}).join(' + '):'Agent inconnu';
  var h='<div class="sticky-header"><button class="back-btn" onclick="state.view=\'terrain-mission\';state.currentPrelId=null;render();">'+ICONS.arrowLeft+' Mission</button><div class="sticky-sub">'+agentNames+' · '+p.type+' · GEH '+p.gehNum+'</div></div><div class="card" style="border-left:4px solid '+mc+';border-radius:0 16px 16px 0;"><h2>'+agentNames+' - '+p.type+'</h2><p class="subtitle"><span class="svg-icon">'+ICONS.folder+'</span> GEH '+p.gehNum+' - '+escapeHtml(p.gehName)+' | '+(p.isReglementaire?'Réglementaire':'Non-régl.')+'</p></div>';
  // Réglementaire avec moins de 3 prélèvements (stratégie) : justification reprise dans le commentaire de la feuille
  if(p.isReglementaire&&p.subPrelevements.length<3){
    h+='<div class="card"><label class="label">Réglementaire avec '+p.subPrelevements.length+' prélèvement'+(p.subPrelevements.length>1?'s':'')+' : justification</label>';
    h+='<textarea class="input" rows="2" placeholder="'+escapeHtml(JUSTIF_NB_DEFAUT)+'" onchange="setJustifNb('+p.id+',this.value);">'+escapeHtml(p.justifNb||'')+'</textarea>';
    h+='<p class="subtitle" style="margin-top:4px;">Reprise dans le commentaire de la feuille de calcul.</p></div>';
  }
  if(p.subPrelevements.length>1){
    h+='<div class="tabs">';
    for(var t=0;t<p.subPrelevements.length;t++){
      var sb=p.subPrelevements[t];
      h+='<button class="tab '+(state.activeSubIndex===t?'active':'')+'" onclick="state.activeSubIndex='+t+';state.lastDayIndex='+t+';render();">Prél '+(t+1)+(sb.completed?' ✓':'')+'</button>';
    }
    h+='</div>';
  }
  h+=renderSubPrelForm(p,p.subPrelevements[state.activeSubIndex],state.activeSubIndex);
  if(state.showModal==='linkAgent')h+=renderLinkAgentModal();
  if(state.showModal==='missingFields')h+=renderMissingFieldsModal();
  return h;
}

// FIX #4 & #5: Ajout des boutons "Copier J-1" et auto-date
function renderSubPrelForm(p,sb,idx){
  var m=getCurrentMission();
  var canCopyFromPrevious=idx>0;
  
  // Feature : pré-remplissage automatique de la date du jour à l'ouverture
  // (le champ reste pleinement modifiable via updateSubField ci-dessous)
  if(!sb.date){
    sb.date=getTodayDate();
    saveData('vlep_missions_v3',state.missions);
  }
  
  var h='<div class="card">';
  
  // Opérateur avec bouton copier J-1
  // Opérateur par défaut ; « Poste fixe » donne « à poste fixe » en type de prélèvement dans la feuille de calcul
  h+='<div class="field"><div class="field-header"><label class="label">'+(sb.posteFixe?'Poste fixe':'Opérateur')+'</label>';
  if(canCopyFromPrevious)h+='<button class="copy-btn" onclick="copyFromPrevious('+p.id+','+idx+',\'operateur\');">'+ICONS.list+' J-1</button>';
  h+='</div><div class="row" style="margin-bottom:6px;">';
  h+='<button type="button" class="btn btn-small '+(!sb.posteFixe?'btn-primary':'btn-gray')+'" style="margin:0;" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'posteFixe\',false);render();">Opérateur</button>';
  h+='<button type="button" class="btn btn-small '+(sb.posteFixe?'btn-primary':'btn-gray')+'" style="margin:0;" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'posteFixe\',true);render();">Poste fixe</button></div>';
  h+='<input type="text" class="input" value="'+escapeHtml(sb.operateur||'')+'" placeholder="'+(sb.posteFixe?'Emplacement du poste fixe':'Nom de l’opérateur')+'" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'operateur\',this.value);"></div>';
  
  // Date
  h+='<div class="field"><label class="label">Date</label><input type="date" class="input" value="'+(sb.date||'')+'" onchange="updateSubField('+p.id+','+idx+',\'date\',this.value);"></div>';
  
  // Plages horaires (remontées juste sous la date, avant les agents)
  var fractionne=getSupportsSupp(sb).length>0;
  h+='<div class="field"><label class="label">Plages horaires'+(fractionne?' · support n°1':'')+'</label>';
  var pl=sb.plages||[{debut:'',fin:''}];
  pl.forEach(function(x,pi){
    h+='<div class="plage-row"><div class="plage-num">'+(pi+1)+'</div><input type="time" class="plage-input" value="'+(x.debut||'')+'" onchange="updatePlageWithAutoDate('+p.id+','+idx+','+pi+',\'debut\',this.value);"><span class="plage-sep">'+ICONS.arrowRight+'</span><input type="time" class="plage-input" value="'+(x.fin||'')+'" onchange="updatePlageWithAutoDate('+p.id+','+idx+','+pi+',\'fin\',this.value);">';
    if(pl.length>1)h+='<button class="plage-delete" onclick="removePlage('+p.id+','+idx+','+pi+');">✕</button>';
    h+='</div>';
  });
  if(pl.length<10)h+='<button class="btn btn-gray btn-small" onclick="addPlage('+p.id+','+idx+');">+ Plage</button>';
  h+='</div>';
  
  var d=getDureeTotale(pl);
  if(d)h+='<div class="duration-box"><span style="display:inline-flex;width:16px;height:16px;">'+ICONS.clock+'</span> Durée : '+d+'</div>';

  // Durée d'exposition (VLEP 8h) : reprise dans la feuille de calcul et le Word. Court-terme : durée du prélèvement.
  if(p.type!=='CT'){
    var dPrel=dureePrelevementMin(sb);
    h+='<div class="field"><div class="field-header"><label class="label">Durée d\'exposition (VLEP 8h)</label>';
    if(canCopyFromPrevious)h+='<button class="copy-btn" onclick="copyFromPrevious('+p.id+','+idx+',\'dureeExpo\');">'+ICONS.list+' J-1</button>';
    h+='</div><div style="display:flex;gap:6px;align-items:center;"><input type="time" class="input" style="max-width:140px;margin:0;" value="'+escapeHtml(sb.dureeExpo||'')+'" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'dureeExpo\',this.value);">';
    if(dPrel>0)h+='<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'dureeExpo\',\''+(Math.floor(dPrel/60)<10?'0':'')+Math.floor(dPrel/60)+':'+(dPrel%60<10?'0':'')+(dPrel%60)+'\');render();">= durée du prélèvement</button>';
    h+='</div><div style="font-size:11px;color:var(--text-muted);margin-top:3px;">Temps d\'exposition de l\'opérateur sur la journée (h:min).</div></div>';
  }

  h+='<div class="field"><label class="label"><span class="svg-icon">'+ICONS.beaker+'</span> Agent(s) chimique(s)'+(fractionne?' · support n°1':'')+'</label>';

  if(!p.agents||p.agents.length===0){
    h+='<div class="info-box info-box-warning"><p>Aucun agent chimique défini pour ce prélèvement</p></div>';
  }else{
    p.agents.forEach(function(a){
      if(!sb.agentData)sb.agentData={};
      var aname=a.name||'Agent inconnu';
      if(!sb.agentData[aname])sb.agentData[aname]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
      var ad=sb.agentData[aname];
      var isTachy=isTachymetreAgent(aname);
      var variation=isTachy?null:calcDebitVariation(ad.debitInitial,ad.debitFinal);
      var hasWarning=false;
      if(!isTachy){
        hasWarning=variation!==null&&variation>5;
      }else{
        var ecartI=calcTachyVariation(ad.debitInitial,ad.debitRef);
        var ecartF=calcTachyVariation(ad.debitFinal,ad.debitRef);
        hasWarning=(ecartI!==null&&ecartI>200)||(ecartF!==null&&ecartF>200);
      }
      
      // Co-prélèvement : détection groupe
      var grpIdx=getCoPrelGroupIndex(sb,aname);
      var isLinked=grpIdx!==-1;
      var grpMembers=isLinked?sb.coPrelGroups[grpIdx]:[];
      var hasOtherAgents=p.agents.length>1;
      // Support partagé : un seul bloc, porté par le premier agent du groupe (ordre du prélèvement) ;
      // les données sont communes (updateAgentDataSynced), les autres agents ne sont pas répétés.
      var grpOrdered=isLinked?p.agents.filter(function(x){return grpMembers.indexOf(x.name)!==-1;}):[];
      if(isLinked&&grpOrdered.length&&grpOrdered[0].name!==aname)return;

      var borderStyle=isLinked?'border:1.5px solid var(--primary-light);border-radius:10px;margin-bottom:8px;':'border:1px solid var(--border);border-radius:8px;margin-bottom:8px;';
      h+='<div class="multi-agent-item" style="'+borderStyle+'">';
      h+='<div class="multi-agent-header" style="'+(isLinked?'background:#e0f2fe;border-radius:6px 6px 0 0;padding:6px 8px;flex-wrap:wrap;gap:4px;':'padding:6px 8px;')+'">';
      if(isLinked){
        h+='<div style="font-size:11px;color:var(--primary-dark);font-weight:700;width:100%;">Même support · '+grpOrdered.length+' agents</div>';
        grpOrdered.forEach(function(ga){
          h+='<span style="display:inline-flex;align-items:center;gap:4px;background:white;border-radius:12px;padding:2px 8px;font-size:12px;font-weight:600;">';
          h+='<span style="width:8px;height:8px;border-radius:50%;background:'+(ga.color||'#3b82f6')+';"></span>'+escapeHtml(ga.name);
          h+='<span title="Délier cet agent" style="cursor:pointer;color:#dc2626;font-weight:700;margin-left:2px;" onclick="unlinkAgentFromSupport('+p.id+','+idx+',\''+escapeJs(ga.name)+'\');">×</span></span>';
        });
        if(grpOrdered.length<p.agents.length){
          h+='<button class="btn btn-small btn-blue" style="margin-left:auto;font-size:11px;padding:2px 8px;" onclick="showLinkAgentModal('+p.id+','+idx+',\''+escapeJs(aname)+'\');">+ Agent</button>';
        }
      }else{
        h+='<div class="multi-agent-color" style="background:'+(a.color||'#3b82f6')+';"></div>';
        h+='<div class="multi-agent-name">'+escapeHtml(aname)+'</div>';
      }
      if(hasOtherAgents){
        if(isLinked){
          // boutons portés par les pastilles ci-dessus
        }else{
          h+='<button class="btn btn-small btn-blue" style="margin-left:auto;font-size:11px;padding:2px 8px;" onclick="showLinkAgentModal('+p.id+','+idx+',\''+escapeJs(aname)+'\');">🔗 Même support</button>';
        }
      }
      h+='</div>';
      h+='<div class="multi-agent-fields" style="padding:6px 8px;">';

      // Analyseur portable (CO, CO2…) : n° d'analyseur, contrôles, n° d'essai — ni pompe ni débit
      if(isAnalyseurAgent(aname)){
        h+=renderAnalyseurChamps(p,idx,aname,ad,canCopyFromPrevious);
        if(typeof renderConsignesAgent==='function')h+=renderConsignesAgent(m,p,sb,aname);
        h+='</div></div>';
        return;
      }

      // N° Pompe avec bouton copier J-1
      h+='<div class="multi-agent-row"><label>N° Pompe';
      if(canCopyFromPrevious)h+='<button class="copy-btn" onclick="copyAgentDataFromPrevious('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'numPompe\');">J-1</button>';
      h+='</label><input type="text" class="input" style="flex:1;" value="'+escapeHtml(ad.numPompe||'')+'" placeholder="Ex: 123" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'numPompe\',this.value);"></div>';
      
      if(isTachy){
        var ecartI=calcTachyVariation(ad.debitInitial,ad.debitRef);
        var ecartF=calcTachyVariation(ad.debitFinal,ad.debitRef);
        var warnI=ecartI!==null&&ecartI>200;
        var warnF=ecartF!==null&&ecartF>200;
        h+='<div class="multi-agent-row"><label>Vitesse réf. (tr/min)</label><input type="text" inputmode="decimal" class="input" style="flex:1;" value="'+escapeHtml(ad.debitRef||'')+'" placeholder="tr/min" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitRef\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');"></div>';
        h+='<div class="multi-agent-row"><label>Vitesse initiale (tr/min)</label><input type="text" inputmode="decimal" class="input '+(warnI?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitInitial||'')+'" placeholder="tr/min" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitInitial\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');">';
        if(ecartI!==null){h+='<span class="debit-variation '+(warnI?'warning':'')+'">Δ '+ecartI.toFixed(0)+' tr/min</span>';}
        h+='</div>';
        h+='<div class="multi-agent-row"><label>Vitesse finale (tr/min)</label><input type="text" inputmode="decimal" class="input '+(warnF?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitFinal||'')+'" placeholder="tr/min" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitFinal\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');">';
        if(ecartF!==null){h+='<span class="debit-variation '+(warnF?'warning':'')+'">Δ '+ecartF.toFixed(0)+' tr/min</span>';}
        h+='</div>';
        if(hasWarning){h+='<div style="color:#dc2626;font-size:11px;padding:4px 0;">⚠️ Écart > 200 tr/min par rapport à la vitesse de référence</div>';}
      }else{
        // Contrôle pour chaque agent du support (les débits attendus peuvent différer)
        var ctrls=(isLinked?grpOrdered.map(function(x){return x.name;}):[aname]).map(function(n){
          var c=checkDebitMoyen(n,p.type,ad.debitInitial,ad.debitFinal);
          if(c)c.agent=n;
          return c;
        }).filter(function(c){return c;});
        var horsTol=ctrls.some(function(c){return c.horsTolerance;});
        h+='<div class="multi-agent-row"><label>Débit initial</label><input type="text" inputmode="decimal" class="input '+(hasWarning||horsTol?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitInitial||'')+'" placeholder="L/min" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitInitial\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');"></div>';
        h+='<div class="multi-agent-row"><label>Débit final</label><input type="text" inputmode="decimal" class="input '+(hasWarning||horsTol?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitFinal||'')+'" placeholder="L/min" onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitFinal\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');">';
        if(variation!==null){h+='<span class="debit-variation '+(hasWarning?'warning':'')+'">Δ '+variation.toFixed(1)+'%</span>';}
        h+='</div>';
        if(hasWarning){
          h+='<div style="color:#dc2626;font-size:11px;padding:4px 0;">⚠️ Écart entre débit initial et final > 5 %</div>';
        }
        var dejaAffiche={};
        ctrls.forEach(function(ctrl){
          var attendu=ctrl.range.min===ctrl.range.max?formatDebit(ctrl.range.min)+' L/min':formatDebit(ctrl.range.min)+' – '+formatDebit(ctrl.range.max)+' L/min';
          if(dejaAffiche[attendu])return; // même débit attendu : une seule ligne
          dejaAffiche[attendu]=true;
          var hors=ctrl.horsTolerance;
          var qui=ctrls.length>1?' · '+escapeHtml(ctrls.filter(function(c){return c.range.min===ctrl.range.min&&c.range.max===ctrl.range.max;}).map(function(c){return c.agent;}).join(', ')):'';
          h+='<div style="color:'+(hors?'#dc2626':'var(--text-muted)')+';font-size:11px;padding:4px 0;">'+(hors?'⚠️ ':'')+'Débit moyen '+formatDebit(ctrl.moy)+' L/min '+(hors?'hors':'dans')+' tolérance (attendu '+attendu+' ± 5 %, '+(p.type==='CT'?'CT':'8h')+')'+qui+'</div>';
        });
      }
      
      h+='<div class="multi-agent-row"><label>Réf. échant.</label><input type="text" value="'+escapeHtml(ad.refEchantillon||'')+'" placeholder="Référence..." onchange="updateAgentDataSynced('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'refEchantillon\',this.value);"></div>';
      // consignes de la base (durées, volumes, rappels) pour cet agent
      if(typeof renderConsignesAgent==='function')(isLinked?grpOrdered.map(function(x){return x.name;}):[aname]).forEach(function(n){h+=renderConsignesAgent(m,p,sb,n);});
      h+='</div></div>';
    });
  }
  h+='</div>';

  // Supports suivants (prélèvement 8h fractionné)
  h+=renderSupportsSupp(p,sb,idx);

  // Timer CT
  if(p.type==='CT'){
    var timerRunning=isTimerRunning(p.id,idx);
    if(timerRunning){
      h+=getTimerDisplay(p.id,idx);
    }else{
      h+='<button class="btn btn-primary" style="width:100%;margin:8px 0;" onclick="startCTTimer('+p.id+','+idx+');">▶️ Démarrer chrono CT</button>';
    }
  }
  
  h+='<div class="field"><label class="label">Observations</label><div style="display:flex;gap:6px;align-items:flex-start;"><textarea class="input" style="flex:1;" rows="2" id="obs-'+p.id+'-'+idx+'" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'observations\',this.value);">'+escapeHtml(sb.observations||'')+'</textarea><button class="dictation-btn" id="dict-btn-'+p.id+'-'+idx+'" onclick="toggleDictation('+p.id+','+idx+');" title="Dictée vocale">'+ICONS.mic+'</button></div></div>';

  // EPI respiratoire
  var epiVal=(sb.epiType!==undefined&&sb.epiType!==null)?sb.epiType:'sans objet';
  var isAutre=(epiVal!=='sans objet'&&epiVal!=='FFP3'&&epiVal!=='TH3');
  h+='<div class="field"><label class="label">EPI respiratoire</label>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';
  ['sans objet','FFP3','TH3','Autre'].forEach(function(opt){
    var isSelected=(opt==='Autre'?isAutre:(epiVal===opt));
    h+='<button type="button" class="btn btn-small '+(isSelected?'btn-primary':'btn-gray')+'" onclick="selectEPI('+p.id+','+idx+',\''+opt+'\');">'+opt+'</button>';
  });
  h+='</div>';
  if(isAutre){
    // Liste de l'onglet FPA de la feuille de calcul (intitulé court = valeur attendue par la feuille)
    var dansListe=EPI_FPA.some(function(e){return e.court===epiVal;});
    h+='<select class="input" style="margin-bottom:6px;" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'epiType\',this.value);render();">';
    h+='<option value=""'+(epiVal===''?' selected':'')+'>Choisir l\'EPI…</option>';
    if(epiVal&&!dansListe)h+='<option value="'+escapeHtml(epiVal)+'" selected>'+escapeHtml(epiVal)+' (hors liste FPA)</option>';
    EPI_FPA.forEach(function(e){
      h+='<option value="'+escapeHtml(e.court)+'"'+(e.court===epiVal?' selected':'')+'>'+escapeHtml(e.court)+' — FPA '+e.fpa+'</option>';
    });
    h+='</select>';
    var choisi=EPI_FPA.find(function(e){return e.court===epiVal;});
    if(choisi)h+='<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">'+escapeHtml(choisi.norme+' · '+choisi.long)+'</div>';
  }
  if(epiVal!=='sans objet'){
    h+='<div style="display:flex;align-items:center;gap:8px;"><label style="white-space:nowrap;font-size:13px;">Durée de port (min)</label><input type="text" inputmode="numeric" class="input" style="width:100px;" value="'+escapeHtml(String(sb.epiDuree||'0'))+'" placeholder="0" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'epiDuree\',this.value);"></div>';
  }
  h+='</div>';

  // Ventilation et captage (Point 2)
  var srcCond=findConditionsSource(m,p,idx);
  h+='<div class="field"><div class="field-header"><label class="label">Ventilation et captage</label>';
  if(srcCond)h+='<button class="copy-btn" title="Recopier ventilation, captage et EPI depuis '+escapeHtml(srcCond.label)+'" onclick="copyConditionsFrom('+p.id+','+idx+');">'+ICONS.list+' '+(idx>0?'J-1':'Prél. précédent')+'</button>';
  h+='</div>';

  // 1) Environnement (défaut coché d'office : Local standard industriel)
  var venvVal=sb.ventEnv||'Local standard industriel';
  h+='<div style="font-size:13px;color:var(--text-dark);margin-bottom:4px;">Environnement</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';
  ['Local standard industriel','Lieu de travail en plein air','Autre'].forEach(function(opt){
    var sel=(venvVal===opt);
    h+='<button type="button" class="btn btn-small '+(sel?'btn-primary':'btn-gray')+'" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventEnv\',\''+opt+'\');render();">'+opt+'</button>';
  });
  h+='</div>';
  if(venvVal==='Autre'){
    h+='<input type="text" class="input" style="margin-bottom:8px;" value="'+escapeHtml(sb.ventEnvAutre||'')+'" placeholder="Préciser" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventEnvAutre\',this.value);">';
  }

  // 2) Ventilation générale mécanique (défaut : non => Absence dans le Word ; Autre => texte libre)
  var vgVal=sb.ventGenerale||'non';
  h+='<div style="font-size:13px;color:var(--text-dark);margin-bottom:4px;">Ventilation générale mécanique</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';
  [['oui','Oui'],['non','Non'],['autre','Autre']].forEach(function(o){
    var sel=(vgVal===o[0]);
    h+='<button type="button" class="btn btn-small '+(sel?'btn-primary':'btn-gray')+'" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventGenerale\',\''+o[0]+'\');render();">'+o[1]+'</button>';
  });
  h+='</div>';
  if(vgVal==='autre'){
    h+='<input type="text" class="input" style="margin-bottom:8px;" value="'+escapeHtml(sb.ventGeneraleAutre||'')+'" placeholder="Préciser" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventGeneraleAutre\',this.value);">';
  }

  // 3) Captage localisé (Non => rien dans le Word)
  var vcVal=(sb.ventCaptage||'Non');
  h+='<div style="font-size:13px;color:var(--text-dark);margin-bottom:4px;">Captage localisé</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';
  ['Non','Inducteur','Enveloppant','Cabine ventilée de grande dimension','Autre'].forEach(function(opt){
    var sel=(vcVal===opt);
    h+='<button type="button" class="btn btn-small '+(sel?'btn-primary':'btn-gray')+'" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventCaptage\',\''+opt+'\');render();">'+opt+'</button>';
  });
  h+='</div>';
  if(vcVal==='Autre'){
    h+='<input type="text" class="input" value="'+escapeHtml(sb.ventCaptageAutre||'')+'" placeholder="Préciser" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'ventCaptageAutre\',this.value);">';
  }
  h+='</div>';

  // Scol@ : tâche, métier, type de procédé (listes Scol@), repris dans le bloc Scol@ de la feuille de calcul
  h+=renderScolaChamps(p,sb,idx);

  // Bouton Valider : grisé + pastille ⓘ si champs manquants
  if(sb.completed){
    h+='<button class="btn btn-success" onclick="toggleSubComplete('+p.id+','+idx+');">✓ Complété - Modifier</button></div>';
  }else{
    var missing=getMissingFields(p,sb);
    if(missing.length===0){
      h+='<button class="btn btn-success" onclick="toggleSubComplete('+p.id+','+idx+');">✓ Valider</button></div>';
    }else{
      h+='<div style="display:flex;gap:6px;align-items:stretch;">';
      h+='<button class="btn btn-gray" style="flex:1;opacity:0.7;cursor:not-allowed;" disabled>✓ Valider ('+missing.length+' manquant'+(missing.length>1?'s':'')+')</button>';
      h+='<button class="btn btn-small" style="background:#f59e0b;color:white;border:none;padding:0 14px;font-size:16px;font-weight:700;border-radius:8px;" onclick="showMissingFieldsModal('+p.id+','+idx+');" title="Voir les champs manquants">ⓘ</button>';
      h+='</div></div>';
    }
  }
  return h;
}

// FIX #4: Fonctions pour copier depuis J-1
function copyFromPrevious(pid,idx,field){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var prevSub=p.subPrelevements[idx-1];
  var currentSub=p.subPrelevements[idx];
  if(prevSub&&prevSub[field]){
    currentSub[field]=prevSub[field];
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function copyAgentDataFromPrevious(pid,idx,agentName,field){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var prevSub=p.subPrelevements[idx-1];
  var currentSub=p.subPrelevements[idx];
  if(prevSub&&prevSub.agentData&&prevSub.agentData[agentName]&&prevSub.agentData[agentName][field]){
    if(!currentSub.agentData)currentSub.agentData={};
    if(!currentSub.agentData[agentName])currentSub.agentData[agentName]={};
    var copiedVal=prevSub.agentData[agentName][field];
    currentSub.agentData[agentName][field]=copiedVal;
    // Point 1 : propager aux autres agents co-prélevés du même support (même jour),
    // comme la saisie manuelle (updateAgentDataSynced) — évite de cliquer J-1 sur chaque ligne.
    var coMembers=getCoPrelGroupMembers(currentSub,agentName);
    if(coMembers.length>1){
      coMembers.forEach(function(mn){
        if(mn!==agentName){
          if(!currentSub.agentData[mn])currentSub.agentData[mn]={};
          currentSub.agentData[mn][field]=copiedVal;
        }
      });
    }
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

// Conditions de prélèvement (ventilation, captage, EPI) recopiables d'un prélèvement à l'autre
var CONDITIONS_FIELDS=['ventEnv','ventEnvAutre','ventGenerale','ventGeneraleAutre','ventCaptage','ventCaptageAutre','epiType','epiDuree','scolaTache','scolaMetier','scolaProcede'];

// ═══════════════════════════════════════════════════════════
// SCOL@ : descripteurs de la mesure (tâche, métier, procédé) choisis dans les listes Scol@.
// Ventilation, captage, lieu et EPI viennent des champs ci-dessus ; le reste est déduit à l'export.
// ═══════════════════════════════════════════════════════════
var SCOLA_CHAMPS=[
  {cle:'scolaTache',liste:'tache',label:'Tâche',placeholder:'Rechercher une tâche (ex. pistolet, ponçage)…'},
  {cle:'scolaMetier',liste:'metier',label:'Métier',placeholder:'Rechercher un métier (ex. peintre, soudeur)…'}
];

function scolaNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}

function renderScolaChamps(p,sb,idx){
  // sans le modèle de feuille de calcul, ces descripteurs ne servent à rien : non affichés
  if(typeof SCOLA_LISTES==='undefined'||typeof FC_MODELE_DISPO==='undefined'||FC_MODELE_DISPO!==true)return '';
  var h='<div class="field"><label class="label">Scol@</label>';
  SCOLA_CHAMPS.forEach(function(c){
    h+='<div style="font-size:13px;color:var(--text-dark);margin:6px 0 4px;">'+c.label+'</div>';
    if(sb[c.cle]){
      h+='<div style="display:flex;align-items:center;gap:6px;background:var(--primary-pale);border-radius:8px;padding:6px 8px;font-size:12px;"><span style="flex:1;">'+escapeHtml(sb[c.cle])+'</span>';
      h+='<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\''+c.cle+'\',\'\');render();">Changer</button></div>';
    }else{
      h+='<input type="text" class="input" style="margin-bottom:4px;" placeholder="'+escapeHtml(c.placeholder)+'" oninput="scolaRechercher('+p.id+','+idx+',\''+c.cle+'\',this.value);">';
      h+='<div id="scola-res-'+c.cle+'"></div>';
    }
  });
  h+='<div style="font-size:13px;color:var(--text-dark);margin:6px 0 4px;">Type de procédé</div><div style="display:flex;gap:6px;flex-wrap:wrap;">';
  SCOLA_LISTES.procede.forEach(function(o){
    var sel=(sb.scolaProcede===o);
    var court=o.replace(/\s*\(anciennement[^)]*\)/,'');
    h+='<button type="button" class="btn btn-small '+(sel?'btn-primary':'btn-gray')+'" style="width:auto;" onclick="updateSubFieldWithAutoDate('+p.id+','+idx+',\'scolaProcede\','+(sel?'\'\'':'\''+escapeJs(o)+'\'')+');render();">'+escapeHtml(court)+'</button>';
  });
  h+='</div></div>';
  return h;
}

// Recherche dans une liste Scol@ sans tout redessiner (garde le clavier ouvert)
function scolaRechercher(pid,idx,cle,valeur){
  var box=document.getElementById('scola-res-'+cle);
  if(!box)return;
  var c=SCOLA_CHAMPS.find(function(x){return x.cle===cle;});
  var mots=scolaNorm(valeur).split(/\s+/).filter(function(w){return w.length>=2;});
  if(!mots.length){box.innerHTML='';return;}
  var res=[];
  var liste=SCOLA_LISTES[c.liste];
  for(var i=0;i<liste.length&&res.length<8;i++){
    var n=scolaNorm(liste[i]);
    if(mots.every(function(w){return n.indexOf(w)!==-1;}))res.push(liste[i]);
  }
  var h='';
  if(!res.length)h='<div style="font-size:12px;color:var(--text-muted);padding:4px;">Aucun résultat dans la liste Scol@</div>';
  else{
    h='<div class="search-results">';
    res.forEach(function(r){
      h+='<div class="search-result-item" onmousedown="event.preventDefault();" onclick="updateSubFieldWithAutoDate('+pid+','+idx+',\''+cle+'\',\''+escapeJs(r)+'\');render();">'+escapeHtml(r)+'</div>';
    });
    h+='</div>';
  }
  box.innerHTML=h;
}

function hasConditionsSaisies(sb){
  return !!sb&&CONDITIONS_FIELDS.some(function(f){return sb[f]!==undefined&&sb[f]!==''&&!(f==='epiType'&&sb[f]==='sans objet');});
}

// Source : jour précédent du même prélèvement ; pour le 1er jour, le dernier prélèvement
// du même GEH saisi à la même date (même opérateur / poste en général).
function findConditionsSource(m,p,idx){
  if(idx>0)return {sb:p.subPrelevements[idx-1],label:'le jour précédent'};
  var sb=p.subPrelevements[idx];
  var found=null;
  m.prelevements.forEach(function(o){
    if(o.id===p.id||o.gehId!==p.gehId)return;
    o.subPrelevements.forEach(function(s){
      if(s.date&&s.date===sb.date&&hasConditionsSaisies(s))found={sb:s,label:o.agents.map(function(a){return a.name;}).join(', ')+' ('+o.type+')'};
    });
  });
  return found;
}

function copyConditionsFrom(pid,idx){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p||!p.subPrelevements[idx])return;
  var src=findConditionsSource(m,p,idx);
  if(!src)return;
  var sb=p.subPrelevements[idx];
  CONDITIONS_FIELDS.forEach(function(f){
    if(src.sb[f]!==undefined)sb[f]=src.sb[f];else delete sb[f];
  });
  saveData('vlep_missions_v3',state.missions);
  render();
}

// FIX #5: Fonctions avec auto-date
function getTodayDate(){
  var d=new Date();
  return d.toISOString().split('T')[0];
}

function autoFillDate(p,idx){
  var sb=p.subPrelevements[idx];
  if(!sb.date){
    sb.date=getTodayDate();
  }
}

function updateSubFieldWithAutoDate(pid,idx,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    p.subPrelevements[idx][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
  }
}

function updateAgentDataWithAutoDate(pid,idx,an,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    if(!p.subPrelevements[idx].agentData)p.subPrelevements[idx].agentData={};
    if(!p.subPrelevements[idx].agentData[an])p.subPrelevements[idx].agentData[an]={};
    p.subPrelevements[idx].agentData[an][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
  }
}

function updatePlageWithAutoDate(pid,idx,pi,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    p.subPrelevements[idx].plages[pi][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function handleDebitInput(input){
  var v=input.value;
  v=v.replace(/[^0-9.,]/g,'');
  v=v.replace(',','.');
  input.value=v;
}

function renderDebitVariation(pid,idx,aname){render();}

function updateSubField(pid,idx,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){p.subPrelevements[idx][f]=v;saveData('vlep_missions_v3',state.missions);}
}

function updateAgentData(pid,idx,an,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    if(!p.subPrelevements[idx].agentData)p.subPrelevements[idx].agentData={};
    if(!p.subPrelevements[idx].agentData[an])p.subPrelevements[idx].agentData[an]={};
    p.subPrelevements[idx].agentData[an][f]=v;
    saveData('vlep_missions_v3',state.missions);
  }
}

function updatePlage(pid,idx,pi,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){p.subPrelevements[idx].plages[pi][f]=v;saveData('vlep_missions_v3',state.missions);render();}
}

function addPlage(pid,idx){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p&&p.subPrelevements[idx].plages.length<10){
    p.subPrelevements[idx].plages.push({debut:'',fin:''});
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function removePlage(pid,idx,pi){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p&&p.subPrelevements[idx].plages.length>1){
    p.subPrelevements[idx].plages.splice(pi,1);
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function getDureeTotale(pl){
  var mn=0;
  pl.forEach(function(x){
    if(x.debut&&x.fin){
      var d=x.debut.split(':'),f=x.fin.split(':');
      var df=(parseInt(f[0])*60+parseInt(f[1]))-(parseInt(d[0])*60+parseInt(d[1]));
      if(df>0)mn+=df;
    }
  });
  if(mn<=0)return'';
  return Math.floor(mn/60)+'h'+(mn%60<10?'0':'')+(mn%60);
}

// Facteurs de protection assignés : onglet « FPA » de la feuille de calcul Contrôle des VLEP (v73).
// Le FPA lui-même est calculé par la feuille à partir de l'intitulé court.
var EPI_FPA=[
  {norme:'EN 149',court:'FFP1',long:'demi-masque filtrant FFP1',fpa:4},
  {norme:'EN 149',court:'FFP2',long:'demi-masque filtrant FFP2',fpa:10},
  {norme:'EN 149',court:'FFP3',long:'demi-masque filtrant FFP3',fpa:10},
  {norme:'EN 405',court:'FFGazX P1',long:'demi-masque filtrant à soupape FFGazX P1',fpa:4},
  {norme:'EN 405',court:'FFGazX P2',long:'demi-masque filtrant à soupape FFGazX P2',fpa:10},
  {norme:'EN 405',court:'FFGazX P3',long:'demi-masque filtrant à soupape FFGazX P3',fpa:10},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque P1',long:'demi-masque ou quart de masque avec filtre P1',fpa:4},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque P2',long:'demi-masque ou quart de masque avec filtre P2',fpa:10},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque P3',long:'demi-masque ou quart de masque avec filtre P3',fpa:10},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque GazX',long:'demi-masque ou quart de masque avec filtre GazX',fpa:10},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque GazX P1',long:'demi-masque ou quart de masque avec filtre GazX P1',fpa:4},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque GazX P2',long:'demi-masque ou quart de masque avec filtre GazX P2',fpa:12},
  {norme:'EN 140 / EN 143 / EN 14387 / EN 12083',court:'1/2 ou 1/4 masque GazX P3',long:'demi-masque ou quart de masque avec filtre GazX P3',fpa:10},
  {norme:'EN 1827',court:'FM P1',long:'demi-masque filtrant sans soupape respiratoire FM P1',fpa:4},
  {norme:'EN 1827',court:'FM P2',long:'demi-masque filtrant sans soupape respiratoire FM P2',fpa:10},
  {norme:'EN 1827',court:'FM P3',long:'demi-masque filtrant sans soupape respiratoire FM P3',fpa:20},
  {norme:'EN 1827',court:'FM GazX',long:'demi-masque filtrant sans soupape respiratoire FM GazX',fpa:10},
  {norme:'EN 1827',court:'FM GazX P1',long:'demi-masque filtrant sans soupape respiratoire FM GazX P1',fpa:4},
  {norme:'EN 1827',court:'FM GazX P2',long:'demi-masque filtrant sans soupape respiratoire FM GazX P2',fpa:12},
  {norme:'EN 1827',court:'FM GazX P3',long:'demi-masque filtrant sans soupape respiratoire FM GazX P3',fpa:48},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet P1',long:'masque complet P1',fpa:4},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet P2',long:'masque complet P2',fpa:10},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet P3',long:'masque complet P3',fpa:30},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet GazX',long:'masque complet GazX',fpa:20},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet GazX P1',long:'masque complet GazX P1',fpa:5},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet GazX P2',long:'masque complet GazX P2',fpa:16},
  {norme:'EN 136 / EN 143 / EN 14387 / EN 12083',court:'masque complet GazX P3',long:'masque complet GazX P3',fpa:20},
  {norme:'EN 12941',court:'TH1',long:'appareils filtrants à ventilation assistée avec cagoule ou casque TH1',fpa:10},
  {norme:'EN 12941',court:'TH2',long:'appareils filtrants à ventilation assistée avec cagoule ou casque TH2',fpa:20},
  {norme:'EN 12941',court:'TH3',long:'appareils filtrants à ventilation assistée avec cagoule ou casque TH3',fpa:40},
  {norme:'EN 12942',court:'TM1',long:'appareils filtrants à ventilation assistée avec masque complet, mi-masque ou quart de masque TM1',fpa:10},
  {norme:'EN 12942',court:'TM2',long:'appareils filtrants à ventilation assistée avec masque complet, mi-masque ou quart de masque TM2',fpa:20},
  {norme:'EN 12942',court:'TM3',long:'appareils filtrants à ventilation assistée avec masque complet, mi-masque ou quart de masque TM3',fpa:60},
  {norme:'EN 14593-1',court:'EN 14593-1',long:'isolant à adduction d\'air comprimé avec soupape à la demande - masque complet',fpa:40},
  {norme:'EN 14593-2',court:'EN 14593-2',long:'isolant à adduction d\'air comprimé avec soupape à la demande - demi-masque à pression positive',fpa:200},
  {norme:'EN 14594',court:'EN 14594 type 1A / 1B',long:'isolant à adduction d\'air comprimé à débit continu 1A / 1B',fpa:10},
  {norme:'EN 14594',court:'EN 14594 type 2A / 2B',long:'isolant à adduction d\'air comprimé à débit continu 2A / 2B',fpa:50},
  {norme:'EN 14594',court:'EN 14594 type 3A / 3B',long:'isolant à adduction d\'air comprimé à débit continu 3A / 3B',fpa:200},
  {norme:'EN 14594',court:'EN 14594 type 4A / 4B',long:'isolant à adduction d\'air comprimé à débit continu 4A / 4B',fpa:250},
  {norme:'EN 138',court:'1/2 masque avec tuyau alimentation',long:'tuyau d\'alimentation en air, isolant, demi-masque',fpa:10},
  {norme:'EN 138',court:'masque complet avec tuyau alim',long:'tuyau d\'alimentation en air, isolant, masque complet',fpa:40},
  {norme:'EN 269',court:'isolant à air libre avec cagoule',long:'isolant à air libre avec cagoule',fpa:100},
  {norme:'EN 137',court:'EN 137 à pression négative',long:'autonome à circuit ouvert à air comprimé, demande à pression négative',fpa:40},
  {norme:'EN 137',court:'EN 137 à pression positive',long:'autonome à circuit ouvert à air comprimé, demande à pression positive',fpa:1000},
  {norme:'EN 145',court:'EN 145',long:'isolant autonome à circuit fermé, du type à oxygène-azote comprimé',fpa:400},
  {norme:'EN 402',court:'EN 402',long:'autonome à circuit ouvert, à air comprimé, avec masque complet ou embout buccal pour l\'évacuation',fpa:1000}
];

function selectEPI(pid,idx,opt){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p||!p.subPrelevements[idx])return;
  var sb=p.subPrelevements[idx];
  if(opt==='Autre'){
    sb.epiType='';
  }else{
    sb.epiType=opt;
    if(opt==='sans objet')sb.epiDuree='';
  }
  saveData('vlep_missions_v3',state.missions);
  render();
}

function toggleSubComplete(pid,idx){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    p.subPrelevements[idx].completed=!p.subPrelevements[idx].completed;
    updateMissionStatus(m);
    saveData('vlep_missions_v3',state.missions);
    state.view='terrain-mission';
    render();
  }
}

function updateMissionStatus(m){
  var t=0,d=0;
  m.prelevements.forEach(function(p){p.subPrelevements.forEach(function(s){t++;if(s.completed)d++;});});
  if(d===0)m.status='validee';
  else if(d===t)m.status='terminee';
  else m.status='encours';
}

// FIX #7: Conditions ambiantes responsive mobile

// ===== CO-PRÉLÈVEMENT : MÊME SUPPORT =====

function getCoPrelGroupIndex(sb,agentName){
  if(!sb.coPrelGroups)return -1;
  for(var i=0;i<sb.coPrelGroups.length;i++){
    if(sb.coPrelGroups[i].indexOf(agentName)!==-1)return i;
  }
  return -1;
}

function getCoPrelGroupMembers(sb,agentName){
  var idx=getCoPrelGroupIndex(sb,agentName);
  if(idx===-1)return [];
  return sb.coPrelGroups[idx];
}

// Détection : deux agents partagent le même support physique si
// Code support identique (non vide) ET Code prétraitement identique (vides acceptés)
function agentsShareSamePhysicalSupport(name1,name2){
  if(typeof getAgentFromDB!=='function')return false;
  var a1=getAgentFromDB(name1);
  var a2=getAgentFromDB(name2);
  if(!a1||!a2)return false;
  var cs1=((a1['Code support']||'')+'').trim();
  var cs2=((a2['Code support']||'')+'').trim();
  var cp1=((a1['Code prétraitement']||'')+'').trim();
  var cp2=((a2['Code prétraitement']||'')+'').trim();
  return cs1!==''&&cs1===cs2&&cp1===cp2;
}

function checkMatchingSupports(){
  var pid=state.coPrelTargetPid;
  var agentName=state.coPrelTargetAgent;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  if(!state.coPrelSelection)state.coPrelSelection={};
  p.agents.forEach(function(a){
    if(a.name!==agentName&&agentsShareSamePhysicalSupport(agentName,a.name)){
      state.coPrelSelection[a.name]=true;
    }
  });
  render();
}

function linkAgentsOnSupport(pid,subIdx,agentName,targetName){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var sb=p.subPrelevements[subIdx];
  if(!sb.coPrelGroups)sb.coPrelGroups=[];
  var gi1=getCoPrelGroupIndex(sb,agentName);
  var gi2=getCoPrelGroupIndex(sb,targetName);
  if(gi1===-1&&gi2===-1){
    sb.coPrelGroups.push([agentName,targetName]);
  }else if(gi1!==-1&&gi2===-1){
    sb.coPrelGroups[gi1].push(targetName);
  }else if(gi1===-1&&gi2!==-1){
    sb.coPrelGroups[gi2].push(agentName);
  }else if(gi1!==gi2){
    var merged=sb.coPrelGroups[gi1].concat(sb.coPrelGroups[gi2]);
    var hi=Math.max(gi1,gi2);var lo=Math.min(gi1,gi2);
    sb.coPrelGroups.splice(hi,1);
    sb.coPrelGroups.splice(lo,1);
    sb.coPrelGroups.push(merged);
  }
  // Synchro des données depuis agentName vers targetName
  if(!sb.agentData)sb.agentData={};
  if(!sb.agentData[agentName])sb.agentData[agentName]={};
  if(!sb.agentData[targetName])sb.agentData[targetName]={};
  var src=sb.agentData[agentName];
  ['numPompe','debitInitial','debitFinal','refEchantillon'].forEach(function(f){
    if(src[f])sb.agentData[targetName][f]=src[f];
  });
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  render();
}

function unlinkAgentFromSupport(pid,subIdx,agentName){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  // Propagation : on délie sur tous les sous-prélèvements du prélèvement
  // (cohérent avec le défaut de propagation du modal "Même support")
  p.subPrelevements.forEach(function(sb){
    if(!sb.coPrelGroups)return;
    var gi=getCoPrelGroupIndex(sb,agentName);
    if(gi===-1)return;
    var pos=sb.coPrelGroups[gi].indexOf(agentName);
    if(pos!==-1)sb.coPrelGroups[gi].splice(pos,1);
    if(sb.coPrelGroups[gi].length<2)sb.coPrelGroups.splice(gi,1);
  });
  saveData('vlep_missions_v3',state.missions);
  render();
}

function updateAgentDataSynced(pid,idx,an,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var sb=p.subPrelevements[idx];
  if(!sb.agentData)sb.agentData={};
  if(!sb.agentData[an])sb.agentData[an]={};
  sb.agentData[an][f]=v;
  var members=getCoPrelGroupMembers(sb,an);
  var inGroup=members.length>1;
  if(inGroup){
    members.forEach(function(mn){
      if(mn!==an){
        if(!sb.agentData[mn])sb.agentData[mn]={};
        sb.agentData[mn][f]=v;
      }
    });
  }
  autoFillDate(p,idx);
  saveData('vlep_missions_v3',state.missions);
  if(inGroup)render();
}

function showLinkAgentModal(pid,subIdx,agentName){
  state.coPrelTargetPid=pid;
  state.coPrelTargetSubIdx=subIdx;
  state.coPrelTargetAgent=agentName;
  // Initialise la sélection avec les agents déjà liés au source
  state.coPrelSelection={};
  var m=getCurrentMission();
  if(m){
    var p=m.prelevements.find(function(x){return x.id===pid;});
    if(p&&p.subPrelevements[subIdx]){
      var sb=p.subPrelevements[subIdx];
      var members=getCoPrelGroupMembers(sb,agentName);
      members.forEach(function(n){
        if(n!==agentName)state.coPrelSelection[n]=true;
      });
    }
  }
  // Propagation par défaut activée (utile pour réglementaire J1/J2/J3)
  state.coPrelPropagateAll=true;
  state.showModal='linkAgent';
  render();
}

function renderLinkAgentModal(){
  var pid=state.coPrelTargetPid;
  var subIdx=state.coPrelTargetSubIdx;
  var agentName=state.coPrelTargetAgent;
  var m=getCurrentMission();if(!m)return'';
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return'';
  var sb=p.subPrelevements[subIdx];
  var otherAgents=p.agents.filter(function(a){return a.name!==agentName;});
  var selection=state.coPrelSelection||{};
  var nbSubs=p.subPrelevements.length;
  var propagate=state.coPrelPropagateAll!==false;
  var h='<div class="modal show" onclick="if(event.target===this){closeCoPrelModal();}"><div class="modal-content"><div class="modal-header"><h2>🔗 Même support</h2><button class="close-btn" onclick="closeCoPrelModal();">×</button></div>';
  h+='<div class="info-box mb-12"><p>Agents partageant le même support physique que <strong>'+escapeHtml(agentName)+'</strong> :</p></div>';
  if(otherAgents.length===0){
    h+='<p style="color:#6b7280;text-align:center;padding:16px;">Aucun autre agent dans ce prélèvement</p>';
    h+='<button class="btn btn-gray mt-12" style="width:100%;" onclick="closeCoPrelModal();">Fermer</button>';
  }else{
    // Détection d'agents partageant support + prétraitement (purement informative)
    var matchCount=0;
    otherAgents.forEach(function(a){
      if(agentsShareSamePhysicalSupport(agentName,a.name))matchCount++;
    });
    if(matchCount>0){
      h+='<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">';
      h+='<span style="font-size:12px;color:#92400e;">🎯 '+matchCount+' agent'+(matchCount>1?'s':'')+' avec support + prétraitement identiques</span>';
      h+='<button class="btn btn-small" style="font-size:11px;padding:2px 8px;background:#f59e0b;color:white;border:none;border-radius:4px;" onclick="checkMatchingSupports();">Cocher</button>';
      h+='</div>';
    }
    otherAgents.forEach(function(a){
      var isChecked=!!selection[a.name];
      var matches=agentsShareSamePhysicalSupport(agentName,a.name);
      h+='<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;">';
      h+='<input type="checkbox" '+(isChecked?'checked':'')+' onchange="toggleCoPrelSelection(\''+escapeJs(a.name)+'\');" style="width:20px;height:20px;cursor:pointer;flex-shrink:0;">';
      h+='<div style="width:10px;height:10px;border-radius:50%;background:'+(a.color||'#3b82f6')+';flex-shrink:0;"></div>';
      h+='<span style="flex:1;">'+escapeHtml(a.name)+'</span>';
      if(matches)h+='<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:600;flex-shrink:0;">🎯 Support identique</span>';
      h+='</label>';
    });
    if(nbSubs>1){
      h+='<label style="display:flex;align-items:center;gap:10px;padding:12px 0;margin-top:8px;border-top:2px solid var(--border);cursor:pointer;background:#f9fafb;border-radius:4px;padding:12px 8px;">';
      h+='<input type="checkbox" '+(propagate?'checked':'')+' onchange="toggleCoPrelPropagate();" style="width:20px;height:20px;cursor:pointer;flex-shrink:0;">';
      h+='<span style="font-size:14px;font-weight:500;">Appliquer à tous les sous-prélèvements (J1 à J'+nbSubs+')</span>';
      h+='</label>';
    }
    var selectedCount=Object.keys(selection).length;
    h+='<div class="row mt-12" style="gap:8px;">';
    h+='<button class="btn btn-gray" style="flex:1;" onclick="closeCoPrelModal();">Annuler</button>';
    h+='<button class="btn btn-blue" style="flex:1;" onclick="applyCoPrelSelection();">✓ Valider ('+selectedCount+')</button>';
    h+='</div>';
  }
  h+='</div></div>';
  return h;
}

function closeCoPrelModal(){
  state.showModal=null;
  state.coPrelSelection=null;
  state.coPrelPropagateAll=null;
  render();
}

function toggleCoPrelSelection(agentName){
  if(!state.coPrelSelection)state.coPrelSelection={};
  if(state.coPrelSelection[agentName])delete state.coPrelSelection[agentName];
  else state.coPrelSelection[agentName]=true;
  render();
}

function toggleCoPrelPropagate(){
  state.coPrelPropagateAll=!(state.coPrelPropagateAll!==false);
  render();
}

function applyCoPrelSelection(){
  var pid=state.coPrelTargetPid;
  var subIdx=state.coPrelTargetSubIdx;
  var sourceName=state.coPrelTargetAgent;
  var selection=state.coPrelSelection||{};
  var propagateAll=state.coPrelPropagateAll!==false;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var targets={};
  Object.keys(selection).forEach(function(n){targets[n]=true;});
  var subsToUpdate=propagateAll?p.subPrelevements.map(function(_,i){return i;}):[subIdx];
  subsToUpdate.forEach(function(si){
    var sb=p.subPrelevements[si];
    if(!sb.coPrelGroups)sb.coPrelGroups=[];
    if(!sb.agentData)sb.agentData={};
    // 1. Groupe actuel du source
    var currentGi=getCoPrelGroupIndex(sb,sourceName);
    var currentGroup=currentGi!==-1?sb.coPrelGroups[currentGi].slice():[sourceName];
    // 2. Retirer les agents désélectionnés (garder source + sélectionnés)
    var stillLinked=currentGroup.filter(function(n){
      return n===sourceName||targets[n];
    });
    // 3. Ajouter les nouveaux sélectionnés
    Object.keys(targets).forEach(function(n){
      if(stillLinked.indexOf(n)===-1){
        // Si l'agent est dans un autre groupe, l'en retirer d'abord
        var oldGi=getCoPrelGroupIndex(sb,n);
        if(oldGi!==-1){
          var oldGroup=sb.coPrelGroups[oldGi];
          var pos=oldGroup.indexOf(n);
          if(pos!==-1)oldGroup.splice(pos,1);
          if(oldGroup.length<2)sb.coPrelGroups.splice(oldGi,1);
        }
        stillLinked.push(n);
      }
    });
    // 4. Supprimer l'ancien groupe du source (recalcul car index peut avoir bougé)
    currentGi=getCoPrelGroupIndex(sb,sourceName);
    if(currentGi!==-1)sb.coPrelGroups.splice(currentGi,1);
    // 5. Créer le nouveau groupe si 2+ membres
    if(stillLinked.length>=2){
      sb.coPrelGroups.push(stillLinked);
      // 6. Sync des données source → cibles (uniquement si source a des données)
      if(!sb.agentData[sourceName])sb.agentData[sourceName]={};
      var src=sb.agentData[sourceName];
      stillLinked.forEach(function(mn){
        if(mn!==sourceName){
          if(!sb.agentData[mn])sb.agentData[mn]={};
          ['numPompe','debitInitial','debitFinal','refEchantillon'].forEach(function(f){
            if(src[f])sb.agentData[mn][f]=src[f];
          });
        }
      });
    }
  });
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.coPrelSelection=null;
  state.coPrelPropagateAll=null;
  render();
}

// ═══════════════════════════════════════════════════════════
// MULTI-SUPPORTS : prélèvement 8h fractionné sur plusieurs supports successifs
// (ex. 6 h de méthanol = 3 supports de 2 h). Chaque support a ses plages, ses débits
// et sa référence ; il sort sur sa propre colonne / ligne analytique à l'export.
// ═══════════════════════════════════════════════════════════

function renderSupportsSupp(p,sb,idx){
  if(p.type!=='8h'||!p.agents||!p.agents.length)return '';
  if(p.agents.every(function(a){return isAnalyseurAgent(a.name);}))return ''; // mesure en continu : pas de supports
  var ex=getSupportsSupp(sb);
  var h='';
  ex.forEach(function(s,k){
    var num=k+2;
    var pl=s.plages&&s.plages.length?s.plages:[{debut:'',fin:''}];
    h+='<div class="card" style="border:1.5px solid var(--primary-light);padding:10px;margin:8px 0;">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><strong style="color:var(--primary-dark);">Support n°'+num+'</strong>';
    var d=getDureeTotale(pl);
    h+='<span style="font-size:12px;color:var(--text-muted);margin-left:auto;margin-right:8px;">'+(d?'Durée : '+d:'')+'</span>';
    h+='<button class="btn btn-danger btn-small" style="width:auto;margin:0;" onclick="removeSupportSupp('+p.id+','+idx+','+k+');">'+ICONS.trash+'</button></div>';
    // Plages du support
    pl.forEach(function(x,pi){
      h+='<div class="plage-row"><div class="plage-num">'+(pi+1)+'</div><input type="time" class="plage-input" value="'+(x.debut||'')+'" onchange="updateSupportPlage('+p.id+','+idx+','+k+','+pi+',\'debut\',this.value);"><span class="plage-sep">'+ICONS.arrowRight+'</span><input type="time" class="plage-input" value="'+(x.fin||'')+'" onchange="updateSupportPlage('+p.id+','+idx+','+k+','+pi+',\'fin\',this.value);">';
      if(pl.length>1)h+='<button class="plage-delete" onclick="removeSupportPlage('+p.id+','+idx+','+k+','+pi+');">✕</button>';
      h+='</div>';
    });
    if(pl.length<10)h+='<button class="btn btn-gray btn-small" onclick="addSupportPlage('+p.id+','+idx+','+k+');">+ Plage</button>';
    // Un bloc par agent (ou par groupe d'agents sur le même support physique)
    p.agents.forEach(function(a){
      var aname=a.name;
      var grp=getCoPrelGroupMembers(sb,aname);
      var grpOrdered=grp.length>1?p.agents.filter(function(x){return grp.indexOf(x.name)!==-1;}):[a];
      if(grpOrdered[0].name!==aname||isAnalyseurAgent(aname))return;
      var ad=(s.agentData&&s.agentData[aname])||{};
      var isTachy=isTachymetreAgent(aname);
      var u=isTachy?'tr/min':'L/min';
      var variation=isTachy?null:calcDebitVariation(ad.debitInitial,ad.debitFinal);
      var ctrls=isTachy?[]:grpOrdered.map(function(x){return checkDebitMoyen(x.name,p.type,ad.debitInitial,ad.debitFinal);}).filter(function(c){return c;});
      var horsTol=ctrls.some(function(c){return c.horsTolerance;})||(variation!==null&&variation>5);
      var call=function(f){return 'updateSupportAgentData('+p.id+','+idx+','+k+',\''+escapeJs(aname)+'\',\''+f+'\',this.value);';};
      h+='<div class="multi-agent-item" style="border:1px solid var(--border);border-radius:8px;margin-top:8px;"><div class="multi-agent-header" style="padding:6px 8px;flex-wrap:wrap;gap:4px;">';
      grpOrdered.forEach(function(ga){
        h+='<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;"><span style="width:8px;height:8px;border-radius:50%;background:'+(ga.color||'#3b82f6')+';"></span>'+escapeHtml(ga.name)+'</span>';
      });
      h+='</div><div class="multi-agent-fields" style="padding:6px 8px;">';
      h+='<div class="multi-agent-row"><label>N° Pompe</label><input type="text" class="input" style="flex:1;" value="'+escapeHtml(ad.numPompe||'')+'" placeholder="Ex: 123" onchange="'+call('numPompe')+'"></div>';
      if(isTachy)h+='<div class="multi-agent-row"><label>Vitesse réf. ('+u+')</label><input type="text" inputmode="decimal" class="input" style="flex:1;" value="'+escapeHtml(ad.debitRef||'')+'" placeholder="'+u+'" onchange="'+call('debitRef')+'render();"></div>';
      h+='<div class="multi-agent-row"><label>'+(isTachy?'Vitesse':'Débit')+' initial'+(isTachy?'e':'')+'</label><input type="text" inputmode="decimal" class="input '+(horsTol?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitInitial||'')+'" placeholder="'+u+'" onchange="'+call('debitInitial')+'render();"></div>';
      h+='<div class="multi-agent-row"><label>'+(isTachy?'Vitesse':'Débit')+' final'+(isTachy?'e':'')+'</label><input type="text" inputmode="decimal" class="input '+(horsTol?'debit-input warning':'')+'" style="flex:1;" value="'+escapeHtml(ad.debitFinal||'')+'" placeholder="'+u+'" onchange="'+call('debitFinal')+'render();">';
      if(variation!==null)h+='<span class="debit-variation '+(variation>5?'warning':'')+'">Δ '+variation.toFixed(1)+'%</span>';
      h+='</div>';
      if(variation!==null&&variation>5)h+='<div style="color:#dc2626;font-size:11px;padding:4px 0;">⚠️ Écart entre débit initial et final > 5 %</div>';
      ctrls.forEach(function(c){
        h+='<div style="color:'+(c.horsTolerance?'#dc2626':'var(--text-muted)')+';font-size:11px;padding:4px 0;">'+(c.horsTolerance?'⚠️ ':'')+'Débit moyen '+formatDebit(c.moy)+' L/min '+(c.horsTolerance?'hors':'dans')+' tolérance (attendu '+formatDebit(c.range.min)+(c.range.min!==c.range.max?' – '+formatDebit(c.range.max):'')+' L/min ± 5 %)</div>';
      });
      h+='<div class="multi-agent-row"><label>Réf. échant.</label><input type="text" value="'+escapeHtml(ad.refEchantillon||'')+'" placeholder="Référence..." onchange="'+call('refEchantillon')+'"></div>';
      h+='</div></div>';
    });
    h+='</div>';
  });
  h+='<button class="btn btn-gray btn-small" style="margin:6px 0;" onclick="addSupportSupp('+p.id+','+idx+');">+ Support (prélèvement fractionné)</button>';
  return h;
}

function getSubForSupport(pid,idx){
  var m=getCurrentMission();if(!m)return null;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p||!p.subPrelevements[idx])return null;
  return {p:p,sb:p.subPrelevements[idx]};
}

function addSupportSupp(pid,idx){
  var r=getSubForSupport(pid,idx);if(!r)return;
  if(!r.sb.supportsSupp)r.sb.supportsSupp=[];
  var ad={};
  // Même pompe que le support n°1 par défaut (cas le plus courant : on change seulement le support)
  r.p.agents.forEach(function(a){
    var src=(r.sb.agentData&&r.sb.agentData[a.name])||{};
    ad[a.name]={numPompe:src.numPompe||'',debitInitial:'',debitFinal:'',refEchantillon:''};
    if(src.debitRef)ad[a.name].debitRef=src.debitRef;
  });
  r.sb.supportsSupp.push({plages:[{debut:'',fin:''}],agentData:ad});
  autoFillDate(r.p,idx);
  saveData('vlep_missions_v3',state.missions);
  render();
}

function removeSupportSupp(pid,idx,k){
  var r=getSubForSupport(pid,idx);if(!r||!r.sb.supportsSupp)return;
  if(!confirm('Supprimer le support n°'+(k+2)+' et ses saisies ?'))return;
  r.sb.supportsSupp.splice(k,1);
  if(!r.sb.supportsSupp.length)delete r.sb.supportsSupp;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function updateSupportPlage(pid,idx,k,pi,f,v){
  var r=getSubForSupport(pid,idx);if(!r)return;
  var s=r.sb.supportsSupp[k];
  if(!s.plages||!s.plages.length)s.plages=[{debut:'',fin:''}];
  s.plages[pi][f]=v;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function addSupportPlage(pid,idx,k){
  var r=getSubForSupport(pid,idx);if(!r)return;
  var s=r.sb.supportsSupp[k];
  if(!s.plages||!s.plages.length)s.plages=[{debut:'',fin:''}];
  if(s.plages.length<10)s.plages.push({debut:'',fin:''});
  saveData('vlep_missions_v3',state.missions);
  render();
}

function removeSupportPlage(pid,idx,k,pi){
  var r=getSubForSupport(pid,idx);if(!r)return;
  var s=r.sb.supportsSupp[k];
  if(s.plages&&s.plages.length>1)s.plages.splice(pi,1);
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Même logique que updateAgentDataSynced : un support physique partagé garde des données communes
function updateSupportAgentData(pid,idx,k,an,f,v){
  var r=getSubForSupport(pid,idx);if(!r)return;
  var s=r.sb.supportsSupp[k];
  if(!s.agentData)s.agentData={};
  var cibles=getCoPrelGroupMembers(r.sb,an);
  if(cibles.length<2)cibles=[an];
  cibles.forEach(function(n){
    if(!s.agentData[n])s.agentData[n]={};
    s.agentData[n][f]=v;
  });
  saveData('vlep_missions_v3',state.missions);
}

console.log('✓ Terrain chargé');
