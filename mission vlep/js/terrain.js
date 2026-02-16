/*
 * VLEP Mission v3.8 - terrain.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module Saisie terrain :
 * - Liste missions terrain
 * - Vue mission (accordion GEH, prélèvements)
 * - Formulaire sous-prélèvement
 * - Fusion manuelle & intelligente
 * - Timer CT, dictée vocale, timer global
 * - Conditions ambiantes
 * - Validation pré-export
 */

// ===== LISTE TERRAIN =====
function renderTerrainList(){
  var h='<button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button><div class="card"><h1>'+ICONS.clipboard+' Saisie terrain</h1><p class="subtitle">Missions prêtes pour le terrain</p></div>';
  h+='<button class="btn btn-success mb-12" onclick="openQuickEntry();">'+ICONS.zap+' Saisie rapide (sans prépa)</button>';
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

// ===== VUE MISSION =====
function renderTerrainMission(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-list';render();return'';}
  var h='<div class="sticky-header"><button class="back-btn" onclick="state.view=\'terrain-list\';state.currentMissionId=null;render();">'+ICONS.arrowLeft+' Liste</button><div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:white;font-weight:700;font-size:14px;">'+escapeHtml(m.clientSite)+'</div><div class="row" style="gap:4px;"><button class="btn btn-gray btn-small btn-icon" onclick="unvalidateMissionFromTerrain();" title="Repasser en prépa" style="background:rgba(255,255,255,0.15);color:white;border:none;">'+ICONS.arrowLeft+'</button><button class="btn btn-danger btn-icon" onclick="deleteMissionTerrain();" style="width:24px;height:24px;">'+ICONS.trash+'</button></div></div></div>';
  h+='<div class="card" style="margin-top:4px;"><p class="subtitle"><span class="svg-icon">'+ICONS.user+'</span> '+escapeHtml(m.preleveur||'-')+' • <span class="svg-icon">'+ICONS.tool+'</span> '+escapeHtml(m.debitmetre||'-')+'</p></div>';
  // CIP Agent selection
  if(m.agents&&m.agents.length>0){
    var hasCIP=m.cipAgents&&m.cipAgents.length>0;
    h+='<div class="card" style="padding:8px 10px;margin-bottom:8px;border:1px solid '+(hasCIP?'#f59e0b':'#e5e7eb')+';"><div style="display:flex;align-items:center;gap:6px;margin-bottom:'+(state.showCIPSection?'6':'0')+'px;cursor:pointer;" onclick="state.showCIPSection=!state.showCIPSection;render();"><span class="svg-icon" style="color:#f59e0b;">'+ICONS.zap+'</span><span style="font-size:12px;font-weight:600;color:#92400e;">Pompe CIP</span><span style="font-size:10px;color:#b45309;margin-left:auto;">'+(hasCIP?m.cipAgents.length+' agent(s)':'aucun')+'</span><span style="font-size:11px;color:#94a3b8;">'+ICONS.chevronRight+'</span></div>';
    if(state.showCIPSection){
      h+='<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      m.agents.forEach(function(a){
        var ic=isAgentCIP(m,a.name);
        h+='<button style="padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:1.5px solid '+(ic?'#f59e0b':'#dce8f0')+';background:'+(ic?'#fef3c7':'white')+';color:'+(ic?'#92400e':'#94a3b8')+';transition:all 0.15s;" onclick="toggleCIPAgent(\''+escapeJs(a.name)+'\');">'+escapeHtml(a.name)+(ic?' ✓':'')+'</button>';
      });
      h+='</div>';
    }
    h+='</div>';
  }
  h+='<div class="row mb-12"><button class="btn btn-gray" onclick="state.view=\'conditions\';render();">'+ICONS.thermometer+' Conditions</button><button class="btn btn-blue" onclick="state.view=\'liste-echantillons\';render();">'+ICONS.list+' Échantillons</button></div>';
  h+='<div class="row mb-12"><button class="btn btn-gray" onclick="exportMissionJSON('+m.id+');">'+ICONS.download+' Export JSON</button></div>';
  h+='<div class="row mb-12"><button class="btn btn-success btn-small" onclick="state.showModal=\'addGehTerrain\';render();">+ GEH</button><button class="btn btn-primary btn-small" onclick="state.showModal=\'addPrelTerrain\';render();">+ Prélèvement</button><button class="btn btn-gray btn-small" onclick="editMissionFromTerrain();">'+ICONS.edit+' Modifier</button></div>';
  if(state.fusionMode){
    h+='<div class="info-box info-box-warning mb-12"><p><strong>Mode fusion manuelle actif</strong></p><p>Sélectionnez les prélèvements à fusionner (même GEH, même type)</p></div><div class="row mb-12"><button class="btn btn-gray" onclick="cancelFusion();">Annuler</button><button class="btn btn-success" onclick="doFusion();" '+(state.selectedForFusion.length<2?'disabled':'')+'>Fusionner ('+state.selectedForFusion.length+')</button></div>';
  }else{
    h+='<div class="row mb-12"><button class="btn btn-success" onclick="showSmartFusionModal();">'+ICONS.zap+' Fusionner intelligemment</button><button class="btn btn-orange" onclick="startFusionMode();">'+ICONS.merge+' Fusion manuelle</button></div>';
  }
  var byGeh={};
  m.prelevements.forEach(function(p){var k=p.gehId;if(!byGeh[k])byGeh[k]=[];byGeh[k].push(p);});
  m.gehs.filter(function(g){return g.name;}).forEach(function(g){
    var ps=byGeh[g.id]||[];
    var dc=0,tc=0;
    ps.forEach(function(p){p.subPrelevements.forEach(function(s){tc++;if(s.completed)dc++;});});
    var isOpen=state.expandedGeh[g.id];
    h+='<div class="accordion"><div class="accordion-header '+(isOpen?'open':'')+'" onclick="toggleGehAccordion('+g.id+');"><span class="accordion-icon">'+ICONS.chevronRight+'</span><span class="accordion-title">'+g.num+'. '+escapeHtml(g.name)+'</span><span class="accordion-count">'+dc+'/'+tc+'</span><button class="btn btn-danger btn-icon" style="width:24px;height:24px;margin-left:6px;font-size:11px;" onclick="event.stopPropagation();deleteGehTerrain('+g.id+');">'+ICONS.trash+'</button></div><div class="accordion-body '+(isOpen?'open':'')+'">';
    if(ps.length===0){
      h+='<div class="empty-state" style="padding:16px;color:#6b7280;"><p>Aucun prélèvement</p></div>';
    }else{
      ps.forEach(function(p){
        var allDone=p.subPrelevements.every(function(s){return s.completed;});
        var mc=p.agents&&p.agents[0]?p.agents[0].color:'#3b82f6';
        var isSelected=state.selectedForFusion.indexOf(p.id)!==-1;
        var agentNames=p.agents&&p.agents.length>0?p.agents.map(function(a){return escapeHtml(a.name);}).join(' + '):'Agent inconnu';
        h+='<div class="prel-item '+(isSelected?'selected':'')+'" style="background:'+lightenColor(mc,0.85)+';">';
        if(state.fusionMode){
          h+='<div class="prel-checkbox '+(isSelected?'checked':'')+'" onclick="toggleFusionSelect('+p.id+');">✓</div>';
        }else{
          h+='<div class="prel-status '+(allDone?'done':'pending')+'" onclick="openPrel('+p.id+');">✓</div>';
        }
        h+='<div class="prel-content" onclick="'+(state.fusionMode?'toggleFusionSelect('+p.id+');':'openPrel('+p.id+');')+'"><div class="prel-title" style="color:'+mc+';">'+agentNames+'</div><div class="prel-subtitle">'+p.type+' • '+p.subPrelevements.length+' sous-prél. '+(p.agents.length>1?'<span style="background:var(--primary-pale);color:var(--primary);padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;margin-right:3px;">Co-prél ×'+p.agents.length+'</span>':'')+(p.isReglementaire?'<span class="prel-reg-badge">Régl.</span>':'<span class="prel-nonreg-badge">Non-régl.</span>')+'</div></div>';
        if(!state.fusionMode){
          if(p.agents&&p.agents.length>1)h+='<button class="btn btn-gray btn-icon" style="width:24px;height:24px;font-size:11px;margin-right:2px;" onclick="event.stopPropagation();defusionPrel('+p.id+');" title="Défusionner">'+ICONS.merge+'</button>';
          h+='<button class="btn btn-danger btn-icon" style="width:24px;height:24px;font-size:11px;margin-right:2px;" onclick="event.stopPropagation();deletePrelTerrain('+p.id+');">'+ICONS.trash+'</button>';
        }
        h+='<div class="prel-arrow" onclick="'+(state.fusionMode?'toggleFusionSelect('+p.id+');':'openPrel('+p.id+');')+'">'+ICONS.arrowRight+'</div></div>';
      });
    }
    h+='</div></div>';
  });
  if(state.showModal==='addGehTerrain')h+=renderAddGehTerrainModal();
  if(state.showModal==='addPrelTerrain')h+=renderAddPrelTerrainModal();
  if(state.showModal==='smartFusion')h+=renderSmartFusionModal();
  return h;
}

