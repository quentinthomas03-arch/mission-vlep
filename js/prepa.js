// prepa.js - Préparation des missions
// © 2025 Quentin THOMAS
// Création, édition, gestion agents, GEH, affectations, validation

function renderHome(){
  var mp=state.missions.filter(function(m){return m.status==='prepa';}).length;
  var mt=state.missions.filter(function(m){return m.status==='validee'||m.status==='encours';}).length;
  var h='<div class="card"><h1>'+ICONS.flask+' VLEP Mission</h1><p class="subtitle">Contrôle des valeurs limites d’exposition professionnelle</p></div>';
  h+=renderNouveautesCard();
  var row=function(onclick,icon,label,sub,count){
    return '<div class="nav-item" onclick="'+onclick+'"><div class="nav-icon">'+icon+'</div><div class="nav-label">'+label+'<div class="nav-sub">'+sub+'</div></div>'+(count?'<div class="nav-count">'+count+'</div>':'')+ICONS.chevronRight+'</div>';
  };
  h+='<div class="nav-menu">';
  h+=row('state.view=\'terrain-list\';render();',ICONS.clipboard,'Saisie terrain','Missions prêtes, saisie rapide',mt);
  h+=row('state.view=\'prepa-list\';render();',ICONS.building,'Préparation mission','GEH, agents, affectations',mp);
  h+='</div><div class="nav-menu">';
  h+=row('state.showModal=\'importChoice\';render();',ICONS.upload,'Importer une mission','Fichier .json reçu par e-mail',0);
  h+=row('state.view=\'db-terrain\';render();',ICONS.search,'Base de données','Agents, méthodes, débits',state.agentsDB.length);
  h+='</div>';
  h+='<input type="file" id="import-mission-input" accept=".json" style="display:none;" onchange="handleImportMission(event);">';
  if(state.showModal==='importChoice'){state.showModal=null;triggerImportMission();}
  if(typeof renderJaugeStockage==='function')h+=renderJaugeStockage();
  h+='<div class="home-tabbar"><button class="home-tab-btn" onclick="state.view=\'tutoriel\';state.guidePhase=null;state.guideOuvert=null;state.guideQ=\'\';render();window.scrollTo(0,0);">'+ICONS.book+'<span>Guide</span></button></div>';
  h+='<div class="version-info">Version '+APP_VERSION+' © 2025 Quentin THOMAS</div>';
  return h;
}

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
  h+='<div class="mission-info">'+gc+' GEH · '+ac+' agents · '+pc+' prél.</div><div class="mission-actions">';
  h+='<button class="btn btn-gray btn-small" onclick="openMission('+m.id+');">'+ICONS.edit+' Ouvrir</button>';
  h+='<button class="btn btn-gray btn-small" onclick="copyMission('+m.id+');" aria-label="Dupliquer">'+ICONS.copy+'</button>';
  if(m.status==='prepa')h+='<button class="btn btn-primary btn-small" onclick="validateMission('+m.id+');">'+ICONS.check+' Valider</button>';
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
      if(g.has8h)c+=nbPrelPrevu(g,'8h');
      if(g.hasCT)c+=nbPrelPrevu(g,'CT');
    }
  }
  return c;
}

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

