// import-export.js - Import/Export de missions (.json)
// © 2025 Quentin THOMAS
// Sauvegarde/restauration des missions, partage par fichier ou e-mail

// ===== EXPORT / IMPORT MISSION JSON =====
// Fichier de la mission, partagé par le téléchargement et l'envoi par e-mail (envoi-mail.js)
function buildMissionJSON(m){
  var exportData={_format:'VLEP_Mission_JSON',_version:'1.0',_exportDate:new Date().toISOString(),_author:'Quentin THOMAS',mission:JSON.parse(JSON.stringify(m))};
  var json=JSON.stringify(exportData,null,2);
  var safeName=(m.clientSite||'mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ _-]/g,'').replace(/\s+/g,'_').substring(0,40);
  return {blob:new Blob([json],{type:'application/json'}),filename:'VLEP_Mission_'+safeName+'_'+String(m.id).slice(-6)+'.json'};
}

function exportMissionJSON(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(!m){alert('Mission introuvable');return;}
  var built=buildMissionJSON(m);
  downloadBlob(built.blob,built.filename);
}

// Boutons « Export JSON » + « Envoyer par e-mail » (préparation et terrain)
function renderMissionFileButtons(m){
  return '<div class="row mb-12"><button class="btn btn-gray" onclick="exportMissionJSON('+m.id+');">'+ICONS.download+' Export JSON</button>'+
    '<button class="btn btn-gray" onclick="sendMissionByMail('+m.id+');">'+ICONS.mail+' Envoyer par e-mail</button></div>';
}

function triggerImportMission(){
  var input=document.getElementById('import-mission-input');
  if(!input){
    input=document.createElement('input');
    input.type='file';
    input.accept='.json';
    input.style.display='none';
    input.id='import-mission-input';
    input.onchange=handleImportMission;
    document.body.appendChild(input);
  }
  input.value='';
  input.click();
}

function handleImportMission(event){
  var file=event.target?event.target.files[0]:null;
  if(!file)return;
  if(!file.name.endsWith('.json')){alert('Veuillez sélectionner un fichier .json');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    importMissionFromText(e.target.result);
  };
  reader.readAsText(file);
}

// Mission contenue dans un fichier (format standard, QR code compact ou brut), sinon null
function missionDepuisDonnees(data){
  if(!data)return null;
  if(data._format==='VLEP_Mission_JSON'&&data.mission)return data.mission;
  if(data._f==='VLEP'&&data.m)return data.m;
  if(data.id&&data.gehs&&data.agents!==undefined)return data;
  return null;
}

function importMissionFromText(text){
  try{
    var data=JSON.parse(text);
    var mission=missionDepuisDonnees(data);
    if(!mission){
      alert('Format non reconnu.\n\nAssurez-vous d\'importer des données VLEP Mission.');
      return;
    }
    // Mission déjà sur le téléphone (fichier d'un collègue) : fusion proposée avant l'écrasement
    var exists=state.missions.some(function(m){return m.id===mission.id;});
    if(exists){
      if(confirm('Cette mission est déjà sur le téléphone.\n\nOK : fusionner (vos saisies et celles du fichier sont réunies)\nAnnuler : autre choix')){appliquerFusionMission(mission);return;}
      if(!confirm('Écraser la mission du téléphone par celle du fichier ?\n\nVos saisies sur ce téléphone seront perdues.'))return;
      state.missions=state.missions.filter(function(m){return m.id!==mission.id;});
    }
    state.missions.push(mission);
    saveData('vlep_missions_v3',state.missions);
    repairMissions();
    state.showModal=null;
    render();
    var name=mission.clientSite||'Sans nom';
    var pCount=0;
    if(mission.prelevements)mission.prelevements.forEach(function(p){if(p.subPrelevements)pCount+=p.subPrelevements.length;});
    var aCount=mission.agents?mission.agents.length:0;
    var gCount=mission.gehs?mission.gehs.filter(function(g){return g.name;}).length:0;
    alert('Mission importée avec succès !\n\n'+name+'\n'+gCount+' GEH • '+aCount+' agents • '+pCount+' sous-prélèvements\n\nStatut : '+(mission.status==='prepa'?'En préparation':(mission.status==='validee'?'Validée':(mission.status==='encours'?'En cours':'Terminée'))));
  }catch(err){
    alert('Erreur lors de l\'import :\n\n'+err.message+'\n\nVérifiez que les données sont valides.');
  }
}


console.log('✓ Import/Export chargé');
