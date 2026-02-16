/*
 * VLEP Mission v3.8 - utils.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Fonctions utilitaires partagées :
 * - Échappement HTML/JS
 * - Génération d'ID, sauvegarde/chargement localStorage
 * - Gestion missions, agents, couleurs
 * - Recherche agents DB
 * - Délégation événements recherche
 * - CIP, débits, dates
 */

// ===== ÉCHAPPEMENT =====
function escapeHtml(t){
  if(!t)return'';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escapeJs(t){
  if(!t)return'';
  var s=String(t);
  s=s.split(String.fromCharCode(92)).join(String.fromCharCode(92,92));
  s=s.split(String.fromCharCode(39)).join(String.fromCharCode(92,39));
  s=s.replace(/"/g,'&quot;');
  return s;
}

// ===== ID & STOCKAGE =====
function generateId(){
  return Date.now()*1000+Math.floor(Math.random()*1000);
}

function saveData(k,d){
  try{localStorage.setItem(k,JSON.stringify(d));}catch(e){console.error('Save error',e);}
}

// ===== MISSION HELPERS =====
function getCurrentMission(){
  return state.missions.find(function(m){return m.id===state.currentMissionId;})||null;
}

function createEmptyMission(){
  var g=[];
  for(var i=0;i<DEFAULT_GEH_COUNT;i++)g.push({id:generateId(),num:i+1,name:''});
  return{
    id:generateId(),
    status:'prepa',
    createdAt:new Date().toISOString(),
    clientSite:'',
    preleveur:'',
    debitmetre:'',
    cipAgents:[],
    gehs:g,
    agents:[],
    affectations:{},
    prelevements:[],
    conditionsAmbiantes:[],
    agentColors:{}
  };
}

function updateMissionStatus(m){
  if(!m)return;
  var total=0,done=0;
  m.prelevements.forEach(function(p){
    p.subPrelevements.forEach(function(s){total++;if(s.completed)done++;});
  });
  if(total>0&&done===total)m.status='terminee';
  else if(done>0)m.status='encours';
  else if(m.status==='terminee'||m.status==='encours')m.status='validee';
}

// ===== CO-PRÉLÈVEMENT : CLÉ DE COMPATIBILITÉ =====
// Agents avec la même clé = même cassette physique
function getCompatKey(agentName,type){
  var ag=getAgentFromDB(agentName);
  if(!ag)return'MANUAL_'+agentName; // agents manuels jamais groupés
  var cs=ag['Code support']||'?';
  var cp=ag['Code prétraitement']||'?';
  var d='?';
  if(type==='8h'){d=ag['débit max  8h (L/min)']||ag['débit max 8h (L/min)']||'?';}
  else{d=ag['débit max CT (L/min)']||'?';}
  return cs+'|'+cp+'|'+String(d).trim();
}

// Retourne les groupes de co-prélèvement pour un GEH/type/reg donné
function getCoPrelevementGroups(m,gehId,type,isReg){
  var groups={};
  for(var an in m.affectations){
    var af=m.affectations[an];
    if(!af.gehs||!af.gehs[gehId])continue;
    var gaf=af.gehs[gehId];
    var isActive=(type==='8h')?gaf.has8h:gaf.hasCT;
    if(!isActive)continue;
    var regStatus=(type==='8h')?gaf.isReg8h:gaf.isRegCT;
    if(regStatus!==isReg)continue;
    var key=getCompatKey(an,type);
    if(!groups[key])groups[key]={key:key,agents:[],info:null};
    groups[key].agents.push(an);
    if(!groups[key].info){
      var ag=getAgentFromDB(an);
      if(ag){
        groups[key].info={
          support:ag['Code support']||'?',
          pretrait:ag['Code prétraitement']||'?',
          debit:(type==='8h')?(ag['débit max  8h (L/min)']||ag['débit max 8h (L/min)']||'?'):(ag['débit max CT (L/min)']||'?'),
          supportNom:ag['Support de prélèvement']||''
        };
      }
    }
  }
  return groups;
}

// ===== COULEURS AGENTS =====
function getAgentColor(m,n){
  if(!m.agentColors)m.agentColors={};
  if(!m.agentColors[n]){
    var u=Object.values(m.agentColors);
    for(var i=0;i<AGENT_COLORS.length;i++){
      if(u.indexOf(AGENT_COLORS[i])===-1){m.agentColors[n]=AGENT_COLORS[i];break;}
    }
    if(!m.agentColors[n])m.agentColors[n]=AGENT_COLORS[Object.keys(m.agentColors).length%AGENT_COLORS.length];
  }
  return m.agentColors[n];
}

function lightenColor(h,p){
  var n=parseInt(h.replace('#',''),16);
  var r=Math.min(255,Math.floor((n>>16)+(255-(n>>16))*p));
  var g=Math.min(255,Math.floor(((n>>8)&0xFF)+(255-((n>>8)&0xFF))*p));
  var b=Math.min(255,Math.floor((n&0xFF)+(255-(n&0xFF))*p));
  return'#'+(0x1000000+r*0x10000+g*0x100+b).toString(16).slice(1);
}

// ===== AGENTS DB =====
function getAgentFromDB(n){
  for(var i=0;i<state.agentsDB.length;i++){
    if(state.agentsDB[i]['Agent chimique']===n)return state.agentsDB[i];
  }
  return null;
}

// FIX #1: Support des deux noms de colonnes pour le code analytique
function getCodeAnalytique(agent){
  if(!agent)return'';
  return agent['code_analyse']||agent['Code analytique']||agent['Code analyse']||'';
}

function hasVLEP8h(n){
  var a=getAgentFromDB(n);if(!a)return false;
  var v=a['VLEP 8h (mg/m3)'];
  return v!==undefined&&v!==null&&v!==''&&String(v).trim()!==''&&String(v).trim()!=='-';
}

function hasVLEPCT(n){
  var a=getAgentFromDB(n);if(!a)return false;
  var v=a['VLEP CT (mg/m3)'];
  return v!==undefined&&v!==null&&v!==''&&String(v).trim()!==''&&String(v).trim()!=='-';
}

function searchAgentsDB(t){
  var s=t.toLowerCase();
  return state.agentsDB.filter(function(a){
    return(a['Agent chimique']||'').toLowerCase().indexOf(s)!==-1;
  }).map(function(a){return a['Agent chimique'];});
}

// ===== DÉLÉGATION RECHERCHE =====
function handleSearchClick(event,fnName){
  var el=event.target;
  while(el&&!el.dataset.agent){
    if(el.id&&el.id.indexOf('search')!==-1)break;
    el=el.parentElement;
  }
  if(!el||!el.dataset.agent||el.dataset.disabled==='1')return;
  event.preventDefault();
  event.stopPropagation();
  if(typeof window[fnName]==='function')window[fnName](el.dataset.agent);
}

// ===== CIP (pompes) =====
function isAgentCIP(m,agentName){
  if(!m||!m.cipAgents)return false;
  return m.cipAgents.indexOf(agentName)!==-1;
}

function toggleCIPAgent(agentName){
  var m=getCurrentMission();if(!m)return;
  if(!m.cipAgents)m.cipAgents=[];
  var idx=m.cipAgents.indexOf(agentName);
  if(idx===-1)m.cipAgents.push(agentName);else m.cipAgents.splice(idx,1);
  saveData('vlep_missions_v3',state.missions);
  render();
}

// ===== DÉBIT & VARIATION =====
function calcDebitVariation(di,df){
  if(!di||!df)return null;
  var a=parseFloat(String(di).replace(',','.'));
  var b=parseFloat(String(df).replace(',','.'));
  if(isNaN(a)||isNaN(b)||a===0)return null;
  return Math.abs((b-a)/a*100);
}

function calcDebitVariationCIP(di,df){
  if(!di||!df)return null;
  var a=parseFloat(String(di).replace(',','.'));
  var b=parseFloat(String(df).replace(',','.'));
  if(isNaN(a)||isNaN(b)||a===0)return null;
  return Math.abs(b-a);
}

function handleDebitInput(input){
  var v=input.value;
  v=v.replace(/[^0-9.,]/g,'');
  v=v.replace(',','.');
  input.value=v;
}

// ===== DATES =====
function getTodayDate(){
  var d=new Date();
  return d.toISOString().split('T')[0];
}

function formatDateFR(d){
  if(!d)return'-';
  var p=d.split('-');
  if(p.length===3)return p[2]+'/'+p[1]+'/'+p[0];
  return d;
}

function autoFillDate(p,idx){
  var sb=p.subPrelevements[idx];
  if(!sb.date){sb.date=getTodayDate();}
}

// ===== UPDATE HELPERS (avec auto-date) =====
function updateSubField(pid,idx,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){p.subPrelevements[idx][f]=v;saveData('vlep_missions_v3',state.missions);}
}

function updateSubFieldWithAutoDate(pid,idx,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    p.subPrelevements[idx][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
  }
}

function updateAgentData(pid,idx,an,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    if(!p.subPrelevements[idx].agentData)p.subPrelevements[idx].agentData={};
    if(!p.subPrelevements[idx].agentData[an])p.subPrelevements[idx].agentData[an]={};
    p.subPrelevements[idx].agentData[an][f]=v;
    saveData('vlep_missions_v3',state.missions);
  }
}

