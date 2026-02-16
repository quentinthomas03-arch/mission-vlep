/*
 * VLEP Mission v3.8 - export.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Module Export & Import :
 * - Liste échantillons + blancs terrain
 * - Export Excel (feuilles REG, NON REG, Échantillons, Relevé activité)
 * - Export/Import JSON mission
 */

// ===== LISTE ÉCHANTILLONS =====
function renderListeEchantillons(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-mission';render();return'';}
  if(!m.blancs)m.blancs=[];
  var h='<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.list+' Liste échantillons</h2><p class="subtitle">'+escapeHtml(m.clientSite)+'</p></div>';
  h+='<div class="row mb-12"><button class="btn btn-success" onclick="state.showModal=\'addBlanc\';state.blancAgentSearch=\'\';state.blancAgents=[];render();">+ Blanc terrain</button><button class="btn btn-primary" onclick="validateBeforeExport();">'+ICONS.check+' Valider & Export</button></div>';
  h+='<div class="row mb-12"><span style="font-size:13px;margin-right:8px;">Trier par :</span><button class="btn btn-small '+(state.echantillonSort==='date'?'btn-blue':'btn-gray')+'" onclick="state.echantillonSort=\'date\';render();">Date</button><button class="btn btn-small '+(state.echantillonSort==='agent'?'btn-blue':'btn-gray')+'" onclick="state.echantillonSort=\'agent\';render();">Agent</button><button class="btn btn-small '+(state.echantillonSort==='geh'?'btn-blue':'btn-gray')+'" onclick="state.echantillonSort=\'geh\';render();">GEH</button></div>';
  var samples=[];
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(sb){
      p.agents.forEach(function(a){
        var ad=(sb.agentData&&sb.agentData[a.name])||{};
        samples.push({agent:a.name,ref:ad.refEchantillon||'',date:sb.date||'',type:p.type,geh:p.gehNum,gehName:p.gehName,pompe:ad.numPompe||'',isReg:p.isReglementaire});
      });
    });
  });
  if(state.echantillonSort==='agent')samples.sort(function(a,b){return a.agent.localeCompare(b.agent);});
  else if(state.echantillonSort==='geh')samples.sort(function(a,b){return a.geh-b.geh;});
  else samples.sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  if(samples.length>0){
    h+='<div class="card" style="padding:0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;">';
    h+='<tr style="background:#f1f5f9;"><th style="padding:6px;text-align:left;">Réf</th><th>Agent</th><th>GEH</th><th>Type</th></tr>';
    samples.forEach(function(x){
      h+='<tr style="border-top:1px solid #e5e7eb;"><td style="padding:5px 6px;font-weight:600;">'+escapeHtml(x.ref||'-')+'</td><td style="padding:5px;">'+escapeHtml(x.agent)+'</td><td style="padding:5px;">'+x.geh+'</td><td style="padding:5px;"><span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;'+(x.type==='CT'?'background:#f59e0b;color:white;':'background:#e5e7eb;')+'">'+x.type+'</span></td></tr>';
    });
    h+='</table></div>';
  }
  if(m.blancs.length>0){
    h+='<div class="section-title mt-12">Blancs terrain ('+m.blancs.length+')</div>';
    m.blancs.forEach(function(b,i){
      h+='<div class="card" style="padding:10px;background:#fef3c7;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>'+escapeHtml(b.ref)+'</strong><div style="font-size:12px;color:#666;">'+escapeHtml(b.agents.join(', '))+' • '+escapeHtml(b.date||'Sans date')+'</div></div><button class="btn btn-danger btn-small" onclick="deleteBlanc('+i+');">'+ICONS.trash+'</button></div></div>';
    });
  }
  if(state.showModal==='addBlanc')h+=renderAddBlancModal();
  if(state.showModal==='validation')h+=renderValidationModal();
  return h;
}

