/*
 * VLEP Mission v3.8 - prepa.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module Préparation mission :
 * - Liste des missions en prépa
 * - Édition mission (infos, GEH, agents, affectations)
 * - Validation & génération des prélèvements
 * - Prépa automatique depuis devis
 */

// ===== LISTE PRÉPA =====
function renderPrepaList(){
  var h='<button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button>';
  h+='<div class="card"><h1>'+ICONS.building+' Préparation mission</h1><p class="subtitle">Préparez vos missions au bureau</p><button class="btn btn-primary mt-12" onclick="createNewMission();">'+ICONS.plus+' Nouvelle mission</button></div>';
  var p=state.missions.filter(function(m){return m.status==='prepa';});
  var v=state.missions.filter(function(m){return m.status==='validee';});
  if(p.length===0&&v.length===0){
    h+='<div class="empty-state"><div class="empty-state-icon">'+ICONS.empty+'</div><p>Aucune mission</p></div>';
  }else{
    if(p.length>0){h+='<div class="section-title">En préparation</div>';p.forEach(function(m){h+=renderMissionCard(m);});}
    if(v.length>0){h+='<div class="section-title">Validées</div>';v.forEach(function(m){h+=renderMissionCard(m);});}
  }
  return h;
}

function renderMissionCard(m){
  var gc=m.gehs.filter(function(g){return g.name;}).length;
  var ac=m.agents.length;
  var pc=countPrelevements(m);
  var h='<div class="mission-card mission-card-'+m.status+'"><div class="mission-title">'+escapeHtml(m.clientSite||'Sans nom')+'<span class="status-badge status-'+m.status+'">'+(m.status==='prepa'?'Prépa':'Validée')+'</span></div>';
  h+='<div class="mission-info">'+gc+' GEH • '+ac+' agents • '+pc+' prél.</div><div class="mission-actions">';
  h+='<button class="btn btn-gray btn-small" onclick="openMission('+m.id+');">'+ICONS.edit+'</button>';
  h+='<button class="btn btn-blue btn-small" onclick="copyMission('+m.id+');">'+ICONS.copy+'</button>';
  if(m.status==='prepa')h+='<button class="btn btn-success btn-small" onclick="validateMission('+m.id+');">'+ICONS.check+' Valider</button>';
  else h+='<button class="btn btn-primary btn-small" onclick="goToTerrain('+m.id+');">'+ICONS.play+' Terrain</button>';
  h+='</div></div>';
  return h;
}

function countPrelevements(m){
  var c=0;
  for(var an in m.affectations){
    var a=m.affectations[an];
    for(var gid in a.gehs){
      var g=a.gehs[gid];
      if(g.has8h)c+=(a.isReg!==false?3:1);
      if(g.hasCT)c+=1;
    }
  }
  return c;
}

// ===== CRUD MISSION =====
function createNewMission(){
  var m=createEmptyMission();
  state.missions.push(m);
  saveData('vlep_missions_v3',state.missions);
  state.currentMissionId=m.id;
  state.showModal='editInfo';
  state.view='prepa-mission';
  render();
}

function openMission(id){state.currentMissionId=id;state.view='prepa-mission';render();}

function copyMission(id){
  var o=state.missions.find(function(m){return m.id===id;});
  if(!o)return;
  var c=JSON.parse(JSON.stringify(o));
  c.id=generateId();
  c.status='prepa';
  c.clientSite=o.clientSite+' (copie)';
  c.prelevements=[];
  c.conditionsAmbiantes=[];
  c.gehs.forEach(function(g){g.id=generateId();});
  state.missions.push(c);
  saveData('vlep_missions_v3',state.missions);
  render();
}

function deleteMission(id){
  if(confirm('Supprimer cette mission ?')){
    state.missions=state.missions.filter(function(m){return m.id!==id;});
    saveData('vlep_missions_v3',state.missions);
    state.currentMissionId=null;
    state.view='prepa-list';
    render();
  }
}

function unvalidateMission(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(m){m.status='prepa';m.prelevements=[];saveData('vlep_missions_v3',state.missions);render();}
}

function unvalidateMissionFromTerrain(){
  var m=getCurrentMission();
  if(!m)return;
  if(!confirm('Repasser cette mission en préparation ?\n\nToutes les données terrain seront conservées.'))return;
  m.status='prepa';
  saveData('vlep_missions_v3',state.missions);
  state.view='prepa-list';
  state.currentMissionId=null;
  render();
}

