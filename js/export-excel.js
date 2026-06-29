// export-excel.js - Export Excel et validation
// © 2025 Quentin THOMAS
// Validation pré-export, création fichier Excel (2 feuilles REG/NON REG + Échantillons)

function createRegSheet(m,prels){
  var aoa=[];
  
  // Lignes 1-3 : En-tête
  aoa.push(['Support Reg','CONTRÔLE REGLEMENTAIRE']);
  aoa.push(['22','PRELEVEMENTS SUR SUPPORT']);
  aoa.push([]);
  
  // Ligne 4-5 : Préleveur et site
  aoa.push(['nom du préleveur','',m.preleveur||'']);
  aoa.push(['site','',m.clientSite||'']);
  
  // Ligne 6 : GEH
  var row6=['GEH',''];
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row6.push(p.gehNum+' - '+p.gehName);
    row6.push('');
  }
  aoa.push(row6);
  
  // Ligne 7 : opérateur
  var row7=['opérateur',''];
  for(var i=0;i<prels.length;i++){
    row7.push(prels[i].sub.operateur||'');
    row7.push('');
  }
  aoa.push(row7);
  
  // Ligne 8 : agent chimique
  var row8=['agent chimique',''];
  for(var i=0;i<prels.length;i++){
    row8.push(prels[i].agent);
    row8.push('');
  }
  aoa.push(row8);
  
  // Ligne 9 : Matériel de prélèvement
  aoa.push(['Matériel de mesure','']);
  
  // Lignes 10-11 : pompe + débitmètre
  var row10=['n° d\'identification','pompe'];
  var row11=['','Déb./Tachym.'];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    var isTachy=isTachymetreAgent(prels[i].agent);
    row10.push(ad&&ad.numPompe?ad.numPompe:'');
    row10.push('');
    row11.push(isTachy?(m.tachymetre||''):(m.debitmetre||''));
    row11.push('');
  }
  aoa.push(row10);
  aoa.push(row11);
  
  // Ligne 12 : Support
  var row12=['Support','nature et marque'];
  for(var i=0;i<prels.length;i++){
    var ag=getAgentFromDB(prels[i].agent);
    var support=ag?(ag['Support de prélèvement']||''):'';
    row12.push(support);
    row12.push('');
  }
  aoa.push(row12);
  
  // Ligne 13 : Plages horaires
  aoa.push(['Plages horaires de prélèvement, durée du','']);
  
  // Ligne 14 : date
  var row14=['date de prélèvement',''];
  for(var i=0;i<prels.length;i++){
    row14.push(formatDateFR(prels[i].sub.date)||'');
    row14.push('');
  }
  aoa.push(row14);
  
  // Lignes 15-24 : 5 plages horaires (2 lignes chacune)
  for(var plageNum=1;plageNum<=5;plageNum++){
    var rowDebut=['plage n°'+plageNum,'heure début n°C'+plageNum+'-P'+plageNum+'_'];
    var rowFin=['','heure fin n°C'+plageNum+'-P'+plageNum+'_'];
    
    for(var i=0;i<prels.length;i++){
      var plages=prels[i].sub.plages||[];
      var plage=plages[plageNum-1];
      
      rowDebut.push(plage&&plage.debut?plage.debut:'');
      rowDebut.push('');
      rowFin.push(plage&&plage.fin?plage.fin:'');
      rowFin.push('');
    }
    
    aoa.push(rowDebut);
    aoa.push(rowFin);
  }
  
  // Ligne 25 : durée du prélèvement (vide)
  var row25=['durée du prélèvement (h)',''];
  for(var i=0;i<prels.length;i++){
    row25.push('');
    row25.push('');
  }
  aoa.push(row25);
  
  // Ligne 26 : durée d'exposition (vide)
  var row26=['durée d\'exposition (h:min) - VLEP 8h',''];
  for(var i=0;i<prels.length;i++){
    row26.push('');
    row26.push('');
  }
  aoa.push(row26);
  
  // Ligne 27 : durée d'exposition VLEP (vide)
  var row27=['durée d\'exposition - VLEP 8h',''];
  for(var i=0;i<prels.length;i++){
    row27.push('');
    row27.push('');
  }
  aoa.push(row27);
  
  // Ligne 28 : Prise en compte des EPI
  aoa.push(['Prise en compte des Equipements de Protection Individuelle','']);
  
  // Ligne 29 : type EPI
  var row29=['type d\'EPI',''];
  for(var i=0;i<prels.length;i++){
    row29.push(prels[i].sub.epiType||'sans objet');
    row29.push('');
  }
  aoa.push(row29);
  
  // Ligne 30 : facteur de protection (calculé par VLOOKUP dans la macro)
  var row30=['facteur de protection assigné (FPA)',''];
  for(var i=0;i<prels.length;i++){
    row30.push('');
    row30.push('');
  }
  aoa.push(row30);
  
  // Ligne 31 : durée de port EPI
  var row31=['durée de port de l\'EPI (min)',''];
  for(var i=0;i<prels.length;i++){
    var epiD=prels[i].sub.epiDuree;
    row31.push((prels[i].sub.epiType||'sans objet')==='sans objet'?0:(epiD||0));
    row31.push('');
  }
  aoa.push(row31);
  
  // Ligne 32 : Conditions ambiantes
  aoa.push(['Conditions ambiantes lors des prélèvements','']);
  
  // Lignes 33-35 : Température (initiale, finale, moyenne)
  var row33=['température ambiante (°C)','initiale'];
  var row34=['','finale'];
  var row35=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row33.push(cond&&cond.tempI?cond.tempI:'');
    row33.push('');
    row34.push(cond&&cond.tempF?cond.tempF:'');
    row34.push('');
    row35.push(''); // moyenne calculée après
    row35.push('');
  }
  aoa.push(row33);
  aoa.push(row34);
  aoa.push(row35);
  
  // Lignes 36-38 : Pression (initiale, finale, moyenne)
  var row36=['pression atmosphérique (hPa)','initiale'];
  var row37=['','finale'];
  var row38=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row36.push(cond&&cond.pressionI?cond.pressionI:'');
    row36.push('');
    row37.push(cond&&cond.pressionF?cond.pressionF:'');
    row37.push('');
    row38.push('');
    row38.push('');
  }
  aoa.push(row36);
  aoa.push(row37);
  aoa.push(row38);
  
  // Lignes 39-41 : Humidité (initiale, finale, moyenne)
  var row39=['humidité relative (%)','initiale'];
  var row40=['','finale'];
  var row41=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row39.push(cond&&cond.humiditeI?cond.humiditeI:'');
    row39.push('');
    row40.push(cond&&cond.humiditeF?cond.humiditeF:'');
    row40.push('');
    row41.push('');
    row41.push('');
  }
  aoa.push(row39);
  aoa.push(row40);
  aoa.push(row41);
  
  // Ligne 42 : Pression de saturation (vide)
  var row42=['pression de saturation de la vapeur d\'eau (Pa)',''];
  for(var i=0;i<prels.length;i++){
    row42.push('');
    row42.push('');
  }
  aoa.push(row42);
  
  // Ligne 43 : Volume prélevé
  aoa.push(['Volume prélevé','']);
  
  // Ligne 44 : Vérification débit
  aoa.push(['Volume prélevé avec pompe - Vérification du débit','']);
  
  // Lignes 45-46 : Débits initial et final (ou vitesses si tachymètre)
  var row45=['débit initial pompe (L/min) / vitesse initiale (tr/min)',''];
  var row46=['débit final pompe (L/min) / vitesse finale (tr/min)',''];
  var row46b=['vitesse de référence (tr/min)',''];
  var hasAnyTachy=false;
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    var isTachy=isTachymetreAgent(prels[i].agent);
    if(isTachy)hasAnyTachy=true;
    row45.push(ad&&ad.debitInitial?ad.debitInitial:'');
    row45.push('');
    row46.push(ad&&ad.debitFinal?ad.debitFinal:'');
    row46.push('');
    row46b.push(isTachy&&ad&&ad.debitRef?ad.debitRef:'');
    row46b.push('');
  }
  aoa.push(row45);
  aoa.push(row46);
  if(hasAnyTachy)aoa.push(row46b);
  
  // Lignes 47-48 : Débit moyen et volume (vides, calculés après)
  var row47=['débit moyen de la pompe (L/min)',''];
  var row48=['volume prélevé (L)',''];
  for(var i=0;i<prels.length;i++){
    row47.push('');
    row47.push('');
    row48.push('');
    row48.push('');
  }
  aoa.push(row47);
  aoa.push(row48);
  
  // Lignes 49-56 : Vérification DLS (vides)
  for(var lnum=49;lnum<=56;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Ligne 57 : Résultats labo
  aoa.push(['Résultats du laboratoire d\'analyse','']);
  
  // Lignes 58-62 : Nom labo, réf échantillon, masse, incertitude
  var row58=['nom du laboratoire',''];
  var row59=['référence de l\'échantillon',''];
  for(var i=0;i<prels.length;i++){
    row58.push('');
    row58.push('');
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    row59.push(ad&&ad.refEchantillon?ad.refEchantillon:'');
    row59.push('');
  }
  aoa.push(row58);
  aoa.push(row59);
  
  // Lignes 60-62 : masse et incertitude (vides)
  for(var lnum=60;lnum<=62;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Ligne 63 : RESULTATS
  aoa.push(['RESULTATS','']);
  
  // Lignes 64-69 : GEH, type VLEP, opérateur, agent, réf, date
  var row64=['GEH',''];
  var row65=['type de VLEP',''];
  var row66=['opérateur',''];
  var row67=['agent chimique',''];
  var row68=['référence de l\'échantillon',''];
  var row69=['date du prélèvement',''];
  
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row64.push(p.gehNum+' - '+p.gehName);
    row64.push('');
    row65.push(p.type); // 8h ou CT
    row65.push('');
    row66.push(p.sub.operateur||'');
    row66.push('');
    row67.push(p.agent);
    row67.push('');
    var ad=p.sub.agentData?p.sub.agentData[p.agent]:null;
    row68.push(ad&&ad.refEchantillon?ad.refEchantillon:'');
    row68.push('');
    row69.push(formatDateFR(p.sub.date)||'');
    row69.push('');
  }
  aoa.push(row64);
  aoa.push(row65);
  aoa.push(row66);
  aoa.push(row67);
  aoa.push(row68);
  aoa.push(row69);
  
  // Lignes 70-78 : Durée, résultats, EPI, exposition, VLEP, commentaire (vides)
  for(var lnum=70;lnum<=78;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Ligne 79 : Validation des prélèvements
  aoa.push(['Validation des prélèvements','']);
  
  // Ligne 80 : Variation débit (vide)
  var row80=['Variation du débit avant et après prélèvement (< 5%)',''];
  for(var i=0;i<prels.length;i++){
    row80.push('');
    row80.push('');
  }
  aoa.push(row80);
  
  // Ligne 81 : Référence témoin (blanc)
  var row81=["référence du témoin",''];
  for(var i=0;i<prels.length;i++){
    var blancRef=getBlancForAgent(m,prels[i].agent);
    row81.push(blancRef);
    row81.push('');
  }
  aoa.push(row81);
  
  // Lignes 82-84 : masse témoin, concentration blanc, critère (vides)
  for(var lnum=82;lnum<=84;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Créer la feuille
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  
  // Ajouter les fusions de cellules
  if(!ws['!merges'])ws['!merges']=[];
  
  // Fusions en-tête
  ws['!merges'].push({s:{r:0,c:1},e:{r:0,c:13}});
  ws['!merges'].push({s:{r:1,c:1},e:{r:1,c:13}});
  ws['!merges'].push({s:{r:3,c:2},e:{r:3,c:13}});
  ws['!merges'].push({s:{r:4,c:2},e:{r:4,c:13}});
  
  // Fusions A-B
  ws['!merges'].push({s:{r:9,c:0},e:{r:10,c:0}});
  for(var plageNum=0;plageNum<5;plageNum++){
    var startRow=14+plageNum*2;
    ws['!merges'].push({s:{r:startRow,c:0},e:{r:startRow+1,c:0}});
  }
  ws['!merges'].push({s:{r:32,c:0},e:{r:34,c:0}});
  ws['!merges'].push({s:{r:35,c:0},e:{r:37,c:0}});
  ws['!merges'].push({s:{r:38,c:0},e:{r:40,c:0}});
  
  // Fusions colonnes prélèvements (C-D, E-F, etc.)
  var fuseRows=[5,6,7,9,10,11,13,25,26,27,28,29,30,32,33,34,35,36,37,38,39,40,41,44,45,46,47,48,58,59,63,64,65,66,67,68,69,80,81];
  for(var ri=0;ri<fuseRows.length;ri++){
    var row=fuseRows[ri];
    for(var i=0;i<prels.length;i++){
      var startCol=2+i*2;
      ws['!merges'].push({s:{r:row,c:startCol},e:{r:row,c:startCol+1}});
    }
  }
  
  // Fusions plages horaires
  for(var plageNum=0;plageNum<5;plageNum++){
    for(var i=0;i<prels.length;i++){
      var startRow=14+plageNum*2;
      var startCol=2+i*2;
      ws['!merges'].push({s:{r:startRow,c:startCol},e:{r:startRow,c:startCol+1}});
      ws['!merges'].push({s:{r:startRow+1,c:startCol},e:{r:startRow+1,c:startCol+1}});
    }
  }
  
  // Largeurs de colonnes
  var cols=[{wch:50},{wch:20}];
  for(var i=0;i<prels.length;i++){
    cols.push({wch:15});
    cols.push({wch:15});
  }
  ws['!cols']=cols;
  
  return ws;
}

function createNonRegSheet(m,prels){
  var aoa=[];
  
  // Ligne 1-2 : préleveur et site
  aoa.push(['nom du préleveur','',m.preleveur||'']);
  aoa.push(['site','',m.clientSite||'']);
  aoa.push(['Matériel de mesure','']);
  
  // Ligne 4 : Prélèvement n°
  var row4=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row4.push(i+1);
    row4.push('');
  }
  aoa.push(row4);
  
  // Ligne 5 : agent chimique
  var row5=['agent chimique',''];
  for(var i=0;i<prels.length;i++){
    row5.push(prels[i].agent);
    row5.push('');
  }
  aoa.push(row5);
  
  // Lignes 6-7 : pompe + débitmètre/tachymètre
  var row6=['n° d\'identification','pompe'];
  var row7=['','Déb./Tachym.'];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    var isTachy=isTachymetreAgent(prels[i].agent);
    row6.push(ad&&ad.numPompe?ad.numPompe:'');
    row6.push('');
    row7.push(isTachy?(m.tachymetre||''):(m.debitmetre||''));
    row7.push('');
  }
  aoa.push(row6);
  aoa.push(row7);
  
  // Ligne 8 : Support
  var row8=['Support','nature et marque'];
  for(var i=0;i<prels.length;i++){
    var ag=getAgentFromDB(prels[i].agent);
    var support=ag?(ag['Support de prélèvement']||''):'';
    row8.push(support);
    row8.push('');
  }
  aoa.push(row8);
  
  // Ligne 9 : Plages horaires
  aoa.push(['Plages horaires de prélèvement, durée du','']);
  
  // Ligne 10 : Prélèvement n° (répété)
  var row10=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row10.push(i+1);
    row10.push('');
  }
  aoa.push(row10);
  
  // Ligne 11 : date
  var row11=['date de prélèvement',''];
  for(var i=0;i<prels.length;i++){
    row11.push(formatDateFR(prels[i].sub.date)||'');
    row11.push('');
  }
  aoa.push(row11);
  
  // Lignes 12-31 : 10 plages horaires (2 lignes chacune)
  for(var plageNum=1;plageNum<=10;plageNum++){
    var rowDebut=['plage n°'+plageNum,'heure début n°C'+plageNum+'-P'+plageNum+'_'];
    var rowFin=['','heure fin n°C'+plageNum+'-P'+plageNum+'_'];
    
    for(var i=0;i<prels.length;i++){
      var plages=prels[i].sub.plages||[];
      var plage=plages[plageNum-1];
      
      rowDebut.push(plage&&plage.debut?plage.debut:'');
      rowDebut.push('');
      rowFin.push(plage&&plage.fin?plage.fin:'');
      rowFin.push('');
    }
    
    aoa.push(rowDebut);
    aoa.push(rowFin);
  }
  
  // Lignes 32-35 : Durées, exposition (calculées par la macro)
  for(var lnum=32;lnum<=35;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){rowEmpty.push('');rowEmpty.push('');}
    aoa.push(rowEmpty);
  }
  
  // Ligne 36 : Prise en compte des EPI
  aoa.push(['Prise en compte des Equipements de Protection Individuelle','']);
  
  // Ligne 37 : type EPI
  var row37nonreg=['type d\'EPI',''];
  for(var i=0;i<prels.length;i++){
    row37nonreg.push(prels[i].sub.epiType||'sans objet');
    row37nonreg.push('');
  }
  aoa.push(row37nonreg);
  
  // Ligne 38 : FPA (calculé par VLOOKUP dans la macro)
  var row38nonreg=['facteur de protection assigné (FPA)',''];
  for(var i=0;i<prels.length;i++){row38nonreg.push('');row38nonreg.push('');}
  aoa.push(row38nonreg);
  
  // Ligne 39 : durée de port EPI
  var row39nonreg=['durée de port de l\'EPI (min)',''];
  for(var i=0;i<prels.length;i++){
    var epiD2=prels[i].sub.epiDuree;
    row39nonreg.push((prels[i].sub.epiType||'sans objet')==='sans objet'?0:(epiD2||0));
    row39nonreg.push('');
  }
  aoa.push(row39nonreg);
  
  // Ligne 40 : Conditions ambiantes
  aoa.push(['Conditions ambiantes lors des prélèvements','']);
  
  // Ligne 41 : Prélèvement n°
  var row41=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row41.push(i+1);
    row41.push('');
  }
  aoa.push(row41);
  
  // Lignes 42-44 : Température
  var row42=['température ambiante (°C)','initiale'];
  var row43=['','finale'];
  var row44=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row42.push(cond&&cond.tempI?cond.tempI:'');
    row42.push('');
    row43.push(cond&&cond.tempF?cond.tempF:'');
    row43.push('');
    row44.push('');
    row44.push('');
  }
  aoa.push(row42);
  aoa.push(row43);
  aoa.push(row44);
  
  // Lignes 45-47 : Pression
  var row45=['pression atmosphérique (hPa)','initiale'];
  var row46=['','finale'];
  var row47=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row45.push(cond&&cond.pressionI?cond.pressionI:'');
    row45.push('');
    row46.push(cond&&cond.pressionF?cond.pressionF:'');
    row46.push('');
    row47.push('');
    row47.push('');
  }
  aoa.push(row45);
  aoa.push(row46);
  aoa.push(row47);
  
  // Lignes 48-50 : Humidité
  var row48=['humidité relative (%)','initiale'];
  var row49=['','finale'];
  var row50=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row48.push(cond&&cond.humiditeI?cond.humiditeI:'');
    row48.push('');
    row49.push(cond&&cond.humiditeF?cond.humiditeF:'');
    row49.push('');
    row50.push('');
    row50.push('');
  }
  aoa.push(row48);
  aoa.push(row49);
  aoa.push(row50);
  
  // Ligne 51 : Pression saturation (vide)
  var row51=['pression de saturation de la vapeur d\'eau (Pa)',''];
  for(var i=0;i<prels.length;i++){
    row51.push('');
    row51.push('');
  }
  aoa.push(row51);
  
  // Ligne 52 : Volume prélevé
  aoa.push(['Volume prélevé','']);
  
  // Ligne 53 : Prélèvement n°
  var row53=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row53.push(i+1);
    row53.push('');
  }
  aoa.push(row53);
  
  // Ligne 54 : Vérification débit
  aoa.push(['Volume prélevé avec pompe - Vérification du débit','']);
  
  // Lignes 55-56 : Débits initial et final (ou vitesses si tachymètre)
  var row55=['débit initial pompe (L/min) / vitesse initiale (tr/min)',''];
  var row56=['débit final pompe (L/min) / vitesse finale (tr/min)',''];
  var row56b=['vitesse de référence (tr/min)',''];
  var hasAnyTachyCT=false;
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    var isTachy=isTachymetreAgent(prels[i].agent);
    if(isTachy)hasAnyTachyCT=true;
    row55.push(ad&&ad.debitInitial?ad.debitInitial:'');
    row55.push('');
    row56.push(ad&&ad.debitFinal?ad.debitFinal:'');
    row56.push('');
    row56b.push(isTachy&&ad&&ad.debitRef?ad.debitRef:'');
    row56b.push('');
  }
  aoa.push(row55);
  aoa.push(row56);
  if(hasAnyTachyCT)aoa.push(row56b);
  
  // Lignes 57-73 : débit moyen, volume, vérification DLS, résultats labo (vides)
  for(var lnum=57;lnum<=73;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Ligne 74 : RESULTATS
  aoa.push(['RESULTATS','']);
  
  // Ligne 75 : Prélèvement n°
  var row75=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row75.push(i+1);
    row75.push('');
  }
  aoa.push(row75);
  
  // Lignes 76-78 : agent, type VLEP, type prélèvement
  var row76=['agent chimique',''];
  var row77=['type de VLEP',''];
  var row78=['type de prélèvement',''];
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row76.push(p.agent);
    row76.push('');
    row77.push(''); // vide pour non-reg
    row77.push('');
    row78.push(p.type); // 8h ou CT
    row78.push('');
  }
  aoa.push(row76);
  aoa.push(row77);
  aoa.push(row78);
  
  // Lignes 79-88 : opérateur, date, réf, résultats (vides/partiels)
  var row79=['opérateur',''];
  var row80=['date de prélèvement',''];
  var row81=['référence de l\'échantillon',''];
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row79.push(p.sub.operateur||'');
    row79.push('');
    row80.push(formatDateFR(p.sub.date)||'');
    row80.push('');
    var ad=p.sub.agentData?p.sub.agentData[p.agent]:null;
    row81.push(ad&&ad.refEchantillon?ad.refEchantillon:'');
    row81.push('');
  }
  aoa.push(row79);
  aoa.push(row80);
  aoa.push(row81);
  
  // Lignes 82-88 : résultats bruts, EPI, VLEP (vides)
  for(var lnum=82;lnum<=88;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Ligne 89 : Validation
  aoa.push(['Validation des prélèvements','']);
  
  // Ligne 90 : Prélèvement n°
  var row90=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){
    row90.push(i+1);
    row90.push('');
  }
  aoa.push(row90);
  
  // Ligne 91 : Variation débit (vide)
  var row91=['Variation du débit avant et après prélèvement (< 5%)',''];
  for(var i=0;i<prels.length;i++){
    row91.push('');
    row91.push('');
  }
  aoa.push(row91);
  
  // Ligne 92 : Référence témoin
  var row92=["référence du témoin",''];
  for(var i=0;i<prels.length;i++){
    var blancRef=getBlancForAgent(m,prels[i].agent);
    row92.push(blancRef);
    row92.push('');
  }
  aoa.push(row92);
  
  // Lignes 93-95 : masse témoin, concentration, critère (vides)
  for(var lnum=93;lnum<=95;lnum++){
    var rowEmpty=['',''];
    for(var i=0;i<prels.length;i++){
      rowEmpty.push('');
      rowEmpty.push('');
    }
    aoa.push(rowEmpty);
  }
  
  // Créer la feuille
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  
  // Ajouter les fusions de cellules
  if(!ws['!merges'])ws['!merges']=[];
  
  // Fusions en-tête
  ws['!merges'].push({s:{r:0,c:2},e:{r:0,c:13}});
  ws['!merges'].push({s:{r:1,c:2},e:{r:1,c:13}});
  
  // Fusions A-B
  ws['!merges'].push({s:{r:5,c:0},e:{r:6,c:0}});
  for(var plageNum=0;plageNum<10;plageNum++){
    var startRow=11+plageNum*2;
    ws['!merges'].push({s:{r:startRow,c:0},e:{r:startRow+1,c:0}});
  }
  ws['!merges'].push({s:{r:41,c:0},e:{r:43,c:0}});
  ws['!merges'].push({s:{r:44,c:0},e:{r:46,c:0}});
  ws['!merges'].push({s:{r:47,c:0},e:{r:49,c:0}});
  
  // Fusions colonnes prélèvements
  var fuseRows=[3,4,5,6,7,9,10,40,41,42,43,44,45,46,47,48,49,50,52,53,54,55,56,74,75,76,77,78,79,80,81,89,90,91,92];
  for(var ri=0;ri<fuseRows.length;ri++){
    var row=fuseRows[ri];
    for(var i=0;i<prels.length;i++){
      var startCol=2+i*2;
      ws['!merges'].push({s:{r:row,c:startCol},e:{r:row,c:startCol+1}});
    }
  }
  
  // Fusions plages horaires
  for(var plageNum=0;plageNum<10;plageNum++){
    for(var i=0;i<prels.length;i++){
      var startRow=11+plageNum*2;
      var startCol=2+i*2;
      ws['!merges'].push({s:{r:startRow,c:startCol},e:{r:startRow,c:startCol+1}});
      ws['!merges'].push({s:{r:startRow+1,c:startCol},e:{r:startRow+1,c:startCol+1}});
    }
  }
  
  // Largeurs de colonnes
  var cols=[{wch:50},{wch:20}];
  for(var i=0;i<prels.length;i++){
    cols.push({wch:15});
    cols.push({wch:15});
  }
  ws['!cols']=cols;
  
  return ws;
}