// ===== BLANCS TERRAIN =====
function renderAddBlancModal(){
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>+ Blanc terrain</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<div class="field"><label class="label">Référence échantillon *</label><input type="text" class="input" id="blanc-ref" placeholder="Ex: BT-001" value="'+escapeHtml(state.blancRef||'')+'" oninput="state.blancRef=this.value;"></div>';
  h+='<div class="field"><label class="label">Date</label><input type="date" class="input" id="blanc-date" value="'+(state.blancDate||'')+'" oninput="state.blancDate=this.value;"></div>';
  h+='<div class="field"><label class="label">Agent(s) chimique(s)</label><input type="text" class="input" id="blanc-agent-search" placeholder="Rechercher..." value="'+escapeHtml(state.blancAgentSearch||'')+'" oninput="handleBlancAgentSearch(this.value);"></div>';
  h+='<div id="blanc-search-results">';
  if(state.blancAgentSearch&&state.blancAgentSearch.length>=2){
    var r=searchAgentsDB(state.blancAgentSearch).slice(0,6);
    if(r.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      r.forEach(function(x){
        var already=state.blancAgents&&state.blancAgents.indexOf(x)!==-1;
        h+='<div class="search-result-item" style="'+(already?'opacity:0.5;':'')+'" data-agent="'+escapeHtml(x)+'"'+(already?' data-disabled="1"':'')+'>'+escapeHtml(x)+(already?' ✓':'')+'</div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  if(state.blancAgents&&state.blancAgents.length>0){
    h+='<div class="info-box mt-8"><strong>Agents :</strong> '+state.blancAgents.map(function(a){return escapeHtml(a);}).join(', ')+'</div>';
  }
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-success" onclick="addBlanc();">Ajouter</button></div></div></div>';
  return h;
}

function handleBlancAgentSearch(value){
  state.blancAgentSearch=value;
  var container=document.getElementById('blanc-search-results');
  if(!container)return;
  var h='';
  if(value&&value.length>=2){
    var r=searchAgentsDB(value).slice(0,6);
    if(r.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      r.forEach(function(x){
        var already=state.blancAgents&&state.blancAgents.indexOf(x)!==-1;
        h+='<div class="search-result-item" style="'+(already?'opacity:0.5;':'')+'" data-agent="'+escapeHtml(x)+'"'+(already?' data-disabled="1"':'')+'>'+escapeHtml(x)+(already?' ✓':'')+'</div>';
      });
      h+='</div>';
    }
  }
  container.innerHTML=h;
}

function addBlancAgent(name){
  if(!state.blancAgents)state.blancAgents=[];
  if(state.blancAgents.indexOf(name)!==-1)return;
  state.blancAgents.push(name);
  state.blancAgentSearch='';
  render();
}

function addBlanc(){
  var m=getCurrentMission();if(!m)return;
  var ref=state.blancRef||'';
  if(!ref.trim()){alert('Saisissez une référence');return;}
  if(!m.blancs)m.blancs=[];
  m.blancs.push({ref:ref.trim(),agents:(state.blancAgents||[]).slice(),date:state.blancDate||''});
  state.blancRef='';state.blancDate='';state.blancAgents=[];state.showModal=null;
  saveData('vlep_missions_v3',state.missions);
  render();
}

function deleteBlanc(i){
  var m=getCurrentMission();if(!m)return;
  if(!confirm('Supprimer ce blanc ?'))return;
  m.blancs.splice(i,1);
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ═══════════════════════════════════════════════════════════
// EXPORT EXCEL - Structure cassette REG/NON REG COMPLÈTE
// © 2025 Quentin THOMAS
// Inclut : Conditions ambiantes, Débits I/F, Type 8h/CT, Blancs
// ═══════════════════════════════════════════════════════════

function exportExcel(){
  var m=getCurrentMission();
  if(!m){alert('Aucune mission');return;}
  var wb=XLSX.utils.book_new();
  var regPrels=[],nonRegPrels=[];
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(sb,si){
      p.agents.forEach(function(a){
        var prelData={prel:p,sub:sb,subIdx:si,agent:a.name,gehName:p.gehName,gehNum:p.gehNum,type:p.type,isReg:p.isReglementaire};
        if(p.isReglementaire)regPrels.push(prelData);
        else nonRegPrels.push(prelData);
      });
    });
  });
  var sortByGehAgent=function(a,b){if(a.gehNum!==b.gehNum)return a.gehNum-b.gehNum;return a.agent.localeCompare(b.agent);};
  regPrels.sort(sortByGehAgent);
  nonRegPrels.sort(sortByGehAgent);
  if(regPrels.length>0){var wsReg=createRegSheet(m,regPrels);XLSX.utils.book_append_sheet(wb,wsReg,'REG');}
  if(nonRegPrels.length>0){var wsNonReg=createNonRegSheet(m,nonRegPrels);XLSX.utils.book_append_sheet(wb,wsNonReg,'NON REG');}
  var wsEchantillons=createEchantillonsSheet(m,regPrels,nonRegPrels);
  XLSX.utils.book_append_sheet(wb,wsEchantillons,'Échantillons');
  var wsActivite=createActiviteSheet(m);
  XLSX.utils.book_append_sheet(wb,wsActivite,'Relevé activité');
  var fn=(m.clientSite||'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g,'')+'_cassettes.xlsx';
  XLSX.writeFile(wb,fn);
  alert('Export terminé : '+fn);
}

// Helper : date FR
function formatDateFR(dateStr){
  if(!dateStr)return'';
  if(dateStr.match(/^\d{4}-\d{2}-\d{2}$/)){var parts=dateStr.split('-');return parts[2]+'/'+parts[1]+'/'+parts[0];}
  return dateStr;
}

// Helper : conditions ambiantes par date
function getConditionsForPrel(m,subPrel){
  if(!m.conditionsAmbiantes||m.conditionsAmbiantes.length===0)return null;
  if(subPrel.date){for(var i=0;i<m.conditionsAmbiantes.length;i++){if(m.conditionsAmbiantes[i].date===subPrel.date)return m.conditionsAmbiantes[i];}}
  return m.conditionsAmbiantes[0];
}

// Helper : référence blanc pour agent
function getBlancForAgent(m,agentName){
  if(!m.blancs||m.blancs.length===0)return'';
  for(var i=0;i<m.blancs.length;i++){if(m.blancs[i].agents&&m.blancs[i].agents.indexOf(agentName)!==-1)return m.blancs[i].ref||'';}
  return'';
}

// ===== FEUILLE REG (10 plages, ~96 lignes) =====
function createRegSheet(m,prels){
  var aoa=[];
  // Lignes 0-2 : En-tête
  aoa.push(['Cassette Reg','CONTRÔLE REGLEMENTAIRE']);
  aoa.push(['22','PRELEVEMENTS SUR CASSETTE']);
  aoa.push([]);
  // Ligne 3-4 : Préleveur et site
  aoa.push(['nom du préleveur','',m.preleveur||'']);
  aoa.push(['site','',m.clientSite||'']);
  // Ligne 5 : GEH
  var row5=['GEH',''];
  for(var i=0;i<prels.length;i++){row5.push(prels[i].gehNum+' - '+prels[i].gehName);row5.push('');}
  aoa.push(row5);
  // Ligne 6 : opérateur
  var row6=['opérateur',''];
  for(var i=0;i<prels.length;i++){row6.push(prels[i].sub.operateur||'');row6.push('');}
  aoa.push(row6);
  // Ligne 7 : agent chimique
  var row7=['agent chimique',''];
  for(var i=0;i<prels.length;i++){row7.push(prels[i].agent);row7.push('');}
  aoa.push(row7);
  // Ligne 8 : Matériel de mesure
  aoa.push(['Matériel de mesure','']);
  // Lignes 9-10 : pompe + débitmètre
  var row9=['n° d\'identification','pompe'];
  var row10=['','Débimetre'];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    row9.push(ad&&ad.numPompe?ad.numPompe:'');row9.push('');
    row10.push(m.debitmetre||'');row10.push('');
  }
  aoa.push(row9);aoa.push(row10);
  // Ligne 11 : Support
  var row11=['Support','nature et marque'];
  for(var i=0;i<prels.length;i++){
    var ag=getAgentFromDB(prels[i].agent);
    row11.push(ag?(ag['Support de prélèvement']||''):'');row11.push('');
  }
  aoa.push(row11);
  // Ligne 12 : Plages horaires header
  aoa.push(['Plages horaires de prélèvement, durée du','']);
  // Ligne 13 : date
  var row13=['date de prélèvement',''];
  for(var i=0;i<prels.length;i++){row13.push(formatDateFR(prels[i].sub.date)||'');row13.push('');}
  aoa.push(row13);
  // Lignes 14-33 : 10 plages horaires (2 lignes chacune)
  for(var plageNum=1;plageNum<=10;plageNum++){
    var rowDebut=['plage n°'+plageNum,'heure début n°C'+plageNum+'-P'+plageNum+'_'];
    var rowFin=['','heure fin n°C'+plageNum+'-P'+plageNum+'_'];
    for(var i=0;i<prels.length;i++){
      var plages=prels[i].sub.plages||[];var plage=plages[plageNum-1];
      rowDebut.push(plage&&plage.debut?plage.debut:'');rowDebut.push('');
      rowFin.push(plage&&plage.fin?plage.fin:'');rowFin.push('');
    }
    aoa.push(rowDebut);aoa.push(rowFin);
  }
  // Lignes 34-41 : Durées, exposition, EPI (vides)
  for(var lnum=34;lnum<=41;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 42 : Conditions ambiantes
  aoa.push(['Conditions ambiantes lors des prélèvements','']);
  // Ligne 43 : Prélèvement n°
  var row43=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row43.push(i+1);row43.push('');}
  aoa.push(row43);
  // Lignes 44-46 : Température I/F/moy
  var row44=['température ambiante (°C)','initiale'];
  var row45=['','finale'];
  var row46=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row44.push(cond&&cond.tempI?cond.tempI:'');row44.push('');
    row45.push(cond&&cond.tempF?cond.tempF:'');row45.push('');
    row46.push('');row46.push('');
  }
  aoa.push(row44);aoa.push(row45);aoa.push(row46);
  // Lignes 47-49 : Pression I/F/moy
  var row47=['pression atmosphérique (hPa)','initiale'];
  var row48=['','finale'];
  var row49=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row47.push(cond&&cond.pressionI?cond.pressionI:'');row47.push('');
    row48.push(cond&&cond.pressionF?cond.pressionF:'');row48.push('');
    row49.push('');row49.push('');
  }
  aoa.push(row47);aoa.push(row48);aoa.push(row49);
  // Lignes 50-52 : Humidité I/F/moy
  var row50=['humidité relative (%)','initiale'];
  var row51=['','finale'];
  var row52=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row50.push(cond&&cond.humiditeI?cond.humiditeI:'');row50.push('');
    row51.push(cond&&cond.humiditeF?cond.humiditeF:'');row51.push('');
    row52.push('');row52.push('');
  }
  aoa.push(row50);aoa.push(row51);aoa.push(row52);
  // Ligne 53 : Pression saturation (vide)
  var row53=['pression de saturation de la vapeur d\'eau (Pa)',''];
  for(var i=0;i<prels.length;i++){row53.push('');row53.push('');}
  aoa.push(row53);
  // Ligne 54 : Volume prélevé
  aoa.push(['Volume prélevé','']);
  // Ligne 55 : Vérification débit
  aoa.push(['Volume prélevé avec pompe - Vérification du débit','']);
  // Lignes 56-57 : Débits I/F
  var row56=['débit initial de la pompe (L/min) DM',''];
  var row57=['débit final de la pompe (L/min) DM',''];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    row56.push(ad&&ad.debitInitial?ad.debitInitial:'');row56.push('');
    row57.push(ad&&ad.debitFinal?ad.debitFinal:'');row57.push('');
  }
  aoa.push(row56);aoa.push(row57);
  // Lignes 58-59 : Débit moyen, volume (vides)
  var row58=['débit moyen de la pompe (L/min)',''];
  var row59=['volume prélevé (L)',''];
  for(var i=0;i<prels.length;i++){row58.push('');row58.push('');row59.push('');row59.push('');}
  aoa.push(row58);aoa.push(row59);
  // Lignes 60-68 : Vérification DLS, labo (vides)
  for(var lnum=60;lnum<=68;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 69 : RESULTATS
  aoa.push(['RESULTATS','']);
  // Lignes 70-75 : GEH, type VLEP, opérateur, agent, réf, date
  var row70=['GEH',''];var row71=['type de VLEP',''];var row72=['opérateur',''];
  var row73=['agent chimique',''];var row74=['référence de l\'échantillon',''];var row75=['date du prélèvement',''];
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row70.push(p.gehNum+' - '+p.gehName);row70.push('');
    row71.push(p.type);row71.push('');
    row72.push(p.sub.operateur||'');row72.push('');
    row73.push(p.agent);row73.push('');
    var ad=p.sub.agentData?p.sub.agentData[p.agent]:null;
    row74.push(ad&&ad.refEchantillon?ad.refEchantillon:'');row74.push('');
    row75.push(formatDateFR(p.sub.date)||'');row75.push('');
  }
  aoa.push(row70);aoa.push(row71);aoa.push(row72);aoa.push(row73);aoa.push(row74);aoa.push(row75);
  // Lignes 76-84 : Durée, résultats, EPI (vides)
  for(var lnum=76;lnum<=84;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 85 : Validation
  aoa.push(['Validation des prélèvements','']);
  // Ligne 86 : Prélèvement n°
  var row86=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row86.push(i+1);row86.push('');}
  aoa.push(row86);
  // Ligne 87 : Variation débit
  var row87=['Variation du débit avant et après prélèvement (< 5%)',''];
  for(var i=0;i<prels.length;i++){row87.push('');row87.push('');}
  aoa.push(row87);
  // Ligne 88 : Référence témoin
  var row88=['référence du témoin',''];
  for(var i=0;i<prels.length;i++){row88.push(getBlancForAgent(m,prels[i].agent));row88.push('');}
  aoa.push(row88);
  // Lignes 89-91 : masse, concentration, critère (vides)
  for(var lnum=89;lnum<=91;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Créer la feuille
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  if(!ws['!merges'])ws['!merges']=[];
  // Fusions en-tête
  ws['!merges'].push({s:{r:0,c:2},e:{r:0,c:13}});
  ws['!merges'].push({s:{r:1,c:2},e:{r:1,c:13}});
  // Fusions A-B (n° identification)
  ws['!merges'].push({s:{r:9,c:0},e:{r:10,c:0}});
  // Fusions plages A-B
  for(var plageNum=0;plageNum<10;plageNum++){
    ws['!merges'].push({s:{r:14+plageNum*2,c:0},e:{r:15+plageNum*2,c:0}});
  }
  // Fusions conditions A-B
  ws['!merges'].push({s:{r:44,c:0},e:{r:46,c:0}});
  ws['!merges'].push({s:{r:47,c:0},e:{r:49,c:0}});
  ws['!merges'].push({s:{r:50,c:0},e:{r:52,c:0}});
  // Fusions colonnes prélèvements (C-D, E-F, etc.)
  var fuseRows=[3,4,5,6,7,9,10,11,13,43,44,45,46,47,48,49,50,51,52,53,56,57,58,59,69,70,71,72,73,74,75,85,86,87,88];
  for(var ri=0;ri<fuseRows.length;ri++){
    var row=fuseRows[ri];
    for(var i=0;i<prels.length;i++){
      ws['!merges'].push({s:{r:row,c:2+i*2},e:{r:row,c:3+i*2}});
    }
  }
  // Fusions plages horaires colonnes
  for(var plageNum=0;plageNum<10;plageNum++){
    for(var i=0;i<prels.length;i++){
      ws['!merges'].push({s:{r:14+plageNum*2,c:2+i*2},e:{r:14+plageNum*2,c:3+i*2}});
      ws['!merges'].push({s:{r:15+plageNum*2,c:2+i*2},e:{r:15+plageNum*2,c:3+i*2}});
    }
  }
  // Largeurs
  var cols=[{wch:50},{wch:20}];
  for(var i=0;i<prels.length;i++){cols.push({wch:15});cols.push({wch:15});}
  ws['!cols']=cols;
  return ws;
}

