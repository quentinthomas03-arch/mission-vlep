/*
 * VLEP Mission v3.8 - search-echantillons.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module de recherche et filtrage dans la liste des échantillons
 */

// État de la recherche
var searchEchantillonsState={
  searchText:'',
  filterType:'all', // 'all', '8h', 'CT'
  filterStatus:'all', // 'all', 'completed', 'pending'
  filterGeh:'all' // 'all' ou gehId
};

// Fonction de rendu de la liste des échantillons avec recherche
function renderListeEchantillonsWithSearch(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-mission';render();return'';}
  
  var h='<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">'+ICONS.arrowLeft+' Mission</button>';
  h+='<div class="card"><h2>'+ICONS.list+' Liste des échantillons</h2><p class="subtitle">Tous les prélèvements de la mission</p></div>';
  
  // Barre de recherche
  h+='<div class="card" style="padding:12px;">';
  h+='<div class="search-box" style="margin-bottom:8px;"><span class="search-icon">'+ICONS.search+'</span><input type="text" class="search-input" id="search-echantillons" placeholder="Rechercher par agent, référence, opérateur..." value="'+escapeHtml(searchEchantillonsState.searchText)+'" oninput="handleSearchEchantillons(this.value);"></div>';
  
  // Filtres
  h+='<div style="display:flex;gap:4px;flex-wrap:wrap;">';
  
  // Filtre type
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterType==='all'?'btn-primary':'btn-gray')+'" onclick="setFilterType(\'all\');">Tous</button>';
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterType==='8h'?'btn-primary':'btn-gray')+'" onclick="setFilterType(\'8h\');">8h</button>';
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterType==='CT'?'btn-primary':'btn-gray')+'" onclick="setFilterType(\'CT\');">CT</button>';
  
  // Filtre statut
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterStatus==='all'?'btn-primary':'btn-gray')+'" onclick="setFilterStatus(\'all\');">Tous</button>';
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterStatus==='completed'?'btn-success':'btn-gray')+'" onclick="setFilterStatus(\'completed\');">✓ Complétés</button>';
  h+='<button class="btn btn-small '+(searchEchantillonsState.filterStatus==='pending'?'btn-gray':'btn-gray')+'" style="'+(searchEchantillonsState.filterStatus==='pending'?'background:var(--warning);color:white;':'')+'\" onclick="setFilterStatus(\'pending\');">⏳ En attente</button>';
  
  h+='</div></div>';
  
  // Récupérer et filtrer les échantillons
  var echantillons=getAllEchantillons(m);
  var filtered=filterEchantillons(echantillons);
  
  // Statistiques
  h+='<div class="info-box"><p><strong>'+filtered.length+'</strong> échantillon(s) trouvé(s) sur <strong>'+echantillons.length+'</strong> total</p></div>';
  
  // Liste des échantillons
  if(filtered.length===0){
    h+='<div class="empty-state"><p>Aucun échantillon trouvé</p></div>';
  }else{
    filtered.forEach(function(ech){
      var statusIcon=ech.completed?'<span style="color:var(--accent);font-size:16px;">✓</span>':'<span style="color:var(--warning);font-size:16px;">⏳</span>';
      var typeColor=ech.type==='8h'?'#3b82f6':'#8b5cf6';
      
      h+='<div class="card" style="padding:10px;margin-bottom:6px;border-left:4px solid '+typeColor+';">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
      h+=statusIcon;
      h+='<div style="flex:1;">';
      h+='<div style="font-weight:700;font-size:13px;color:var(--text-dark);">'+escapeHtml(ech.agentName)+'</div>';
      h+='<div style="font-size:11px;color:var(--text-muted);">'+ech.gehName+' • '+ech.type+' • J'+ech.dayNum+'</div>';
      h+='</div>';
      h+='<button class="btn btn-primary btn-small" onclick="openEchantillon('+ech.prelId+','+ech.subIdx+');">Ouvrir</button>';
      h+='</div>';
      
      // Détails
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:11px;">';
      h+='<div><span style="color:var(--text-muted);">Réf :</span> <strong>'+escapeHtml(ech.reference||'-')+'</strong></div>';
      h+='<div><span style="color:var(--text-muted);">Pompe :</span> <strong>'+escapeHtml(ech.numPompe||'-')+'</strong></div>';
      h+='<div><span style="color:var(--text-muted);">Opérateur :</span> '+escapeHtml(ech.operateur||'-')+'</div>';
      h+='<div><span style="color:var(--text-muted);">Date :</span> '+formatDateFR(ech.date)+'</div>';
      h+='</div>';
      
      h+='</div>';
    });
  }
  
  return h;
}

