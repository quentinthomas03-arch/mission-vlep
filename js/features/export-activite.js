/*
 * VLEP Mission v3.8 - export-activite.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Export rapport d'activité au format Word (.docx)
 * Format : Tableau avec 9 colonnes comme dans le fichier activite.docx
 */

// Fonction principale d'export rapport d'activité
async function exportRapportActivite(){
  var m=getCurrentMission();
  if(!m){alert('Aucune mission sélectionnée');return;}
  
  try{
    // Créer le document Word
    var docContent=createActivityReport(m);
    
    // Télécharger (nécessite bibliothèque docx.js)
    var fileName='Rapport_Activite_'+sanitizeFilename(m.clientSite)+'_'+formatDateForFile(new Date())+'.docx';
    
    alert('✓ Format du rapport d\'activité prêt !\n\nNécessite l\'intégration de docx.js pour générer le fichier.\n\nFichier : '+fileName);
    console.log('Rapport d\'activité:',docContent);
    
  }catch(err){
    console.error('Erreur export activité:',err);
    alert('❌ Erreur lors de l\'export du rapport d\'activité.\n\n'+err.message);
  }
}

// Créer le contenu du rapport d'activité
function createActivityReport(mission){
  var report={
    title:'Rapport d\'activité - '+mission.clientSite,
    headers:[],
    tableData:[]
  };
  
  // Pour chaque GEH
  mission.gehs.filter(function(g){return g.name;}).forEach(function(geh){
    // En-tête de section GEH
    report.headers.push({
      geh:geh.num+' - '+geh.name,
      production:'Production : '+getGehProduction(mission,geh.id)
    });
    
    // Trouver tous les prélèvements de ce GEH
    var prelGeh=mission.prelevements.filter(function(p){return p.gehId===geh.id;});
    
    // Pour chaque prélèvement
    prelGeh.forEach(function(prel){
      prel.subPrelevements.forEach(function(sub){
        // Pour chaque agent du prélèvement
        prel.agents.forEach(function(agent){
          var agentData=(sub.agentData&&sub.agentData[agent.name])||{};
          var agentDB=getAgentFromDB(agent.name);
          
          // Calculer durée d'exposition
          var dureeExpo=calculateExpositionDuration(sub.plages);
          
          // Formater plages horaires
          var plagesStr=formatPlagesForReport(sub.plages);
          
          // VLEP
          var vlepStr=prel.type==='8h'?'VLEP 8h':'VLEP CT';
          if(agentDB){
            var vlepValue=prel.type==='8h'?agentDB['VLEP 8h (mg/m3)']:agentDB['VLEP CT (mg/m3)'];
            if(vlepValue)vlepStr+=' : '+vlepValue+' mg/m³';
          }
          
          // Ajouter ligne au tableau
          report.tableData.push({
            operateur:sub.operateur||'-',
            plageHoraire:plagesStr,
            dureeExposition:dureeExpo,
            agentChimique:agent.name,
            vlep:vlepStr,
            epi:getEPIForAgent(agent.name),
            ventilation:getVentilationInfo(mission,geh.id),
            taches:getTachesRealisees(sub),
            observations:sub.observations||'-'
          });
        });
      });
    });
  });
  
  return report;
}

// Calculer durée d'exposition totale
function calculateExpositionDuration(plages){
  if(!plages||plages.length===0)return'-';
  
  var totalMinutes=0;
  plages.forEach(function(plage){
    if(plage.debut&&plage.fin){
      var debut=plage.debut.split(':');
      var fin=plage.fin.split(':');
      var debutMin=parseInt(debut[0])*60+parseInt(debut[1]);
      var finMin=parseInt(fin[0])*60+parseInt(fin[1]);
      totalMinutes+=finMin-debutMin;
    }
  });
  
  if(totalMinutes===0)return'-';
  
  var hours=Math.floor(totalMinutes/60);
  var minutes=totalMinutes%60;
  
  return hours+'h'+String(minutes).padStart(2,'0');
}

// Formater plages horaires pour rapport
function formatPlagesForReport(plages){
  if(!plages||plages.length===0)return'-';
  
  return plages.map(function(plage,idx){
    if(!plage.debut||!plage.fin)return'';
    return 'P'+(idx+1)+': '+plage.debut+' - '+plage.fin;
  }).filter(function(s){return s;}).join('\n');
}

// Récupérer EPI pour un agent (peut être enrichi)
function getEPIForAgent(agentName){
  var agentDB=getAgentFromDB(agentName);
  if(!agentDB)return'-';
  
  // Cette info pourrait être dans la base de données
  // Pour l'instant on retourne un placeholder
  var cmr=agentDB['CMR']||'';
  if(cmr&&cmr!=='Non'){
    return 'Protection respiratoire FFP3 recommandée';
  }
  return 'Selon fiche de sécurité';
}

// Récupérer info ventilation pour un GEH
function getVentilationInfo(mission,gehId){
  // Cette info pourrait être stockée au niveau du GEH
  // Pour l'instant on retourne un placeholder
  return 'Ventilation générale en place';
}

// Récupérer tâches réalisées depuis observations
function getTachesRealisees(sub){
  if(!sub.observations)return'-';
  
  // On pourrait parser les observations pour extraire les tâches
  // Pour l'instant on retourne les premières lignes
  var lines=sub.observations.split('\n');
  return lines[0]||'-';
}

// Récupérer nature production pour un GEH
function getGehProduction(mission,gehId){
  // Cette info pourrait être stockée au niveau du GEH
  // Pour l'instant on retourne un placeholder
  var geh=mission.gehs.find(function(g){return g.id===gehId;});
  if(!geh)return'-';
  return geh.name; // On pourrait avoir un champ "production" séparé
}

// Créer le document Word (structure pour docx.js)
function createWordDocument(report){
  // Structure pour la bibliothèque docx.js
  var doc={
    sections:[{
      properties:{},
      children:[
        // Titre
        {
          type:'paragraph',
          text:report.title,
          heading:'Heading1'
        }
      ]
    }]
  };
  
  // Pour chaque section GEH
  report.headers.forEach(function(header,idx){
    // En-tête GEH
    doc.sections[0].children.push({
      type:'paragraph',
      text:'GEH : '+header.geh+'        Nature de la production : '+header.production,
      spacing:{before:400,after:200}
    });
    
    // Tableau
    var tableRows=[];
    
    // Ligne d'en-tête
    tableRows.push({
      type:'row',
      tableHeader:true,
      cells:[
        {text:'Nom de l\'opérateur'},
        {text:'Plage horaire de prélèvement'},
        {text:'Durée d\'exposition'},
        {text:'Agent chimique prélevé'},
        {text:'VLEP (8h/CT)'},
        {text:'EPI (ex : demi-masque filtrant FFP2, norme EN 149)'},
        {text:'Ventilation générale et captages localisés'},
        {text:'Tâches réalisées'},
        {text:'Observation (écart par rapport à la stratégie prévue, conditions non représentatives de l\'activité : incident, arrêt, absence d\'activité,…)'}
      ]
    });
    
    // Lignes de données pour ce GEH
    report.tableData.forEach(function(row){
      tableRows.push({
        type:'row',
        cells:[
          {text:row.operateur},
          {text:row.plageHoraire},
          {text:row.dureeExposition},
          {text:row.agentChimique},
          {text:row.vlep},
          {text:row.epi},
          {text:row.ventilation},
          {text:row.taches},
          {text:row.observations}
        ]
      });
    });
    
    doc.sections[0].children.push({
      type:'table',
      rows:tableRows,
      width:{size:100,type:'pct'}
    });
  });
  
  return doc;
}