// ===== FEUILLE NON REG (5 plages, ~85 lignes) =====
function createNonRegSheet(m,prels){
  var aoa=[];
  // Lignes 0-1 : préleveur et site
  aoa.push(['nom du préleveur','',m.preleveur||'']);
  aoa.push(['site','',m.clientSite||'']);
  aoa.push(['Matériel de mesure','']);
  // Ligne 3 : Prélèvement n°
  var row3=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row3.push(i+1);row3.push('');}
  aoa.push(row3);
  // Ligne 4 : agent chimique
  var row4=['agent chimique',''];
  for(var i=0;i<prels.length;i++){row4.push(prels[i].agent);row4.push('');}
  aoa.push(row4);
  // Lignes 5-6 : pompe + débitmètre
  var row5=['n° d\'identification','pompe'];
  var row6=['','débitmètre'];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    row5.push(ad&&ad.numPompe?ad.numPompe:'');row5.push('');
    row6.push(m.debitmetre||'');row6.push('');
  }
  aoa.push(row5);aoa.push(row6);
  // Ligne 7 : Support
  var row7=['Support','nature et marque'];
  for(var i=0;i<prels.length;i++){
    var ag=getAgentFromDB(prels[i].agent);
    row7.push(ag?(ag['Support de prélèvement']||''):'');row7.push('');
  }
  aoa.push(row7);
  // Ligne 8 : Plages horaires header
  aoa.push(['Plages horaires de prélèvement, durée du','']);
  // Ligne 9 : Prélèvement n°
  var row9=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row9.push(i+1);row9.push('');}
  aoa.push(row9);
  // Ligne 10 : date
  var row10=['date de prélèvement',''];
  for(var i=0;i<prels.length;i++){row10.push(formatDateFR(prels[i].sub.date)||'');row10.push('');}
  aoa.push(row10);
  // Lignes 11-20 : 5 plages horaires (2 lignes chacune)
  for(var plageNum=1;plageNum<=5;plageNum++){
    var rowDebut=['plage n°'+plageNum,'heure début n°C'+plageNum+'-P'+plageNum+'_'];
    var rowFin=['','heure fin n°C'+plageNum+'-P'+plageNum+'_'];
    for(var i=0;i<prels.length;i++){
      var plages=prels[i].sub.plages||[];var plage=plages[plageNum-1];
      rowDebut.push(plage&&plage.debut?plage.debut:'');rowDebut.push('');
      rowFin.push(plage&&plage.fin?plage.fin:'');rowFin.push('');
    }
    aoa.push(rowDebut);aoa.push(rowFin);
  }
  // Lignes 21-28 : Durées, exposition, EPI (vides)
  for(var lnum=21;lnum<=28;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 29 : Conditions ambiantes
  aoa.push(['Conditions ambiantes lors des prélèvements','']);
  // Ligne 30 : Prélèvement n°
  var row30=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row30.push(i+1);row30.push('');}
  aoa.push(row30);
  // Lignes 31-33 : Température I/F/moy
  var row31=['température ambiante (°C)','initiale'];
  var row32=['','finale'];
  var row33=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row31.push(cond&&cond.tempI?cond.tempI:'');row31.push('');
    row32.push(cond&&cond.tempF?cond.tempF:'');row32.push('');
    row33.push('');row33.push('');
  }
  aoa.push(row31);aoa.push(row32);aoa.push(row33);
  // Lignes 34-36 : Pression I/F/moy
  var row34=['pression atmosphérique (hPa)','initiale'];
  var row35=['','finale'];
  var row36=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row34.push(cond&&cond.pressionI?cond.pressionI:'');row34.push('');
    row35.push(cond&&cond.pressionF?cond.pressionF:'');row35.push('');
    row36.push('');row36.push('');
  }
  aoa.push(row34);aoa.push(row35);aoa.push(row36);
  // Lignes 37-39 : Humidité I/F/moy
  var row37=['humidité relative (%)','initiale'];
  var row38=['','finale'];
  var row39=['','moyenne'];
  for(var i=0;i<prels.length;i++){
    var cond=getConditionsForPrel(m,prels[i].sub);
    row37.push(cond&&cond.humiditeI?cond.humiditeI:'');row37.push('');
    row38.push(cond&&cond.humiditeF?cond.humiditeF:'');row38.push('');
    row39.push('');row39.push('');
  }
  aoa.push(row37);aoa.push(row38);aoa.push(row39);
  // Ligne 40 : Pression saturation (vide)
  var row40=['pression de saturation de la vapeur d\'eau (Pa)',''];
  for(var i=0;i<prels.length;i++){row40.push('');row40.push('');}
  aoa.push(row40);
  // Ligne 41 : Volume prélevé
  aoa.push(['Volume prélevé','']);
  // Ligne 42 : Prélèvement n°
  var row42=['Prélèvement n°',''];
  for(var i=0;i<prels.length;i++){row42.push(i+1);row42.push('');}
  aoa.push(row42);
  // Ligne 43 : Vérification débit
  aoa.push(['Volume prélevé avec pompe - Vérification du débit','']);
  // Lignes 44-45 : Débits I/F
  var row44=['débit initial de la pompe (L/min)',''];
  var row45=['débit final de la pompe (L/min)',''];
  for(var i=0;i<prels.length;i++){
    var ad=prels[i].sub.agentData?prels[i].sub.agentData[prels[i].agent]:null;
    row44.push(ad&&ad.debitInitial?ad.debitInitial:'');row44.push('');
    row45.push(ad&&ad.debitFinal?ad.debitFinal:'');row45.push('');
  }
  aoa.push(row44);aoa.push(row45);
  // Lignes 46-62 : débit moyen, volume, vérification DLS, labo (vides)
  for(var lnum=46;lnum<=62;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 63 : RESULTATS
  aoa.push(['RESULTATS','']);
  // Lignes 64-69 : GEH, type VLEP, opérateur, agent, réf, date
  var row64=['GEH',''];var row65=['type de VLEP',''];var row66=['opérateur',''];
  var row67=['agent chimique',''];var row68=['référence de l\'échantillon',''];var row69=['date du prélèvement',''];
  for(var i=0;i<prels.length;i++){
    var p=prels[i];
    row64.push(p.gehNum+' - '+p.gehName);row64.push('');
    row65.push(p.type);row65.push('');
    row66.push(p.sub.operateur||'');row66.push('');
    row67.push(p.agent);row67.push('');
    var ad=p.sub.agentData?p.sub.agentData[p.agent]:null;
    row68.push(ad&&ad.refEchantillon?ad.refEchantillon:'');row68.push('');
    row69.push(formatDateFR(p.sub.date)||'');row69.push('');
  }
  aoa.push(row64);aoa.push(row65);aoa.push(row66);aoa.push(row67);aoa.push(row68);aoa.push(row69);
  // Lignes 70-78 : Résultats, EPI (vides)
  for(var lnum=70;lnum<=78;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Ligne 79 : Validation
  aoa.push(['Validation des prélèvements','']);
  // Ligne 80 : Variation débit
  var row80=['Variation du débit avant et après prélèvement (< 5%)',''];
  for(var i=0;i<prels.length;i++){row80.push('');row80.push('');}
  aoa.push(row80);
  // Ligne 81 : Référence témoin
  var row81=['référence du témoin',''];
  for(var i=0;i<prels.length;i++){row81.push(getBlancForAgent(m,prels[i].agent));row81.push('');}
  aoa.push(row81);
  // Lignes 82-84 : masse, concentration, critère (vides)
  for(var lnum=82;lnum<=84;lnum++){
    var rowE=['',''];for(var i=0;i<prels.length;i++){rowE.push('');rowE.push('');}aoa.push(rowE);
  }
  // Créer la feuille
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  if(!ws['!merges'])ws['!merges']=[];
  // Fusions en-tête
  ws['!merges'].push({s:{r:0,c:1},e:{r:0,c:13}});
  ws['!merges'].push({s:{r:1,c:1},e:{r:1,c:13}});
  ws['!merges'].push({s:{r:3,c:2},e:{r:3,c:13}});
  ws['!merges'].push({s:{r:4,c:2},e:{r:4,c:13}});
  // Fusions A-B (n° identification)
  ws['!merges'].push({s:{r:5,c:0},e:{r:6,c:0}});
  // Fusions plages A-B
  for(var plageNum=0;plageNum<5;plageNum++){
    ws['!merges'].push({s:{r:11+plageNum*2,c:0},e:{r:12+plageNum*2,c:0}});
  }
  // Fusions conditions A-B
  ws['!merges'].push({s:{r:31,c:0},e:{r:33,c:0}});
  ws['!merges'].push({s:{r:34,c:0},e:{r:36,c:0}});
  ws['!merges'].push({s:{r:37,c:0},e:{r:39,c:0}});
  // Fusions colonnes prélèvements
  var fuseRows=[3,4,5,6,7,9,10,30,31,32,33,34,35,36,37,38,39,40,42,44,45,63,64,65,66,67,68,69,79,80,81];
  for(var ri=0;ri<fuseRows.length;ri++){
    var row=fuseRows[ri];
    for(var i=0;i<prels.length;i++){
      ws['!merges'].push({s:{r:row,c:2+i*2},e:{r:row,c:3+i*2}});
    }
  }
  // Fusions plages horaires colonnes
  for(var plageNum=0;plageNum<5;plageNum++){
    for(var i=0;i<prels.length;i++){
      ws['!merges'].push({s:{r:11+plageNum*2,c:2+i*2},e:{r:11+plageNum*2,c:3+i*2}});
      ws['!merges'].push({s:{r:12+plageNum*2,c:2+i*2},e:{r:12+plageNum*2,c:3+i*2}});
    }
  }
  // Largeurs
  var cols=[{wch:50},{wch:20}];
  for(var i=0;i<prels.length;i++){cols.push({wch:15});cols.push({wch:15});}
  ws['!cols']=cols;
  return ws;
}

// ===== FEUILLE ÉCHANTILLONS =====
function createEchantillonsSheet(m,regPrels,nonRegPrels){
  var aoa=[];
  aoa.push(['Nom de l\'échantillon','Date','Numéro de lot','Type d\'échantillon','Priorité air','Matrice']);
  var allPrels=regPrels.concat(nonRegPrels);
  var seenRefs={};
  allPrels.forEach(function(p){
    var ad=p.sub.agentData?p.sub.agentData[p.agent]:null;
    var ref=ad&&ad.refEchantillon?ad.refEchantillon:'';
    if(!ref||seenRefs[ref])return;
    seenRefs[ref]=true;
    aoa.push([ref,p.sub.date?formatDateFR(p.sub.date):'','','Echantillon','Standard (J0+9)','Air des lieux de Travail']);
  });
  if(m.blancs&&m.blancs.length>0){
    m.blancs.forEach(function(b){
      var ref=b.ref||'';
      if(!ref||seenRefs[ref])return;
      seenRefs[ref]=true;
      aoa.push([ref,b.date?formatDateFR(b.date):'','','Blanc','Standard (J0+9)','Air des lieux de Travail']);
    });
  }
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:25},{wch:12},{wch:15},{wch:18},{wch:18},{wch:30}];
  return ws;
}

