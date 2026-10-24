// echantillons.js - Gestion échantillons et conditions ambiantes
// © 2025 Quentin THOMAS
// Liste échantillons, blancs, conditions ambiantes

function renderConditions(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-mission';render();return'';}
  var h='<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.thermometer+' Conditions ambiantes</h2><p class="subtitle">Par jour de prélèvement</p>';
  var manquants=joursSansConditions(m);
  if(manquants.length)h+='<button class="btn btn-primary mt-12" onclick="ajouterJoursConditions();">'+ICONS.plus+' Ajouter '+(manquants.length>1?'les jours de prélèvement':'le jour de prélèvement')+' ('+manquants.map(function(d){return formatDateFR(d).slice(0,5);}).join(', ')+')</button>';
  h+='<button class="btn btn-gray'+(manquants.length?'':' mt-12')+'" onclick="addCondition();">'+ICONS.plus+' Ajouter un autre jour</button></div>';
  if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
  if(m.conditionsAmbiantes.length===0)h+='<div class="empty-state"><p>Aucune condition saisie</p></div>';
  else m.conditionsAmbiantes.forEach(function(c,i){
    h+='<div class="condition-card">';
    h+='<div class="condition-date"><input type="date" class="input" style="margin:0;flex:1;max-width:160px;" value="'+(c.date||'')+'" onchange="updateCond('+i+',\'date\',this.value);"><button class="btn btn-danger btn-icon" onclick="deleteCond('+i+');">'+ICONS.trash+'</button></div>';
    
    // Température
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.thermometer+' Température (°C)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="decimal" class="condition-input condition-input-i" value="'+escapeHtml(c.tempI||'')+'" placeholder="I" onchange="updateCond('+i+',\'tempI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="decimal" class="condition-input condition-input-f" value="'+escapeHtml(c.tempF||'')+'" placeholder="F" onchange="updateCond('+i+',\'tempF\',this.value);"></div></div></div>';
    
    // Pression
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.database+' Pression (hPa)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="decimal" class="condition-input condition-input-i" value="'+escapeHtml(c.pressionI||'')+'" placeholder="I" onchange="updateCond('+i+',\'pressionI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="decimal" class="condition-input condition-input-f" value="'+escapeHtml(c.pressionF||'')+'" placeholder="F" onchange="updateCond('+i+',\'pressionF\',this.value);"></div></div></div>';
    
    // Humidité
    h+='<div class="condition-row"><span class="condition-label">'+ICONS.droplet+' Humidité (%)</span><div class="condition-inputs"><div style="flex:1;"><div class="condition-input-label">Initial</div><input type="text" inputmode="decimal" class="condition-input condition-input-i" value="'+escapeHtml(c.humiditeI||'')+'" placeholder="I" onchange="updateCond('+i+',\'humiditeI\',this.value);"></div><div style="flex:1;"><div class="condition-input-label">Final</div><input type="text" inputmode="decimal" class="condition-input condition-input-f" value="'+escapeHtml(c.humiditeF||'')+'" placeholder="F" onchange="updateCond('+i+',\'humiditeF\',this.value);"></div></div></div>';
    
    h+='</div>';
  });
  return h;
}

// Jours de prélèvement (dates saisies, non réalisés exclus) sans conditions ambiantes, dans l'ordre
function joursSansConditions(m){
  var j=[];
  (m.prelevements||[]).forEach(function(p){(p.subPrelevements||[]).forEach(function(sb){
    if(!sb.nonRealise&&sb.date&&j.indexOf(sb.date)===-1&&!getConditionsForPrel(m,sb))j.push(sb.date);
  });});
  return j.sort();
}
function ajouterJoursConditions(){
  var m=getCurrentMission();if(!m)return;
  if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
  joursSansConditions(m).forEach(function(d){m.conditionsAmbiantes.push({date:d,tempI:'',tempF:'',pressionI:'',pressionF:'',humiditeI:'',humiditeF:''});});
  m.conditionsAmbiantes.sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
  saveData('vlep_missions_v3',state.missions);
  render();
}

// Jour hors prélèvements saisis : la date du jour s'il n'est pas déjà dans la liste, sinon à choisir
function addCondition(){
  var m=getCurrentMission();if(!m)return;
  if(!m.conditionsAmbiantes)m.conditionsAmbiantes=[];
  var auj=getTodayDate(),deja=m.conditionsAmbiantes.some(function(c){return c.date===auj;});
  m.conditionsAmbiantes.push({date:deja?'':auj,tempI:'',tempF:'',pressionI:'',pressionF:'',humiditeI:'',humiditeF:''});
  saveData('vlep_missions_v3',state.missions);
  render();
}