// Fonction helper pour récupérer les conditions ambiantes d'un sous-prélèvement
function getConditionsForPrel(m,subPrel){
  if(!m.conditionsAmbiantes||m.conditionsAmbiantes.length===0)return null;
  // Matcher par date si possible
  if(subPrel.date){
    for(var i=0;i<m.conditionsAmbiantes.length;i++){
      if(m.conditionsAmbiantes[i].date===subPrel.date)return m.conditionsAmbiantes[i];
    }
  }
  // Fallback: première condition
  return m.conditionsAmbiantes[0];
}

// Fonction helper pour récupérer la référence du blanc pour un agent
function getBlancForAgent(m,agentName){
  if(!m.blancs||m.blancs.length===0)return '';
  for(var i=0;i<m.blancs.length;i++){
    var b=m.blancs[i];
    if(b.agents&&b.agents.indexOf(agentName)!==-1){
      return b.ref||'';
    }
  }
  return '';
}



function createEchantillonsSheet(m, regPrels, nonRegPrels){
  var aoa = [];
  
  // En-tête
  aoa.push(['Nom de l\'échantillon', 'Date', 'Numéro de lot', 'Type d\'échantillon', 'Priorité air', 'Matrice']);
  
  // Collecter tous les échantillons (REG + NON REG) - dédupliquer par réf
  var allPrels = regPrels.concat(nonRegPrels);
  var seenRefs = {};
  
  // Fonction pour normaliser les références (trim + lowercase)
  function normalizeRef(ref){
    return ref ? String(ref).trim().toLowerCase() : '';
  }
  
  // Ajouter les échantillons (dédupliqués)
  allPrels.forEach(function(p){
    var ad = p.sub.agentData ? p.sub.agentData[p.agent] : null;
    var ref = ad && ad.refEchantillon ? ad.refEchantillon : '';
    if(!ref) return; // skip empty refs
    
    // Normaliser pour la comparaison
    var normalizedRef = normalizeRef(ref);
    if(!normalizedRef) return; // skip empty after trim
    if(seenRefs[normalizedRef]) return; // skip duplicates
    seenRefs[normalizedRef] = true;
    
    var date = p.sub.date ? formatDateFR(p.sub.date) : '';
    
    aoa.push([
      ref,                           // Nom de l'échantillon (valeur originale)
      date,                          // Date (JJ/MM/AAAA)
      '',                            // Numéro de lot (vide)
      'Echantillon',                 // Type
      'Standard (J0+9)',             // Priorité
      'Air des lieux de Travail'     // Matrice
    ]);
  });
  
  // Ajouter les blancs
  if(m.blancs && m.blancs.length > 0){
    m.blancs.forEach(function(b){
      var ref = b.ref || '';
      if(!ref) return;
      
      // Normaliser pour la comparaison
      var normalizedRef = normalizeRef(ref);
      if(!normalizedRef || seenRefs[normalizedRef]) return;
      seenRefs[normalizedRef] = true;
      
      var date = b.date ? formatDateFR(b.date) : '';
      
      aoa.push([
        ref,                           // Nom de l'échantillon (ref blanc, valeur originale)
        date,                          // Date (JJ/MM/AAAA)
        '',                            // Numéro de lot (vide)
        'Blanc',                       // Type
        'Standard (J0+9)',             // Priorité
        'Air des lieux de Travail'     // Matrice
      ]);
    });
  }
  
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Largeurs de colonnes
  ws['!cols'] = [
    {wch: 25}, // Nom échantillon
    {wch: 12}, // Date
    {wch: 15}, // Numéro de lot
    {wch: 18}, // Type
    {wch: 18}, // Priorité
    {wch: 30}  // Matrice
  ];
  
  return ws;
}