// ===== FEUILLE RELEVÉ D'ACTIVITÉ =====
function createActiviteSheet(m){
  var aoa=[];
  aoa.push(['Relevé d\'activité - '+(m.clientSite||'')]);
  aoa.push(['Préleveur: '+(m.preleveur||''),'','Débitmètre: '+(m.debitmetre||'')]);
  aoa.push([]);
  aoa.push(['GEH','Opérateur','Agent(s) chimique(s)','Type','Date','Plage horaire','Durée','Observations']);
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(sb){
      var agentNames=p.agents.map(function(a){return a.name;}).join(', ');
      var plagesStr='';var dureeTotale=0;
      if(sb.plages){
        plagesStr=sb.plages.filter(function(pl){return pl.debut||pl.fin;}).map(function(pl){return(pl.debut||'?')+' - '+(pl.fin||'?');}).join(' / ');
        sb.plages.forEach(function(pl){
          if(pl.debut&&pl.fin){var d=pl.debut.split(':'),f=pl.fin.split(':');var diff=(parseInt(f[0])*60+parseInt(f[1]))-(parseInt(d[0])*60+parseInt(d[1]));if(diff>0)dureeTotale+=diff;}
        });
      }
      var dureeStr=dureeTotale>0?(Math.floor(dureeTotale/60)+'h'+(dureeTotale%60<10?'0':'')+(dureeTotale%60)):'';
      aoa.push([p.gehNum+' - '+(p.gehName||''),sb.operateur||'',agentNames,p.type+(p.isReglementaire?' (Régl.)':' (Non-régl.)'),formatDateFR(sb.date)||'',plagesStr,dureeStr,sb.observations||'']);
    });
  });
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  if(!ws['!merges'])ws['!merges']=[];
  ws['!merges'].push({s:{r:0,c:0},e:{r:0,c:7}});
  ws['!cols']=[{wch:25},{wch:18},{wch:30},{wch:15},{wch:12},{wch:25},{wch:10},{wch:30}];
  return ws;
}