function updateCond(i,f,v){
  var m=getCurrentMission();
  if(m&&m.conditionsAmbiantes[i]){m.conditionsAmbiantes[i][f]=v;saveData('vlep_missions_v3',state.missions);}
}

function deleteCond(i){
  var m=getCurrentMission();
  if(m&&confirm('Supprimer ?')){m.conditionsAmbiantes.splice(i,1);saveData('vlep_missions_v3',state.missions);render();}
}

// Liste des échantillons et blancs (réf., agent, date, lot, blanc associé). La commande au laboratoire se fait
// par la feuille de calcul (onglet Eurofins) : pas de code analytique ici.
function renderListeEchantillons(){
  var m=getCurrentMission();
  if(!m){state.view='terrain-mission';render();return'';}
  if(!m.blancs)m.blancs=[];
  
  var h='<button class="back-btn" onclick="state.view=\'terrain-mission\';render();">'+ICONS.arrowLeft+' Mission</button><div class="card"><h2>'+ICONS.list+' Liste échantillons</h2><p class="subtitle">'+escapeHtml(m.clientSite)+'</p></div>';
  h+='<div class="row mb-12"><button class="btn btn-gray" onclick="state.showModal=\'addBlanc\';state.blancAgentSearch=\'\';state.blancAgents=[];if(!state.blancDate)state.blancDate=getTodayDate();render();">+ Blanc terrain</button><button class="btn btn-gray" onclick="ouvrirLotEnMasse();">N° de lot…</button>'+(typeof FC_MODELE_DISPO!=='undefined'&&FC_MODELE_DISPO===true?'<button class="btn btn-primary" onclick="exportFeuilleCalcul();">'+ICONS.sheet+' Feuille de calcul</button>':'')+'</div>';
  h+='<div class="row mb-12"><span style="font-size:13px;margin-right:8px;">Trier par :</span><button class="btn btn-small '+(state.echantillonSort==='date'?'btn-blue':'btn-gray')+'" onclick="state.echantillonSort=\'date\';render();">Date</button><button class="btn btn-small '+(state.echantillonSort==='agent'?'btn-blue':'btn-gray')+'" onclick="state.echantillonSort=\'agent\';render();">Agent</button></div>';
  
  // une ligne par référence (agents d'un même support réunis)
  var byRef={};
  m.prelevements.forEach(function(p){
    p.subPrelevements.filter(function(s0){return !s0.nonRealise;}).reduce(function(acc,s0){return acc.concat(expandSubSupports(s0));},[]).forEach(function(sb){
      p.agents.forEach(function(a){
        var d=sb.agentData?sb.agentData[a.name]:null;
        if(d&&d.refEchantillon){
          var ref=d.refEchantillon;
          if(!byRef[ref]){
            byRef[ref]={ref:ref,agents:[],date:sb.date||'',type:'Échantillon',isBlanc:false,lot:d.lot||'',blanc:''};
          }
          byRef[ref].agents.push({name:a.name});
          var bl=findBlancForSupport(m,sb,agentsMemeRef(p,sb,a.name));
          if(bl&&!byRef[ref].blanc)byRef[ref].blanc=bl.ref||'(sans réf.)';
        }
      });
    });
  });
  
  // Blancs
  m.blancs.forEach(function(b,bi){
    var ref=b.ref;
    // Blanc sans référence (ancienne saisie, import) : ligne à part, jamais fusionné avec un autre
    if(!ref||!String(ref).trim()){
      byRef['_blanc_sans_ref_'+bi]={ref:'(sans réf.)',agents:b.agents.map(function(an){return {name:an};}),date:b.date||'',type:'Blanc',isBlanc:true,lot:b.lot||''};
      return;
    }
    if(!byRef[ref]){
      byRef[ref]={ref:ref,agents:[],date:b.date||'',type:'Blanc',isBlanc:true,lot:b.lot||''};
    }
    b.agents.forEach(function(an){byRef[ref].agents.push({name:an});});
  });
  
  // Convertir en liste
  var l=Object.values(byRef);
  
  if(state.echantillonSort==='agent'){
    l.sort(function(a,b){
      var aName=a.agents[0]?a.agents[0].name:'';
      var bName=b.agents[0]?b.agents[0].name:'';
      return aName.localeCompare(bName);
    });
  }else{
    l.sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  }
  
  if(l.length===0)h+='<div class="empty-state"><p>Aucun échantillon</p></div>';
  else{
    h+='<div class="card" style="padding:8px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><tr style="background:#f3f4f6;"><th style="padding:6px;text-align:left;">Réf.</th><th style="padding:6px;text-align:left;">Agent(s) chimique(s)</th><th style="padding:6px;">Date</th><th style="padding:6px;">Lot</th><th style="padding:6px;">Blanc associé</th><th style="padding:6px;">Type</th></tr>';
    l.forEach(function(x){
      var bg=x.isBlanc?'background:#fef3c7;':'';
      var agentNames=x.agents.map(function(a){return a.name;}).join(', ');
      h+='<tr style="border-bottom:1px solid #e5e7eb;'+bg+'"><td style="padding:6px;font-weight:600;">'+escapeHtml(x.ref)+'</td><td style="padding:6px;">'+escapeHtml(agentNames)+'</td><td style="padding:6px;text-align:center;">'+escapeHtml(formatDateFR(x.date))+'</td><td style="padding:6px;text-align:center;">'+escapeHtml(x.lot||'-')+'</td><td style="padding:6px;text-align:center;">'+(x.isBlanc?'':escapeHtml(x.blanc||'-'))+'</td><td style="padding:6px;text-align:center;"><span style="font-size:10px;padding:2px 6px;border-radius:4px;'+(x.isBlanc?'background:#f59e0b;color:white;':'background:#e5e7eb;')+'">'+x.type+'</span></td></tr>';
    });
    h+='</table></div>';
  }
  
  // Gravimétrie : 2 blancs par lot
  var gravi=blancsGraviManquants(m);
  if(gravi.length){
    h+='<div class="info-box info-box-warning mt-12"><p><strong>Gravimétrie : 2 blancs attendus par lot</strong></p>';
    gravi.forEach(function(g,i){
      h+='<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;"><span style="flex:1;min-width:0;">« '+escapeHtml(g.agent)+' »'+(g.lot?', lot '+escapeHtml(g.lot):', sans n° de lot')+' : '+g.blancs.length+' blanc sur 2</span>';
      h+='<button class="btn btn-small btn-primary" style="white-space:nowrap;" onclick="ajouterBlancDuLot('+i+');">'+(g.blancs.length?'Ajouter le 2e blanc du lot':'Ajouter un blanc du lot')+'</button></div>';
    });
    h+='</div>';
  }

  if(m.blancs.length>0){
    h+='<div class="section-title mt-12">Blancs terrain ('+m.blancs.length+')</div>';
    m.blancs.forEach(function(b,i){
      h+='<div class="card" style="padding:10px;background:#fef3c7;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>'+escapeHtml(b.ref||'(sans réf.)')+'</strong><div style="font-size:12px;color:#666;">'+escapeHtml(b.agents.join(', '))+' • '+escapeHtml(b.date?formatDateFR(b.date):'Sans date')+(b.lot?' • Lot '+escapeHtml(b.lot):' • Sans n° de lot')+'</div>'+(function(){var n=echantillonsDuBlanc(m,b);return '<div style="font-size:12px;margin-top:2px;color:'+(n?'#166534':'#b45309')+';">'+(n?'Réf. reportée sur '+n+' échantillon'+(n>1?'s':'')+' dans la feuille de calcul':'Aucun échantillon du même agent et du même n° de lot : réf. non reportée')+'</div>';})()+'</div><button class="btn btn-danger btn-small" onclick="deleteBlanc('+i+');">'+ICONS.trash+'</button></div></div>';
    });
  }
  
  if(state.showModal==='addBlanc')h+=renderAddBlancModal();
  if(state.showModal==='lotEnMasse')h+=renderLotEnMasseModal(m);
  return h;
}

