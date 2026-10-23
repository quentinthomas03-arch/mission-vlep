// database-views.js - Vues base de données agents
// © 2025 Quentin THOMAS
// Recherche terrain et consultation complète

function renderDbTerrain(){
  return'<div class="sticky-header" style="padding-bottom:10px;"><button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button><h1 style="margin:4px 0 8px;">'+ICONS.search+' Base de données terrain</h1><div class="search-box"><span class="search-icon">'+ICONS.search+'</span><input type="text" class="search-input" id="db-search-input" placeholder="Rechercher par nom ou N° CAS..." oninput="updateDbResults();"></div></div><div id="results-count" style="color:var(--text-muted);font-size:12px;margin:10px 0;">Tapez pour rechercher</div><div id="agent-results"></div>';
}

function updateDbResults(){
  var i=document.getElementById('db-search-input');
  var c=document.getElementById('results-count');
  var r=document.getElementById('agent-results');
  if(!i||!c||!r)return;
  var s=i.value.toLowerCase().trim();
  if(s.length<2){c.textContent='Tapez au moins 2 caractères';r.innerHTML='';return;}
  // même ordre que les autres recherches (meilleurs résultats d'abord), ou recherche par n° CAS
  var f=state.agentsDB.filter(function(a){
    return rangAgent(a['Agent chimique'],s)>=0||(a['N° CAS']||'').toLowerCase().indexOf(s)!==-1;
  });
  f.sort(function(x,y){
    var rx=rangAgent(x['Agent chimique'],s),ry=rangAgent(y['Agent chimique'],s);
    if(rx<0)rx=9;if(ry<0)ry=9;
    return rx-ry||(x['Agent chimique']||'').length-(y['Agent chimique']||'').length;
  });
  c.textContent=f.length+' agent(s) trouvé(s)';
  var h='';
  f.slice(0,30).forEach(function(a){
    h+='<div class="agent-card"><div class="agent-card-name">'+escapeHtml(a['Agent chimique'])+'</div><div class="agent-card-cas">CAS : '+escapeHtml(a['N° CAS']||'-')+'</div><div class="agent-card-grid">';
    var cmr=a['CMR (règlement CLP)']||'';
    if(cmr)h+='<div class="agent-card-field full"><div class="agent-card-field-label">CMR</div><div class="agent-card-field-value cmr">'+escapeHtml(cmr)+'</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">VLEP 8h</div><div class="agent-card-field-value highlight">'+escapeHtml(a['VLEP 8h (mg/m3)']||'-')+' mg/m³</div></div><div class="agent-card-field"><div class="agent-card-field-label">VLEP CT</div><div class="agent-card-field-value highlight">'+escapeHtml(a['VLEP CT (mg/m3)']||'-')+' mg/m³</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Débit max 8h</div><div class="agent-card-field-value">'+escapeHtml(a['débit max  8h (L/min)']||a['débit max 8h (L/min)']||'-')+' L/min</div></div><div class="agent-card-field"><div class="agent-card-field-label">Débit max CT</div><div class="agent-card-field-value">'+escapeHtml(a['débit max CT (L/min)']||'-')+' L/min</div></div>';
    // code analytique (deux noms de colonne possibles selon la version de la base)
    var codeAnalyse=getCodeAnalytique(a);
    if(codeAnalyse)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Code analyse</div><div class="agent-card-field-value">'+escapeHtml(codeAnalyse)+'</div></div>';
    var pos=a['positionnement du support']||'';
    if(pos)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Positionnement support</div><div class="agent-card-field-value">'+escapeHtml(pos)+'</div></div>';
    var lab=a['Laboratoire\nsous-traitant']||a['Laboratoire sous-traitant']||'';
    if(lab)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Laboratoire sous-traitant</div><div class="agent-card-field-value">'+escapeHtml(lab)+'</div></div>';
    var com=a['commentaire (interférent, impact des conditions ambiantes)']||'';
    if(com)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Commentaire</div><div class="agent-card-field-value">'+escapeHtml(com)+'</div></div>';
    var cons=a['conservation après prélèvement (t°/durée max)']||'';
    if(cons)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Conservation</div><div class="agent-card-field-value">'+escapeHtml(cons)+'</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Code support</div><div class="agent-card-field-value">'+escapeHtml(a['Code support']||'-')+'</div></div><div class="agent-card-field"><div class="agent-card-field-label">Code prétraitement</div><div class="agent-card-field-value">'+escapeHtml(a['Code prétraitement']||'-')+'</div></div></div></div>';
  });
  r.innerHTML=h;
}

loadData();
// chronos CT : restoreCTTimers() (timers.js, appelé au démarrage)


console.log('✓ Database views chargé');
