// import-export.js - Import/Export de missions (.json)
// © 2025 Quentin THOMAS
// Sauvegarde/restauration des missions, partage par fichier ou e-mail

// ===== EXPORT / IMPORT MISSION JSON =====
// Fichier de la mission, partagé par le téléchargement et l'envoi par e-mail (envoi-mail.js)
function buildMissionJSON(m){
  // heure de la dernière sauvegarde hors du téléphone (fichier ou e-mail) : sert au rappel de sauvegarde
  m._sauvegarde=Date.now();
  try{saveData('vlep_missions_v3',state.missions);}catch(e){}
  var exportData={_format:'VLEP_Mission_JSON',_version:'1.0',_exportDate:new Date().toISOString(),_author:'Quentin THOMAS',mission:JSON.parse(JSON.stringify(m))};
  var json=JSON.stringify(exportData,null,2);
  var safeName=(m.clientSite||'mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ _-]/g,'').replace(/\s+/g,'_').substring(0,40);
  return {blob:new Blob([json],{type:'application/json'}),filename:'Appli_VLEP_'+safeName+'_'+String(m.id).slice(-6)+'.json'};
}

function exportMissionJSON(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(!m){alert('Mission introuvable');return;}
  var built=buildMissionJSON(m);
  downloadBlob(built.blob,built.filename);
}

// Rappel de sauvegarde : la mission ne vit que dans le téléphone. Saisies faites depuis la dernière sauvegarde
// (fichier .json ou e-mail) et dont la plus ancienne date d'un jour passé, ou en fin de journée (16 h) : rappel.
// Renvoie la date (aaaa-mm-jj) de la plus ancienne saisie non sauvegardée, ou null.
function sauvegardeEnRetard(m,maintenant){
  maintenant=maintenant||new Date();
  var depuis=m._sauvegarde||0,plusAncienne=null;
  (m.prelevements||[]).forEach(function(p){(p.subPrelevements||[]).forEach(function(sb){
    if(sb._mod&&sb._mod>depuis&&(plusAncienne===null||sb._mod<plusAncienne))plusAncienne=sb._mod;
  });});
  if(plusAncienne===null)return null;
  var jour=function(t){var d=new Date(t),p=function(n){return (n<10?'0':'')+n;};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
  var j=jour(plusAncienne);
  return j<jour(maintenant.getTime())||maintenant.getHours()>=16?j:null;
}
function renderRappelSauvegarde(m){
  var j=sauvegardeEnRetard(m);
  if(!j)return '';
  var quand=j===getTodayDate()?'d’aujourd’hui':'depuis le '+formatDateFR(j);
  return '<div class="a-verifier rappel-sauvegarde"><div class="a-verifier-tete" style="cursor:default;"><span>Saisies '+quand+' seulement dans ce téléphone</span></div>'+
    '<div class="a-verifier-liste"><div style="font-size:12px;margin:0 2px 6px;">S’il est perdu ou réinitialisé, elles sont perdues. Enregistrez ou envoyez la mission :</div><div class="row" style="gap:6px;">'+
    '<button class="btn btn-gray btn-small" style="margin:0;" onclick="exportMissionJSON('+m.id+');render();">'+ICONS.download+' Enregistrer (.json)</button>'+
    '<button class="btn btn-gray btn-small" style="margin:0;" onclick="sendMissionByMail('+m.id+');render();">'+ICONS.mail+' Envoyer par e-mail</button></div></div></div>';
}

// ===== Stockage du téléphone =====
// Les missions sont dans le stockage du navigateur, limité à environ 5 millions de caractères par site selon les
// navigateurs : plein, l'enregistrement échoue. Jauge sur l'accueil ; les missions terminées s'archivent.
var STOCKAGE_LIMITE = 5000000;
function stockageUtilise() {
  var n = 0;
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {}
  return n;
}
function tailleMission(m) { try { return JSON.stringify(m).length; } catch (e) { return 0; } }
function formatMo(n) { return n < 100000 ? Math.max(1, Math.round(n / 1000)) + ' Ko' : (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mo'; }
function renderJaugeStockage(siAlerte) {
  var u = stockageUtilise(), pct = Math.min(100, Math.round(u * 100 / STOCKAGE_LIMITE)), alerte = pct >= 70;
  if (siAlerte && !alerte) return '';
  var h = '<div class="jauge-stockage' + (alerte ? ' alerte' : '') + '"><div class="jauge-stockage-texte"><span>Stockage du téléphone</span><span>' + formatMo(u) + ' sur environ ' + formatMo(STOCKAGE_LIMITE) + '</span></div><div class="jauge-stockage-barre"><span style="width:' + pct + '%;"></span></div>';
  if (alerte) {
    var lourdes = (state.missions || []).slice().sort(function (a, b) { return tailleMission(b) - tailleMission(a); }).slice(0, 3);
    h += '<div class="jauge-stockage-aide">Bientôt plein : l’enregistrement échouerait. Archivez les missions terminées (mission › menu ⋯ › Archiver). Les plus lourdes : ' + lourdes.map(function (m) { return escapeHtml(m.clientSite || 'Sans nom') + ' (' + formatMo(tailleMission(m)) + ')'; }).join(', ') + '.</div>';
  }
  return h + '</div>';
}

// Archiver : fichier .json enregistré, puis mission retirée du téléphone après confirmation (réimport depuis l'accueil)
function archiverMission(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) return;
  var nom = buildMissionJSON(m).filename;
  exportMissionJSON(id);
  setTimeout(function () {
    if (!confirm('Archiver « ' + (m.clientSite || 'Sans nom') + ' » ?\n\nVérifiez d’abord que le fichier « ' + nom + ' » est bien enregistré (Téléchargements), ou envoyez-le par e-mail.\n\nOK : la mission est retirée de ce téléphone. Elle se réimporte depuis l’accueil (« Importer une mission »).')) return;
    state.missions = state.missions.filter(function (x) { return x.id !== id; });
    saveData('vlep_missions_v3', state.missions);
    state.currentMissionId = null; state.missionMenuOpen = false; state.view = 'terrain-list';
    render();
  }, 600);
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
      alert('Format non reconnu.\n\nAssurez-vous d\'importer une mission de l\'Appli VLEP.');
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