// ═══ N° de lot en une fois sur plusieurs échantillons et/ou blancs (évite de le ressaisir sous chaque réf.) ═══
// Échantillons = réf. distinctes (une réf. = un support : tous les agents qui la portent reçoivent le lot).
function lignesLot(m){
  var l=[],vus={};
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(s0){
      if(s0.nonRealise)return;
      expandSubSupports(s0).forEach(function(sb){
        p.agents.forEach(function(a){
          var d=sb.agentData&&sb.agentData[a.name];
          var ref=d&&String(d.refEchantillon||'').trim();
          if(!ref)return;
          if(vus[ref]){if(vus[ref].agents.indexOf(a.name)===-1)vus[ref].agents.push(a.name);return;}
          vus[ref]={cle:'e:'+ref,ref:ref,agents:[a.name],date:sb.date||'',lot:d.lot||'',blanc:false};
          l.push(vus[ref]);
        });
      });
    });
  });
  l.sort(function(a,b){return (a.agents[0]||'').localeCompare(b.agents[0]||'')||(a.date||'').localeCompare(b.date||'')||a.ref.localeCompare(b.ref);});
  (m.blancs||[]).forEach(function(b,i){l.push({cle:'b:'+i,ref:b.ref||'(sans réf.)',agents:b.agents||[],date:b.date||'',lot:b.lot||'',blanc:true});});
  return l;
}

function ouvrirLotEnMasse(){
  state.lotMasse={lot:'',sel:{}};
  state.showModal='lotEnMasse';
  render();
}

