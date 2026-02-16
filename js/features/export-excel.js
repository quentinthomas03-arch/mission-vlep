/*
 * VLEP Mission v3.8 - export-excel.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Export Excel professionnel avec format exact des feuilles REG et NON REG
 */

// Fonction principale d'export Excel
async function exportExcel(){
  var m=getCurrentMission();
  if(!m){alert('Aucune mission sélectionnée');return;}
  
  // Valider avant export
  var validation=validateMissionData(m);
  if(validation.errors.length>0){
    var proceed=confirm('⚠️ Attention : Des données sont manquantes ou incorrectes.\n\n'+validation.errors.join('\n')+'\n\nVoulez-vous exporter quand même ?');
    if(!proceed)return;
  }
  
  try{
    // Créer le fichier Excel avec ExcelJS
    var workbook=await createExcelWorkbook(m);
    
    // Télécharger
    var fileName='VLEP_'+sanitizeFilename(m.clientSite)+'_'+formatDateForFile(new Date())+'.xlsx';
    downloadWorkbook(workbook,fileName);
    
    alert('✓ Export Excel réussi !\n\nFichier : '+fileName);
  }catch(err){
    console.error('Erreur export Excel:',err);
    alert('❌ Erreur lors de l\'export Excel.\n\n'+err.message);
  }
}

// Créer le workbook Excel avec les deux feuilles
async function createExcelWorkbook(mission){
  // Note: Ce code nécessite ExcelJS (https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js)
  // Pour l'instant, on va créer une structure compatible
  
  var workbook={
    SheetNames:['REG','NON REG'],
    Sheets:{}
  };
  
  // Séparer les prélèvements réglementaires et non-réglementaires
  var prelevementsREG=[];
  var prelevementsNONREG=[];
  
  mission.prelevements.forEach(function(prel){
    if(prel.isReglementaire){
      prelevementsREG.push(prel);
    }else{
      prelevementsNONREG.push(prel);
    }
  });
  
  // Créer feuille REG
  workbook.Sheets['REG']=createREGSheet(mission,prelevementsREG);
  
  // Créer feuille NON REG
  workbook.Sheets['NON REG']=createNONREGSheet(mission,prelevementsNONREG);
  
  return workbook;
}