// Récupérer tous les échantillons de la mission
function getAllEchantillons(mission){
  var echantillons=[];
  
  mission.prelevements.forEach(function(prel){
    var geh=mission.gehs.find(function(g){return g.id===prel.gehId;});
    var gehName=geh?geh.num+'. '+geh.name:'GEH inconnu';
    
    prel.subPrelevements.forEach(function(sub,subIdx){
      prel.agents.forEach(function(agent){
        var agentData=(sub.agentData&&sub.agentData[agent.name])||{};
        
        echantillons.push({
          prelId:prel.id,
          subIdx:subIdx,
          agentName:agent.name,
          gehName:gehName,
          gehId:prel.gehId,
          type:prel.type,
          dayNum:sub.dayNum||1,
          date:sub.date,
          operateur:sub.operateur,
          reference:agentData.refEchantillon,
          numPompe:agentData.numPompe,
          debitInitial:agentData.debitInitial,
          debitFinal:agentData.debitFinal,
          completed:sub.completed||false,
          observations:sub.observations
        });
      });
    });
  });
  
  return echantillons;
}

// Filtrer les échantillons selon les critères
function filterEchantillons(echantillons){
  return echantillons.filter(function(ech){
    // Filtre texte
    if(searchEchantillonsState.searchText){
      var searchLower=searchEchantillonsState.searchText.toLowerCase();
      var matchText=(
        (ech.agentName||'').toLowerCase().indexOf(searchLower)!==-1||
        (ech.reference||'').toLowerCase().indexOf(searchLower)!==-1||
        (ech.operateur||'').toLowerCase().indexOf(searchLower)!==-1||
        (ech.gehName||'').toLowerCase().indexOf(searchLower)!==-1||
        (ech.numPompe||'').toLowerCase().indexOf(searchLower)!==-1
      );
      if(!matchText)return false;
    }
    
    // Filtre type
    if(searchEchantillonsState.filterType!=='all'){
      if(ech.type!==searchEchantillonsState.filterType)return false;
    }
    
    // Filtre statut
    if(searchEchantillonsState.filterStatus!=='all'){
      if(searchEchantillonsState.filterStatus==='completed'&&!ech.completed)return false;
      if(searchEchantillonsState.filterStatus==='pending'&&ech.completed)return false;
    }
    
    // Filtre GEH
    if(searchEchantillonsState.filterGeh!=='all'){
      if(ech.gehId!==searchEchantillonsState.filterGeh)return false;
    }
    
    return true;
  });
}

// Handler recherche
function handleSearchEchantillons(text){
  searchEchantillonsState.searchText=text;
  render();
}

// Setters filtres
function setFilterType(type){
  searchEchantillonsState.filterType=type;
  render();
}

function setFilterStatus(status){
  searchEchantillonsState.filterStatus=status;
  render();
}

function setFilterGeh(gehId){
  searchEchantillonsState.filterGeh=gehId;
  render();
}

// Ouvrir un échantillon spécifique
function openEchantillon(prelId,subIdx){
  state.currentPrelId=prelId;
  state.activeSubIndex=subIdx;
  state.view='terrain-prel';
  render();
}

// Réinitialiser les filtres
function resetFiltersEchantillons(){
  searchEchantillonsState={
    searchText:'',
    filterType:'all',
    filterStatus:'all',
    filterGeh:'all'
  };
  render();
}