function renderLotEnMasseModal(m){
  var lm=state.lotMasse||(state.lotMasse={lot:'',sel:{}});
  var l=lignesLot(m),agents=[];
  l.forEach(function(x){x.agents.forEach(function(a){if(agents.indexOf(a)===-1)agents.push(a);});});
  var n=l.filter(function(x){return lm.sel[x.cle];}).length;
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>N° de lot</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<p class="subtitle" style="margin-bottom:8px;">Saisir le lot une fois, cocher les échantillons et les blancs de ce lot, puis appliquer.</p>';
  h+='<div class="field"><label class="label">N° de lot</label>'+lotsDatalist(m)+'<input type="text" class="input" id="lot-masse" list="lots-mission" autocomplete="off" value="'+escapeHtml(lm.lot)+'" placeholder="Lot des supports" oninput="state.lotMasse.lot=this.value;"></div>';
  if(!l.length)h+='<div class="empty-state"><p>Aucun échantillon ni blanc avec une référence</p></div>';
  else{
    var chip=function(label,args){return '<button class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="lotMasseCocher('+args+');">'+label+'</button>';};
    h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
    h+=chip('Tout','\'tout\'')+chip('Sans lot','\'sanslot\'');
    agents.forEach(function(a){h+=chip(escapeHtml(a),'\'agent\',\''+escapeJs(a)+'\'');});
    h+=chip('Aucun','\'aucun\'')+'</div>';
    h+='<div style="max-height:45vh;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:10px;">';
    l.forEach(function(x){
      h+='<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border-subtle);font-size:12px;cursor:pointer;'+(x.blanc?'background:#fef3c7;':'')+'">';
      h+='<input type="checkbox" '+(lm.sel[x.cle]?'checked ':'')+'onchange="state.lotMasse.sel[\''+escapeJs(x.cle)+'\']=this.checked;render();">';
      h+='<span style="flex:1;min-width:0;"><strong>'+escapeHtml(x.ref)+'</strong>'+(x.blanc?' <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#f59e0b;color:white;">Blanc</span>':'')+'<br><span style="color:var(--text-muted);">'+escapeHtml(x.agents.join(', '))+(x.date?' · '+escapeHtml(formatDateFR(x.date)):'')+'</span></span>';
      h+='<span style="font-size:11px;color:'+(x.lot?'var(--text-dark)':'var(--text-muted)')+';white-space:nowrap;">'+(x.lot?'Lot '+escapeHtml(x.lot):'sans lot')+'</span></label>';
    });
    h+='</div>';
  }
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-success" onclick="appliquerLotEnMasse();"'+(n?'':' disabled')+'>Appliquer à '+n+'</button></div></div></div>';
  return h;
}

function lotMasseCocher(mode,agent){
  var m=getCurrentMission();if(!m)return;
  var sel={};
  // un raccourci d'agent s'ajoute à la sélection en cours
  if(mode==='agent')Object.keys(state.lotMasse.sel).forEach(function(k){if(state.lotMasse.sel[k])sel[k]=true;});
  if(mode!=='aucun')lignesLot(m).forEach(function(x){
    if(mode==='tout'||(mode==='sanslot'&&!x.lot)||(mode==='agent'&&x.agents.indexOf(agent)!==-1))sel[x.cle]=true;
  });
  state.lotMasse.sel=sel;
  render();
}

function appliquerLotEnMasse(){
  var m=getCurrentMission();if(!m)return;
  var lm=state.lotMasse,lot=(lm.lot||'').trim();
  if(!lot&&!confirm('Aucun n° de lot saisi : effacer le lot des éléments cochés ?'))return;
  appliquerLot(m,lm.sel,lot);
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;state.lotMasse=null;
  render();
}

// Écrit le lot sur les échantillons cochés (toutes les données d'agent qui portent la réf., supports fractionnés
// compris) et sur les blancs cochés. Renvoie le nombre d'éléments cochés.
function appliquerLot(m,sel,lot){
  var refs={},n=0;
  Object.keys(sel).forEach(function(k){
    if(!sel[k])return;
    n++;
    if(k.indexOf('e:')===0)refs[k.slice(2)]=true;
    else{var b=(m.blancs||[])[+k.slice(2)];if(b)b.lot=lot;}
  });
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(s0){
      expandSubSupports(s0).forEach(function(sb){
        Object.keys(sb.agentData||{}).forEach(function(an){
          var d=sb.agentData[an];
          if(d&&refs[String(d.refEchantillon||'').trim()])d.lot=lot;
        });
      });
    });
  });
  return n;
}