// Fonction helper pour formater les dates en JJ/MM/AAAA
function formatDateFR(dateStr){
  if(!dateStr) return '';
  
  // Si la date est au format AAAA-MM-JJ (format ISO)
  if(dateStr.match(/^\d{4}-\d{2}-\d{2}$/)){
    var parts = dateStr.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0]; // JJ/MM/AAAA
  }
  
  // Si déjà au bon format ou autre, retourner tel quel
  return dateStr;
}


// ═══════════════════════════════════════════════════════════════════════════════
// TIMER CT - Chronomètre pour prélèvements Court Terme
// © 2025 Quentin THOMAS
// ═══════════════════════════════════════════════════════════════════════════════

// Ajouter au state initial (dans la fonction d'initialisation)
// state.timers = {}; // { prelId_subIdx: { startTime, elapsed, interval } }

function startCTTimer(prelId, subIdx){
  var key = prelId + '_' + subIdx;
  
  // Si déjà un timer en cours, l'arrêter
  if(state.timers && state.timers[key] && state.timers[key].interval){
    clearInterval(state.timers[key].interval);
  }
  
  if(!state.timers) state.timers = {};
  
  // Démarrer le timer
  var startTime = Date.now();
  state.timers[key] = {
    startTime: startTime,
    elapsed: 0,
    interval: setInterval(function(){
      updateTimerDisplay(key);
    }, 1000)
  };
  
  // Persister le timer
  saveTimers();
  
  // Remplir l'heure de début automatiquement
  var now = new Date();
  var heureDebut = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  var m = getCurrentMission();
  if(!m) return;
  
  var prel = m.prelevements.find(function(p){ return p.id === prelId; });
  if(!prel) return;
  
  var sub = prel.subPrelevements[subIdx];
  if(!sub) return;
  
  if(!sub.plages || sub.plages.length === 0){
    sub.plages = [{debut: '', fin: ''}];
  }
  
  // Trouver la première plage vide
  var plageIdx = -1;
  for(var i = 0; i < sub.plages.length; i++){
    if(!sub.plages[i].debut){
      plageIdx = i;
      break;
    }
  }
  
  if(plageIdx === -1){
    // Toutes les plages sont remplies, ajouter une nouvelle
    sub.plages.push({debut: heureDebut, fin: ''});
  } else {
    sub.plages[plageIdx].debut = heureDebut;
  }
  
  saveData('vlep_missions_v3', state.missions);
  render();
}