function toggleGehAccordion(gid){state.expandedGeh[gid]=!state.expandedGeh[gid];render();}

function deleteMissionTerrain(){
  var m=getCurrentMission();if(!m)return;
  if(!confirm('Supprimer la mission "'+m.clientSite+'" ?\n\nToutes les données seront perdues !'))return;
  state.missions=state.missions.filter(function(x){return x.id!==m.id;});
  saveData('vlep_missions_v3',state.missions);
  state.currentMissionId=null;
  state.view='terrain-list';
  render();
}

// ===== AJOUT/SUPPRESSION GEH & PRÉL TERRAIN =====
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
  var newGeh={id:generateId(),num:m.gehs.length+1,name:name};
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
  m.prelevements=m.prelevements.filter(function(p){return p.gehId!==gehId;});
  m.gehs=m.gehs.filter(function(g){return g.id!==gehId;});
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
  if(!state.newPrelData)state.newPrelData={gehId:null,agents:[],type:'8h',isReg:true,agentSearch:''};
  var d=state.newPrelData;
  h+='<div class="field"><label class="label">GEH *</label><select class="input" onchange="state.newPrelData.gehId=this.value;render();">';
  h+='<option value="">-- Sélectionner --</option>';
  m.gehs.filter(function(g){return g.name;}).forEach(function(g){
    h+='<option value="'+g.id+'" '+(d.gehId==g.id?'selected':'')+'>'+g.num+'. '+escapeHtml(g.name)+'</option>';
  });
  h+='</select></div>';
  h+='<div class="field"><label class="label">Type de VLEP *</label><div class="row">';
  h+='<button class="btn btn-small '+(d.type==='8h'?'btn-primary':'btn-gray')+'" onclick="state.newPrelData.type=\'8h\';render();">8h</button>';
  h+='<button class="btn btn-small '+(d.type==='CT'?'btn-primary':'btn-gray')+'" onclick="state.newPrelData.type=\'CT\';render();">CT</button>';
  h+='</div></div>';
  h+='<div class="field"><label class="label">Statut</label><div class="row">';
  h+='<button class="btn btn-small '+(d.isReg?'btn-success':'btn-gray')+'" onclick="state.newPrelData.isReg=true;render();">Réglementaire</button>';
  h+='<button class="btn btn-small '+(!d.isReg?'btn-orange':'btn-gray')+'" onclick="state.newPrelData.isReg=false;render();">Non-réglementaire</button>';
  h+='</div></div>';
  h+='<div class="field"><label class="label">Agent(s) chimique(s) *</label>';
  h+='<input type="text" class="input" id="new-prel-agent-search" placeholder="Rechercher..." value="'+escapeHtml(d.agentSearch||'')+'" oninput="handleNewPrelAgentSearch(this.value);"></div>';
  h+='<div id="new-prel-search-results">';
  if(d.agentSearch&&d.agentSearch.length>=2){
    var results=searchAgentsDB(d.agentSearch);
    var filtered=results.filter(function(x){return!d.agents.some(function(a){return a.name===x;});});
    if(filtered.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      filtered.slice(0,6).forEach(function(x){
        h+='<div class="search-result-item" data-agent="'+escapeHtml(x)+'">'+escapeHtml(x)+'</div>';
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
  var subCount=d.isReg&&d.type==='8h'?3:1;
  h+='<div class="info-box info-box-success mt-12"><p>'+subCount+' sous-prélèvement(s) seront créés</p></div>';
  var canAdd=d.gehId&&d.agents.length>0;
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.newPrelData=null;render();">Annuler</button><button class="btn btn-primary" '+(canAdd?'':'disabled')+' onclick="addPrelTerrain();">Ajouter</button></div></div></div>';
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
        h+='<div class="search-result-item" data-agent="'+escapeHtml(x)+'">'+escapeHtml(x)+'</div>';
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
  var newPrel={id:generateId(),gehId:geh.id,gehName:geh.name,gehNum:geh.num,agents:d.agents.slice(),type:d.type,isReglementaire:d.isReg,subPrelevements:[]};
  for(var i=0;i<subCount;i++){
    var sub={id:generateId(),operateur:'',date:'',plages:[{debut:'',fin:''}],observations:'',completed:false,agentData:{}};
    d.agents.forEach(function(a){sub.agentData[a.name]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};});
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

// ===== FUSION MANUELLE =====
function startFusionMode(){
  state.fusionMode=true;
  state.selectedForFusion=[];
  var m=getCurrentMission();
  if(m)m.gehs.forEach(function(g){state.expandedGeh[g.id]=true;});
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
  for(var j=1;j<tm.length;j++){
    var o=tm[j];
    o.agents.forEach(function(a){if(!first.agents.some(function(x){return x.name===a.name;}))first.agents.push(a);});
    for(var s=0;s<first.subPrelevements.length&&s<o.subPrelevements.length;s++){
      if(!first.subPrelevements[s].agentData)first.subPrelevements[s].agentData={};
      if(o.subPrelevements[s].agentData){
        for(var an in o.subPrelevements[s].agentData){
          if(!first.subPrelevements[s].agentData[an])first.subPrelevements[s].agentData[an]=o.subPrelevements[s].agentData[an];
        }
      }
    }
    var idx=m.prelevements.findIndex(function(x){return x.id===o.id;});
    if(idx!==-1)m.prelevements.splice(idx,1);
  }
  saveData('vlep_missions_v3',state.missions);
  state.fusionMode=false;
  state.selectedForFusion=[];
  render();
}

// ===== DÉFUSION =====
function defusionPrel(prelId){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===prelId;});
  if(!p||!p.agents||p.agents.length<2){alert('Ce prélèvement ne contient qu\'un seul agent.');return;}
  if(!confirm('Défusionner ce prélèvement ?\nChaque agent redeviendra un prélèvement séparé.'))return;
  var newPrels=[];
  p.agents.forEach(function(agent){
    var np={id:Date.now()+Math.floor(Math.random()*1000),gehId:p.gehId,gehName:p.gehName,gehNum:p.gehNum,type:p.type,isReglementaire:p.isReglementaire,agents:[agent],subPrelevements:[]};
    p.subPrelevements.forEach(function(sub){
      var ns=JSON.parse(JSON.stringify(sub));
      ns.id=Date.now()+Math.floor(Math.random()*10000);
      if(ns.agentData){var kept={};if(ns.agentData[agent.name])kept[agent.name]=ns.agentData[agent.name];ns.agentData=kept;}
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

// ===== FUSION INTELLIGENTE =====
function analyzeGroupsForFusion(){
  var m=getCurrentMission();if(!m)return[];
  var groups=[];var processed={};
  m.prelevements.forEach(function(p){
    if(processed[p.id])return;
    var compatible=m.prelevements.filter(function(x){
      return x.gehId===p.gehId&&x.type===p.type&&x.isReglementaire===p.isReglementaire&&x.id!==p.id&&!processed[x.id];
    });
    if(compatible.length>0){
      var allInGroup=[p].concat(compatible);
      var gehInfo=m.gehs.find(function(g){return g.id===p.gehId;});
      var agentNames=[];
      allInGroup.forEach(function(pr){pr.agents.forEach(function(a){if(agentNames.indexOf(a.name)===-1)agentNames.push(a.name);});});
      var warnings=[];
      var operators={},dates={},supports={},codesPretrait={};
      allInGroup.forEach(function(pr){
        pr.subPrelevements.forEach(function(sub){if(sub.operateur)operators[sub.operateur]=true;if(sub.date)dates[sub.date]=true;});
        pr.agents.forEach(function(a){
          var ag=getAgentFromDB(a.name);
          if(ag){var sup=ag['Support de prélèvement']||'';var cp=ag['Code prétraitement']||'';if(sup)supports[sup]=true;if(cp)codesPretrait[cp]=true;}
        });
      });
      if(Object.keys(operators).length>1)warnings.push('Opérateurs différents');
      if(Object.keys(dates).length>1)warnings.push('Dates différentes');
      if(Object.keys(supports).length>1)warnings.push('Supports différents: '+Object.keys(supports).join(', '));
      if(Object.keys(codesPretrait).length>1)warnings.push('Codes prétraitement différents: '+Object.keys(codesPretrait).join(', '));
      groups.push({id:'group_'+p.id,gehId:p.gehId,gehName:gehInfo?gehInfo.name:'',gehNum:gehInfo?gehInfo.num:'',type:p.type,isReglementaire:p.isReglementaire,prelevements:allInGroup,agentNames:agentNames,warnings:warnings,selected:warnings.length===0});
      allInGroup.forEach(function(pr){processed[pr.id]=true;});
    }
  });
  return groups;
}

function showSmartFusionModal(){
  var groups=analyzeGroupsForFusion();
  if(groups.length===0){alert('Aucun prélèvement fusionnable trouvé.\n\nLes prélèvements doivent partager :\n- Même GEH\n- Même type (8h ou CT)\n- Même statut réglementaire');return;}
  state.showModal='smartFusion';
  state.fusionGroups=groups;
  render();
}

function renderSmartFusionModal(){
  if(!state.fusionGroups||state.fusionGroups.length===0)return'';
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;state.fusionGroups=null;render();}"><div class="modal-content" style="max-height:90vh;overflow-y:auto;"><div class="modal-header"><h2>'+ICONS.zap+' Fusion intelligente</h2><button class="close-btn" onclick="state.showModal=null;state.fusionGroups=null;render();">×</button></div>';
  var selectedCount=state.fusionGroups.filter(function(g){return g.selected;}).length;
  h+='<div class="info-box mb-12"><p><strong>'+state.fusionGroups.length+' groupe(s) fusionnable(s) détecté(s)</strong></p><p style="font-size:11px;margin-top:4px;">Décochez les groupes que vous ne souhaitez pas fusionner</p></div>';
  h+='<div class="row mb-12"><button class="btn btn-gray btn-small" onclick="toggleAllGroups(true);">Tout sélectionner</button><button class="btn btn-gray btn-small" onclick="toggleAllGroups(false);">Tout désélectionner</button></div>';
  state.fusionGroups.forEach(function(group){
    var hasWarnings=group.warnings.length>0;
    h+='<div class="card" style="padding:10px;margin-bottom:8px;border-left:4px solid '+(hasWarnings?'var(--warning)':'var(--accent)')+';">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
    h+='<input type="checkbox" '+(group.selected?'checked':'')+' onchange="toggleGroupSelection(\''+group.id+'\');" style="width:18px;height:18px;cursor:pointer;">';
    h+='<div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--text-dark);">'+group.gehNum+'. '+escapeHtml(group.gehName)+'</div>';
    h+='<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+group.type+' • '+(group.isReglementaire?'Réglementaire':'Non-régl.')+'</div></div>';
    h+='<div style="background:var(--primary-pale);color:var(--primary);padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">'+group.prelevements.length+' prél.</div></div>';
    h+='<div style="font-size:12px;color:var(--text-dark);margin-bottom:4px;"><strong>Agents:</strong> '+group.agentNames.map(escapeHtml).join(', ')+'</div>';
    if(hasWarnings)h+='<div style="background:#fef3c7;border-radius:6px;padding:6px 8px;font-size:11px;color:#b45309;"><strong>⚠ Attention:</strong> '+group.warnings.join(', ')+'</div>';
    h+='</div>';
  });
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.fusionGroups=null;render();">Annuler</button><button class="btn btn-success" onclick="doSmartFusion();" '+(selectedCount===0?'disabled':'')+'>Fusionner ('+selectedCount+')</button></div>';
  h+='</div></div>';
  return h;
}

function toggleGroupSelection(groupId){
  if(!state.fusionGroups)return;
  var group=state.fusionGroups.find(function(g){return g.id===groupId;});
  if(group)group.selected=!group.selected;
  render();
}

function toggleAllGroups(select){
  if(!state.fusionGroups)return;
  state.fusionGroups.forEach(function(g){g.selected=select;});
  render();
}

function doSmartFusion(){
  var m=getCurrentMission();
  if(!m||!state.fusionGroups)return;
  var selectedGroups=state.fusionGroups.filter(function(g){return g.selected;});
  if(selectedGroups.length===0){alert('Aucun groupe sélectionné');return;}
  var totalFused=0;
  selectedGroups.forEach(function(group){
    if(group.prelevements.length<2)return;
    var first=group.prelevements[0];
    for(var j=1;j<group.prelevements.length;j++){
      var other=group.prelevements[j];
      other.agents.forEach(function(a){if(!first.agents.some(function(x){return x.name===a.name;}))first.agents.push(a);});
      for(var s=0;s<first.subPrelevements.length&&s<other.subPrelevements.length;s++){
        if(!first.subPrelevements[s].agentData)first.subPrelevements[s].agentData={};
        if(other.subPrelevements[s].agentData){for(var an in other.subPrelevements[s].agentData){if(!first.subPrelevements[s].agentData[an])first.subPrelevements[s].agentData[an]=other.subPrelevements[s].agentData[an];}}
      }
      var idx=m.prelevements.findIndex(function(x){return x.id===other.id;});
      if(idx!==-1){m.prelevements.splice(idx,1);totalFused++;}
    }
  });
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.fusionGroups=null;
  render();
  alert('Fusion réussie !\n\n'+selectedGroups.length+' groupe(s) fusionné(s)\n'+totalFused+' prélèvement(s) fusionné(s)');
}

// ===== VUE PRÉLÈVEMENT =====
function openPrel(pid){
  if(state.fusionMode)return;
  state.currentPrelId=pid;
  state.activeSubIndex=0;
  state.view='terrain-prel';
  render();
}

function renderTerrainPrel(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-list';render();return'';}
  var p=m.prelevements.find(function(x){return x.id===state.currentPrelId;});
  if(!p){state.view='terrain-mission';render();return'';}
  var mc=p.agents&&p.agents[0]?p.agents[0].color:'#3b82f6';
  var agentNames=p.agents&&p.agents.length>0?p.agents.map(function(a){return escapeHtml(a.name||'???');}).join(' + '):'Agent inconnu';
  var h='<div class="sticky-header"><button class="back-btn" onclick="state.view=\'terrain-mission\';state.currentPrelId=null;render();">'+ICONS.arrowLeft+' Liste</button><div style="color:white;font-size:12px;opacity:0.85;">'+agentNames+' - '+p.type+' | GEH '+p.gehNum+'</div></div>';
  h+='<div class="card" style="border-left:4px solid '+mc+';"><h2 style="color:'+mc+';">'+agentNames+' - '+p.type+'</h2><p class="subtitle"><span class="svg-icon">'+ICONS.folder+'</span> GEH '+p.gehNum+' - '+escapeHtml(p.gehName)+' | '+(p.isReglementaire?'Réglementaire':'Non-régl.')+'</p></div>';
  if(p.subPrelevements.length>1){
    h+='<div class="tabs">';
    for(var t=0;t<p.subPrelevements.length;t++){
      var sb=p.subPrelevements[t];
      h+='<button class="tab '+(state.activeSubIndex===t?'active':'')+'" onclick="state.activeSubIndex='+t+';render();">Prél '+(t+1)+(sb.completed?' ✓':'')+'</button>';
    }
    h+='</div>';
  }
  h+=renderSubPrelForm(p,p.subPrelevements[state.activeSubIndex],state.activeSubIndex);
  return h;
}

// FIX #4 & #5: Boutons "Copier J-1" et auto-date
function renderSubPrelForm(p,sb,idx){
  var m=getCurrentMission();
  var canCopyFromPrevious=idx>0;
  var h='<div class="card">';
  if(canCopyFromPrevious){
    h+='<div style="display:flex;justify-content:flex-end;margin-bottom:6px;"><button class="btn btn-gray btn-small" style="font-size:10px;padding:4px 10px;" onclick="copyAllFromPrevious('+p.id+','+idx+');">'+ICONS.copy+' Copier tout J-1</button></div>';
  }
  h+='<div class="field"><div class="field-header"><label class="label">Opérateur / Point fixe</label>';
  if(canCopyFromPrevious)h+='<button class="copy-btn" onclick="copyFromPrevious('+p.id+','+idx+',\'operateur\');">'+ICONS.list+' J-1</button>';
  h+='</div><input type="text" class="input" value="'+escapeHtml(sb.operateur||'')+'" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'operateur\',this.value);"></div>';
  h+='<div class="field"><label class="label">Date</label><input type="date" class="input" value="'+(sb.date||'')+'" onchange="updateSubField('+p.id+','+idx+',\'date\',this.value);"></div>';
  h+='<div class="field"><label class="label"><span class="svg-icon">'+ICONS.beaker+'</span> Agent(s) chimique(s)</label>';
  if(!p.agents||p.agents.length===0){
    h+='<div class="info-box info-box-warning"><p>Aucun agent chimique défini</p></div>';
  }else{
    p.agents.forEach(function(a){
      if(!sb.agentData)sb.agentData={};
      var aname=a.name||'Agent inconnu';
      if(!sb.agentData[aname])sb.agentData[aname]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
      var ad=sb.agentData[aname];
      var isCIP=isAgentCIP(m,aname);
      var variation=isCIP?calcDebitVariationCIP(ad.debitInitial,ad.debitFinal):calcDebitVariation(ad.debitInitial,ad.debitFinal);
      var hasWarning=isCIP?(variation!==null&&variation>200):(variation!==null&&variation>5);
      h+='<div class="multi-agent-item"><div class="multi-agent-header"><div class="multi-agent-color" style="background:'+(a.color||'#3b82f6')+';"></div><div class="multi-agent-name">'+escapeHtml(aname)+'</div></div><div class="multi-agent-fields">';
      h+='<div class="multi-agent-row"><label>N° Pompe';
      if(canCopyFromPrevious)h+='<button class="copy-btn" onclick="copyAgentDataFromPrevious('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'numPompe\');">J-1</button>';
      h+='</label><input type="text" inputmode="numeric" value="'+escapeHtml(ad.numPompe||'')+'" placeholder="Ex: 123" onchange="updateAgentDataWithAutoDate('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'numPompe\',this.value);"></div>';
      h+='<div class="multi-agent-row"><label>Débit initial</label><input type="text" inputmode="decimal" class="debit-input '+(hasWarning?'warning':'')+'" value="'+escapeHtml(ad.debitInitial||'')+'" placeholder="L/min" oninput="handleDebitInput(this);" onchange="updateAgentDataWithAutoDate('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitInitial\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');"></div>';
      h+='<div class="multi-agent-row"><label>Débit final</label><input type="text" inputmode="decimal" class="debit-input '+(hasWarning?'warning':'')+'" value="'+escapeHtml(ad.debitFinal||'')+'" placeholder="L/min" oninput="handleDebitInput(this);" onchange="updateAgentDataWithAutoDate('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'debitFinal\',this.value);renderDebitVariation('+p.id+','+idx+',\''+escapeJs(aname)+'\');">';
      if(variation!==null){h+='<span class="debit-variation '+(hasWarning?'warning':'')+'">Δ '+variation.toFixed(1)+(isCIP?' mL/min':'%')+'</span>';}
      h+='</div>';
      h+='<div class="multi-agent-row"><label>Réf. échant.</label><input type="text" value="'+escapeHtml(ad.refEchantillon||'')+'" placeholder="Référence..." onchange="updateAgentDataWithAutoDate('+p.id+','+idx+',\''+escapeJs(aname)+'\',\'refEchantillon\',this.value);"></div>';
      h+='</div></div>';
    });
  }
  h+='</div>';
  // Timer CT
  if(p.type==='CT'){
    var timerRunning=isTimerRunning(p.id,idx);
    if(timerRunning){h+=getTimerDisplay(p.id,idx);}
    else{h+='<button class="btn btn-primary" style="width:100%;margin:8px 0;" onclick="startCTTimer('+p.id+','+idx+');">▶️ Démarrer chrono CT</button>';}
  }
  h+='<div class="field"><label class="label">Plages horaires</label>';
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
  h+='<div class="field"><label class="label">Observations</label><div style="display:flex;gap:6px;align-items:flex-start;"><textarea class="input" style="flex:1;" rows="2" id="obs-'+p.id+'-'+idx+'" onchange="updateSubFieldWithAutoDate('+p.id+','+idx+',\'observations\',this.value);">'+escapeHtml(sb.observations||'')+'</textarea><button class="dictation-btn" id="dict-btn-'+p.id+'-'+idx+'" onclick="toggleDictation('+p.id+','+idx+');" title="Dictée vocale">'+ICONS.mic+'</button></div></div>';
  h+='<button class="btn btn-success" onclick="toggleSubComplete('+p.id+','+idx+');">'+(sb.completed?'✓ Complété - Modifier':'✓ Valider')+'</button></div>';
  return h;
}

// ===== PLAGES =====
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

function renderDebitVariation(pid,idx,aname){render();}

// ===== CONDITIONS AMBIANTES =====
function renderConditions(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-mission';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.thermometer+' Conditions ambiantes</h2><p class="subtitle">Par jour de prélèvement</p><button class="btn btn-primary mt-12" onclick="addCondition();">+ Ajouter un jour</button></div>';
  if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
  if(m.conditionsAmbiantes.length===0)h+='<div class="empty-state"><p>Aucune condition saisie</p></div>';
  else m.conditionsAmbiantes.forEach(function(c,i){
    h+='<div class="condition-card">';
    h+='<div class="condition-date"><input type="date" class="input" style="margin:0;flex:1;max-width:160px;" value="'+(c.date||'')+'" onchange="updateCond('+i+',\'date\',this.value);"><button class="btn btn-danger btn-icon" onclick="deleteCond('+i+');">'+ICONS.trash+'</button></div>';
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.thermometer+' Température (°C)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="decimal" class="condition-input condition-input-i" value="'+(c.tempI||'')+'" placeholder="I" onchange="updateCond('+i+',\'tempI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="decimal" class="condition-input condition-input-f" value="'+(c.tempF||'')+'" placeholder="F" onchange="updateCond('+i+',\'tempF\',this.value);"></div></div></div>';
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.database+' Pression (hPa)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="numeric" class="condition-input condition-input-i" value="'+(c.pressionI||'')+'" placeholder="I" onchange="updateCond('+i+',\'pressionI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="numeric" class="condition-input condition-input-f" value="'+(c.pressionF||'')+'" placeholder="F" onchange="updateCond('+i+',\'pressionF\',this.value);"></div></div></div>';
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.droplet+' Humidité (%)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="numeric" class="condition-input condition-input-i" value="'+(c.humiditeI||'')+'" placeholder="I" onchange="updateCond('+i+',\'humiditeI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="numeric" class="condition-input condition-input-f" value="'+(c.humiditeF||'')+'" placeholder="F" onchange="updateCond('+i+',\'humiditeF\',this.value);"></div></div></div>';
    h+='</div>';
  });
  return h;
}

function addCondition(){
  var m=getCurrentMission();if(!m)return;
  if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
  m.conditionsAmbiantes.push({date:new Date().toISOString().split('T')[0],tempI:'',tempF:'',pressionI:'',pressionF:'',humiditeI:'',humiditeF:''});
  saveData('vlep_missions_v3',state.missions);
  render();
}

function updateCond(i,f,v){
  var m=getCurrentMission();
  if(m&&m.conditionsAmbiantes[i]){m.conditionsAmbiantes[i][f]=v;saveData('vlep_missions_v3',state.missions);}
}

function deleteCond(i){
  var m=getCurrentMission();
  if(m&&confirm('Supprimer ?')){m.conditionsAmbiantes.splice(i,1);saveData('vlep_missions_v3',state.missions);render();}
}

// ═══════════════════════════════════════════════════════════
// TIMER CT - Chronomètre pour prélèvements Court Terme
// ═══════════════════════════════════════════════════════════

function startCTTimer(prelId,subIdx){
  var key=prelId+'_'+subIdx;
  if(state.timers&&state.timers[key]&&state.timers[key].interval)clearInterval(state.timers[key].interval);
  if(!state.timers)state.timers={};
  var startTime=Date.now();
  state.timers[key]={startTime:startTime,elapsed:0,interval:setInterval(function(){updateTimerDisplay(key);},1000)};
  saveTimers();
  var now=new Date();
  var heureDebut=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  var m=getCurrentMission();if(!m)return;
  var prel=m.prelevements.find(function(p){return p.id===prelId;});if(!prel)return;
  var sub=prel.subPrelevements[subIdx];if(!sub)return;
  if(!sub.plages||sub.plages.length===0)sub.plages=[{debut:'',fin:''}];
  var plageIdx=-1;
  for(var i=0;i<sub.plages.length;i++){if(!sub.plages[i].debut){plageIdx=i;break;}}
  if(plageIdx===-1)sub.plages.push({debut:heureDebut,fin:''});
  else sub.plages[plageIdx].debut=heureDebut;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function stopCTTimer(prelId,subIdx){
  var key=prelId+'_'+subIdx;
  if(!state.timers||!state.timers[key])return;
  if(state.timers[key].interval)clearInterval(state.timers[key].interval);
  var now=new Date();
  var heureFin=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  var m=getCurrentMission();if(!m)return;
  var prel=m.prelevements.find(function(p){return p.id===prelId;});if(!prel)return;
  var sub=prel.subPrelevements[subIdx];if(!sub)return;
  var plageIdx=-1;
  for(var i=sub.plages.length-1;i>=0;i--){if(sub.plages[i].debut&&!sub.plages[i].fin){plageIdx=i;break;}}
  if(plageIdx!==-1)sub.plages[plageIdx].fin=heureFin;
  delete state.timers[key];
  saveTimers();
  saveData('vlep_missions_v3',state.missions);
  render();
}

function getTimerDisplay(prelId,subIdx){
  var key=prelId+'_'+subIdx;
  if(!state.timers||!state.timers[key])return'';
  var elapsed=Math.floor((Date.now()-state.timers[key].startTime)/1000);
  var minutes=Math.floor(elapsed/60);
  var seconds=elapsed%60;
  var timeStr=String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
  var color=elapsed>=900?'#ef4444':'#0066b3';
  return'<div style="background:#f0f7fc;border:2px solid '+color+';border-radius:8px;padding:12px;margin:8px 0;text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">⏱️ Chronomètre CT</div><div id="timer-display-'+key+'" style="font-size:32px;font-weight:bold;color:'+color+';font-family:monospace;">'+timeStr+'</div><button class="btn btn-danger" style="margin-top:8px;" onclick="stopCTTimer('+prelId+','+subIdx+');">⏹️ Arrêter</button></div>';
}

function isTimerRunning(prelId,subIdx){
  var key=prelId+'_'+subIdx;
  return state.timers&&state.timers[key]&&state.timers[key].interval;
}

function saveTimers(){
  var data={};
  for(var key in state.timers){if(state.timers[key]&&state.timers[key].startTime)data[key]={startTime:state.timers[key].startTime};}
  try{localStorage.setItem('vlep_timers',JSON.stringify(data));}catch(e){}
}

function restoreTimers(){
  try{
    var data=JSON.parse(localStorage.getItem('vlep_timers')||'{}');
    for(var key in data){
      if(data[key].startTime){
        state.timers[key]={startTime:data[key].startTime,elapsed:Math.floor((Date.now()-data[key].startTime)/1000),interval:setInterval((function(k){return function(){updateTimerDisplay(k);};})(key),1000)};
      }
    }
  }catch(e){}
}

function updateTimerDisplay(key){
  if(!state.timers||!state.timers[key])return;
  var timer=state.timers[key];
  var elapsed=Math.floor((Date.now()-timer.startTime)/1000);
  timer.elapsed=elapsed;
  var element=document.getElementById('timer-display-'+key);
  if(element){
    var minutes=Math.floor(elapsed/60);
    var seconds=elapsed%60;
    element.textContent=String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
    if(elapsed===900){
      element.style.color='#ef4444';
      element.style.fontWeight='bold';
      try{if(navigator.vibrate)navigator.vibrate([500,200,500,200,1000]);}catch(e){}
    }
  }
}

// ═══════════════════════════════════════════════════════════
// DICTÉE VOCALE
// ═══════════════════════════════════════════════════════════

function toggleDictation(prelId,subIdx){
  var key=prelId+'_'+subIdx;
  var btn=document.getElementById('dict-btn-'+prelId+'-'+subIdx);
  var textarea=document.getElementById('obs-'+prelId+'-'+subIdx);
  if(activeDictation&&activeDictation.key===key){
    activeDictation.stopped=true;
    if(activeDictation.recognition)try{activeDictation.recognition.stop();}catch(e){}
    activeDictation=null;
    if(btn)btn.classList.remove('recording');
    return;
  }
  if(activeDictation){
    activeDictation.stopped=true;
    if(activeDictation.recognition)try{activeDictation.recognition.stop();}catch(e){}
    var oldBtn=document.getElementById('dict-btn-'+activeDictation.prelId+'-'+activeDictation.subIdx);
    if(oldBtn)oldBtn.classList.remove('recording');
    activeDictation=null;
  }
  var SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){alert('Dictée vocale non supportée');return;}
  var recognition=new SpeechRecognition();
  recognition.lang='fr-FR';
  recognition.continuous=true;
  recognition.interimResults=true;
  var baseText=textarea?textarea.value:'';
  var finalTranscript='';
  var dictObj={key:key,prelId:prelId,subIdx:subIdx,recognition:recognition,stopped:false};
  recognition.onresult=function(event){
    var interim='';
    finalTranscript='';
    for(var i=event.resultIndex;i<event.results.length;i++){
      if(event.results[i].isFinal)finalTranscript+=event.results[i][0].transcript;
      else interim+=event.results[i][0].transcript;
    }
    var sep=baseText&&(finalTranscript||interim)?' ':'';
    if(textarea)textarea.value=baseText+sep+finalTranscript+interim;
  };
  recognition.onerror=function(event){if(event.error==='no-speech'||event.error==='aborted')return;};
  recognition.onend=function(){
    if(textarea){baseText=baseText+(baseText&&finalTranscript?' ':'')+finalTranscript;textarea.value=baseText;updateSubFieldWithAutoDate(prelId,subIdx,'observations',textarea.value);finalTranscript='';}
    if(!dictObj.stopped&&activeDictation&&activeDictation.key===key){try{recognition.start();}catch(e){activeDictation=null;if(btn)btn.classList.remove('recording');}}
    else{activeDictation=null;if(btn)btn.classList.remove('recording');}
  };
  recognition.start();
  activeDictation=dictObj;
  if(btn)btn.classList.add('recording');
}

// ═══════════════════════════════════════════════════════════
// TIMER GLOBAL FLOTTANT
// ═══════════════════════════════════════════════════════════

function renderGlobalTimer(){
  var existing=document.getElementById('global-timer-overlay');
  var tv=['terrain-list','terrain-mission','terrain-prel','conditions','liste-echantillons','quick-entry'];
  if(tv.indexOf(state.view)===-1&&!globalTimerState.running){if(existing)existing.remove();return;}
  if(!existing){existing=document.createElement('div');existing.id='global-timer-overlay';existing.className='global-timer';document.body.appendChild(existing);}
  var el=globalTimerState.elapsed;
  if(globalTimerState.running)el+=Date.now()-globalTimerState.startTime;
  var hrs=Math.floor(el/3600000),mins=Math.floor((el%3600000)/60000),secs=Math.floor((el%60000)/1000);
  var disp=(hrs>0?hrs+':':'')+String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
  existing.className='global-timer'+(globalTimerState.running?' running':'');
  existing.innerHTML='<span class="timer-display">⏱ '+disp+'</span>'+(globalTimerState.running?'<button class="timer-btn stop" onclick="event.stopPropagation();stopGlobalTimer();">⏸</button>':'<button class="timer-btn start" onclick="event.stopPropagation();startGlobalTimer();">▶</button>')+(el>0?'<button class="timer-btn reset" onclick="event.stopPropagation();resetGlobalTimer();">↺</button>':'');
}

function startGlobalTimer(){
  if(globalTimerState.running)return;
  globalTimerState.running=true;
  globalTimerState.startTime=Date.now();
  globalTimerState.interval=setInterval(function(){renderGlobalTimer();},1000);
  renderGlobalTimer();
}

function stopGlobalTimer(){
  if(!globalTimerState.running)return;
  globalTimerState.elapsed+=Date.now()-globalTimerState.startTime;
  globalTimerState.running=false;
  if(globalTimerState.interval)clearInterval(globalTimerState.interval);
  globalTimerState.interval=null;
  renderGlobalTimer();
}

function resetGlobalTimer(){
  if(globalTimerState.interval)clearInterval(globalTimerState.interval);
  globalTimerState={running:false,startTime:0,elapsed:0,interval:null};
  renderGlobalTimer();
}

// ===== VALIDATION PRÉ-EXPORT =====
function validateBeforeExport(){
  var m=getCurrentMission();if(!m){alert('Aucune mission');return;}
  var issues=[],warnings=[],ok=[];
  if(!m.clientSite)issues.push('Nom client/site manquant');else ok.push('Client/site : '+m.clientSite);
  if(!m.preleveur)warnings.push('Préleveur non renseigné');else ok.push('Préleveur : '+m.preleveur);
  if(!m.debitmetre)warnings.push('Débitmètre non renseigné');
  var totalSubs=0,missingRef=0,missingPompe=0,missingDebit=0,missingDate=0,missingPlages=0,debitWarn=0;
  m.prelevements.forEach(function(p){p.subPrelevements.forEach(function(sb){
    totalSubs++;if(!sb.date)missingDate++;
    if(!sb.plages||sb.plages.length===0||sb.plages.some(function(pl){return!pl.debut||!pl.fin;}))missingPlages++;
    if(p.agents){p.agents.forEach(function(a){var ad=(sb.agentData&&sb.agentData[a.name])||{};
      if(!ad.refEchantillon)missingRef++;if(!ad.numPompe)missingPompe++;
      if(!ad.debitInitial||!ad.debitFinal)missingDebit++;
      else{var ic=isAgentCIP(m,a.name);var v=ic?calcDebitVariationCIP(ad.debitInitial,ad.debitFinal):calcDebitVariation(ad.debitInitial,ad.debitFinal);
        if(v!==null&&((ic&&v>200)||(!ic&&v>5)))debitWarn++;}
    });}
  });});
  if(totalSubs===0)issues.push('Aucun sous-prélèvement');else ok.push(totalSubs+' sous-prélèvement(s)');
  if(missingRef>0)issues.push(missingRef+' réf. échantillon manquante(s)');
  if(missingPompe>0)warnings.push(missingPompe+' n° pompe manquant(s)');
  if(missingDebit>0)warnings.push(missingDebit+' débit(s) manquant(s)');
  if(missingDate>0)warnings.push(missingDate+' date(s) manquante(s)');
  if(missingPlages>0)warnings.push(missingPlages+' plage(s) horaire(s) incomplète(s)');
  if(debitWarn>0)issues.push(debitWarn+' variation(s) de débit hors norme');
  if(!m.conditionsAmbiantes||m.conditionsAmbiantes.length===0)warnings.push('Aucune condition ambiante');
  else ok.push(m.conditionsAmbiantes.length+' jour(s) de conditions');
  state.validationResult={ok:ok,warnings:warnings,issues:issues};
  state.showModal='validation';
  render();
}

function renderValidationModal(){
  var v=state.validationResult;if(!v)return'';
  var hasErr=v.issues.length>0;
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>'+ICONS.check+' Validation export</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  if(v.ok.length>0){h+='<div style="margin-bottom:8px;">';v.ok.forEach(function(t){h+='<div class="validation-item validation-ok">✓ '+escapeHtml(t)+'</div>';});h+='</div>';}
  if(v.warnings.length>0){h+='<div style="margin-bottom:8px;">';v.warnings.forEach(function(t){h+='<div class="validation-item validation-warn">⚠ '+escapeHtml(t)+'</div>';});h+='</div>';}
  if(v.issues.length>0){h+='<div style="margin-bottom:8px;">';v.issues.forEach(function(t){h+='<div class="validation-item validation-err">✗ '+escapeHtml(t)+'</div>';});h+='</div>';}
  if(hasErr)h+='<div class="info-box info-box-warning mt-8"><p><strong>Attention :</strong> des données sont manquantes.</p></div>';
  else if(v.warnings.length>0)h+='<div class="info-box mt-8"><p>Quelques champs optionnels manquants.</p></div>';
  else h+='<div class="info-box info-box-success mt-8"><p><strong>Tout est bon !</strong></p></div>';
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn '+(hasErr?'btn-warning':'btn-success')+'" onclick="state.showModal=null;exportExcel();">'+ICONS.download+' Exporter'+(hasErr?' quand même':'')+'</button></div>';
  h+='</div></div>';
  return h;
}