function validateMission(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(!m)return;
  var avant=JSON.parse(JSON.stringify(m.prelevements||[]));
  var retires=generatePrelevements(m);
  if(typeof scolaGehCompleter==='function')scolaGehCompleter(m); // Scol@ par GEH déjà saisi (reprise de l'an dernier…)
  if(retires.length){
    var noms=retires.map(function(p){return '• GEH '+p.gehNum+' – '+(p.agents||[]).map(function(a){return a.name;}).join(' + ')+' ('+p.type+')';}).join('\n');
    if(!confirm('Ces prélèvements déjà saisis n\'ont plus de GEH ou d\'agent dans la préparation et seront supprimés :\n\n'+noms+'\n\nContinuer ?')){m.prelevements=avant;render();return;}
  }
  if(m.prelevements.length===0){
    alert('Aucun prélèvement à générer.\n\nVérifiez :\n1. Au moins un GEH avec nom\n2. Au moins un agent avec 8h ou CT\n3. Des affectations agents → GEH');
    return;
  }
  m.status='validee';
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Un prélèvement a-t-il déjà été saisi (même partiellement) ?
function prelASaisie(p){
  return (p.subPrelevements||[]).some(function(s0){
    return expandSubSupports(s0).some(function(sb){
      if(sb.completed||sb.operateur||sb.date||sb.observations)return true;
      if((sb.plages||[]).some(function(pl){return pl.debut||pl.fin;}))return true;
      return Object.keys(sb.agentData||{}).some(function(an){
        var d=sb.agentData[an]||{};
        return Object.keys(d).some(function(k){var v=d[k];return Array.isArray(v)?v.length>0:(v!==''&&v!==null&&v!==undefined&&v!==false);});
      });
    });
  });
}

// Statut réglementaire propre au 8h et au CT de chaque affectation
// Mission déjà commencée (retour en préparation pour modifier les GEH, agents ou affectations) : les prélèvements
// existants sont gardés tels quels (saisie, fusions, prélèvements ajoutés sur le terrain), seuls les nouveaux sont
// ajoutés. Renvoie les prélèvements saisis qui n'ont plus de GEH ou d'agent (à confirmer avant suppression).
function generatePrelevements(m){
  var anciens=m.prelevements||[];
  m.prelevements=[];
  for(var an in m.affectations){
    var a=m.affectations[an];
    if(!an||an==='undefined')continue;
    var c=getAgentColor(m,an);
    for(var gid in a.gehs){
      var ga=a.gehs[gid];
      var g=m.gehs.find(function(x){return String(x.id)===String(gid);});
      if(!g||!g.name)continue;
      // Utiliser isReg8h pour le 8h
      var isReg8h=(ga.isReg8h!==undefined)?ga.isReg8h:((ga.isReg!==undefined)?ga.isReg:((a.isReg!==undefined)?a.isReg:true));
      // Utiliser isRegCT pour le CT
      var isRegCT=(ga.isRegCT!==undefined)?ga.isRegCT:((ga.isReg!==undefined)?ga.isReg:((a.isReg!==undefined)?a.isReg:true));
      
      if(ga.has8h){
        var ns=nbPrelPrevu(ga,'8h');
        var p={id:generateId(),gehId:g.id,gehName:g.name,gehNum:g.num,agents:[{name:an,color:c}],type:'8h',isReglementaire:isReg8h,subPrelevements:[]};
        if(isReg8h&&ns<3)p.justifNb=JUSTIF_NB_DEFAUT;
        if(ga.plage8h)p.plagePrevue=ga.plage8h;
        for(var s=0;s<ns;s++){
          var sb={id:generateId(),operateur:'',date:'',plages:[{debut:'',fin:''}],observations:'',completed:false,agentData:{}};
          if(ga.jours8h&&ga.jours8h[s])sb.jourPrevu=ga.jours8h[s];
          if(ga.posteFixe)sb.posteFixe=true;
          appliquerReprise(sb,ga,'8h',s);
          sb.agentData[an]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
          p.subPrelevements.push(sb);
        }
        m.prelevements.push(p);
      }
      if(ga.hasCT){
        var nsCT=nbPrelPrevu(ga,'CT');
        var pct={id:generateId(),gehId:g.id,gehName:g.name,gehNum:g.num,agents:[{name:an,color:lightenColor(c,0.4)}],type:'CT',isReglementaire:isRegCT,subPrelevements:[]};
        if(isRegCT&&nsCT<3)pct.justifNb=JUSTIF_NB_DEFAUT;
        if(ga.plageCT)pct.plagePrevue=ga.plageCT;
        for(var sCT=0;sCT<nsCT;sCT++){
          var sbCT={id:generateId(),operateur:'',date:'',plages:[{debut:'',fin:''}],observations:'',completed:false,agentData:{}};
          if(ga.joursCT&&ga.joursCT[sCT])sbCT.jourPrevu=ga.joursCT[sCT];
          if(ga.posteFixe)sbCT.posteFixe=true;
          appliquerReprise(sbCT,ga,'CT',sCT);
          sbCT.agentData[an]={refEchantillon:'',numPompe:'',debitInitial:'',debitFinal:''};
          pct.subPrelevements.push(sbCT);
        }
        m.prelevements.push(pct);
      }
    }
  }
  var neufs=m.prelevements;
  if(!anciens.length)return [];
  var gehOk={};m.gehs.forEach(function(g){if(g.name)gehOk[String(g.id)]=g;});
  var agentsMission={};(m.agents||[]).forEach(function(a){agentsMission[a.name]=true;});
  var sansAgents=!(m.agents||[]).length;
  var gardes=[],retires=[];
  anciens.forEach(function(p){
    var g=gehOk[String(p.gehId)];
    var agentOk=sansAgents||(p.agents||[]).some(function(a){return agentsMission[a.name];});
    if(g&&agentOk){p.gehName=g.name;p.gehNum=g.num;gardes.push(p);}
    else if(prelASaisie(p))retires.push(p);
  });
  neufs.forEach(function(p){
    var an=p.agents[0].name;
    var couvrant=gardes.filter(function(x){return String(x.gehId)===String(p.gehId)&&x.type===p.type&&(x.agents||[]).some(function(a){return a.name===an;});});
    if(!couvrant.length){gardes.push(p);return;}
    // prélèvement mono-agent déjà là : statut réglementaire et nombre prévu mis à jour, sans rien retirer
    var ex=couvrant.filter(function(x){return x.agents.length===1;})[0];
    if(!ex)return;
    ex.isReglementaire=p.isReglementaire;
    if(ex.isReglementaire&&p.subPrelevements.length<3&&ex.subPrelevements.length<3&&!ex.justifNb)ex.justifNb=JUSTIF_NB_DEFAUT;
    while(ex.subPrelevements.length<p.subPrelevements.length)ex.subPrelevements.push(p.subPrelevements[ex.subPrelevements.length]);
    if(p.plagePrevue)ex.plagePrevue=p.plagePrevue;
    p.subPrelevements.forEach(function(sb,i){if(sb.jourPrevu&&ex.subPrelevements[i])ex.subPrelevements[i].jourPrevu=sb.jourPrevu;});
  });
  m.prelevements=gardes;
  return retires;
}

function goToTerrain(id){
  state.currentMissionId=id;
  state.view='terrain-mission';
  state.expandedGeh={};
  render();
}

function renderPrepaMission(){
  var m=getCurrentMission();
  if(!m){state.view='prepa-list';render();return'';}
  var gc=m.gehs.filter(function(g){return g.name;}).length;
  var ac=m.agents.length;
  var pc=countPrelevements(m);
  var h='<button class="back-btn" onclick="state.view=\'prepa-list\';state.currentMissionId=null;render();">'+ICONS.arrowLeft+' Liste</button>';
  h+='<div class="card"><h2>'+ICONS.clipboard+' '+escapeHtml(m.clientSite||'Nouvelle mission')+'</h2><div class="info-box mt-12"><p><span class="svg-icon">'+ICONS.user+'</span> Préleveur : <strong>'+escapeHtml(m.preleveur||'-')+'</strong></p><p><span class="svg-icon">'+ICONS.tool+'</span> Débitmètre : <strong>'+escapeHtml(debitmetreTexte(m))+'</strong>'+(m.debitmetreType?'':' <span style="color:var(--status-warn-fg);">(à choisir : débits et volumes en dépendent)</span>')+'</p>'+(m.tachymetre?'<p><span class="svg-icon">'+ICONS.tool+'</span> Tachymètre : <strong>'+escapeHtml(m.tachymetre)+'</strong></p>':'')+'</div><button class="btn btn-gray btn-small mt-12" onclick="state.showModal=\'editInfo\';render();">'+ICONS.edit+' Modifier infos</button></div>';
  // dossier Scol@ (n° de dossier, établissement, site accrédité) : connu dès le devis, utile à la feuille et au rapport
  if(typeof renderScolaDossierPrepa==='function'&&typeof FC_MODELE_DISPO!=='undefined'&&FC_MODELE_DISPO===true)h+=renderScolaDossierPrepa(m);
  var step1=gc>0;var step2=ac>0;var step3=pc>0;
  h+='<div class="info-box mt-12"><p><strong>Étapes de préparation :</strong></p><p>'+(step1?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 1. Définir les GEH ('+(gc||'aucun')+')</p><p>'+(step2?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 2. Sélectionner les agents ('+(ac||'aucun')+')</p><p>'+(step3?'<span style="color:var(--accent);display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>':'<span style="opacity:0.3;display:inline-flex;width:14px;height:14px;vertical-align:middle;">'+ICONS.check+'</span>')+' 3. Affecter agents / GEH ('+(pc||'aucun')+' prél.)</p></div>';
  h+='<div class="nav-menu"><div class="nav-item" onclick="state.view=\'prepa-geh\';render();"><div class="nav-icon">'+ICONS.folder+'</div><div class="nav-label">1. GEH</div><div class="nav-count">'+gc+'</div></div><div class="nav-item" onclick="state.view=\'prepa-agents\';state.searchText=\'\';render();"><div class="nav-icon green">'+ICONS.beaker+'</div><div class="nav-label">2. Agents chimiques</div><div class="nav-count">'+ac+'</div></div></div>';
  if(ac>0&&gc>0)h+='<button class="btn btn-blue" onclick="state.view=\'prepa-affectations\';render();">'+ICONS.link+' 3. Affecter agents aux GEH</button>';
  h+='<div class="info-box info-box-success mt-12"><p><strong>Récap :</strong> '+gc+' GEH · '+ac+' agents · '+pc+' prélèvements</p></div>';
  if(pc>0)h+='<button class="btn btn-gray mt-8" onclick="ouvrirFicheSupports(\'prepa-mission\');">'+ICONS.clipboard+' Fiche supports (réf., commentaires, nombres conseillés)</button>';
  h+='<div class="row">';
  if(m.status==='prepa'){
    if(pc>0)h+='<button class="btn btn-primary" onclick="validateMission('+m.id+');">'+ICONS.check+' Valider ('+pc+')</button>';
    else h+='<button class="btn btn-gray" disabled>'+ICONS.check+' Valider</button>';
  }else{
    h+='<button class="btn btn-primary" onclick="goToTerrain('+m.id+');">'+ICONS.play+' Terrain</button>';
    h+='<button class="btn btn-gray btn-small" onclick="unvalidateMission('+m.id+');">'+ICONS.arrowLeft+' Prépa</button>';
  }
  h+='<button class="btn btn-danger btn-icon" onclick="deleteMission('+m.id+');">'+ICONS.trash+'</button>';
  h+='</div>';
  h+=renderMissionFileButtons(m);
  if(state._returnToTerrain)h+='<button class="btn btn-primary mt-8" onclick="returnToTerrain();">'+ICONS.check+' Retour au terrain</button>';
  if(m.status==='prepa')h+='<button class="btn btn-gray mt-8" onclick="state.showModal=\'prepaAuto\';state.prepaAutoData=null;render();">'+ICONS.zap+' Prépa automatique (devis)</button>';
  if(m.status==='prepa'&&typeof repriseChoisirFichier==='function')h+='<button class="btn btn-gray mt-8" onclick="repriseChoisirFichier();">'+ICONS.folder+' Reprendre la feuille de calcul de l’an dernier</button>';
  if(state.showModal==='reprise'&&typeof renderRepriseModal==='function')h+=renderRepriseModal(m);
  if(typeof renderVeoliaPrepa==='function'&&typeof FC_MODELE_DISPO!=='undefined'&&FC_MODELE_DISPO===true)h+=renderVeoliaPrepa(m);
  if(state.showModal==='editInfo')h+=renderEditInfoModal(m);
  if(state.showModal==='prepaAuto')h+=renderPrepaAutoModal(m);
  return h;
}

function renderEditInfoModal(m){
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>Infos mission</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div><div class="field"><label class="label">Client / Site *</label><input type="text" class="input" id="edit-clientsite" value="'+escapeHtml(m.clientSite)+'" placeholder="Ex: Entreprise ABC - Usine Nord"></div><div class="field"><label class="label">Préleveur</label><input type="text" class="input" id="edit-preleveur" value="'+escapeHtml(m.preleveur)+'"></div><div class="field"><label class="label">Type de débitmètre</label>'+renderDebitmetreTypeSelect('edit-debitmetre-type',m.debitmetreType||'')+'</div><div class="field"><label class="label">Débitmètre</label><input type="text" inputmode="numeric" class="input" id="edit-debitmetre" value="'+escapeHtml(m.debitmetre)+'"></div><div class="field"><label class="label">Tachymètre</label><input type="text" inputmode="numeric" class="input" id="edit-tachymetre" placeholder="N° tachymètre (si utilisé)" value="'+escapeHtml(m.tachymetre||'')+'"></div><div class="row"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-primary" onclick="saveEditInfo();">Enregistrer</button></div></div></div>';
  return h;
}

function saveEditInfo(){
  var m=getCurrentMission();if(!m)return;
  var cs=document.getElementById('edit-clientsite');
  var pr=document.getElementById('edit-preleveur');
  var db=document.getElementById('edit-debitmetre');
  var ta=document.getElementById('edit-tachymetre');
  var dt=document.getElementById('edit-debitmetre-type');
  if(dt&&dt.value)m.debitmetreType=dt.value;
  if(cs)m.clientSite=cs.value.trim();
  if(pr)m.preleveur=pr.value.trim();
  if(db)m.debitmetre=db.value.trim();
  if(ta)m.tachymetre=ta.value.trim();
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  render();
}

// ═══════════════════════════════════════════════════════════
// PRÉPA AUTOMATIQUE - Import depuis tableau devis
// © 2025 Quentin THOMAS
// ═══════════════════════════════════════════════════════════

function renderPrepaAutoModal(m){
  if(!state.prepaAutoData)state.prepaAutoData={format:'1',devisText:'',gehListText:'',parsed:null,error:null};
  var d=state.prepaAutoData;
  
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;state.prepaAutoData=null;render();}"><div class="modal-content" style="max-height:92vh;overflow-y:auto;"><div class="modal-header"><h2>'+ICONS.zap+' Prépa automatique</h2><button class="close-btn" onclick="state.showModal=null;state.prepaAutoData=null;render();">×</button></div>';
  
  // Choix du format
  h+='<div class="field"><label class="label">Format du devis</label><div class="row">';
  h+='<button class="btn btn-small '+(d.format==='1'?'btn-primary':'btn-gray')+'" onclick="state.prepaAutoData.format=\'1\';state.prepaAutoData.parsed=null;render();">Format 1 : N° GEH</button>';
  h+='<button class="btn btn-small '+(d.format==='2'?'btn-primary':'btn-gray')+'" onclick="state.prepaAutoData.format=\'2\';state.prepaAutoData.parsed=null;render();">Format 2 : Noms GEH</button>';
  h+='<button class="btn btn-small '+(d.format==='3'?'btn-primary':'btn-gray')+'" onclick="state.prepaAutoData.format=\'3\';state.prepaAutoData.parsed=null;render();">Format 3 : Plan d’échantillonnage</button>';
  h+='</div></div>';
  
  // Instructions
  if(d.format==='3'){
    h+='<div class="info-box"><p><strong>Format 3 :</strong> Collez l’onglet « Plan d’échantillonnage » de l’annexe</p><p style="font-size:11px;margin-top:4px;">Colonnes : Jour | Agents chimiques | GEH | Nb total de prélèvements | Type de VLEP | Plage horaire. GEH en numéro (« 1 »), en nom (« Laborantin ») ou les deux (« 1 - Prestataire ») ; la partie « Postes fixes » est reconnue.</p><p style="font-size:11px;margin-top:2px;">Les jours (J1, J2…) servent à la fiche supports (matériel par jour) et sont rappelés sur chaque prélèvement.</p></div>';
  }else if(d.format==='1'){
    h+='<div class="info-box"><p><strong>Format 1 :</strong> Collez le tableau du devis</p><p style="font-size:11px;margin-top:4px;">Colonnes attendues : Agent chimique | N° GEH | Nb prélèvements | Type VLEP</p><p style="font-size:11px;margin-top:2px;">+ Collez la liste des GEH (N° | Nom) en dessous</p></div>';
  }else{
    h+='<div class="info-box"><p><strong>Format 2 :</strong> Collez le tableau du devis</p><p style="font-size:11px;margin-top:4px;">Colonnes attendues : Agent chimique | Noms GEH | Nb prélèvements | Type VLEP</p></div>';
  }
  
  // Zone de saisie devis
  h+='<div class="field"><label class="label">'+(d.format==='3'?'Plan d’échantillonnage (copier/coller depuis Excel, ligne « Jour » comprise)':'Tableau du devis (copier/coller depuis Excel)')+'</label><textarea class="input" id="prepa-auto-devis" rows="6" placeholder="Collez ici le tableau du devis..." style="font-size:12px;font-family:monospace;">'+escapeHtml(d.devisText)+'</textarea></div>';
  
  // Zone GEH si format 1
  if(d.format==='1'||d.format==='3'){
    h+='<div class="field"><label class="label">Liste des GEH (N° + Nom)'+(d.format==='3'?' — facultative, si le plan ne donne que des numéros':'')+'</label><textarea class="input" id="prepa-auto-gehlist" rows="4" placeholder="Ex:\n1\tDécoupe LM\n2\tDécoupe SHW\n..." style="font-size:12px;font-family:monospace;">'+escapeHtml(d.gehListText)+'</textarea></div>';
  }
  
  // Bouton analyser
  h+='<button class="btn btn-primary" onclick="parsePrepaAuto();">'+ICONS.search+' Analyser le devis</button>';
  
  // Afficher erreur
  if(d.error){
    h+='<div class="info-box info-box-warning mt-12"><p>'+escapeHtml(d.error)+'</p></div>';
  }
  
  // Afficher aperçu si parsé
  if(d.parsed){
    var p=d.parsed;
    h+='<div class="section-title mt-12">Aperçu</div>';
    
    // GEH détectés
    h+='<div class="card" style="padding:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;"><span class="svg-icon">'+ICONS.folder+'</span> '+p.gehs.length+' GEH détectés</div>';
    p.gehs.forEach(function(g){
      h+='<div style="font-size:12px;color:var(--text-muted);padding:2px 0;">'+g.num+'. '+escapeHtml(g.name)+'</div>';
    });
    h+='</div>';
    
    // Agents et affectations
    h+='<div class="card" style="padding:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;"><span class="svg-icon">'+ICONS.beaker+'</span> '+p.agents.length+' agent(s) chimique(s)</div>';
    p.rows.forEach(function(r){
      var regs=r.posteFixe?r.agentNames.map(function(){return false;}):r.agentNames.map(agentEstReglementaire);
      var regLabel=regs.every(Boolean)?'<span style="color:#047857;font-size:10px;font-weight:700;"> REG</span>':(regs.some(Boolean)?'<span style="color:#047857;font-size:10px;font-weight:700;"> REG / NR</span>':'<span style="color:#b45309;font-size:10px;font-weight:700;"> NR</span>');
      h+='<div style="background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:6px;border-left:3px solid var(--primary);">';
      r.agentNames.forEach(function(an){
        h+='<div style="font-size:12px;font-weight:600;">'+escapeHtml(an)+'</div>';
      });
      if(r.jours&&r.jours.length)h+='<div style="font-size:11px;color:var(--primary);margin-top:3px;">'+escapeHtml(r.joursTexte)+(r.plage?' · '+escapeHtml(r.plage):'')+(r.posteFixe?' · poste fixe':'')+'</div>';
      h+='<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">'+r.type+regLabel+(r.posteFixe?' (poste fixe, hors accréditation)':'')+' · '+(r.agentNames.length>1?r.agentNames.length+' agents × ':'')+r.gehNums.length+' GEH × '+r.nb+' = '+(r.agentNames.length*r.gehNums.length*r.nb)+' sous-prél.'+(r.nb<3&&regs.some(Boolean)?' (réglementaire, justification à confirmer sur le terrain)':'')+'</div>';
      h+='</div>';
    });
    h+='</div>';
    
    // Résumé
    var totalPrel=0;
    p.rows.forEach(function(r){totalPrel+=r.agentNames.length*r.gehNums.length*r.nb;});
    h+='<div class="info-box info-box-success"><p><strong>Total :</strong> '+p.gehs.length+' GEH · '+p.agents.length+' agents · '+totalPrel+' sous-prélèvements</p></div>';
    
    // Avertissements agents non trouvés dans la DB
    var notInDB=[];
    p.agents.forEach(function(an){
      if(!getAgentFromDB(an))notInDB.push(an);
    });
    if(notInDB.length>0){
      h+='<div class="info-box info-box-warning mt-8"><p><strong>'+notInDB.length+' agent(s) non trouvé(s) dans la base :</strong></p>';
      notInDB.forEach(function(an){
        h+='<p style="font-size:11px;">• '+escapeHtml(an)+'</p>';
      });
      h+='<p style="font-size:11px;margin-top:4px;">Ils seront ajoutés en mode "manuel"</p></div>';
    }
    
    // Bouton appliquer
    h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;state.prepaAutoData=null;render();">Annuler</button><button class="btn btn-success" onclick="applyPrepaAuto();">'+ICONS.check+' Appliquer à la mission</button></div>';
  }
  
  h+='</div></div>';
  return h;
}

function parsePrepaAuto(){
  var d=state.prepaAutoData;
  d.error=null;
  d.parsed=null;
  
  // Lire les textareas
  var devisEl=document.getElementById('prepa-auto-devis');
  var gehListEl=document.getElementById('prepa-auto-gehlist');
  d.devisText=devisEl?devisEl.value:'';
  d.gehListText=gehListEl?gehListEl.value:'';
  
  if(!d.devisText.trim()){
    d.error='Collez le tableau du devis';
    render();return;
  }
  if(d.format==='3'){
    try{d.parsed=parsePlanEchantillonnage(d.devisText,d.gehListText);}catch(e){d.error=e.message;}
    render();return;
  }
  
  try{
    // Parser les lignes du devis
    var devisLines=parseTSVLines(d.devisText);
    if(devisLines.length===0){d.error='Aucune ligne valide détectée';render();return;}
    
    // Détecter si la première ligne est un en-tête
    var firstLine=devisLines[0];
    var isHeader=false;
    if(firstLine.length>=2){
      var col0=(firstLine[0]||'').toLowerCase();
      if(col0.indexOf('agent')!==-1||col0.indexOf('chimique')!==-1||col0.indexOf('substance')!==-1||col0.indexOf('paramètre')!==-1){
        isHeader=true;
      }
    }
    if(isHeader)devisLines.shift();
    
    // Parser la liste GEH (format 1)
    var gehMap={};
    if(d.format==='1'){
      if(!d.gehListText.trim()){
        d.error='Format 1 : collez aussi la liste des GEH (N° + Nom)';
        render();return;
      }
      var gehLines=parseTSVLines(d.gehListText);
      // Détecter header GEH
      if(gehLines.length>0){
        var gh0=(gehLines[0][0]||'').toLowerCase();
        if(gh0.indexOf('geh')!==-1||gh0.indexOf('n°')!==-1||gh0.indexOf('désignation')!==-1){
          gehLines.shift();
        }
      }
      // Parser : peut être "N° \t Nom" ou "N° Nom" sur chaque ligne
      gehLines.forEach(function(cols){
        if(cols.length>=2&&cols[0].trim()&&cols[1].trim()){
          var num=parseInt(cols[0].trim());
          if(!isNaN(num)){
            gehMap[num]=cols[1].trim();
          }
        }else if(cols.length===1||cols.length>=1){
          // Essayer format "1 Nom du GEH" ou "1\tNom"
          var txt=cols.join('\t').trim();
          var match=txt.match(/^(\d+)\s+(.+)/);
          if(match){
            gehMap[parseInt(match[1])]=match[2].trim();
          }
        }
      });
      
      // Aussi tenter un format inline "N° GEH \t Désignation 1 \t NomGEH1 2 \t NomGEH2..."
      if(Object.keys(gehMap).length===0){
        // Essayer de parser la liste en un seul bloc
        var allText=d.gehListText;
        var matches=allText.match(/(\d+)\s+([^\d]+)/g);
        if(matches){
          matches.forEach(function(m){
            var mm=m.match(/^(\d+)\s+(.+)/);
            if(mm)gehMap[parseInt(mm[1])]=mm[2].trim();
          });
        }
      }
      
      // Essayer format inline avec tabs : "Header \t Name1 N1 \t Name2 N2 \t ..."
      // Ou : "Header \t N1 \t Name1 \t N2 \t Name2 \t ..."
      if(Object.keys(gehMap).length===0&&gehLines.length>0){
        var flatCols=gehLines[0];
        // Format: [Header, Header2, N1, Name1, N2, Name2, ...]
        for(var ci=0;ci<flatCols.length-1;ci++){
          var numVal=parseInt(flatCols[ci]);
          if(!isNaN(numVal)&&numVal>0&&flatCols[ci+1]&&isNaN(parseInt(flatCols[ci+1]))){
            gehMap[numVal]=flatCols[ci+1].trim();
            ci++; // skip next
          }
        }
      }
      
      // Format: "Name1 N1 \t Name2 N2 \t ..." (nombre à la fin)
      if(Object.keys(gehMap).length===0&&gehLines.length>0){
        var flatCols2=gehLines[0];
        flatCols2.forEach(function(cell){
          var match2=cell.match(/^(.+?)\s+(\d+)\s*$/);
          if(match2){
            gehMap[parseInt(match2[2])]=match2[1].trim();
          }
        });
      }
      
      // Format: texte continu avec pattern "N NomGEH"
      if(Object.keys(gehMap).length===0){
        var fullText=d.gehListText.replace(/\t/g,' ');
        var re=/(\d+)\s+([A-Z\u00C0-\u00DA][^\d]*?)(?=\s+\d+\s|$)/gi;
        var m2;
        while((m2=re.exec(fullText))!==null){
          var nn=parseInt(m2[1]);
          var nm=m2[2].trim();
          if(nn>0&&nm.length>1)gehMap[nn]=nm;
        }
      }
      
      if(Object.keys(gehMap).length===0){
        d.error='Impossible de parser la liste des GEH. Format attendu :\n1\\tNom GEH 1\\n2\\tNom GEH 2\\n...';
        render();return;
      }
    }
    
    // Parser chaque ligne du devis
    var rows=[];
    var allAgents=[];
    var allGehNums={};
    
    devisLines.forEach(function(cols){
      if(cols.length<3)return;
      
      // Col 0 : Agent(s) chimique(s) - peut contenir plusieurs lignes
      var agentRaw=cols[0]||'';
      var agentNames=parseAgentNames(agentRaw);
      if(agentNames.length===0)return;
      
      // Col 1 : GEH (numéros ou noms séparés par " - ")
      var gehRaw=cols[1]||'';
      var gehNums=parseGehColumn(gehRaw,d.format,gehMap);
      if(gehNums.length===0)return;
      
      // Col 2 : Nb prélèvements
      var nb=lireNbPrel(cols[2]);
      
      // Col 3 : Type VLEP
      var typeRaw=(cols[3]||'8h').trim().toUpperCase();
      var type=typeRaw.indexOf('CT')!==-1?'CT':'8h';
      
      // Collecter
      agentNames.forEach(function(an){
        if(allAgents.indexOf(an)===-1)allAgents.push(an);
      });
      gehNums.forEach(function(gn){allGehNums[gn]=true;});
      
      rows.push({
        agentNames:agentNames,
        gehNums:gehNums,
        nb:nb,
        type:type
      });
    });
    
    if(rows.length===0){
      d.error='Aucun prélèvement détecté. Vérifiez le format du tableau.';
      render();return;
    }
    
    // Construire la liste des GEH
    var gehs=[];
    var sortedNums=Object.keys(allGehNums).map(Number).sort(function(a,b){return a-b;});
    sortedNums.forEach(function(num){
      var name=gehMap[num]||('GEH '+num);
      gehs.push({num:num,name:name});
    });
    
    d.parsed={
      gehs:gehs,
      agents:allAgents,
      rows:rows,
      gehMap:gehMap
    };
    
  }catch(e){
    d.error='Erreur d\'analyse : '+e.message;
  }
  
  render();
}

// Nombre de prélèvements d'une cellule (« 3 », « 2 prélèvements », « x1 ») ; illisible : 3 comme avant
function lireNbPrel(v){
  var n=parseInt(String(v||'').replace(/[^\d]/g,' ').trim().split(/\s+/)[0],10);
  return n>0&&n<100?n:3;
}

// Jours d'une ligne du plan (« J1/J2/J3 », « J2 / J3 / J4 », « J2 ») -> jour prévu de chaque prélèvement.
// Autant de jours que de prélèvements : un jour chacun ; un seul jour : tous ce jour-là ; sinon le prélèvement est
// « à placer » parmi les jours listés (« J3/J4/J5 »), jamais deviné.
function joursPlan(texte,nb){
  var l=String(texte||'').split(/[\/,;]+/).map(function(x){return x.replace(/\s+/g,'').toUpperCase();}).filter(function(x){return /^J\d+$/.test(x);});
  var out=[];
  for(var i=0;i<nb;i++)out.push(!l.length?'':(l.length===nb?l[i]:(l.length===1?l[0]:l.join('/'))));
  return out;
}

// Format 3 : onglet « Plan d'échantillonnage » de l'annexe (Jour | Agents | GEH | Nb | Type | Plage horaire).
// GEH : numéro, nom ou « n - nom » ; liste des GEH facultative pour nommer les numéros. Partie « Postes fixes » :
// lignes suivantes en poste fixe. Renvoie le même aperçu que les formats 1 et 2, avec jours et plage par ligne.
function parsePlanEchantillonnage(text,gehListText){
  var lignes=parseTSVLines(text),noms={},gehMap={},rows=[],agents=[],pf=false;
  (gehListText?parseTSVLines(gehListText):[]).forEach(function(c){var n=parseInt(c[0],10);if(n>0&&c[1]&&c[1].trim())noms[n]=c[1].trim();});
  var gehs=[],cle=function(num,nom){return num?'n'+num:'t'+nom.toLowerCase();};
  var parGeh={};
  lignes.forEach(function(c){
    var c0=(c[0]||'').trim();
    if(/^postes? fixes?$/i.test(c0)&&!(c[1]||'').trim()){pf=true;return;}
    if(/^jour$/i.test(c0)||c.length<4)return;
    var agentNames=parseAgentNames(c[1]||'');
    var gRaw=(c[2]||'').replace(/\s+/g,' ').trim();
    if(!agentNames.length||!gRaw)return;
    var m=/^(\d+)\s*(?:-\s*(.+))?$/.exec(gRaw),num=m?parseInt(m[1],10):null,nom=m?(m[2]||noms[num]||''):gRaw;
    // même GEH écrit tantôt « 1 - Peintres », tantôt « Peintres », tantôt « 1 » : rapproché par numéro ou par nom
    var g=num?gehs.filter(function(x){return x.num===num;})[0]:null;
    if(!g&&nom)g=gehs.filter(function(x){return x.name&&x.name.toLowerCase()===nom.toLowerCase()&&(!num||!x.num);})[0];
    if(!g){g={num:num,name:nom,pf:pf||/^PF\b/i.test(gRaw)};gehs.push(g);}
    else{if(!g.num&&num)g.num=num;if(!g.name&&nom)g.name=nom;}
    var k=cle(g.num,g.name);parGeh[k]=g;
    var nb=lireNbPrel(c[3]);
    var type=/CT/i.test(c[4]||'')?'CT':'8h';
    var jours=joursPlan(c0,nb);
    agentNames.forEach(function(an){if(agents.indexOf(an)===-1)agents.push(an);});
    rows.push({agentNames:agentNames,geh:g,nb:nb,type:type,jours:jours,joursTexte:c0,plage:(c[5]||'').replace(/\s+/g,' ').trim(),posteFixe:g.pf});
  });
  if(!rows.length)throw new Error('Aucune ligne reconnue. Collez le tableau à partir de la ligne « Jour | Agents chimiques | … ».');
  // numéros : ceux du plan, puis les GEH nommés sans numéro à la suite
  var pris={};gehs.forEach(function(g){if(g.num)pris[g.num]=true;});
  var suivant=1;gehs.forEach(function(g){if(!g.num){while(pris[suivant])suivant++;g.num=suivant;pris[suivant]=true;}if(!g.name)g.name='GEH '+g.num;gehMap[g.num]=g.name;});
  rows.forEach(function(r){r.gehNums=[r.geh.num];r.posteFixe=r.geh.pf;delete r.geh;});
  gehs.sort(function(a,b){return a.num-b.num;});
  return {gehs:gehs.map(function(g){return {num:g.num,name:g.name,posteFixe:g.pf};}),agents:agents,rows:rows,gehMap:gehMap};
}

function parseTSVLines(text){
  var result=[];
  var lines=[];
  var current='';
  var inQuote=false;
  
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(c==='"'){
      inQuote=!inQuote;
      current+=c;
    }else if(c==='\n'&&!inQuote){
      if(current.trim())lines.push(current);
      current='';
    }else{
      current+=c;
    }
  }
  if(current.trim())lines.push(current);
  
  lines.forEach(function(line){
    var cols=[];
    var cell='';
    var q=false;
    for(var i=0;i<line.length;i++){
      var c=line[i];
      if(c==='"')q=!q;
      else if(c==='\t'&&!q){
        cols.push(cell.replace(/^"|"$/g,'').trim());
        cell='';
      }else{
        cell+=c;
      }
    }
    cols.push(cell.replace(/^"|"$/g,'').trim());
    result.push(cols);
  });
  
  return result;
}