function stopCTTimer(prelId, subIdx){
  var key = prelId + '_' + subIdx;
  
  if(!state.timers || !state.timers[key]) return;
  
  // Arrêter le timer
  if(state.timers[key].interval){
    clearInterval(state.timers[key].interval);
  }
  
  // Remplir l'heure de fin automatiquement
  var now = new Date();
  var heureFin = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  var m = getCurrentMission();
  if(!m) return;
  
  var prel = m.prelevements.find(function(p){ return p.id === prelId; });
  if(!prel) return;
  
  var sub = prel.subPrelevements[subIdx];
  if(!sub) return;
  
  // Trouver la dernière plage avec un début mais sans fin
  var plageIdx = -1;
  for(var i = sub.plages.length - 1; i >= 0; i--){
    if(sub.plages[i].debut && !sub.plages[i].fin){
      plageIdx = i;
      break;
    }
  }
  
  if(plageIdx !== -1){
    sub.plages[plageIdx].fin = heureFin;
  }
  
  // Nettoyer le timer
  delete state.timers[key];
  saveTimers();
  
  saveData('vlep_missions_v3', state.missions);
  render();
}

// Persistence des timers
function saveTimers(){
  var data={};
  for(var key in state.timers){
    if(state.timers[key]&&state.timers[key].startTime){
      data[key]={startTime:state.timers[key].startTime};
    }
  }
  try{localStorage.setItem('vlep_timers',JSON.stringify(data));}catch(e){}
}

function restoreTimers(){
  try{
    var data=JSON.parse(localStorage.getItem('vlep_timers')||'{}');
    for(var key in data){
      if(data[key].startTime){
        state.timers[key]={
          startTime:data[key].startTime,
          elapsed:Math.floor((Date.now()-data[key].startTime)/1000),
          interval:setInterval((function(k){return function(){updateTimerDisplay(k);};})(key),1000)
        };
      }
    }
  }catch(e){}
}

function updateTimerDisplay(key){
  if(!state.timers || !state.timers[key]) return;
  
  var timer = state.timers[key];
  var elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
  timer.elapsed = elapsed;
  
  // Mettre à jour l'affichage
  var element = document.getElementById('timer-display-' + key);
  if(element){
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    element.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    // Alerte à 15 minutes
    if(elapsed === 900){ // 15 minutes
      element.style.color = '#ef4444';
      element.style.fontWeight = 'bold';
      // Vibration (3 pulses longues)
      try {
        if(navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
      } catch(e){}
      // Son
      try {
        var audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWe77einTxELTqXh8LljHAU7k9r0x3ImBSh+zPLaizsIFWS56+qnUBEKTKPh8rpmHgU+m9z0zHUpBSh/zfPaizsIFWO46uunThELTaTi8bplHgU8mtr0zHYrBSh+zfPbiTsIFWS46uunUBEKTKPh8r1pHgU/nN301XcsBSh/zfPbiTsIFWS46+ymURAKTKPi8bxmHgU9mtr0zHYrBSh/zfPbizsIFWS46+ymUhELTKTi8bxmHgU9mtr0zHYrBSh/zfPbiTwIFWO46+ymUhAKTKPi8b1nHgU/m9301HgrBSh/zfPbiTsIFWS46+ymURAKTKPh8rxnHgU+m9v00nYpBSh/zPPbiTsIFWO46uunUBEKTKPh8rxnHgU+m9z00nYqBSh/zPPaiTsIFWS46+ymUhEKTKPi8r1oHgU/nNz0z3cpBSh/zfPaiTsIFWS46+ymUhELTKPi8r1oHgU+m9z00nYpBSh/zfPbiTsIFWO46+ymUhEKTKPi8r1pHgU/nN301HcpBSh/zfPaiTsIFWS56+ymUhAKTKPi8r1pHgU+m9301HgrBSiAzfPbiTsIFWO46+ymUhELTKPi8r1pHgU/nN301XcsBSiAzfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9z01HYpBSh/zfPaiTsIFWS46+ymUhEKTKPi8r1pHgVAm9z01XcsBSh/zfPaiTsIFWS46+ymURAKTKPi8r1pHgU+m9301HYpBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU/nN301XcsBSh/zfPaiTsIFWS46+ymUhAKTKPi8r1pHgU+m9z00nYpBSh/zfPaiTsIFWS46+ymUhEKTKPi8r1pHgU/nN301XcsBSh/zfPaiTsIFWS46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHgU+m9301HYrBSh/zfPaiTsIFWO46+ymUhEKTKPi8r1pHg==');
        audio.play();
      } catch(e){}
    }
    // Rappel vibration à 14min (1 min avant)
    if(elapsed === 840){
      try {
        if(navigator.vibrate) navigator.vibrate([300, 100, 300]);
      } catch(e){}
    }
  }
}

function getTimerDisplay(prelId, subIdx){
  var key = prelId + '_' + subIdx;
  
  if(!state.timers || !state.timers[key]){
    return '';
  }
  
  var elapsed = state.timers[key].elapsed || 0;
  var minutes = Math.floor(elapsed / 60);
  var seconds = elapsed % 60;
  var timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  
  var color = elapsed >= 900 ? '#ef4444' : '#0066b3';
  
  return '<div style="background:#f0f7fc;border:2px solid '+color+';border-radius:8px;padding:12px;margin:8px 0;text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">⏱️ Chronomètre CT</div><div id="timer-display-'+key+'" style="font-size:32px;font-weight:bold;color:'+color+';font-family:monospace;">'+timeStr+'</div><button class="btn btn-danger" style="margin-top:8px;" onclick="stopCTTimer('+prelId+','+subIdx+');">⏹️ Arrêter</button></div>';
}

function isTimerRunning(prelId, subIdx){
  var key = prelId + '_' + subIdx;
  return state.timers && state.timers[key] && state.timers[key].interval;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gestion des timers en arrière-plan (iOS/Android)
// © 2025 Quentin THOMAS
// ═══════════════════════════════════════════════════════════════════════════════

// Quand l'app revient au premier plan, mettre à jour tous les timers actifs
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && state.timers) {
    // L'app revient au premier plan
    console.log('[Timers] App revenue au premier plan, mise à jour des timers...');
    
    // Mettre à jour l'affichage de tous les timers actifs
    for (var key in state.timers) {
      if (state.timers[key] && state.timers[key].startTime) {
        updateTimerDisplay(key);
      }
    }
  }
});

// Au chargement, restaurer les timers depuis localStorage
if (typeof restoreTimers === 'function') {
  restoreTimers();
}



// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET SILICE - Structure verticale pour fractions silice
// © 2025 Quentin THOMAS
// ═══════════════════════════════════════════════════════════════════════════════


console.log('✓ Export Excel chargé');