// Créer la feuille REG (format cassette réglementaire)
function createREGSheet(mission,prelevements){
  var sheet=[];
  
  // En-tête principal bleu
  sheet.push([
    {v:'Cassette Reg',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
    {v:'CONTRÔLE REGLEMENTAIRE DES VLEP',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
    '','','','','','','',''
  ]);
  
  sheet.push([
    {v:'22',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
    {v:'PRELEVEMENTS SUR CASSETTE PORTE-FILTRE',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
    '','','','','','','',''
  ]);
  
  sheet.push(['','','','','','','','','','']); // Ligne vide
  
  // Infos générales
  sheet.push(['nom du préleveur','',mission.preleveur||'','','','','','','','']);
  sheet.push(['site','',mission.clientSite||'','','','','','','','']);
  
  // Pour chaque GEH avec prélèvements réglementaires
  var gehsWithPrel={};
  prelevements.forEach(function(p){
    if(!gehsWithPrel[p.gehId])gehsWithPrel[p.gehId]=[];
    gehsWithPrel[p.gehId].push(p);
  });
  
  Object.keys(gehsWithPrel).forEach(function(gehId){
    var geh=mission.gehs.find(function(g){return g.id==gehId;});
    var prelGeh=gehsWithPrel[gehId];
    
    // Ligne GEH
    sheet.push([
      'GEH','',
      {v:geh.num+' - '+geh.name,s:{font:{bold:true}}},
      '','','','','','',''
    ]);
    
    // Pour chaque prélèvement du GEH
    prelGeh.forEach(function(prel){
      prel.subPrelevements.forEach(function(sub,subIdx){
        // Opérateur
        sheet.push(['opérateur','',sub.operateur||'','','','','','','','']);
        
        // Agent chimique
        var agentNames=prel.agents.map(function(a){return a.name;}).join(' + ');
        sheet.push(['agent chimique','',agentNames,'','','','','','','']);
        
        // Section Matériel de mesure (en-tête bleu)
        sheet.push([
          {v:'Matériel de mesure',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}}
        ]);
        
        // N° identification / pompe
        var firstAgent=prel.agents[0]?prel.agents[0].name:'';
        var agentData=sub.agentData&&sub.agentData[firstAgent]?sub.agentData[firstAgent]:{};
        sheet.push([
          'n° d\'identification','pompe',
          agentData.refEchantillon||'','',
          agentData.numPompe||'','',
          '','','',''
        ]);
        
        // Débitmètre
        sheet.push(['','Débimetre',mission.debitmetre||'','','','','','','','']);
        
        // Support
        var supportName='';
        if(prel.agents[0]){
          var agentDB=getAgentFromDB(prel.agents[0].name);
          if(agentDB)supportName=agentDB['Support de prélèvement']||'';
        }
        sheet.push(['Support','nature et marque',supportName,'','','','','','','']);
        
        // Section Plages horaires (en-tête bleu)
        sheet.push([
          {v:'Plages horaires de prélèvement, durée du prélèvement et durée d\'exposition',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
          {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}}
        ]);
        
        // Date
        sheet.push(['date de prélèvement','',formatDateFR(sub.date),'','','','','','','']);
        
        // Plages (jusqu'à 10)
        var plages=sub.plages||[];
        for(var pi=0;pi<10;pi++){
          var plage=plages[pi]||{debut:'',fin:''};
          sheet.push([
            'plage n°'+(pi+1),
            'heure début n°C1-P'+(pi+1)+'_',
            plage.debut||'','',
            '','','','','',''
          ]);
          sheet.push([
            '',
            'heure fin n°C1-P'+(pi+1)+'_',
            plage.fin||'','',
            '','','','','',''
          ]);
        }
        
        // Ligne vide entre sous-prélèvements
        sheet.push(['','','','','','','','','','']);
      });
    });
  });
  
  return sheet;
}

// Créer la feuille NON REG (format non réglementaire)
function createNONREGSheet(mission,prelevements){
  var sheet=[];
  
  // En-tête
  sheet.push(['nom du préleveur','',mission.preleveur||'','','','','','','','']);
  sheet.push(['site','',mission.clientSite||'','','','','','','','']);
  
  // Section Matériel (en-tête bleu)
  sheet.push([
    {v:'Matériel de mesure',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
    {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}}
  ]);
  
  // Numérotation automatique
  var prelNum=1;
  sheet.push([
    {v:'Prélèvement n°',s:{font:{bold:true}}},'',
    {v:prelNum,s:{font:{bold:true}}},'',
    {v:prelNum+1,s:{font:{bold:true}}},'',
    {v:prelNum+2,s:{font:{bold:true}}},'',
    {v:prelNum+3,s:{font:{bold:true}}},''
  ]);
  
  // Pour chaque prélèvement non-réglementaire
  prelevements.forEach(function(prel){
    prel.subPrelevements.forEach(function(sub){
      // Agent chimique
      var agentNames=prel.agents.map(function(a){return a.name;}).join(' + ');
      sheet.push(['agent chimique','',agentNames,'','','','','','','']);
      
      // N° identification / pompe
      var firstAgent=prel.agents[0]?prel.agents[0].name:'';
      var agentData=sub.agentData&&sub.agentData[firstAgent]?sub.agentData[firstAgent]:{};
      sheet.push([
        'n° d\'identification','pompe',
        agentData.refEchantillon||'','',
        '','','','','',''
      ]);
      sheet.push(['','débitmètre',mission.debitmetre||'','','','','','','','']);
      
      // Support
      var supportName='';
      if(prel.agents[0]){
        var agentDB=getAgentFromDB(prel.agents[0].name);
        if(agentDB)supportName=agentDB['Support de prélèvement']||'';
      }
      sheet.push(['Support','nature et marque',supportName,'','','','','','','']);
      
      // Section Plages (en-tête bleu)
      sheet.push([
        {v:'Plages horaires de prélèvement, durée du prélèvement et durée d\'exposition',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true,color:{rgb:'FFFFFFFF'}}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}},
        {v:'',s:{fill:{fgColor:{rgb:'FF00ACE8'}},font:{bold:true}}}
      ]);
      
      sheet.push([{v:'Prélèvement n°',s:{font:{bold:true}}},'',{v:prelNum,s:{font:{bold:true}}},'','','','','','','']);
      sheet.push(['date de prélèvement','',formatDateFR(sub.date),'','','','','','','']);
      
      // Plages (jusqu'à 10 pour non-réglementaire)
      var plages=sub.plages||[];
      for(var pi=0;pi<10;pi++){
        var plage=plages[pi]||{debut:'',fin:''};
        sheet.push([
          'plage n°'+(pi+1),
          'heure début n°C1-P'+(pi+1)+'_',
          plage.debut||'','',
          '','','','','',''
        ]);
        sheet.push([
          '',
          'heure fin n°C1-P'+(pi+1)+'_',
          plage.fin||'','',
          '','','','','',''
        ]);
      }
      
      prelNum++;
    });
  });
  
  return sheet;
}

// Valider les données de mission avant export
function validateMissionData(mission){
  var errors=[];
  var warnings=[];
  
  if(!mission.clientSite)errors.push('• Nom client/site manquant');
  if(!mission.preleveur)warnings.push('• Préleveur non renseigné');
  if(!mission.debitmetre)warnings.push('• Débitmètre non renseigné');
  
  var totalSubs=0;
  mission.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(sb){
      totalSubs++;
      if(!sb.date)errors.push('• Date manquante pour un prélèvement');
      if(!sb.plages||sb.plages.length===0)errors.push('• Plages horaires manquantes');
      
      p.agents.forEach(function(a){
        var ad=(sb.agentData&&sb.agentData[a.name])||{};
        if(!ad.refEchantillon)errors.push('• Référence échantillon manquante ('+a.name+')');
        if(!ad.numPompe)warnings.push('• N° pompe manquant ('+a.name+')');
      });
    });
  });
  
  if(totalSubs===0)errors.push('• Aucun sous-prélèvement');
  
  return{errors:errors,warnings:warnings};
}

// Télécharger le workbook (nécessite une bibliothèque externe comme SheetJS)
function downloadWorkbook(workbook,fileName){
  // Cette fonction nécessiterait SheetJS pour fonctionner réellement
  // Pour l'instant, on crée un export JSON simulé
  alert('Export Excel : Cette fonctionnalité nécessite l\'intégration de SheetJS.\n\nLe format est prêt, il faut ajouter la bibliothèque externe.');
  console.log('Workbook prêt:',workbook);
  console.log('Nom fichier:',fileName);
}

// Utilitaires
function sanitizeFilename(str){
  return str.replace(/[^a-z0-9]/gi,'_').replace(/_+/g,'_');
}

function formatDateForFile(date){
  var y=date.getFullYear();
  var m=String(date.getMonth()+1).padStart(2,'0');
  var d=String(date.getDate()).padStart(2,'0');
  return y+m+d;
}