function updateAgentDataWithAutoDate(pid,idx,an,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    if(!p.subPrelevements[idx].agentData)p.subPrelevements[idx].agentData={};
    if(!p.subPrelevements[idx].agentData[an])p.subPrelevements[idx].agentData[an]={};
    p.subPrelevements[idx].agentData[an][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
  }
}

function updatePlageWithAutoDate(pid,idx,pi,f,v){
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(p){
    p.subPrelevements[idx].plages[pi][f]=v;
    autoFillDate(p,idx);
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

// ===== COPIER J-1 =====
function copyFromPrevious(pid,idx,field){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var prevSub=p.subPrelevements[idx-1];
  var currentSub=p.subPrelevements[idx];
  if(prevSub&&prevSub[field]){
    currentSub[field]=prevSub[field];
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function copyAgentDataFromPrevious(pid,idx,agentName,field){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var prevSub=p.subPrelevements[idx-1];
  var currentSub=p.subPrelevements[idx];
  if(prevSub&&prevSub.agentData&&prevSub.agentData[agentName]&&prevSub.agentData[agentName][field]){
    if(!currentSub.agentData)currentSub.agentData={};
    if(!currentSub.agentData[agentName])currentSub.agentData[agentName]={};
    currentSub.agentData[agentName][field]=prevSub.agentData[agentName][field];
    saveData('vlep_missions_v3',state.missions);
    render();
  }
}

function copyAllFromPrevious(pid,idx){
  if(idx<=0)return;
  var m=getCurrentMission();if(!m)return;
  var p=m.prelevements.find(function(x){return x.id===pid;});
  if(!p)return;
  var prevSub=p.subPrelevements[idx-1];
  var currentSub=p.subPrelevements[idx];
  if(!prevSub)return;
  currentSub.operateur=prevSub.operateur||currentSub.operateur;
  if(prevSub.agentData){
    if(!currentSub.agentData)currentSub.agentData={};
    for(var an in prevSub.agentData){
      if(!currentSub.agentData[an])currentSub.agentData[an]={};
      currentSub.agentData[an].numPompe=prevSub.agentData[an].numPompe||'';
      currentSub.agentData[an].refEchantillon=prevSub.agentData[an].refEchantillon||'';
    }
  }
  saveData('vlep_missions_v3',state.missions);
  render();
}