var TUBE_TOP=[["Tube Reg (multi)", "CONTRÔLE REGLEMENTAIRE DES VLEP"], ["", "PRELEVEMENTS MULTI-POLLUANTS SUR SUPPORT ADSORBANT"], ["", ""], ["nom du préleveur", ""], ["site", ""], ["GEH", ""], ["opérateur", ""], ["Matériel de mesure", ""], ["n° d'identification", "pompe"], ["", "débitmètre à lame de savon ou à piston"], ["tubes adsorbant", "nature et marque"], ["", "n° de lot"], ["", "date d’expiration"], ["Plages horaires de prélèvement, durée du prélèvement et durée d'exposition", ""], ["date de prélèvement", ""], ["plage n°1 heure début n°C1-P1_", ""], ["plage n°1 heure fin n°C1-P1_", ""], ["plage n°2 heure début n°C1-P2_", ""], ["plage n°2 heure fin n°C1-P2_", ""], ["plage n°3 heure début n°C1-P3_", ""], ["plage n°3 heure fin n°C1-P3_", ""], ["plage n°4 heure début n°C1-P4_", ""], ["plage n°4 heure fin n°C1-P4_", ""], ["plage n°5 heure début n°C1-P5_", ""], ["plage n°5 heure fin n°C1-P5_", ""], ["plage n°6 heure début n°C1-P6_", ""], ["plage n°6 heure fin n°C1-P6_", ""], ["plage n°7 heure début n°C1-P7_", ""], ["plage n°7 heure fin n°C1-P7_", ""], ["plage n°8 heure début n°C1-P8_", ""], ["plage n°8 heure fin n°C1-P8_", ""], ["plage n°9 heure début n°C1-P9_", ""], ["plage n°9 heure fin n°C1-P9_", ""], ["plage n°10 heure début n°C1-P10_", ""], ["plage n°10 heure fin n°C1-P10_", ""], ["durée du prélèvement (h)", ""], ["durée d'exposition (h:min) - VLEP 8h", ""], ["durée d'exposition - VLEP 8h", ""], ["Prise en compte des Equipements de Protection Individuelle", ""], ["type d'EPI", ""], ["facteur de protection assigné (FPA)", ""], ["durée de port de l'EPI (min)", ""], ["Conditions ambiantes lors des prélèvements", ""], ["température ambiante (°C)", "initiale"], ["", "finale"], ["", "moyenne"], ["pression atmosphérique (hPa)", "initiale"], ["", "finale"], ["", "moyenne"], ["humidité relative (%)", "initiale"], ["", "finale"], ["", "moyenne"], ["pression de saturation de la vapeur d'eau (Pa)", ""], ["Volume prélevé", ""], ["Volume prélevé avec pompe - Vérification du débit avec débitmètre massique", ""], ["débit initial de la pompe (L/min)", ""], ["débit final de la pompe (L/min)", ""], ["débit moyen de la pompe (L/min)", ""], ["volume prélevé (L)", ""], ["Volume prélevé avec pompe - Vérification du débit avec débitmètre à lame de savon ou à piston", ""], ["débit initial de la pompe (L/min)", ""], ["débit initial corrigé (L/min)", ""], ["débit final de la pompe (L/min)", ""], ["débit final corrigé (L/min)", ""], ["débit moyen de la pompe (L/min)", ""], ["volume prélevé corrigé (L)", ""], ["Volume prélevé (L)", ""], ["Résultats du laboratoire d'analyse", ""], ["nom du laboratoire", ""], ["référence de l'échantillon", ""]];
var TUBE_RESHDR=[["RESULTATS", ""], ["GEH", ""], ["type de VLEP", ""], ["opérateur", ""], ["date du prélèvement", ""], ["durée du prélèvement (min)", ""], ["référence de l'échantillon", ""]];
var TUBE_VALHDR=[["Validation des prélèvements", ""], ["Variation du débit avant et après prélèvement (< 5%)", ""], ["référence du témoin", ""]];
var TUBE_BOTTOM=[["", ""], ["Calcul d'incertitudes", ""], ["", ""], ["Incertitude associée au volume de gaz prélevé", ""], ["Débitmètre", ""], ["EMT (%)", ""], ["résolution (L/min)", ""], ["Paramètre", ""], ["u²(D)", ""], ["Chronomètre", ""], ["EMT (s)", ""], ["résolution (s)", ""], ["écart de synchronisation (s)", ""], ["u²(t)", ""], ["Capteur de température", ""], ["EMT (°C)", ""], ["résolution (°C)", ""], ["u²(Tp) ou u²(Té)", ""], ["Baromètre", ""], ["EMT (Pa)", ""], ["résolution (Pa)", ""], ["u²(Pp) ou u²(Pé)", ""], ["Station météorologique (humidité relative)", ""], ["EMT (%)", ""], ["résolution (%)", ""], ["u²(HR)", ""], ["", ""], ["Température lors de l'étalonnage du débitmètre massique (°C)", ""], ["Pression atmosphérique lors de l'étalonnage du débitmètre massique (kPa)", ""], ["Volume prélevé avec pompe", ""], ["Paramètre", ""], ["u²(Dc)/Dc² (débitmètre massique)", ""], ["∂Dc/∂D", ""], ["∂Dc/∂P", ""], ["∂Dc/∂HR", ""], ["u²(Dc) (débitmètre à lame de savon)", ""], ["u²(V)/V²", ""], ["", ""], ["Incertitude associée à la concentration", ""], ["u²(C)/C² N°1", ""], ["u²(C)/C² N°2", ""], ["u²(C)/C² N°3", ""], ["u²(C)/C² N°4", ""], ["u²(C)/C² N°5", ""]];

// ═══════════════════════════════════════════════════════════
// POINT 5 — Export par type de support, structure "(multi)"
// ═══════════════════════════════════════════════════════════

// Classe un libellé de support vers un type d'onglet du modèle.
// Règles validées : tube+filtre/cassette => cassette+tube ; coupelle/mousse/cip => cip10 ;
// tube => tube ; filtre/cassette => cassette ; sinon => autre.
function classifySupport(s){
  s=(s||'').toLowerCase();
  var hasTube=s.indexOf('tube')!==-1;
  var hasFiltreCass=s.indexOf('filtre')!==-1||s.indexOf('cassette')!==-1;
  if(hasTube&&hasFiltreCass)return 'cassette+tube';
  if(s.indexOf('coupelle')!==-1||s.indexOf('mousse')!==-1||s.indexOf('cip')!==-1)return 'cip10';
  if(hasTube)return 'tube';
  if(hasFiltreCass)return 'cassette';
  return 'autre';
}

// Regroupe une liste d'entrées {prel,sub,subIdx,agent,gehNum,gehName,type} en colonnes-support.
// Une colonne = un support = (prélèvement, jour J, groupe co-prélèvement). Agents empilés.
function buildSupportColumns(m,prels,groupAllPerSub){
  var groups={};var order=[];
  prels.forEach(function(e){
    var sb=e.sub;
    var gid;
    if(groupAllPerSub){
      gid='_all_'; // silice : toutes les fractions d'un même prélèvement/jour => une colonne
    }else{
      var members=(typeof getCoPrelGroupMembers==='function')?getCoPrelGroupMembers(sb,e.agent):[];
      if(members&&members.length>1){
        gid=members.slice().sort().join('|'); // même groupe co-prélevé => même colonne
      }else{
        gid=e.agent; // agent seul = support à un seul polluant
      }
    }
    var key=e.prel.id+'#'+e.subIdx+'#'+gid;
    if(!groups[key]){
      groups[key]={prel:e.prel,sub:sb,subIdx:e.subIdx,gehNum:e.gehNum,gehName:e.gehName,type:e.type,agentNames:[]};
      order.push(key);
    }
    if(groups[key].agentNames.indexOf(e.agent)===-1)groups[key].agentNames.push(e.agent);
  });
  return order.map(function(key){
    var g=groups[key];var sb=g.sub;var firstAgent=g.agentNames[0];
    var ad=sb.agentData?sb.agentData[firstAgent]:null;
    var ag=(typeof getAgentFromDB==='function')?getAgentFromDB(firstAgent):null;
    var cond=(typeof getConditionsForPrel==='function')?getConditionsForPrel(m,sb):null;
    var isTachy=(typeof isTachymetreAgent==='function')&&isTachymetreAgent(firstAgent);
    return {
      gehLabel:g.gehNum+' - '+g.gehName,
      operateur:sb.operateur||'',
      numPompe:ad&&ad.numPompe?ad.numPompe:'',
      debitmetre:isTachy?(m.tachymetre||''):(m.debitmetre||''),
      supportNature:ag?(ag['Support de prélèvement']||''):'',
      date:(typeof formatDateFR==='function')?(formatDateFR(sb.date)||''):(sb.date||''),
      plages:sb.plages||[],
      epiType:sb.epiType||'sans objet',
      epiDuree:((sb.epiType||'sans objet')==='sans objet')?0:(sb.epiDuree||0),
      tempI:cond&&cond.tempI?cond.tempI:'',tempF:cond&&cond.tempF?cond.tempF:'',
      pressionI:cond&&cond.pressionI?cond.pressionI:'',pressionF:cond&&cond.pressionF?cond.pressionF:'',
      humiditeI:cond&&cond.humiditeI?cond.humiditeI:'',humiditeF:cond&&cond.humiditeF?cond.humiditeF:'',
      debitInitial:ad&&ad.debitInitial?ad.debitInitial:'',debitFinal:ad&&ad.debitFinal?ad.debitFinal:'',
      refEchantillon:ad&&ad.refEchantillon?ad.refEchantillon:'',
      typeVlep:g.type,
      blancRef:(typeof getBlancForAgent==='function')?getBlancForAgent(m,firstAgent):'',
      agents:g.agentNames.map(function(n){return {name:n};})
    };
  });
}