function parseAgentNames(raw){
  var names=[];
  // Séparer par retour à la ligne dans une cellule
  var parts=raw.split(/\n|\r\n|\r/);
  parts.forEach(function(p){
    var t=p.replace(/^["'\s]+|["'\s]+$/g,'').trim();
    // Ignorer les lignes qui sont des commentaires comme "Analyse TOXILABO"
    if(!t)return;
    if(t.toLowerCase().indexOf('analyse ')===0)return;
    // Nom de la base écrit sur deux lignes (« Butanol » / « (Toxilabo) », « … » / « (support PVC) ») : précision
    // entre parenthèses rattachée à l'agent de la ligne précédente
    if(t.charAt(0)==='('&&names.length){
      var prec=names[names.length-1];
      names[names.length-1]=getAgentFromDB(prec+'\n'+t)?prec+'\n'+t:prec+' '+t;
      return;
    }
    // Ajouter si c'est un nom valide
    if(t.length>1)names.push(t);
  });
  return names;
}

function parseGehColumn(raw,format,gehMap){
  var nums=[];
  // Les GEH sont séparés par " - " ou "-" avec espaces
  var parts=raw.split(/\s*-\s*/);
  
  if(format==='1'){
    // Numéros
    parts.forEach(function(p){
      var n=parseInt(p.trim());
      if(!isNaN(n)&&n>0)nums.push(n);
    });
  }else{
    // Noms directs - on les ajoute comme numéros séquentiels
    // On crée un mapping name->num
    var nextNum=1;
    parts.forEach(function(p){
      var name=p.trim();
      if(!name)return;
      // Chercher dans gehMap si un num existe déjà pour ce nom
      var found=false;
      for(var num in gehMap){
        if(gehMap[num]===name){
          nums.push(parseInt(num));
          found=true;
          break;
        }
      }
      if(!found){
        // Ajouter un nouveau GEH
        while(gehMap[nextNum])nextNum++;
        gehMap[nextNum]=name;
        nums.push(nextNum);
        nextNum++;
      }
    });
  }
  
  return nums;
}

function applyPrepaAuto(){
  var m=getCurrentMission();
  if(!m||!state.prepaAutoData||!state.prepaAutoData.parsed)return;
  var p=state.prepaAutoData.parsed;
  
  var confirm1=confirm('Appliquer la prépa automatique ?\n\nCela va remplacer les GEH, agents et affectations actuels.\n\n'+p.gehs.length+' GEH · '+p.agents.length+' agents');
  if(!confirm1)return;
  appliquerPlanPrepa(m,p);

  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.prepaAutoData=null;
  render();

  var totalPrel=countPrelevements(m);
  alert('Prépa automatique appliquée !\n\n'+m.gehs.filter(function(g){return g.name;}).length+' GEH\n'+m.agents.length+' agents\n'+totalPrel+' prélèvements\n\nVérifiez les affectations et validez quand tout est bon.');
}

// Plan (prépa automatique ou reprise de la feuille de l'an dernier) -> GEH, agents et affectations de la mission.
// r.isReg : statut imposé par la source (feuille de l'an dernier), sinon celui de la base ; r.reprise : saisies de
// chaque prélèvement (Scol@, EPI, durée d'exposition) recopiées à la validation
function appliquerPlanPrepa(m,p){
  // 1. Créer les GEH
  m.gehs=[];
  p.gehs.forEach(function(g){
    var ng={id:generateId(),num:g.num,name:g.name};
    if(g.scola&&Object.keys(g.scola).length)ng.scola=JSON.parse(JSON.stringify(g.scola)); // Scol@ par GEH (reprise)
    m.gehs.push(ng);
  });
  p.rows.forEach(function(r){r.nb=r.nb||3;});
  
  // 2. Créer les agents
  m.agents=[];
  var agentTypes={};// agentName -> {is8h, isCT}
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
    m.agents.push({
      name:an,
      is8h:types.is8h||(!types.is8h&&!types.isCT),
      isCT:types.isCT,
      isManual:!inDB
    });
  });
  
  // 3. Créer les affectations
  m.affectations={};
  m.agentColors={};
  
  p.rows.forEach(function(r){
    r.agentNames.forEach(function(an){
      if(!m.affectations[an])m.affectations[an]={gehs:{}};
      var c=getAgentColor(m,an);
      
      r.gehNums.forEach(function(gNum){
        // Trouver le GEH correspondant
        var geh=m.gehs.find(function(g){return g.num===gNum;});
        if(!geh)return;
        
        if(!m.affectations[an].gehs[geh.id]){
          m.affectations[an].gehs[geh.id]={has8h:false,hasCT:false,isReg8h:true,isRegCT:true};
        }
        var gaf=m.affectations[an].gehs[geh.id];
        // même agent, même GEH, même type sur plusieurs lignes : prélèvements additionnés (avant : le dernier écrasait)
        var T=r.type==='CT'?'CT':'8h';
        if(gaf['has'+T]){gaf['nb'+T]=(gaf['nb'+T]||0)+r.nb;}
        else{gaf['has'+T]=true;gaf['nb'+T]=r.nb;}
        // poste fixe : mesure d'ambiance hors accréditation, jamais réglementaire
        gaf['isReg'+T]=r.posteFixe?false:(r.isReg!==undefined?r.isReg:agentEstReglementaire(an));
        if(r.jours){gaf['jours'+T]=(gaf['jours'+T]||[]).concat(r.jours);if(r.plage)gaf['plage'+T]=r.plage;}
        if(r.reprise&&r.reprise.length)gaf['reprise'+T]=(gaf['reprise'+T]||[]).concat(r.reprise);
        if(r.posteFixe)gaf.posteFixe=true;
      });
    });
  });
}