// ═══════════════════════════════════════════════════════════
// EXPORT / IMPORT JSON
// ═══════════════════════════════════════════════════════════

function exportMissionJSON(id){
  var m=state.missions.find(function(x){return x.id===id;});
  if(!m){alert('Mission introuvable');return;}
  var exportData={_format:'VLEP_Mission_JSON',_version:'3.8',_exportDate:new Date().toISOString(),_author:'Quentin THOMAS',mission:JSON.parse(JSON.stringify(m))};
  var json=JSON.stringify(exportData,null,2);
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  var safeName=(m.clientSite||'mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç _-]/g,'').replace(/\s+/g,'_').substring(0,40);
  a.href=url;
  a.download='VLEP_Mission_'+safeName+'_'+String(m.id).slice(-6)+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImportMission(){
  var input=document.getElementById('import-mission-input');
  if(!input){
    input=document.createElement('input');
    input.type='file';input.accept='.json';input.style.display='none';
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
  reader.onload=function(e){importMissionFromText(e.target.result);};
  reader.readAsText(file);
}

function importMissionFromText(text){
  try{
    var data=JSON.parse(text);
    var mission=null;
    if(data._format==='VLEP_Mission_JSON'&&data.mission)mission=data.mission;
    else if(data._f==='VLEP'&&data.m)mission=data.m;
    else if(data.id&&data.gehs&&data.agents!==undefined)mission=data;
    else{alert('Format non reconnu.');return;}
    var exists=state.missions.some(function(m){return m.id===mission.id;});
    if(exists){
      if(!confirm('Une mission avec le même identifiant existe déjà.\n\nVoulez-vous l\'écraser ?'))return;
      state.missions=state.missions.filter(function(m){return m.id!==mission.id;});
    }
    state.missions.push(mission);
    saveData('vlep_missions_v3',state.missions);
    repairMissions();
    state.showModal=null;
    render();
    alert('Mission importée avec succès !');
  }catch(err){
    alert('Erreur lors de l\'import :\n\n'+err.message);
  }
}