// Construit la feuille "Tube Reg (multi)" : structure exacte du modèle, agents empilés.
function createTubeRegMultiSheet(m,columns){
  // Gabarits par agent (n°k)
  function lab(k){return [['agent chimique n\u00b0'+k+'_',''],['masse \u00e9chantillon n\u00b0'+k+'_','(\u00b5g)'],['incertitude sur la masse n\u00b0'+k+'_','(%)     ou'],['','(\u00b5g)']];}
  function res(k){var K='n\u00b0'+k+'_';return [['agent chimique '+K,''],['r\u00e9sultat brut (mg/m3) '+K,''],['incertitude (mg/m3) '+K,''],['r\u00e9sultat pond\u00e9r\u00e9 (mg/m3) '+K,''],["port d'un EPI respiratoire "+K,''],['Exposition (mg/m3) '+K,''],['VLEP (mg/m3) '+K,''],['concentration / VLEP (%) '+K,''],['commentaire '+K,'']];}
  function tem(k){var K='n\u00b0'+k+'_';return [['masse t\u00e9moin agent chimique '+K+'(\u00b5g)',''],['concentration dans le blanc '+K+'(mg/m3)',''],['Crit\u00e8re de validit\u00e9 '+K+'(<LQ)','']];}
  function zon(k){var K='n\u00b0'+k+'_';return [['masse agent chimique n\u00b0'+k+' (\u00b5g) recueillie dans','zone 1 '+K],['','zone 2 '+K],['Crit\u00e8re de validit\u00e9 (zone2 < 5% x zone1) '+K,'']];}

  var slots=5;
  columns.forEach(function(c){if(c.agents.length>slots)slots=c.agents.length;});

  var rows=[];
  function pushStatic(arr,fillMap){
    arr.forEach(function(ab,i){rows.push({a:ab[0],b:ab[1],fill:(fillMap&&fillMap[i])?fillMap[i]:null});});
  }
  function pushAgentBlocks(makeBlock,nameRowIndex){
    for(var k=1;k<=slots;k++){
      (function(k){
        makeBlock(k).forEach(function(ab,i){
          var fill=null;
          if(nameRowIndex!==null&&i===nameRowIndex){
            fill=function(c){return c.agents[k-1]?c.agents[k-1].name:'';};
          }
          rows.push({a:ab[0],b:ab[1],fill:fill});
        });
      })(k);
    }
  }

  // TOP (lignes 1-70)
  var topFill={};
  topFill[5]=function(c){return c.gehLabel;};
  topFill[6]=function(c){return c.operateur;};
  topFill[8]=function(c){return c.numPompe;};
  topFill[9]=function(c){return c.debitmetre;};
  topFill[10]=function(c){return c.supportNature;};
  topFill[14]=function(c){return c.date;};
  for(var j=0;j<10;j++){
    (function(j){
      topFill[15+2*j]=function(c){return c.plages[j]&&c.plages[j].debut?c.plages[j].debut:'';};
      topFill[16+2*j]=function(c){return c.plages[j]&&c.plages[j].fin?c.plages[j].fin:'';};
    })(j);
  }
  topFill[39]=function(c){return c.epiType;};
  topFill[41]=function(c){return c.epiDuree;};
  topFill[43]=function(c){return c.tempI;};
  topFill[44]=function(c){return c.tempF;};
  topFill[46]=function(c){return c.pressionI;};
  topFill[47]=function(c){return c.pressionF;};
  topFill[49]=function(c){return c.humiditeI;};
  topFill[50]=function(c){return c.humiditeF;};
  topFill[55]=function(c){return c.debitInitial;};
  topFill[56]=function(c){return c.debitFinal;};
  topFill[69]=function(c){return c.refEchantillon;};
  pushStatic(TUBE_TOP,topFill);

  // LAB blocks (agent en ligne 0 du bloc)
  pushAgentBlocks(lab,0);

  // RESHDR (lignes 91-97)
  var resHdrFill={};
  resHdrFill[1]=function(c){return c.gehLabel;};
  resHdrFill[2]=function(c){return c.typeVlep;};
  resHdrFill[3]=function(c){return c.operateur;};
  resHdrFill[4]=function(c){return c.date;};
  resHdrFill[6]=function(c){return c.refEchantillon;};
  pushStatic(TUBE_RESHDR,resHdrFill);

  // RES blocks (agent en ligne 0 du bloc)
  pushAgentBlocks(res,0);

  // VALHDR (lignes 143-145)
  var valHdrFill={};
  valHdrFill[2]=function(c){return c.blancRef;};
  pushStatic(TUBE_VALHDR,valHdrFill);

  // TEM + ZON blocks (aucune donnée appli : macro/labo)
  pushAgentBlocks(tem,null);
  pushAgentBlocks(zon,null);

  // BOTTOM (calcul d'incertitudes, statique)
  pushStatic(TUBE_BOTTOM,null);

  // Assemblage : col A, col B, puis 2 colonnes par support (valeur + colonne vide)
  var aoa=rows.map(function(row){
    var r=[row.a,row.b];
    columns.forEach(function(col){
      r.push(row.fill?(row.fill(col)||''):'');
      r.push('');
    });
    return r;
  });
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  return applyMultiMerges(ws,columns,MERGE_TUBE,aoa.length);
}


var CASS_TOP=[["Cassette Reg (multi)", "CONTRÔLE REGLEMENTAIRE DES VLEP"], ["", "PRELEVEMENTS SUR CASSETTE PORTE-FILTRE"], ["", ""], ["nom du préleveur", ""], ["site", ""], ["GEH", ""], ["opérateur", ""], ["Matériel de mesure", ""], ["n° d'identification", "pompe"], ["", "débitmètre à lame de savon ou à piston"], ["cassette porte-filtre", "nature et marque"], ["Plages horaires de prélèvement, durée du prélèvement et durée d'exposition", ""], ["date de prélèvement", ""], ["plage n°1", "heure début n°C1-P1_"], ["", "heure fin n°C1-P1_"], ["plage n°2", "heure début n°C1-P2_"], ["", "heure fin n°C1-P2_"], ["plage n°3", "heure début n°C1-P3_"], ["", "heure fin n°C1-P3_"], ["plage n°4", "heure début n°C1-P4_"], ["", "heure fin n°C1-P4_"], ["plage n°5", "heure début n°C1-P5_"], ["", "heure fin n°C1-P5_"], ["plage n°6", "heure début n°C1-P6_"], ["", "heure fin n°C1-P6_"], ["plage n°7", "heure début n°C1-P7_"], ["", "heure fin n°C1-P7_"], ["plage n°8", "heure début n°C1-P8_"], ["", "heure fin n°C1-P8_"], ["plage n°9", "heure début n°C1-P9_"], ["", "heure fin n°C1-P9_"], ["plage n°10", "heure début n°C1-P10_"], ["", "heure fin n°C1-P10_"], ["durée du prélèvement (h)", ""], ["durée d'exposition (h:min) - VLEP 8h", ""], ["durée d'exposition - VLEP 8h", ""], ["Prise en compte des Equipements de Protection Individuelle", ""], ["type d'EPI", ""], ["facteur de protection assigné (FPA)", ""], ["durée de port de l'EPI (min)", ""], ["Conditions ambiantes lors des prélèvements", ""], ["température ambiante (°C)", "initiale"], ["", "finale"], ["", "moyenne"], ["pression atmosphérique (hPa)", "initiale"], ["", "finale"], ["", "moyenne"], ["humidité relative (%)", "initiale"], ["", "finale"], ["", "moyenne"], ["pression de saturation de la vapeur d'eau (Pa)", ""], ["Volume prélevé", ""], ["Volume prélevé avec pompe - Vérification du débit avec débitmètre massique", ""], ["débit initial de la pompe (L/min) DM", ""], ["débit final de la pompe (L/min) DM", ""], ["débit moyen de la pompe (L/min)", ""], ["volume prélevé (L)", ""], ["Volume prélevé avec pompe - Vérification du débit avec débitmètre à lame de savon ou à piston", ""], ["débit initial de la pompe (L/min) DLS", ""], ["débit initial corrigé (L/min) DLS", ""], ["débit final de la pompe (L/min) DLS", ""], ["débit final corrigé (L/min)", ""], ["débit moyen de la pompe (L/min)", ""], ["volume prélevé corrigé (L)", ""], ["Volume prélevé (L)", ""], ["Résultats du laboratoire d'analyse", ""], ["nom du laboratoire", ""], ["référence de l'échantillon", ""]];
var CASS_RESHDR=[["RESULTATS", ""], ["GEH", ""], ["type de VLEP", ""], ["opérateur", ""], ["référence de l'échantillon", ""], ["date du prélèvement", ""], ["durée du prélèvement (min)", ""]];
var CASS_VALHDR=[["Validation des prélèvements", ""], ["Variation du débit avant et après prélèvement (< 5%)", ""], ["référence du témoin", ""]];
var CASS_BOTTOM=[["", ""], ["Calcul d'incertitudes", ""], ["", ""], ["Incertitude associée au volume de gaz prélevé", ""], ["Débitmètre", ""], ["EMT (%)", ""], ["résolution (L/min)", ""], ["Agent chimique", ""], ["u²(D)", ""], ["Chronomètre", ""], ["EMT (s)", ""], ["résolution (s)", ""], ["écart de synchronisation (s)", ""], ["u²(t)", ""], ["Capteur de température", ""], ["EMT (°C)", ""], ["résolution (°C)", ""], ["u²(Tp) ou u²(Té)", ""], ["Baromètre", ""], ["EMT (Pa)", ""], ["résolution (Pa)", ""], ["u²(Pp) ou u²(Pé)", ""], ["Station météorologique (humidité relative)", ""], ["EMT (%)", ""], ["résolution (%)", ""], ["u²(HR)", ""], ["", ""], ["Température lors de l'étalonnage du débitmètre massique (°C)", ""], ["Pression atmosphérique lors de l'étalonnage du débitmètre massique (kPa)", ""], ["Volume prélevé avec pompe", ""], ["Paramètre", ""], ["u²(Dc)/Dc² (débitmètre massique)", ""], ["∂Dc/∂D (débitmètre à lame de savon)", ""], ["∂Dc/∂P (débitmètre à lame de savon)", ""], ["∂Dc/∂HR (débitmètre à lame de savon)", ""], ["u²(Dc) (débitmètre à lame de savon)", ""], ["u²(V)/V²", ""], ["", ""], ["Incertitude associée à la concentration", ""], ["u²(C)/C² N°1", ""], ["u²(C)/C² N°2", ""], ["u²(C)/C² N°3", ""], ["u²(C)/C² N°4", ""], ["u²(C)/C² N°5", ""]];