// Fenêtre « Blanc terrain »
function renderAddBlancModal(){
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>+ Blanc terrain</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<div class="field"><label class="label">Référence échantillon *</label><input type="text" class="input" id="blanc-ref" placeholder="Ex: BT-001" value="'+escapeHtml(state.blancRef||'')+'" oninput="state.blancRef=this.value;"></div>';
  h+='<div class="field"><label class="label">Date</label><input type="date" class="input" id="blanc-date" value="'+(state.blancDate||'')+'" oninput="state.blancDate=this.value;"></div>';
  h+='<div class="field"><label class="label">N° de lot</label>'+lotsDatalist(getCurrentMission()||{})+'<input type="text" class="input" id="blanc-lot" list="lots-mission" autocomplete="off" placeholder="Lot des supports" value="'+escapeHtml(state.blancLot||'')+'" oninput="state.blancLot=this.value;"></div>';
  h+='<div class="blanc-pense-bete">La réf. du blanc n’est reportée dans la feuille de calcul (« réf. du témoin ») que sur les échantillons du <strong>même agent chimique</strong> et du <strong>même n° de lot</strong>, saisi sous la réf. de chaque échantillon. Plusieurs agents sur le même support : un seul d’entre eux suffit.</div>';
  // Agents de la mission en un toucher ; supports à plusieurs agents (agents fusionnés) d'un coup
  var ch=blancChoixMission(getCurrentMission()||{}),sel=state.blancAgents||[];
  if(ch.agents.length){
    h+='<div class="field"><label class="label">Agent(s) chimique(s) de la mission</label>';
    if(ch.supports.length){
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';
      ch.supports.forEach(function(s,i){
        var tous=s.every(function(a){return sel.indexOf(a)!==-1;});
        h+='<button type="button" class="btn btn-small '+(tous?'btn-primary':'btn-gray')+'" style="text-align:left;" onclick="ajouterBlancSupport('+i+');">Tout le support : '+escapeHtml(s.join(' + '))+'</button>';
      });
      h+='</div>';
    }
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    ch.agents.forEach(function(a,i){
      h+='<button type="button" class="btn btn-small '+(sel.indexOf(a)!==-1?'btn-primary':'btn-gray')+'" style="text-align:left;" onclick="basculerBlancAgent('+i+');">'+(sel.indexOf(a)!==-1?'✓ ':'')+escapeHtml(a)+'</button>';
    });
    h+='</div></div>';
  }
  h+='<div class="field"><label class="label">'+(ch.agents.length?'Autre agent (recherche dans la base)':'Agent(s) chimique(s)')+'</label><input type="text" class="input" id="blanc-agent-search" placeholder="Rechercher..." value="'+escapeHtml(state.blancAgentSearch||'')+'" oninput="handleBlancAgentSearch(this.value);"></div>';
  h+='<div id="blanc-search-results">';
  if(state.blancAgentSearch&&state.blancAgentSearch.length>=2){
    var r=searchAgentsDB(state.blancAgentSearch).slice(0,6);
    if(r.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      r.forEach(function(x){
        var already=state.blancAgents&&state.blancAgents.indexOf(x)!==-1;
        h+='<div class="search-result-item" style="'+(already?'opacity:0.5;':'')+'" onmousedown="event.preventDefault();" onclick="'+(already?'':'addBlancAgent(\''+escapeJs(x)+'\');')+'">'+escapeHtml(x)+(already?' ✓':'')+'</div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  if(state.blancAgents&&state.blancAgents.length>0){
    h+='<div class="info-box mt-8"><strong>Agents sélectionnés :</strong><div style="margin-top:4px;">';
    state.blancAgents.forEach(function(a,i){
      h+='<span style="display:inline-block;background:#e5e7eb;padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;">'+escapeHtml(a)+' <span style="cursor:pointer;color:#ef4444;" onclick="removeBlancAgent('+i+');">×</span></span>';
    });
    h+='</div></div>';
    // Avertissements si débits ou codes prétraitement différents
    var blancWarnings=checkBlancWarnings(state.blancAgents);
    if(blancWarnings.length>0){
      blancWarnings.forEach(function(w){
        h+='<div class="blanc-warning">'+escapeHtml(w)+'</div>';
      });
    }
  }
  h+='<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button><button class="btn btn-success" onclick="saveBlanc();">Ajouter</button></div></div></div>';
  return h;
}

// Recherche d'agent du blanc : seuls les résultats sont redessinés (le champ garde le focus)
function handleBlancAgentSearch(value){
  state.blancAgentSearch=value;
  updateBlancSearchResults();
}

function updateBlancSearchResults(){
  var container=document.getElementById('blanc-search-results');
  if(!container)return;
  var h='';
  if(state.blancAgentSearch&&state.blancAgentSearch.length>=2){
    var r=searchAgentsDB(state.blancAgentSearch).slice(0,6);
    if(r.length>0){
      h+='<div class="search-results" style="max-height:120px;overflow-y:auto;">';
      r.forEach(function(x){
        var already=state.blancAgents&&state.blancAgents.indexOf(x)!==-1;
        h+='<div class="search-result-item" style="'+(already?'opacity:0.5;':'')+'" onmousedown="event.preventDefault();" onclick="'+(already?'':'addBlancAgent(\''+escapeJs(x)+'\');')+'">'+escapeHtml(x)+(already?' ✓':'')+'</div>';
      });
      h+='</div>';
    }
  }
  container.innerHTML=h;
}

// Agents de la mission pouvant avoir un blanc (hors analyseurs) et supports portant plusieurs agents (même réf.)
function blancChoixMission(m){
  var agents=[],supports=[],vus={};
  (m.prelevements||[]).forEach(function(p){
    (p.agents||[]).forEach(function(a){
      if(typeof isAnalyseurAgent==='function'&&isAnalyseurAgent(a.name))return;
      if(agents.indexOf(a.name)===-1)agents.push(a.name);
    });
    (p.subPrelevements||[]).forEach(function(s0){
      if(s0.nonRealise)return;
      expandSubSupports(s0).forEach(function(sb){
        (p.agents||[]).forEach(function(a){
          var g=agentsMemeRef(p,sb,a.name).filter(function(x){return agents.indexOf(x)!==-1;});
          var k=g.slice().sort().join('|');
          if(g.length>1&&!vus[k]){vus[k]=true;supports.push(g);}
        });
      });
    });
  });
  return {agents:agents,supports:supports};
}
function basculerBlancAgent(i){
  var a=blancChoixMission(getCurrentMission()||{}).agents[i];if(!a)return;
  if(!state.blancAgents)state.blancAgents=[];
  var k=state.blancAgents.indexOf(a);
  if(k===-1)state.blancAgents.push(a);else state.blancAgents.splice(k,1);
  render();
}
function ajouterBlancSupport(i){
  var s=blancChoixMission(getCurrentMission()||{}).supports[i];if(!s)return;
  if(!state.blancAgents)state.blancAgents=[];
  s.forEach(function(a){if(state.blancAgents.indexOf(a)===-1)state.blancAgents.push(a);});
  render();
}

function addBlancAgent(name){
  if(!state.blancAgents)state.blancAgents=[];
  if(state.blancAgents.indexOf(name)===-1)state.blancAgents.push(name);
  state.blancAgentSearch='';
  render();
}

function removeBlancAgent(i){
  if(state.blancAgents)state.blancAgents.splice(i,1);
  render();
}

function checkBlancWarnings(agents){
  if(!agents||agents.length<=1)return[];
  var warnings=[];
  var debits={};
  var codesPretrait={};
  agents.forEach(function(an){
    var ag=getAgentFromDB(an);
    if(ag){
      var d8=ag['débit max  8h (L/min)']||ag['débit max 8h (L/min)']||'';
      var cp=ag['Code prétraitement']||'';
      if(d8)debits[d8]=(debits[d8]||[]).concat([an]);
      if(cp)codesPretrait[cp]=(codesPretrait[cp]||[]).concat([an]);
    }
  });
  if(Object.keys(debits).length>1){
    warnings.push('Débits différents : '+Object.keys(debits).map(function(d){return d+' L/min ('+debits[d].join(', ')+')';}).join(' vs '));
  }
  if(Object.keys(codesPretrait).length>1){
    warnings.push('Codes prétraitement différents : '+Object.keys(codesPretrait).map(function(c){return c+' ('+codesPretrait[c].join(', ')+')';}).join(' vs '));
  }
  return warnings;
}

function saveBlanc(){
  var ref=(state.blancRef||'').trim();
  var date=state.blancDate||'';
  if(!ref){alert('Saisissez une référence');return;}
  if(!state.blancAgents||state.blancAgents.length===0){alert('Sélectionnez au moins un agent');return;}
  var m=getCurrentMission();if(!m)return;
  if(!m.blancs)m.blancs=[];
  m.blancs.push({ref:ref,date:date,lot:(state.blancLot||'').trim(),agents:state.blancAgents.slice()});
  saveData('vlep_missions_v3',state.missions);
  state.showModal=null;
  state.blancAgents=[];
  state.blancRef='';
  state.blancDate='';
  state.blancLot='';
  render();
}

function deleteBlanc(i){
  var m=getCurrentMission();
  if(!m||!confirm('Supprimer ce blanc ?'))return;
  m.blancs.splice(i,1);
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ---------- Utilitaires communs (feuille de calcul, Word, Véolia) ----------

// Fonction helper pour récupérer les conditions ambiantes d'un sous-prélèvement
function getConditionsForPrel(m,subPrel){
  if(!m.conditionsAmbiantes||m.conditionsAmbiantes.length===0||!subPrel.date)return null;
  // Uniquement les conditions du jour du prélèvement : jamais celles d'un autre jour
  for(var i=0;i<m.conditionsAmbiantes.length;i++){
    if(m.conditionsAmbiantes[i].date===subPrel.date)return m.conditionsAmbiantes[i];
  }
  return null;
}

// Blanc terrain d'un échantillon : même agent chimique ET même n° de lot que l'échantillon (lots comparés sans
// espaces ni majuscules ; un échantillon sans lot ne va qu'avec un blanc sans lot).
// Lot renseigné : le blanc du jour s'il y en a un, sinon le premier blanc de ce lot (un blanc pour le lot).
// Sans lot (anciennes saisies) : 1) blanc du jour ; 2) blanc sans date ; 3) blanc unique de l'agent sur la mission.
// Plusieurs blancs, tous d'autres jours : aucun (on ne devine pas).
// Réf. d'échantillon -> supports physiques qui la portent. Un co-prélèvement (agents d'un même support) partage
// normalement sa réf. : il compte pour un seul support. Une réf. sur plusieurs supports (ou sur un échantillon et
// un blanc) est une erreur de saisie : la commande Eurofins dédoublonne les réf., un seul échantillon partirait.
// Analyseurs exclus (n° d'essai, rien au laboratoire). Clé : réf. sans espaces autour, sans majuscules.
function supportsParRef(m){
  var map={};
  function noter(ref,cle,lib){
    ref=String(ref||'').trim();if(!ref)return;
    var k=ref.toLowerCase();
    if(!map[k])map[k]={ref:ref,cles:{},libs:[]};
    if(!map[k].cles[cle]){map[k].cles[cle]=true;map[k].libs.push(lib);}
  }
  (m.prelevements||[]).forEach(function(p){
    (p.subPrelevements||[]).forEach(function(s0,si){
      if(s0.nonRealise)return;
      expandSubSupports(s0).forEach(function(sb,k){
        (p.agents||[]).forEach(function(a){
          if(typeof isAnalyseurAgent==='function'&&isAnalyseurAgent(a.name))return;
          var ad=sb.agentData&&sb.agentData[a.name];if(!ad)return;
          var grp=typeof getCoPrelGroupMembers==='function'?getCoPrelGroupMembers(s0,a.name):[];
          // fractions de silice d'un même CIP10 ou cyclone : un seul échantillon, comme à l'export (onglet CIP10 silice)
          if(grp.length<=1&&typeof fcGroupeSilice==='function'&&(fcEstSilice(a.name)||fcEstCycloneSilice(a.name)))grp=fcGroupeSilice(p).map(function(x){return x.name;});
          var qui=grp.length>1?grp.slice().sort():[a.name];
          noter(ad.refEchantillon,p.id+'|'+si+'|'+k+'|'+qui.join('+'),qui.join(' + ')+(sb.date?' · '+formatDateFR(sb.date):''));
        });
      });
    });
  });
  (m.blancs||[]).forEach(function(b,i){noter(b.ref,'blanc|'+i,'blanc '+(b.agents||[]).join(', '));});
  return map;
}
function refsEnDouble(m){
  var map=supportsParRef(m);
  return Object.keys(map).map(function(k){return map[k];}).filter(function(x){return Object.keys(x.cles).length>1;});
}
// Avertissement sous le champ réf. (formulaire terrain)
function infoRefDouble(m,ref){
  ref=String(ref||'').trim();if(!ref)return '';
  var x=supportsParRef(m)[ref.toLowerCase()];
  if(!x||Object.keys(x.cles).length<2)return '';
  return '<div style="font-size:11px;color:#b45309;padding:2px 0 4px;">Même réf. sur '+x.libs.length+' échantillons différents ('+escapeHtml(x.libs.join(' ; '))+') : un seul partirait au laboratoire.</div>';
}

// Lots déjà saisis sur la mission (échantillons et blancs), proposés à la saisie d'un lot
function lotsConnus(m){
  var vus={},l=[];
  function add(x){x=String(x||'').trim();var k=normLot(x);if(k&&!vus[k]){vus[k]=true;l.push(x);}}
  (m.prelevements||[]).forEach(function(p){(p.subPrelevements||[]).forEach(function(s0){expandSubSupports(s0).forEach(function(sb){Object.keys(sb.agentData||{}).forEach(function(an){add(sb.agentData[an]&&sb.agentData[an].lot);});});});});
  (m.blancs||[]).forEach(function(b){add(b.lot);});
  return l.sort();
}
function lotsDatalist(m){
  return '<datalist id="lots-mission">'+lotsConnus(m).map(function(x){return '<option value="'+escapeHtml(x)+'"></option>';}).join('')+'</datalist>';
}
function normLot(l){return String(l||'').replace(/\s+/g,'').toLowerCase();}
function findBlancForAgent(m,agentName,date,lot){
  if(!m.blancs||m.blancs.length===0)return null;
  var nl=normLot(lot),duJour=null,sansDate=null,tous=[];
  m.blancs.forEach(function(b){
    if(!b.agents||b.agents.indexOf(agentName)===-1)return;
    if(normLot(b.lot)!==nl)return;
    tous.push(b);
    if(date&&b.date===date&&!duJour)duJour=b;
    if(!b.date&&!sansDate)sansDate=b;
  });
  if(nl)return duJour||tous[0]||null;
  return duJour||sansDate||(tous.length===1?tous[0]:null);
}

// Blanc d'un support portant plusieurs agents (agents fusionnés, même réf.) : le blanc saisi avec l'un d'eux
// vaut pour le support (lot de chaque agent, sinon celui du support)
function findBlancForSupport(m,sb,agentNames){
  var lotSupport='';
  agentNames.forEach(function(an){var d=sb.agentData&&sb.agentData[an];if(!lotSupport&&d&&String(d.lot||'').trim())lotSupport=String(d.lot).trim();});
  for(var i=0;i<agentNames.length;i++){
    var d=sb.agentData&&sb.agentData[agentNames[i]];
    var b=findBlancForAgent(m,agentNames[i],sb.date,(d&&String(d.lot||'').trim())||lotSupport);
    if(b)return b;
  }
  return null;
}
// Agents du prélèvement partageant la réf. d'échantillon de cet agent sur ce support
function agentsMemeRef(p,sb,an){
  var d=sb.agentData&&sb.agentData[an],ref=d&&String(d.refEchantillon||'').trim();
  if(!ref)return [an];
  return (p.agents||[]).map(function(a){return a.name;}).filter(function(x){var e=sb.agentData&&sb.agentData[x];return e&&String(e.refEchantillon||'').trim()===ref;});
}

// Gravimétrie (poussières inhalables / alvéolaires, brouillard d'huile…) : 2 blancs attendus par lot
function estGravimetrie(an){
  var a=getAgentFromDB(an);
  return !!a&&/gravim/i.test(JSON.stringify(a));
}
// Agents en gravimétrie × lot d'échantillons réalisés ayant moins de 2 blancs (même agent, même lot)
function blancsGraviManquants(m){
  var groupes={},ordre=[];
  (m.prelevements||[]).forEach(function(p){
    (p.subPrelevements||[]).forEach(function(s0){
      if(s0.nonRealise)return;
      expandSubSupports(s0).forEach(function(sb){
        (p.agents||[]).forEach(function(a){
          var ad=sb.agentData&&sb.agentData[a.name];
          if(!ad||!String(ad.refEchantillon||'').trim()||!estGravimetrie(a.name))return;
          var k=a.name+'|'+normLot(ad.lot);
          if(!groupes[k]){groupes[k]={agent:a.name,lot:String(ad.lot||'').trim(),date:sb.date||''};ordre.push(k);}
        });
      });
    });
  });
  return ordre.map(function(k){
    var g=groupes[k];
    g.blancs=(m.blancs||[]).filter(function(b){return (b.agents||[]).indexOf(g.agent)!==-1&&normLot(b.lot)===normLot(g.lot);});
    return g;
  }).filter(function(g){return g.blancs.length<2;});
}
// Formulaire « + Blanc terrain » prérempli avec l'agent, le lot et la date du blanc déjà saisi (seule la réf. reste à taper)
function ajouterBlancDuLot(i){
  var m=getCurrentMission();if(!m)return;
  var g=blancsGraviManquants(m)[i];if(!g)return;
  var b=g.blancs[0];
  state.blancAgents=b?(b.agents||[]).slice():[g.agent];
  state.blancLot=b?(b.lot||''):g.lot;
  state.blancDate=b&&b.date?b.date:(g.date||getTodayDate());
  state.blancRef='';state.blancAgentSearch='';
  state.showModal='addBlanc';
  render();
}

// Échantillons de la mission auxquels un blanc est associé (pense-bête de la liste des blancs)
function echantillonsDuBlanc(m,blanc){
  var n=0,vus={};
  (m.prelevements||[]).forEach(function(p){
    (p.subPrelevements||[]).forEach(function(s0){
      if(s0.nonRealise)return;
      expandSubSupports(s0).forEach(function(sb){
        (p.agents||[]).forEach(function(a){
          var ad=sb.agentData&&sb.agentData[a.name];
          var ref=ad&&String(ad.refEchantillon||'').trim();
          if(!ref||vus[ref])return;
          if(findBlancForSupport(m,sb,agentsMemeRef(p,sb,a.name))===blanc){vus[ref]=true;n++;}
        });
      });
    });
  });
  return n;
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

console.log('✓ Échantillons chargé');
