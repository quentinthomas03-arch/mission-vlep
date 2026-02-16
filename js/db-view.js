/*
 * VLEP Mission v3.8 - db-view.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module Base de données :
 * - Recherche terrain (fiches agents détaillées)
 * - Vue complète DB + import Excel
 */

// ===== RECHERCHE TERRAIN =====
function renderDbTerrain(){
  return '<div style="position:sticky;top:-16px;background:linear-gradient(135deg, #004d87 0%, #0066b3 60%, #1a8fd4 100%);margin:-16px -16px 0;padding:16px;z-index:10;">'+
    '<button class="back-btn" style="color:white;" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button>'+
    '<h1 style="color:white;margin:8px 0;">'+ICONS.search+' Base de données terrain</h1>'+
    '<div class="search-box"><span class="search-icon">'+ICONS.search+'</span>'+
    '<input type="text" class="search-input" id="db-search-input" placeholder="Rechercher par nom ou N° CAS..." oninput="updateDbResults();"></div></div>'+
    '<div id="results-count" style="color:white;font-size:13px;margin:12px 0;">Tapez pour rechercher</div>'+
    '<div id="agent-results"></div>';
}

function updateDbResults(){
  var i=document.getElementById('db-search-input');
  var c=document.getElementById('results-count');
  var r=document.getElementById('agent-results');
  if(!i||!c||!r)return;
  var s=i.value.toLowerCase().trim();
  if(s.length<2){c.textContent='Tapez au moins 2 caractères';r.innerHTML='';return;}
  var f=state.agentsDB.filter(function(a){
    var n=(a['Agent chimique']||'').toLowerCase();
    var cs=(a['N° CAS']||'').toLowerCase();
    return n.indexOf(s)!==-1||cs.indexOf(s)!==-1;
  });
  c.textContent=f.length+' agent(s) trouvé(s)';
  var h='';
  f.slice(0,30).forEach(function(a){
    h+='<div class="agent-card"><div class="agent-card-name">'+escapeHtml(a['Agent chimique'])+'</div>';
    h+='<div class="agent-card-cas">CAS : '+escapeHtml(a['N° CAS']||'-')+'</div>';
    h+='<div class="agent-card-grid">';
    // CMR
    var cmr=a['CMR (règlement CLP)']||'';
    if(cmr)h+='<div class="agent-card-field full"><div class="agent-card-field-label">CMR</div><div class="agent-card-field-value cmr">'+escapeHtml(cmr)+'</div></div>';
    // VLEP 8h / CT
    h+='<div class="agent-card-field"><div class="agent-card-field-label">VLEP 8h</div><div class="agent-card-field-value highlight">'+escapeHtml(a['VLEP 8h (mg/m3)']||'-')+' mg/m³</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">VLEP CT</div><div class="agent-card-field-value highlight">'+escapeHtml(a['VLEP CT (mg/m3)']||'-')+' mg/m³</div></div>';
    // Débits max
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Débit max 8h</div><div class="agent-card-field-value">'+escapeHtml(a['débit max  8h (L/min)']||a['débit max 8h (L/min)']||'-')+' L/min</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Débit max CT</div><div class="agent-card-field-value">'+escapeHtml(a['débit max CT (L/min)']||'-')+' L/min</div></div>';
    // Code analytique (FIX #1 : support deux noms de colonnes)
    var codeAnalyse=getCodeAnalytique(a);
    if(codeAnalyse)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Code analyse</div><div class="agent-card-field-value">'+escapeHtml(codeAnalyse)+'</div></div>';
    // Support de prélèvement
    var support=a['Support de prélèvement']||'';
    if(support)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Support de prélèvement</div><div class="agent-card-field-value">'+escapeHtml(support)+'</div></div>';
    // Positionnement support
    var pos=a['positionnement du support']||'';
    if(pos)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Positionnement support</div><div class="agent-card-field-value">'+escapeHtml(pos)+'</div></div>';
    // Laboratoire
    var lab=a['Laboratoire\nsous-traitant']||a['Laboratoire sous-traitant']||'';
    if(lab)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Laboratoire sous-traitant</div><div class="agent-card-field-value">'+escapeHtml(lab)+'</div></div>';
    // Commentaire
    var com=a['commentaire (interférent, impact des conditions ambiantes)']||'';
    if(com)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Commentaire</div><div class="agent-card-field-value">'+escapeHtml(com)+'</div></div>';
    // Conservation
    var cons=a['conservation après prélèvement (t°/durée max)']||'';
    if(cons)h+='<div class="agent-card-field full"><div class="agent-card-field-label">Conservation</div><div class="agent-card-field-value">'+escapeHtml(cons)+'</div></div>';
    // Codes support / prétraitement
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Code support</div><div class="agent-card-field-value">'+escapeHtml(a['Code support']||'-')+'</div></div>';
    h+='<div class="agent-card-field"><div class="agent-card-field-label">Code prétraitement</div><div class="agent-card-field-value">'+escapeHtml(a['Code prétraitement']||'-')+'</div></div>';
    h+='</div></div>';
  });
  r.innerHTML=h;
}