// Saisies reprises de la feuille de l'an dernier (gaf.reprise8h / repriseCT) -> prélèvement n°s (le 1er à défaut)
var REPRISE_CHAMPS=['scolaTache','scolaMetier','scolaProcede','ventEnv','ventGenerale','ventCaptage','epiType','dureeExpo','scolaDispositif','scolaMethode','scolaApr'];
function appliquerReprise(sb,ga,type,s){
  var l=ga['reprise'+type];
  if(!l||!l.length)return;
  var j=l[s]||l[0];
  REPRISE_CHAMPS.forEach(function(k){if(j[k])sb[k]=j[k];});
}

function unvalidateMission(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(m){m.status='prepa';saveData('vlep_missions_v3',state.missions);render();}
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


function deleteMission(id){
  if(confirm('Supprimer cette mission ?')){
    state.missions=state.missions.filter(function(m){return m.id!==id;});
    saveData('vlep_missions_v3',state.missions);
    state.currentMissionId=null;
    state.view='prepa-list';
    render();
  }
}

// Recherche d'agents : seuls les résultats sont redessinés (le champ garde le focus)
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
      state._searchResults=f.slice(0,10);
      h+='<div class="search-results" id="agent-search-results">';
      state._searchResults.forEach(function(x,idx){
        h+='<div class="search-result-item" data-agent-idx="'+idx+'" onmousedown="event.preventDefault();">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }else{state._searchResults=[];}
  }else{state._searchResults=[];}
  h+='</div>';
  h+='<button class="btn btn-gray" onclick="state.showModal=\'addManual\';render();">+ Ajouter manuellement</button><div class="section-title">Agents sélectionnés ('+m.agents.length+')</div>';
  if(m.agents.length===0)h+='<div class="empty-state"><p>Aucun agent sélectionné</p></div>';
  else m.agents.forEach(function(a,i){
    var c=getAgentColor(m,a.name);
    var h8=hasVLEP8h(a.name)||a.isManual;
    var hc=hasVLEPCT(a.name)||a.isManual;
    h+='<div class="agent-item"><div class="agent-color" style="background:'+c+';"></div><div class="agent-name">'+escapeHtml(a.name)+(a.isManual?' <small>(manuel)</small>':'')+(typeof consigneSansLabo==='function'&&consigneSansLabo(a.name)?' <small style="color:#dc2626;font-weight:600;">aucun laboratoire ne l’analyse</small>':'')+'</div><div class="agent-badges"><span class="agent-badge agent-badge-8h '+(a.is8h?'active':'')+'" onclick="toggleAgent8h('+i+');">8h</span><span class="agent-badge agent-badge-ct '+(a.isCT?'active':'')+'" onclick="toggleAgentCT('+i+');">CT</span></div><button class="agent-delete" onclick="removeAgent('+i+');">'+ICONS.trash+'</button></div>';
  });
  if(state.showModal==='addManual')h+=renderAddManualModal();
  return h;
}

// Clic sur un résultat de recherche
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
      state._searchResults=f.slice(0,10);
      h+='<div class="search-results" id="agent-search-results">';
      state._searchResults.forEach(function(x,idx){
        h+='<div class="search-result-item" data-agent-idx="'+idx+'" onmousedown="event.preventDefault();">'+escapeHtml(x)+'</div>';
      });
      h+='</div>';
    }else{state._searchResults=[];}
  }else{state._searchResults=[];}
  container.innerHTML=h;
  attachSearchResultListeners(container);
}

