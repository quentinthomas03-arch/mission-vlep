/*
 * VLEP Mission v3.8 - render.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module Render :
 * - Router principal render() (14 vues)
 * - Page d'accueil renderHome()
 * - Délégation événements recherche
 */

// ===== ROUTER PRINCIPAL =====
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
  // Animation fade-slide
  document.getElementById('app').style.animation='none';
  void document.getElementById('app').offsetHeight;
  document.getElementById('app').style.animation='fadeSlideIn 0.18s ease-out';
  // Post-render hooks
  renderGlobalTimer();
  setupSearchDelegation();
  if(state.view==='db-terrain')setTimeout(updateDbResults,50);
  if(state.view==='quick-entry')setTimeout(function(){var i=document.getElementById('quick-agent-search');if(i)i.focus();},50);
}

// ===== PAGE D'ACCUEIL =====
function renderHome(){
  var mp=state.missions.filter(function(m){return m.status==='prepa';}).length;
  var mt=state.missions.filter(function(m){return m.status==='validee'||m.status==='encours';}).length;
  var h='<div class="card"><h1>'+ICONS.flask+' VLEP Mission</h1></div>';
  h+='<div class="nav-menu">';
  // Saisie terrain
  h+='<div class="nav-item" onclick="state.view=\'terrain-list\';render();"><div class="nav-icon green">'+ICONS.clipboard+'</div><div class="nav-label">Saisie terrain</div>';
  if(mt>0)h+='<div class="nav-count">'+mt+'</div>';
  h+='</div>';
  // Préparation mission
  h+='<div class="nav-item" onclick="state.view=\'prepa-list\';render();"><div class="nav-icon">'+ICONS.building+'</div><div class="nav-label">Préparation mission</div>';
  if(mp>0)h+='<div class="nav-count">'+mp+'</div>';
  h+='</div>';
  // Importer mission
  h+='<div class="nav-item" onclick="state.showModal=\'importChoice\';render();"><div class="nav-icon" style="background:linear-gradient(135deg,#0891b2,#06b6d4);">'+ICONS.upload+'</div><div class="nav-label">Importer une mission</div></div>';
  // Base de données
  h+='<div class="nav-item" onclick="state.view=\'db-terrain\';render();"><div class="nav-icon orange">'+ICONS.search+'</div><div class="nav-label">Base de données</div><div class="nav-count">'+state.agentsDB.length+'</div></div>';
  h+='</div>';
  // Input file caché pour import
  h+='<input type="file" id="import-mission-input" accept=".json" style="display:none;" onchange="handleImportMission(event);">';
  // Trigger import si modal demandé
  if(state.showModal==='importChoice'){
    state.showModal=null;
    triggerImportMission();
  }
  // Version
  h+='<div class="version-info">VLEP Mission v3.8 — © 2025 Quentin THOMAS</div>';
  return h;
}

// ===== DÉLÉGATION ÉVÉNEMENTS RECHERCHE =====
// Gère les clics sur les résultats de recherche dans toutes les zones
function setupSearchDelegation(){
  var mappings=[
    ['search-results-container','addAgentFromSearch'],
    ['new-prel-search-results','addNewPrelAgent'],
    ['blanc-search-results','addBlancAgent'],
    ['quick-search-results','addQuickAgent']
  ];
  mappings.forEach(function(m){
    var el=document.getElementById(m[0]);
    if(el&&!el._delegated){
      el._delegated=true;
      // mousedown empêche le blur de l'input avant le clic
      el.addEventListener('mousedown',function(e){
        var t=e.target;
        while(t&&t!==el&&!t.dataset.agent){t=t.parentElement;}
        if(t&&t.dataset.agent&&t.dataset.disabled!=='1'){
          e.preventDefault();
        }
      });
      // click pour la sélection effective (mobile + desktop)
      el.addEventListener('click',function(e){
        var t=e.target;
        while(t&&t!==el&&!t.dataset.agent){t=t.parentElement;}
        if(t&&t.dataset.agent&&t.dataset.disabled!=='1'){
          if(typeof window[m[1]]==='function')window[m[1]](t.dataset.agent);
        }
      });
    }
  });
}