// Construit la feuille "Cassette Reg (multi)" : structure exacte du modèle, agents empilés.
// Différences avec le tube : pas de section zone1/zone2 ; libellé "exposition / VLEP (%)" ;
// offsets propres (plages à idx13, débit DM idx53/54, réf échantillon idx67) ; RESHDR avec réf avant date.
function createCassetteRegMultiSheet(m,columns){
  function lab(k){return [['agent chimique n\u00b0'+k+'_',''],['masse \u00e9chantillon n\u00b0'+k+'_','(\u00b5g)'],['incertitude sur la masse n\u00b0'+k+'_','(%)     ou'],['','(\u00b5g)']];}
  function res(k){var K='n\u00b0'+k+'_';return [['agent chimique '+K,''],['r\u00e9sultat brut (mg/m3) '+K,''],['incertitude (mg/m3) '+K,''],['r\u00e9sultat pond\u00e9r\u00e9 (mg/m3) '+K,''],["port d'un EPI respiratoire "+K,''],['Exposition (mg/m3) '+K,''],['VLEP (mg/m3) '+K,''],['exposition / VLEP (%)  '+K,''],['commentaire '+K,'']];}
  function tem(k){var K='n\u00b0'+k+'_';return [['masse t\u00e9moin agent chimique '+K+'(\u00b5g)',''],['concentration dans le blanc '+K+'(mg/m3)',''],['Crit\u00e8re de validit\u00e9 '+K+'(<LQ)','']];}

  var slots=5;
  columns.forEach(function(c){if(c.agents.length>slots)slots=c.agents.length;});

  var rows=[];
  function pushStatic(arr,fillMap){
    arr.forEach(function(ab,i){rows.push({a:ab[0],b:ab[1],fill:(fillMap&&fillMap[i])?fillMap[i]:null});});
  }
  function pushAgentBlocks(makeBlock,nameRowIndex){
    for(var k=1;k<=slots;k++){
      (function(k){
        makeBlock(k).forEach(function(ab,i){
          var fill=null;
          if(nameRowIndex!==null&&i===nameRowIndex){
            fill=function(c){return c.agents[k-1]?c.agents[k-1].name:'';};
          }
          rows.push({a:ab[0],b:ab[1],fill:fill});
        });
      })(k);
    }
  }

  // TOP (lignes 1-68) — offsets cassette
  var topFill={};
  topFill[5]=function(c){return c.gehLabel;};
  topFill[6]=function(c){return c.operateur;};
  topFill[8]=function(c){return c.numPompe;};
  topFill[9]=function(c){return c.debitmetre;};
  topFill[10]=function(c){return c.supportNature;};
  topFill[12]=function(c){return c.date;};
  for(var j=0;j<10;j++){
    (function(j){
      topFill[13+2*j]=function(c){return c.plages[j]&&c.plages[j].debut?c.plages[j].debut:'';};
      topFill[14+2*j]=function(c){return c.plages[j]&&c.plages[j].fin?c.plages[j].fin:'';};
    })(j);
  }
  topFill[37]=function(c){return c.epiType;};
  topFill[39]=function(c){return c.epiDuree;};
  topFill[41]=function(c){return c.tempI;};
  topFill[42]=function(c){return c.tempF;};
  topFill[44]=function(c){return c.pressionI;};
  topFill[45]=function(c){return c.pressionF;};
  topFill[47]=function(c){return c.humiditeI;};
  topFill[48]=function(c){return c.humiditeF;};
  topFill[53]=function(c){return c.debitInitial;};
  topFill[54]=function(c){return c.debitFinal;};
  topFill[67]=function(c){return c.refEchantillon;};
  pushStatic(CASS_TOP,topFill);

  // LAB blocks
  pushAgentBlocks(lab,0);

  // RESHDR (lignes 89-95) — ordre cassette : réf échantillon (idx4) avant date (idx5)
  var resHdrFill={};
  resHdrFill[1]=function(c){return c.gehLabel;};
  resHdrFill[2]=function(c){return c.typeVlep;};
  resHdrFill[3]=function(c){return c.operateur;};
  resHdrFill[4]=function(c){return c.refEchantillon;};
  resHdrFill[5]=function(c){return c.date;};
  pushStatic(CASS_RESHDR,resHdrFill);

  // RES blocks
  pushAgentBlocks(res,0);

  // VALHDR (lignes 141-143)
  var valHdrFill={};
  valHdrFill[2]=function(c){return c.blancRef;};
  pushStatic(CASS_VALHDR,valHdrFill);

  // TEM blocks (pas de section zone pour la cassette)
  pushAgentBlocks(tem,null);

  // BOTTOM
  pushStatic(CASS_BOTTOM,null);

  var aoa=rows.map(function(row){
    var r=[row.a,row.b];
    columns.forEach(function(col){
      r.push(row.fill?(row.fill(col)||''):'');
      r.push('');
    });
    return r;
  });
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  return applyMultiMerges(ws,columns,MERGE_CASS,aoa.length);
}