// ===== VUE MISSION =====
function renderPrepaMission(){
  var m=getCurrentMission();
  if(!m){state.view='prepa-list';render();return'';}
  var gc=m.gehs.filter(function(g){return g.name;}).length;
  var ac=m.agents.length;
  var pc=countPrelevements(m);
  var h='<button class="back-btn" onclick="state.view=\'prepa-list\';state.currentMissionId=null;render();">'+ICONS.arrowLeft+' Liste</button>';
  h+='<div class="card"><h2>'+ICONS.clipboard+' '+escapeHtml(m.clientSite||'Nouvelle mission')+'</h2><div class="info-box mt-12"><p><span class="svg-icon">'+ICONS.user+'</span> Préleveur : <strong>'+escapeHtml(m.preleveur||'-')+'</strong></p><p><span class="svg-icon">'+ICONS.tool+'</span> Débitmètre : <strong>'+escapeHtml(m.debitmetre||'-')+'</strong></p></div><button class="btn btn-gray btn-small mt-12" onclick="state.showModal=\'editInfo\';render();">'+ICONS.edit+' Modifier infos</button></div>';
  var step1=gc>0;var step2=ac>0;var step3=pc>0;
  h+='<div class="info-box mt-12"><p><strong>Étapes de préparation :</strong></p>';
  h+='<p>'+(step1?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 1. Définir les GEH ('+(gc||'aucun')+')</p>';
  h+='<p>'+(step2?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 2. Sélectionner les agents ('+(ac||'aucun')+')</p>';
  h+='<p>'+(step3?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 3. Affecter agents / GEH ('+(pc||'aucun')+' prél.)</p></div>';
  h+='<div class="nav-menu"><div class="nav-item" onclick="state.view=\'prepa-geh\';render();"><div class="nav-icon">'+ICONS.folder+'</div><div class="nav-label">1. GEH</div><div class="nav-count">'+gc+'</div></div><div class="nav-item" onclick="state.view=\'prepa-agents\';state.searchText=\'\';render();"><div class="nav-icon green">'+ICONS.beaker+'</div><div class="nav-label">2. Agents chimiques</div><div class="nav-count">'+ac+'</div></div></div>';
  if(ac>0&&gc>0)h+='<button class="btn btn-orange" onclick="state.view=\'prepa-affectations\';render();">'+ICONS.link+' 3. Affecter agents aux GEH</button>';
  h+='<div class="info-box info-box-success mt-12"><p><strong>Récap :</strong> '+gc+' GEH • '+ac+' agents • '+pc+' prélèvements</p></div>';
  h+='<div class="row">';
  if(m.status==='prepa'){
    if(pc>0)h+='<button class="btn btn-success" onclick="validateMission('+m.id+');">'+ICONS.check+' Valider ('+pc+')</button>';
    else h+='<button class="btn btn-gray" disabled>'+ICONS.check+' Valider</button>';
  }else{
    h+='<button class="btn btn-primary" onclick="goToTerrain('+m.id+');">'+ICONS.play+' Terrain</button>';
    h+='<button class="btn btn-gray btn-small" onclick="unvalidateMission('+m.id+');">'+ICONS.arrowLeft+' Prépa</button>';
  }
  h+='<button class="btn btn-danger btn-icon" onclick="deleteMission('+m.id+');">'+ICONS.trash+'</button>';
  h+='</div>';
  h+='<div class="row mt-8"><button class="btn btn-gray" onclick="exportMissionJSON('+m.id+');">'+ICONS.download+' Export JSON</button></div>';
  if(state._returnToTerrain)h+='<button class="btn btn-primary mt-8" onclick="returnToTerrain();">'+ICONS.check+' Retour au terrain</button>';
  if(m.status==='prepa')h+='<button class="btn btn-primary mt-8" onclick="state.showModal=\'prepaAuto\';state.prepaAutoData=null;render();" style="background:linear-gradient(135deg,var(--purple),#a78bfa);">'+ICONS.zap+' Prépa automatique (devis)</button>';
  if(state.showModal==='editInfo')h+=renderEditInfoModal(m);
  if(state.showModal==='prepaAuto')h+=renderPrepaAutoModal(m);
  return h;
}

// ===== MODAL INFOS =====
function renderEditInfoModal(m){
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>Infos mission</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<div class="field"><label class="label">Client / Site *</label><input type="text" class="input" id="edit-clientsite" value="'+escapeHtml(m.clientSite)+'" placeholder="Ex: Entreprise ABC - Usine Nord"></div>';
  h+='<div class="field"><label class="label">Préleveur</label><input type="text" class="input" id="edit-preleveur" value="'+escapeHtml(m.preleveur)+'"></div>';
  h+='<div class="field"><label class="label">Débitmètre</label><input type="text" inputmode="numeric" class="input" id="edit-debitmetre" value="'+escapeHtml(m.debitmetre)+'"></div>';
  h+='<div class="row"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-primary" onclick="saveEditInfo();">Enregistrer</button></div></div></div>';
  return h;
}

function saveEditInfo(){
  var m=getCurrentMission();if(!m)return;
  var cs=document.getElementById('edit-clientsite');
  var pr=document.getElementById('edit-preleveur');
  var db=document.getElementById('edit-debitmetre');
  if(cs)m.clientSite=cs.value.trim();
  if(pr)m.preleveur=pr.value.trim();
  if(db)m.debitmetre=db.value.trim();
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  render();
}

// ===== GEH =====
function renderPrepaGeh(){
  var m=getCurrentMission();
  if(!m){state.view='prepa-list';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'prepa-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.folder+' Groupes d\'Exposition Homogène</h2><p class="subtitle">Définissez les GEH pour cette mission</p></div><div class="section-title">GEH définis</div>';
  m.gehs.forEach(function(g,i){
    h+='<div class="geh-item"><div class="geh-num">'+g.num+'</div><input type="text" class="geh-input" value="'+escapeHtml(g.name)+'" placeholder="Nom du GEH..." onchange="updateGehName('+i+',this.value);"><button class="agent-delete" onclick="deleteGehPrepa('+i+');">'+ICONS.trash+'</button></div>';
  });
  h+='<button class="btn btn-primary" onclick="addGeh();">+ Ajouter un GEH</button>';
  return h;
}

function updateGehName(i,v){
  var m=getCurrentMission();
  if(m&&m.gehs[i]){m.gehs[i].name=v.trim();saveData('vlep_missions_v3',state.missions);}
}

function addGeh(){
  var m=getCurrentMission();if(!m)return;
  m.gehs.push({id:generateId(),num:m.gehs.length+1,name:''});
  saveData('vlep_missions_v3',state.missions);
  render();
}

function deleteGehPrepa(i){
  var m=getCurrentMission();if(!m)return;
  if(m.gehs.length<=1){alert('Vous devez garder au moins un GEH');return;}
  var geh=m.gehs[i];
  var msg='Supprimer ce GEH ?';
  if(geh.name)msg='Supprimer le GEH "'+geh.name+'" ?';
  if(!confirm(msg))return;
  for(var an in m.affectations){
    if(m.affectations[an].gehs&&m.affectations[an].gehs[geh.id]){
      delete m.affectations[an].gehs[geh.id];
    }
  }
  m.gehs.splice(i,1);
  m.gehs.forEach(function(g,idx){g.num=idx+1;});
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ===== AGENTS =====
function renderPrepaAgents(){
  var m=getCurrentMission();
  if(!m){state.view='prepa-list';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'prepa-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.beaker+' Agents chimiques</h2><p class="subtitle">Sélectionnez les ACD pour cette mission</p></div>';
  h+='<div class="search-box"><span class="search-icon">'+ICONS.search+'</span><input type="text" class="search-input" id="agent-search" placeholder="Rechercher un agent..." value="'+escapeHtml(state.searchText)+'" oninput="handleAgentSearchInput(this.value);"></div>';
  h+='<div id="search-results-container">';
  if(state.searchText.length>=2){
    var r=searchAgentsDB(state.searchText);
    var f=r.filter(function(x){return!m.agents.some(function(a){return a.name===x;});});
    if(f.length>0){
      h+='<div class="search-results">';
      f.slice(0,10).forEach(function(x){
        h+='<div class="search-result-item" data-agent="'+escapeHtml(x)+'">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  h+='<button class="btn btn-gray" onclick="state.showModal=\'addManual\';render();">+ Ajouter manuellement</button><div class="section-title">Agents sélectionnés ('+m.agents.length+')</div>';
  if(m.agents.length===0)h+='<div class="empty-state"><p>Aucun agent sélectionné</p></div>';
  else m.agents.forEach(function(a,i){
    var c=getAgentColor(m,a.name);
    h+='<div class="agent-item"><div class="agent-color" style="background:'+c+';"></div><div class="agent-name">'+escapeHtml(a.name)+(a.isManual?' <small>(manuel)</small>':'')+'</div><div class="agent-badges"><span class="agent-badge agent-badge-8h '+(a.is8h?'active':'')+'" onclick="toggleAgent8h('+i+');">8h</span><span class="agent-badge agent-badge-ct '+(a.isCT?'active':'')+'" onclick="toggleAgentCT('+i+');">CT</span></div><button class="agent-delete" onclick="removeAgent('+i+');">'+ICONS.trash+'</button></div>';
  });
  if(state.showModal==='addManual')h+=renderAddManualModal();
  return h;
}

// FIX #3: Handler qui ne fait pas de render() complet
function handleAgentSearchInput(value){
  state.searchText=value;
  updateSearchResultsOnly();
}

function updateSearchResultsOnly(){
  var container=document.getElementById('search-results-container');
  if(!container)return;
  var m=getCurrentMission();
  if(!m)return;
  var h='';
  if(state.searchText.length>=2){
    var r=searchAgentsDB(state.searchText);
    var f=r.filter(function(x){return!m.agents.some(function(a){return a.name===x;});});
    if(f.length>0){
      h+='<div class="search-results">';
      f.slice(0,10).forEach(function(x){
        h+='<div class="search-result-item" data-agent="'+escapeHtml(x)+'">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }
  }
  container.innerHTML=h;
}

function addAgentFromSearch(n){
  var m=getCurrentMission();
  if(!m||m.agents.some(function(a){return a.name===n;}))return;
  m.agents.push({name:n,is8h:hasVLEP8h(n),isCT:hasVLEPCT(n),isManual:false});
  state.searchText='';
  saveData('vlep_missions_v3',state.missions);
  render();
}

function renderAddManualModal(){
  return'<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>Ajouter agent</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div><div class="field"><label class="label">Nom de l\'agent</label><input type="text" class="input" id="manual-name" placeholder="Ex: Benzène"></div><div class="row"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-primary" onclick="addManualAgent();">Ajouter</button></div></div></div>';
}

function addManualAgent(){
  var n=document.getElementById('manual-name').value.trim();
  if(!n){alert('Saisissez un nom');return;}
  var m=getCurrentMission();
  if(!m||m.agents.some(function(a){return a.name===n;})){alert('Agent déjà ajouté');return;}
  m.agents.push({name:n,is8h:true,isCT:true,isManual:true});
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  render();
}

function removeAgent(i){
  var m=getCurrentMission();if(!m)return;
  var an=m.agents[i].name;
  m.agents.splice(i,1);
  delete m.affectations[an];
  saveData('vlep_missions_v3',state.missions);
  render();
}

function toggleAgent8h(i){
  var m=getCurrentMission();if(!m)return;
  var a=m.agents[i];
  a.is8h=!a.is8h;
  if(!a.is8h&&!a.isCT)a.isCT=true;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function toggleAgentCT(i){
  var m=getCurrentMission();if(!m)return;
  var a=m.agents[i];
  a.isCT=!a.isCT;
  if(!a.is8h&&!a.isCT)a.is8h=true;
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ===== AFFECTATIONS =====
function renderPrepaAffectations(){
  var m=getCurrentMission();
  if(!m){state.view='prepa-list';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'prepa-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.link+' Affectations</h2><p class="subtitle">Attribuez les agents aux GEH</p></div>';
  var ga=m.gehs.filter(function(g){return g.name;});
  if(ga.length===0){
    h+='<div class="info-box info-box-warning"><p>Définissez d\'abord au moins un GEH avec un nom</p></div>';
    return h;
  }
  m.agents.forEach(function(ag){
    if(!m.affectations[ag.name])m.affectations[ag.name]={gehs:{}};
    var af=m.affectations[ag.name];
    var c=getAgentColor(m,ag.name);
    var agentDB=getAgentFromDB(ag.name);
    var defaultIsReg=agentDB?(agentDB['Réglementaire']!=='Non'):true;
    h+='<div class="affect-card" style="border-left:4px solid '+c+';"><div class="affect-header"><div class="affect-agent">'+escapeHtml(ag.name)+'</div></div>';
    ga.forEach(function(g){
      if(!af.gehs[g.id])af.gehs[g.id]={has8h:false,hasCT:false,isReg8h:defaultIsReg,isRegCT:defaultIsReg};
      var gaf=af.gehs[g.id];
      // Migration: si isReg8h/isRegCT n'existent pas
      if(gaf.isReg8h===undefined){
        gaf.isReg8h=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:defaultIsReg);
      }
      if(gaf.isRegCT===undefined){
        gaf.isRegCT=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:defaultIsReg);
      }
      var can8h=ag.is8h;
      var canCT=ag.isCT;
      h+='<div class="affect-geh-row"><div class="affect-geh-name">'+g.num+'. '+escapeHtml(g.name)+'</div><div class="affect-geh-badges">';
      h+='<span class="affect-mini-badge '+(gaf.has8h?'active-8h':'')+' '+(!can8h?'disabled':'')+'" onclick="toggleGehAffect(\''+escapeJs(ag.name)+'\','+g.id+',\'8h\');">8h</span>';
      if(gaf.has8h){
        h+='<button class="affect-reg-toggle-mini '+(gaf.isReg8h?'':'nonreg')+'" onclick="toggleGehAffectReg(\''+escapeJs(ag.name)+'\','+g.id+',\'8h\');" title="'+(gaf.isReg8h?'8h Réglementaire':'8h Non réglementaire')+'">'+(gaf.isReg8h?'R':'NR')+'</button>';
      }
      h+='<span class="affect-mini-badge '+(gaf.hasCT?'active-ct':'')+' '+(!canCT?'disabled':'')+'" onclick="toggleGehAffect(\''+escapeJs(ag.name)+'\','+g.id+',\'CT\');">CT</span>';
      if(gaf.hasCT){
        h+='<button class="affect-reg-toggle-mini '+(gaf.isRegCT?'':'nonreg')+'" onclick="toggleGehAffectReg(\''+escapeJs(ag.name)+'\','+g.id+',\'CT\');" title="'+(gaf.isRegCT?'CT Réglementaire':'CT Non réglementaire')+'">'+(gaf.isRegCT?'R':'NR')+'</button>';
      }
      h+='</div></div>';
    });
    h+='</div>';
  });
  // === APERÇU CO-PRÉLÈVEMENT ===
  h+='<div class="section-title mt-12">'+ICONS.link+' Aperçu co-prélèvements</div>';
  h+='<div class="info-box mb-12"><p style="font-size:11px;">Les agents avec même <strong>support</strong>, <strong>prétraitement</strong> et <strong>débit</strong> seront prélevés sur la même cassette.</p></div>';
  var hasGroups=false;
  var gaFiltered=m.gehs.filter(function(g){return g.name;});
  gaFiltered.forEach(function(g){
    ['8h','CT'].forEach(function(type){
      [true,false].forEach(function(isReg){
        var groups=getCoPrelevementGroups(m,g.id,type,isReg);
        var multiGroups=[];
        for(var gk in groups){
          if(groups[gk].agents.length>1)multiGroups.push(groups[gk]);
        }
        if(multiGroups.length>0){
          hasGroups=true;
          multiGroups.forEach(function(grp){
            var info=grp.info;
            h+='<div class="card" style="padding:10px;margin-bottom:6px;border-left:4px solid var(--accent);background:#f0f7fc;">';
            h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
            h+='<div style="font-weight:700;font-size:12px;color:var(--primary);">'+ICONS.link+' Co-prélèvement</div>';
            h+='<div style="display:flex;gap:4px;">';
            h+='<span style="background:var(--primary-pale);color:var(--primary);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">'+g.num+'. '+escapeHtml(g.name)+'</span>';
            h+='<span style="background:'+(type==='8h'?'#dbeafe;color:#1d4ed8':'#fef3c7;color:#b45309')+';padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">'+type+'</span>';
            h+='<span style="background:'+(isReg?'#d1fae5;color:#065f46':'#fed7aa;color:#c2410c')+';padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">'+(isReg?'R':'NR')+'</span>';
            h+='</div></div>';
            h+='<div style="font-size:12px;margin-bottom:4px;">';
            grp.agents.forEach(function(an,i){
              var c=getAgentColor(m,an);
              h+='<span style="display:inline-block;background:'+lightenColor(c,0.8)+';border-left:3px solid '+c+';padding:2px 6px;border-radius:4px;margin:1px 2px;font-size:11px;">'+escapeHtml(an)+'</span>';
            });
            h+='</div>';
            if(info){
              h+='<div style="font-size:10px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">';
              h+='<span>Support: <strong>'+escapeHtml(info.support)+'</strong></span>';
              h+='<span>Prétrait: <strong>'+escapeHtml(info.pretrait)+'</strong></span>';
              h+='<span>Débit: <strong>'+escapeHtml(String(info.debit))+'</strong> L/min</span>';
              if(info.supportNom)h+='<span>('+escapeHtml(info.supportNom)+')</span>';
              h+='</div>';
            }
            h+='</div>';
          });
        }
      });
    });
  });
  if(!hasGroups){
    h+='<div class="card" style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px;">Aucun co-prélèvement détecté — chaque agent aura sa propre cassette</div>';
  }
  saveData('vlep_missions_v3',state.missions);
  return h;
}

function toggleGehAffectReg(an,gid,type){
  var m=getCurrentMission();
  if(!m||!m.affectations[an]||!m.affectations[an].gehs[gid])return;
  var gaf=m.affectations[an].gehs[gid];
  if(type==='8h'){gaf.isReg8h=!gaf.isReg8h;}
  else if(type==='CT'){gaf.isRegCT=!gaf.isRegCT;}
  saveData('vlep_missions_v3',state.missions);
  render();
}

function toggleGehAffect(an,gid,t){
  var m=getCurrentMission();
  if(!m||!m.affectations[an])return;
  var ag=m.agents.find(function(a){return a.name===an;});
  if(!ag)return;
  if(t==='8h'&&!ag.is8h)return;
  if(t==='CT'&&!ag.isCT)return;
  var ga=m.affectations[an].gehs[gid];
  if(!ga)ga=m.affectations[an].gehs[gid]={has8h:false,hasCT:false};
  if(t==='8h')ga.has8h=!ga.has8h;
  else ga.hasCT=!ga.hasCT;
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ===== VALIDATION & GÉNÉRATION =====
function validateMission(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(!m)return;
  generatePrelevements(m);
  if(m.prelevements.length===0){
    alert('Aucun prélèvement à générer.\n\nVérifiez :\n1. Au moins un GEH avec nom\n2. Au moins un agent avec 8h ou CT\n3. Des affectations agents ↔ GEH');
    return;
  }
  m.status='validee';
  saveData('vlep_missions_v3',state.missions);
  render();
}

// FIX #8: Statut réglementaire indépendant pour 8h et CT
// + CO-PRÉLÈVEMENT : regroupe les agents compatibles (même support/prétraitement/débit)
function generatePrelevements(m){
  m.prelevements=[];
  // Collecter toutes les combinaisons GEH × type × reg
  var combos={}; // clé: gehId_type_reg
  for(var an in m.affectations){
    var a=m.affectations[an];
    if(!an||an==='undefined')continue;
    for(var gid in a.gehs){
      var ga=a.gehs[gid];
      var g=m.gehs.find(function(x){return String(x.id)===String(gid);});
      if(!g||!g.name)continue;
      var isReg8h=(ga.isReg8h!==undefined)?ga.isReg8h:((ga.isReg!==undefined)?ga.isReg:true);
      var isRegCT=(ga.isRegCT!==undefined)?ga.isRegCT:((ga.isReg!==undefined)?ga.isReg:true);
      if(ga.has8h){
        var k8=gid+'_8h_'+(isReg8h?'R':'NR');
        if(!combos[k8])combos[k8]={gehId:gid,geh:g,type:'8h',isReg:isReg8h,agents:[]};
        combos[k8].agents.push(an);
      }
      if(ga.hasCT){
        var kc=gid+'_CT_'+(isRegCT?'R':'NR');
        if(!combos[kc])combos[kc]={gehId:gid,geh:g,type:'CT',isReg:isRegCT,agents:[]};
        combos[kc].agents.push(an);
      }
    }
  }
  // Pour chaque combo, regrouper les agents par clé de compatibilité
  for(var ck in combos){
    var combo=combos[ck];
    var g=combo.geh;
    var groups={}; // compatKey -> [agentName, ...]
    combo.agents.forEach(function(an){
      var key=getCompatKey(an,combo.type);
      if(!groups[key])groups[key]=[];
      groups[key].push(an);
    });
    // Créer un prélèvement par groupe de compatibilité
    for(var gk in groups){
      var agentNames=groups[gk];
      var agents=agentNames.map(function(an){return{name:an,color:getAgentColor(m,an)};});
      var ns=combo.isReg?3:1;
      var p={
        id:generateId(),
        gehId:g.id,gehName:g.name,gehNum:g.num,
        agents:agents,
        type:combo.type,
        isReglementaire:combo.isReg,
        subPrelevements:[]
      };
      for(var s=0;s<ns;s++){
        var sb={id:generateId(),operateur:'',date:'',plages:[{debut:'',fin:''}],observations:'',completed:false,agentData:{}};
        agentNames.forEach(function(an){
          sb.agentData[an]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
        });
        p.subPrelevements.push(sb);
      }
      m.prelevements.push(p);
    }
  }
}

function goToTerrain(id){
  state.currentMissionId=id;
  state.view='terrain-mission';
  state.expandedGeh={};
  state.fusionMode=false;
  state.selectedForFusion=[];
  render();
}

// ===== RETOUR TERRAIN ↔ PRÉPA =====
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

// ═══════════════════════════════════════════════════════════════
// PRÉPA AUTOMATIQUE - Import depuis tableau devis
// ═══════════════════════════════════════════════════════════════

function renderPrepaAutoModal(m){
  if(!state.prepaAutoData)state.prepaAutoData={format:'1',devisText:'',gehListText:'',parsed:null,error:null};
  var d=state.prepaAutoData;
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;state.prepaAutoData=null;render();}"><div class="modal-content" style="max-height:92vh;overflow-y:auto;"><div class="modal-header"><h2>'+ICONS.zap+' Prépa automatique</h2><button class="close-btn" onclick="state.showModal=null;state.prepaAutoData=null;render();">×</button></div>';
  h+='<div class="field"><label class="label">Format du devis</label><div class="row">';
  h+='<button class="btn btn-small '+(d.format==='1'?'btn-primary':'btn-gray')+'" onclick="state.prepaAutoData.format=\'1\';state.prepaAutoData.parsed=null;render();">Format 1 : N° GEH</button>';
  h+='<button class="btn btn-small '+(d.format==='2'?'btn-primary':'btn-gray')+'" onclick="state.prepaAutoData.format=\'2\';state.prepaAutoData.parsed=null;render();">Format 2 : Noms GEH</button>';
  h+='</div></div>';
  if(d.format==='1'){
    h+='<div class="info-box"><p><strong>Format 1 :</strong> Collez le tableau du devis</p><p style="font-size:11px;margin-top:4px;">Colonnes attendues : Agent chimique | N° GEH | Nb prélèvements | Type VLEP</p><p style="font-size:11px;margin-top:2px;">+ Collez la liste des GEH (N° | Nom) en dessous</p></div>';
  }else{
    h+='<div class="info-box"><p><strong>Format 2 :</strong> Collez le tableau du devis</p><p style="font-size:11px;margin-top:4px;">Colonnes attendues : Agent chimique | Noms GEH | Nb prélèvements | Type VLEP</p></div>';
  }
  h+='<div class="field"><label class="label">Tableau du devis (copier/coller depuis Excel)</label><textarea class="input" id="prepa-auto-devis" rows="6" placeholder="Collez ici le tableau du devis..." style="font-size:12px;font-family:monospace;">'+escapeHtml(d.devisText)+'</textarea></div>';
  if(d.format==='1'){
    h+='<div class="field"><label class="label">Liste des GEH (N° + Nom)</label><textarea class="input" id="prepa-auto-gehlist" rows="4" placeholder="Ex:\n1\tDécoupe LM\n2\tDécoupe SHW\n..." style="font-size:12px;font-family:monospace;">'+escapeHtml(d.gehListText)+'</textarea></div>';
  }
  h+='<button class="btn btn-primary" onclick="parsePrepaAuto();">'+ICONS.search+' Analyser le devis</button>';
  if(d.error){
    h+='<div class="info-box info-box-warning mt-12"><p>'+escapeHtml(d.error)+'</p></div>';
  }
  if(d.parsed){
    var p=d.parsed;
    h+='<div class="section-title mt-12">Aperçu</div>';
    h+='<div class="card" style="padding:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;"><span class="svg-icon">'+ICONS.folder+'</span> '+p.gehs.length+' GEH détectés</div>';
    p.gehs.forEach(function(g){
      h+='<div style="font-size:12px;color:var(--text-muted);padding:2px 0;">'+g.num+'. '+escapeHtml(g.name)+'</div>';
    });
    h+='</div>';
    h+='<div class="card" style="padding:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;"><span class="svg-icon">'+ICONS.beaker+'</span> '+p.agents.length+' agent(s) chimique(s)</div>';
    p.rows.forEach(function(r){
      var regLabel=r.isReg?'<span style="color:#047857;font-size:10px;font-weight:700;"> REG</span>':'<span style="color:#b45309;font-size:10px;font-weight:700;"> NR</span>';
      h+='<div style="background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:6px;border-left:3px solid var(--primary);">';
      r.agentNames.forEach(function(an){h+='<div style="font-size:12px;font-weight:600;">'+escapeHtml(an)+'</div>';});
      h+='<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">'+r.type+regLabel+' → '+r.gehNums.length+' GEH × '+(r.isReg?'3':'1')+' = '+(r.gehNums.length*(r.isReg?3:1))+' sous-prél.</div>';
      h+='</div>';
    });
    h+='</div>';
    var totalPrel=0;
    p.rows.forEach(function(r){totalPrel+=r.gehNums.length*(r.isReg?3:1);});
    h+='<div class="info-box info-box-success"><p><strong>Total :</strong> '+p.gehs.length+' GEH • '+p.agents.length+' agents • '+totalPrel+' sous-prélèvements</p></div>';
    var notInDB=[];
    p.agents.forEach(function(an){if(!getAgentFromDB(an))notInDB.push(an);});
    if(notInDB.length>0){
      h+='<div class="info-box info-box-warning mt-8"><p><strong>'+notInDB.length+' agent(s) non trouvé(s) dans la base :</strong></p>';
      notInDB.forEach(function(an){h+='<p style="font-size:11px;">• '+escapeHtml(an)+'</p>';});
      h+='<p style="font-size:11px;margin-top:4px;">Ils seront ajoutés en mode "manuel"</p></div>';
    }
    h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.prepaAutoData=null;render();">Annuler</button><button class="btn btn-success" onclick="applyPrepaAuto();">'+ICONS.check+' Appliquer à la mission</button></div>';
  }
  h+='</div></div>';
  return h;
}

function parsePrepaAuto(){
  var d=state.prepaAutoData;
  d.error=null;
  d.parsed=null;
  var devisEl=document.getElementById('prepa-auto-devis');
  var gehListEl=document.getElementById('prepa-auto-gehlist');
  d.devisText=devisEl?devisEl.value:'';
  d.gehListText=gehListEl?gehListEl.value:'';
  if(!d.devisText.trim()){d.error='Collez le tableau du devis';render();return;}
  try{
    var lines=parseTabSeparated(d.devisText);
    if(lines.length<1){d.error='Aucune ligne détectée';render();return;}
    var gehMap={};
    if(d.format==='1'&&d.gehListText.trim()){
      var gehLines=parseTabSeparated(d.gehListText);
      gehLines.forEach(function(cols){
        if(cols.length>=2){var n=parseInt(cols[0]);if(!isNaN(n)&&n>0)gehMap[n]=cols[1].trim();}
      });
    }
    var rows=[];var agents=[];
    lines.forEach(function(cols){
      if(cols.length<3)return;
      var agentNames=parseAgentNames(cols[0]);
      if(agentNames.length===0)return;
      var gehNums=parseGehColumn(cols[1],d.format,gehMap);
      var nbPrel=parseInt(cols[2])||0;
      var typeCol=(cols[3]||'').toLowerCase().trim();
      var type=typeCol.indexOf('ct')!==-1?'CT':'8h';
      var isReg=nbPrel>=3||typeCol.indexOf('non')===-1;
      agentNames.forEach(function(an){if(agents.indexOf(an)===-1)agents.push(an);});
      rows.push({agentNames:agentNames,gehNums:gehNums,type:type,isReg:isReg});
    });
    if(rows.length===0){d.error='Aucune ligne valide détectée';render();return;}
    var gehs=[];
    for(var num in gehMap){gehs.push({num:parseInt(num),name:gehMap[num]});}
    gehs.sort(function(a,b){return a.num-b.num;});
    if(gehs.length===0){
      var allNums={};
      rows.forEach(function(r){r.gehNums.forEach(function(n){allNums[n]=true;});});
      for(var n2 in allNums){gehs.push({num:parseInt(n2),name:'GEH '+n2});}
      gehs.sort(function(a,b){return a.num-b.num;});
    }
    d.parsed={gehs:gehs,agents:agents,rows:rows};
  }catch(err){d.error='Erreur de parsing : '+err.message;}
  render();
}

function parseTabSeparated(text){
  var result=[];
  text.split('\n').forEach(function(line){
    line=line.replace(/\r/g,'');
    if(!line.trim())return;
    var cols=[];var cell='';var q=false;
    for(var i=0;i<line.length;i++){
      var c=line[i];
      if(c==='"')q=!q;
      else if(c==='\t'&&!q){cols.push(cell.replace(/^"|"$/g,'').trim());cell='';}
      else{cell+=c;}
    }
    cols.push(cell.replace(/^"|"$/g,'').trim());
    result.push(cols);
  });
  return result;
}

function parseAgentNames(raw){
  var names=[];
  var parts=raw.split(/\n|\r\n|\r/);
  parts.forEach(function(p){
    var t=p.replace(/^["'\s]+|["'\s]+$/g,'').trim();
    if(!t)return;
    if(t.toLowerCase().indexOf('analyse ')===0)return;
    if(t.length>1)names.push(t);
  });
  return names;
}

function parseGehColumn(raw,format,gehMap){
  var nums=[];
  var parts=raw.split(/\s*-\s*/);
  if(format==='1'){
    parts.forEach(function(p){var n=parseInt(p.trim());if(!isNaN(n)&&n>0)nums.push(n);});
  }else{
    var nextNum=1;
    parts.forEach(function(p){
      var name=p.trim();if(!name)return;
      var found=false;
      for(var num in gehMap){if(gehMap[num]===name){nums.push(parseInt(num));found=true;break;}}
      if(!found){while(gehMap[nextNum])nextNum++;gehMap[nextNum]=name;nums.push(nextNum);nextNum++;}
    });
  }
  return nums;
}

function applyPrepaAuto(){
  var m=getCurrentMission();
  if(!m||!state.prepaAutoData||!state.prepaAutoData.parsed)return;
  var p=state.prepaAutoData.parsed;
  if(!confirm('Appliquer la prépa automatique ?\n\nCela va remplacer les GEH, agents et affectations actuels.\n\n'+p.gehs.length+' GEH • '+p.agents.length+' agents'))return;
  m.gehs=[];
  p.gehs.forEach(function(g){m.gehs.push({id:generateId(),num:g.num,name:g.name});});
  m.agents=[];
  var agentTypes={};
  p.rows.forEach(function(r){
    r.agentNames.forEach(function(an){
      if(!agentTypes[an])agentTypes[an]={is8h:false,isCT:false};
      if(r.type==='8h')agentTypes[an].is8h=true;
      if(r.type==='CT')agentTypes[an].isCT=true;
    });
  });
  p.agents.forEach(function(an){
    var inDB=getAgentFromDB(an);
    var types=agentTypes[an]||{is8h:true,isCT:false};
    m.agents.push({name:an,is8h:types.is8h||(!types.is8h&&!types.isCT),isCT:types.isCT,isManual:!inDB});
  });
  m.affectations={};
  m.agentColors={};
  p.rows.forEach(function(r){
    r.agentNames.forEach(function(an){
      if(!m.affectations[an])m.affectations[an]={gehs:{}};
      var c=getAgentColor(m,an);
      r.gehNums.forEach(function(gNum){
        var geh=m.gehs.find(function(g){return g.num===gNum;});
        if(!geh)return;
        if(!m.affectations[an].gehs[geh.id])m.affectations[an].gehs[geh.id]={has8h:false,hasCT:false,isReg8h:true,isRegCT:true};
        var gaf=m.affectations[an].gehs[geh.id];
        if(r.type==='8h'){gaf.has8h=true;gaf.isReg8h=r.isReg;}
        if(r.type==='CT'){gaf.hasCT=true;gaf.isRegCT=r.isReg;}
      });
    });
  });
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.prepaAutoData=null;
  render();
  var totalPrel=countPrelevements(m);
  alert('Prépa automatique appliquée !\n\n'+m.gehs.filter(function(g){return g.name;}).length+' GEH\n'+m.agents.length+' agents\n'+totalPrel+' prélèvements\n\nVérifiez les affectations et validez quand tout est bon.');
}