function attachSearchResultListeners(container){
  var items=container.querySelectorAll('[data-agent-idx]');
  items.forEach(function(el){
    el.addEventListener('click',function(){
      var idx=parseInt(el.getAttribute('data-agent-idx'),10);
      if(state._searchResults&&state._searchResults[idx]!==undefined){
        addAgentFromSearch(state._searchResults[idx]);
      }
    });
  });
}

function addAgentFromSearch(n){
  var m=getCurrentMission();
  if(!m||m.agents.some(function(a){return a.name===n;}))return;
  var h8=hasVLEP8h(n),hct=hasVLEPCT(n);
  m.agents.push({name:n,is8h:h8||(!h8&&!hct),isCT:hct,isManual:false});
  state.searchText='';
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Recherche d'agents : sans accents, plusieurs mots possibles, et les meilleurs résultats d'abord
// (nom exact, puis nom qui commence par la saisie, puis un mot qui commence par la saisie, puis le reste ;
// à rang égal, le nom le plus court). Ainsi « éthanol » sort avant « 2-butoxyéthanol » ou « diéthanolamine ».
function normRecherche(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();}
function rangAgent(nom,saisie){
  var n=normRecherche(nom),s=normRecherche(saisie);
  if(!s)return -1;
  var mots=s.split(' ');
  if(!mots.every(function(w){return n.indexOf(w)!==-1;}))return -1;
  if(n===s)return 0;
  if(n.indexOf(s)===0)return 1;
  var p=n.indexOf(s);
  while(p>0){
    if(!/[a-z0-9]/.test(n.charAt(p-1)))return 2; // un mot commence par la saisie
    p=n.indexOf(s,p+1);
  }
  return 3;
}
function searchAgentsDB(t){
  var res=[];
  state.agentsDB.forEach(function(a){
    var nom=a['Agent chimique']||'';
    var r=rangAgent(nom,t);
    if(r>=0)res.push({nom:nom,r:r});
  });
  res.sort(function(x,y){return x.r-y.r||x.nom.length-y.nom.length||x.nom.localeCompare(y.nom);});
  return res.map(function(x){return x.nom;});
}

function addAgent(n){
  var m=getCurrentMission();
  if(!m||m.agents.some(function(a){return a.name===n;}))return;
  var h8=hasVLEP8h(n),hct=hasVLEPCT(n);
  m.agents.push({name:n,is8h:h8||(!h8&&!hct),isCT:hct,isManual:false});
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
  var b=nomAgentManuel(n);
  if(b){state.showModal=null;addAgent(b);return;}
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

function deleteGehPrepa(i){
  var m=getCurrentMission();if(!m)return;
  if(m.gehs.length<=1){alert('Vous devez garder au moins un GEH');return;}
  var geh=m.gehs[i];
  var msg='Supprimer ce GEH ?';
  if(geh.name)msg='Supprimer le GEH "'+geh.name+'" ?';
  if(!confirm(msg))return;
  // Supprimer les affectations liées
  for(var an in m.affectations){
    if(m.affectations[an].gehs&&m.affectations[an].gehs[geh.id]){
      delete m.affectations[an].gehs[geh.id];
    }
  }
  m.gehs.splice(i,1);
  // Renuméroter
  m.gehs.forEach(function(g,idx){g.num=idx+1;});
  saveData('vlep_missions_v3',state.missions);
  render();
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
    // Obtenir le statut réglementaire par défaut de l'agent depuis la DB
    var agentDB=getAgentFromDB(ag.name);
    var defaultIsReg=agentEstReglementaire(ag.name);
    h+='<div class="affect-card" style="border-left:4px solid '+c+';"><div class="affect-header"><div class="affect-agent">'+escapeHtml(ag.name)+'</div></div>';
    ga.forEach(function(g){
      if(!af.gehs[g.id])af.gehs[g.id]={has8h:false,hasCT:false,isReg8h:defaultIsReg,isRegCT:defaultIsReg};
      var gaf=af.gehs[g.id];
      // Migration: si isReg8h/isRegCT n'existent pas, utiliser isReg ou valeur par défaut
      if(gaf.isReg8h===undefined){
        gaf.isReg8h=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:defaultIsReg);
      }
      if(gaf.isRegCT===undefined){
        gaf.isRegCT=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:defaultIsReg);
      }
      var can8h=ag.is8h;
      var canCT=ag.isCT;
      h+='<div class="affect-geh-row"><div class="affect-geh-name">'+g.num+'. '+escapeHtml(g.name)+'</div><div class="affect-geh-badges">';
      h+='<span class="affect-groupe">';
      h+='<span class="affect-mini-badge '+(gaf.has8h?'active-8h':'')+' '+(!can8h?'disabled':'')+'" onclick="toggleGehAffect(\''+escapeJs(ag.name)+'\','+g.id+',\'8h\');">8h</span>';
      if(gaf.has8h){
        h+='<button class="affect-reg-toggle-mini '+(gaf.isReg8h?'':'nonreg')+'" onclick="toggleGehAffectReg(\''+escapeJs(ag.name)+'\','+g.id+',\'8h\');" title="'+(gaf.isReg8h?'8h réglementaire (toucher pour changer)':'8h non réglementaire (toucher pour changer)')+'">'+(gaf.isReg8h?'Régl.':'Non régl.')+'</button>';
        h+='<button class="affect-reg-toggle-mini nb" onclick="toggleGehAffectNb(\''+escapeJs(ag.name)+'\','+g.id+',\'8h\');" title="Nombre de prélèvements (toucher pour changer)">'+nbPrelPrevu(gaf,'8h')+' prél.</button>';
      }
      h+='</span><span class="affect-groupe">';
      h+='<span class="affect-mini-badge '+(gaf.hasCT?'active-ct':'')+' '+(!canCT?'disabled':'')+'" onclick="toggleGehAffect(\''+escapeJs(ag.name)+'\','+g.id+',\'CT\');">CT</span>';
      if(gaf.hasCT){
        h+='<button class="affect-reg-toggle-mini '+(gaf.isRegCT?'':'nonreg')+'" onclick="toggleGehAffectReg(\''+escapeJs(ag.name)+'\','+g.id+',\'CT\');" title="'+(gaf.isRegCT?'CT réglementaire (toucher pour changer)':'CT non réglementaire (toucher pour changer)')+'">'+(gaf.isRegCT?'Régl.':'Non régl.')+'</button>';
        h+='<button class="affect-reg-toggle-mini nb" onclick="toggleGehAffectNb(\''+escapeJs(ag.name)+'\','+g.id+',\'CT\');" title="Nombre de prélèvements (toucher pour changer)">'+nbPrelPrevu(gaf,'CT')+' prél.</button>';
      }
      h+='</span></div></div>';
    });
    h+='</div>';
  });
  saveData('vlep_missions_v3',state.missions);
  return h;
}

// Nombre de prélèvements prévus : 3 → 1 → 2 → 3 (une stratégie peut en prévoir moins de 3 en réglementaire)
function toggleGehAffectNb(an,gid,type){
  var m=getCurrentMission();
  if(!m||!m.affectations[an]||!m.affectations[an].gehs[gid])return;
  var gaf=m.affectations[an].gehs[gid],cle=type==='CT'?'nbCT':'nb8h';
  gaf[cle]={3:1,1:2,2:3}[nbPrelPrevu(gaf,type)]||3;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function toggleGehAffectReg(an,gid,type){
  var m=getCurrentMission();
  if(!m||!m.affectations[an]||!m.affectations[an].gehs[gid])return;
  var gaf=m.affectations[an].gehs[gid];
  if(type==='8h'){
    gaf.isReg8h=!gaf.isReg8h;
  }else if(type==='CT'){
    gaf.isRegCT=!gaf.isRegCT;
  }
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


console.log('✓ Prépa chargé');