// ===== VUE COMPLÈTE DB =====
function renderDbFull(){
  var h='<button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button>';
  h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><div>';
  h+='<h1>'+ICONS.database+' Base de données complète</h1>';
  h+='<p class="subtitle">'+state.agentsDB.length+' agents</p></div>';
  h+='<button class="btn btn-blue btn-small" onclick="state.showModal=\'importDB\';render();">'+ICONS.upload+' Importer</button>';
  h+='</div></div>';
  if(state.agentsDB.length===0){
    h+='<div class="empty-state"><div class="empty-state-icon">'+ICONS.database+'</div><p>Aucune donnée</p></div>';
  }
  // Modal import
  if(state.showModal==='importDB'){
    h+='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content">';
    h+='<div class="modal-header"><h2>Importer</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
    h+='<div class="info-box"><p>1. Ouvrez Excel</p><p>2. Sélectionnez A à AU (sauf C)</p><p>3. Copiez et collez ci-dessous</p></div>';
    h+='<textarea class="input" id="importDBText" rows="8" placeholder="Collez ici..."></textarea>';
    h+='<div class="row"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button>';
    h+='<button class="btn btn-blue" onclick="importDB();">Importer</button></div>';
    h+='</div></div>';
  }
  return h;
}

// ===== IMPORT DB EXCEL =====
function importDB(){
  var t=document.getElementById('importDBText').value;
  if(!t.trim()){alert('Collez vos données');return;}
  try{
    // Parser CSV/TSV avec gestion des guillemets
    var rw=[],cr='',iq=false;
    for(var i=0;i<t.length;i++){
      var c=t[i];
      if(c==='"'){iq=!iq;cr+=c;}
      else if(c==='\n'&&!iq){if(cr.trim())rw.push(cr);cr='';}
      else cr+=c;
    }
    if(cr.trim())rw.push(cr);
    // Parser les colonnes tab-séparées
    var pr=function(ln){
      var cl=[],ce='',q=false;
      for(var i=0;i<ln.length;i++){
        var c=ln[i];
        if(c==='"')q=!q;
        else if(c==='\t'&&!q){cl.push(ce.replace(/^"|"$/g,'').trim());ce='';}
        else ce+=c;
      }
      cl.push(ce.replace(/^"|"$/g,'').trim());
      return cl;
    };
    var hd=pr(rw[0]);
    var db=[];
    for(var j=1;j<rw.length;j++){
      var vl=pr(rw[j]);
      var ob={};
      for(var k=0;k<hd.length&&k<=50;k++){
        if(hd[k])ob[hd[k]]=vl[k]||'';
      }
      if(ob['Agent chimique'])db.push(ob);
    }
    state.agentsDB=db;
    saveData('vlep_database',db);
    state.showModal=null;
    alert(ICONS.check+' '+db.length+' agents importés !');
    render();
  }catch(e){
    alert('Erreur: '+e.message);
  }
}