var SILICE_SKEL=[["CIP10 silice Reg", "CONTRÔLE REGLEMENTAIRE DES VLEP"], ["", "PRELEVEMENTS AVEC CIP10 (SILICE)"], ["", ""], ["nom du préleveur", ""], ["site", ""], ["GEH", ""], ["opérateur", ""], ["agent chimique", ""], ["Matériel de mesure", ""], ["n° d'identification", ""], ["marque", ""], ["Plages horaires de prélèvement, durée du prélèvement et durée d'exposition", ""], ["date de prélèvement", ""], ["plage n°1", "heure début n°C1-P1_"], ["", "heure fin n°C1-P1_"], ["plage n°2", "heure début n°C1-P2_"], ["", "heure fin n°C1-P2_"], ["plage n°3", "heure début n°C1-P3_"], ["", "heure fin n°C1-P3_"], ["plage n°4", "heure début n°C1-P4_"], ["", "heure fin n°C1-P4_"], ["plage n°5", "heure début n°C1-P5_"], ["", "heure fin n°C1-P5_"], ["plage n°6", "heure début n°C1-P6_"], ["", "heure fin n°C1-P6_"], ["plage n°7", "heure début n°C1-P7_"], ["", "heure fin n°C1-P7_"], ["plage n°8", "heure début n°C1-P8_"], ["", "heure fin n°C1-P8_"], ["plage n°9", "heure début n°C1-P9_"], ["", "heure fin n°C1-P9_"], ["plage n°10", "heure début n°C1-P10_"], ["", "heure fin n°C1-P10_"], ["durée du prélèvement (h)", ""], ["durée du prélèvement (min)", ""], ["durée d'exposition (h:min) - VLEP 8h", ""], ["durée d'exposition - VLEP 8h", ""], ["Prise en compte des Equipements de Protection Individuelle", ""], ["type d'EPI", ""], ["facteur de protection assigné (FPA)", ""], ["durée de port de l'EPI (min)", ""], ["Volume prélevé", ""], ["valeurs étalonnage", "vitesse de rotation (tr/min)"], ["", "débit de prélèvement (L/min)"], ["vitesse de rotation (tr/min)", "initiale"], ["", "finale"], ["débit moyen du CIP10 (L/min)", ""], ["Volume prélevé (L)", ""], ["Résultats du laboratoire d'analyse", ""], ["nom du laboratoire", ""], ["référence de l'échantillon", ""], ["masse dans l'échantillon (µg)", "poussières alvéolaires totales"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["incertitude sur la masse", "poussières alv. totales en %  ou"], ["", "en µg"], ["", "quartz en %     ou"], ["", "en µg"], ["", "cristobalite en %     ou"], ["", "en µg"], ["", "tridymite en %     ou"], ["", "en mg"], ["RESULTATS", ""], ["GEH", ""], ["type de VLEP", ""], ["opérateur", ""], ["agent chimique", ""], ["référence de l'échantillon", ""], ["date de prélèvement", ""], ["durée du prélèvement (min)", ""], ["résultat brut (mg/m3)", "poussières alvéolaires totales"], ["", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["Incertitude (mg/m3)", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["Résultat pondéré (mg/m3)", "poussières alvéolaires totales"], ["", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["port d'un EPI respiratoire", ""], ["Exposition (mg/m3)", ""], ["VLEP (mg/m3)", "poussières alvéolaires totales"], ["0.9", "poussières alvéolaires non silicogènes"], ["", "calcul intermédiaire"], ["", "concentration / VLEP (%)"], ["0.1", "quartz"], ["", "calcul intermédiaire"], ["", "concentration / VLEP (%)"], ["0.05", "cristobalite"], ["", "calcul intermédiaire"], ["", "concentration / VLEP (%)"], ["0.05", "tridymite"], ["", "calcul intermédiaire"], ["", "concentration / VLEP (%)"], ["Validation des prélèvements", ""], ["Validation de la vitesse de rotation (variation <200 tr/min)", ""], ["référence du témoin", ""], ["masse dans le témoin (µg)", "poussières alvéolaires totales"], ["", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["concentration dans le blanc (mg/m3) (<10% x VLEP)", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["Critère de validité (<LQ)", "poussières alvéolaires non silicogènes"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"], ["Condition d'additivité ", "valeur"], ["", "validité"], ["", ""], ["Calcul d'incertitudes", ""], ["", ""], ["Incertitude associée à la concentration", ""], ["Tachymètre", ""], ["EMT (tr/min)", ""], ["résolution (tr/min)", ""], ["u²(v)", ""], ["Chronomètre", ""], ["EMT (s)", ""], ["résolution (s)", ""], ["écart de synchronisation (s)", ""], ["u²(t)", ""], ["", ""], ["u²(V)/V²", ""], ["u²(C)/C²", "poussières alvéolaires totales"], ["", "quartz"], ["", "cristobalite"], ["", "tridymite"]];

// Construit la feuille "CIP10 silice Reg" : structure FIXE du modèle.
// Les fractions (alvéolaires/quartz/cristobalite/tridymite) sont des sous-lignes du modèle ;
// une colonne = un support CIP10 (toutes les fractions d'un même prélèvement/jour).
// L'appli ne remplit que le partagé ; masses/résultats/VLEP = macro/labo (laissés tels quels).
function createSiliceSheet(m,columns){
  var fill={};
  fill[5]=function(c){return c.gehLabel;};
  fill[6]=function(c){return c.operateur;};
  fill[7]=function(c){return 'silice cristalline';};
  fill[9]=function(c){return c.numPompe;};               // n° d'identification = n° de pompe
  fill[10]=function(c){return c.debitmetre;};            // marque = tachymètre (équivalent débitmètre)
  fill[12]=function(c){return c.date;};
  for(var j=0;j<10;j++){
    (function(j){
      fill[13+2*j]=function(c){return c.plages[j]&&c.plages[j].debut?c.plages[j].debut:'';};
      fill[14+2*j]=function(c){return c.plages[j]&&c.plages[j].fin?c.plages[j].fin:'';};
    })(j);
  }
  fill[38]=function(c){return c.epiType;};
  fill[40]=function(c){return c.epiDuree;};
  fill[44]=function(c){return c.debitInitial;};          // vitesse de rotation initiale (tr/min)
  fill[45]=function(c){return c.debitFinal;};            // vitesse de rotation finale (tr/min)
  fill[50]=function(c){return c.refEchantillon;};
  fill[64]=function(c){return c.gehLabel;};
  fill[65]=function(c){return c.typeVlep;};
  fill[66]=function(c){return c.operateur;};
  fill[67]=function(c){return 'silice cristalline';};
  fill[68]=function(c){return c.refEchantillon;};
  fill[69]=function(c){return c.date;};
  fill[102]=function(c){return c.blancRef;};

  var aoa=SILICE_SKEL.map(function(ab,i){
    var r=[ab[0],ab[1]];
    columns.forEach(function(col){
      r.push(fill[i]?(fill[i](col)||''):'');
      r.push('');
    });
    return r;
  });
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  return applyMultiMerges(ws,columns,MERGE_SILICE,aoa.length);
}


var MERGE_TUBE={"full": [3, 4, 5, 68, 70, 74, 78, 82, 86, 91, 92, 97, 103, 106, 112, 115, 121, 124, 130, 133, 139, 182], "twocol": [6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 69, 72, 73, 76, 77, 80, 81, 84, 85, 88, 89, 93, 94, 95, 96, 101, 105, 110, 114, 119, 123, 128, 132, 137, 141, 143, 144, 146, 147, 149, 150, 152, 153, 155, 156, 158, 159, 162, 165, 168, 171, 174, 180, 181, 183, 185, 186, 187, 188, 190, 191, 192, 194, 195, 196, 198, 199, 200, 202, 203, 205, 206, 207, 208, 209, 210, 211, 214, 215, 216, 217, 218], "ab": [[203, 0, 203, 1], [49, 0, 51, 0], [205, 0, 205, 1], [216, 0, 216, 1], [88, 0, 89, 0], [172, 0, 173, 0], [206, 0, 206, 1], [160, 0, 161, 0], [143, 0, 143, 1], [214, 0, 214, 1], [163, 0, 164, 0], [84, 0, 85, 0], [166, 0, 167, 0], [215, 0, 215, 1], [217, 0, 217, 1], [43, 0, 45, 0], [218, 0, 218, 1], [52, 0, 52, 1], [207, 0, 207, 1], [209, 0, 209, 1], [202, 0, 202, 1], [8, 0, 9, 0], [46, 0, 48, 0], [182, 0, 182, 1], [208, 0, 208, 1], [37, 0, 37, 1], [169, 0, 170, 0], [210, 0, 210, 1], [80, 0, 81, 0], [76, 0, 77, 0], [10, 0, 12, 0], [72, 0, 73, 0]], "rows": 219};
var MERGE_CASS={"full": [3, 4, 5, 9, 66, 68, 72, 76, 80, 84, 89, 90, 95, 101, 104, 110, 113, 119, 122, 128, 131, 137, 165, 188], "twocol": [6, 8, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 53, 54, 55, 56, 58, 59, 60, 61, 62, 63, 64, 67, 70, 71, 74, 75, 78, 79, 82, 83, 86, 87, 91, 92, 93, 94, 99, 103, 108, 112, 117, 121, 126, 130, 135, 139, 141, 142, 144, 145, 147, 148, 150, 151, 153, 154, 156, 157, 163, 164, 166, 168, 169, 170, 171, 173, 174, 175, 177, 178, 179, 181, 182, 183, 185, 186, 189, 190, 191, 192, 193, 194, 197, 198, 199, 200, 201], "ab": [[185, 0, 185, 1], [190, 0, 190, 1], [50, 0, 50, 1], [78, 0, 79, 0], [86, 0, 87, 0], [191, 0, 191, 1], [193, 0, 193, 1], [199, 0, 199, 1], [201, 0, 201, 1], [17, 0, 18, 0], [31, 0, 32, 0], [15, 0, 16, 0], [21, 0, 22, 0], [41, 0, 43, 0], [88, 0, 88, 1], [165, 0, 165, 1], [13, 0, 14, 0], [44, 0, 46, 0], [186, 0, 186, 1], [188, 0, 188, 1], [27, 0, 28, 0], [29, 0, 30, 0], [189, 0, 189, 1], [141, 0, 141, 1], [8, 0, 9, 0], [192, 0, 192, 1], [74, 0, 75, 0], [47, 0, 49, 0], [198, 0, 198, 1], [70, 0, 71, 0], [19, 0, 20, 0], [25, 0, 26, 0], [82, 0, 83, 0], [23, 0, 24, 0], [200, 0, 200, 1], [197, 0, 197, 1]], "rows": 202};
var MERGE_SILICE={"full": [3, 4, 5, 7, 49, 64, 65, 67], "twocol": [6, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 42, 43, 44, 45, 46, 47, 50, 55, 56, 57, 58, 59, 60, 61, 62, 66, 68, 69, 70, 85, 99, 101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 123, 124, 125, 127, 128, 129, 130, 132, 133, 134, 135, 136], "ab": [[63, 0, 63, 1], [44, 0, 45, 0], [17, 0, 18, 0], [31, 0, 32, 0], [15, 0, 16, 0], [21, 0, 22, 0], [116, 0, 117, 0], [71, 0, 75, 0], [42, 0, 43, 0], [101, 0, 101, 1], [13, 0, 14, 0], [27, 0, 28, 0], [29, 0, 30, 0], [112, 0, 115, 0], [36, 0, 36, 1], [51, 0, 54, 0], [133, 0, 136, 0], [55, 0, 62, 0], [103, 0, 107, 0], [80, 0, 84, 0], [19, 0, 20, 0], [25, 0, 26, 0], [76, 0, 79, 0], [23, 0, 24, 0], [108, 0, 111, 0]], "rows": 137};

// Applique les fusions de cellules du modèle aux feuilles multi (tube/cassette/silice),
// pour retrouver le collage parfait : chaque support = ses 2 colonnes fusionnées (C-D, E-F…),
// lignes GEH/agent/titre fusionnées sur toute la largeur, libellés A/B fusionnés verticalement.
// cfg = {full:[lignes pleine largeur], twocol:[lignes 2-col par support], ab:[[r1,c1,r2,c2]…], rows:N attendu}
function applyMultiMerges(ws,columns,cfg,nRows){
  if(!ws['!merges'])ws['!merges']=[];
  var n=columns.length;
  if(n<1)return ws;
  // Garde-fou : si la structure a été décalée (ex. >5 agents empilés), on n'applique pas
  // les fusions du modèle (indices de lignes non valides) plutôt que de produire de mauvaises fusions.
  if(cfg.rows&&nRows&&nRows!==cfg.rows){
    return ws;
  }
  var lastDataCol=2+2*n-1;
  // Lignes pleine largeur (GEH / agent / titre)
  cfg.full.forEach(function(r){
    ws['!merges'].push({s:{r:r,c:2},e:{r:r,c:lastDataCol}});
  });
  // Lignes 2-colonnes : une fusion par support
  cfg.twocol.forEach(function(r){
    for(var i=0;i<n;i++){
      var sc=2+i*2;
      ws['!merges'].push({s:{r:r,c:sc},e:{r:r,c:sc+1}});
    }
  });
  // Fusions des libellés colonnes A/B (telles que dans le modèle)
  cfg.ab.forEach(function(mr){
    ws['!merges'].push({s:{r:mr[0],c:mr[1]},e:{r:mr[2],c:mr[3]}});
  });
  // Largeurs de colonnes : A large, B moyen, puis (valeur + espaceur étroit) par support
  var colsW=[{wch:48},{wch:18}];
  for(var k=0;k<n;k++){colsW.push({wch:16});colsW.push({wch:3});}
  ws['!cols']=colsW;
  return ws;
}
