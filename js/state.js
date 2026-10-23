// state.js - État global de l'application
// © 2025 Quentin THOMAS

// Couleurs pour les agents chimiques
var AGENT_COLORS=['#00a878','#0f4c81','#e63946','#7c3aed','#f59e0b','#0891b2','#c026d3','#65a30d','#0284c7','#db2777','#4f46e5','#059669','#d97706','#7c2d12','#1d4ed8'];

// Nombre de GEH par défaut lors de création mission
var DEFAULT_GEH_COUNT=5;

// État global de l'application
var state={
  _author:'Quentin THOMAS',
  _copyright:'© 2025 Quentin THOMAS',
  
  // Navigation
  view:'home',
  showModal:null,
  
  // Données
  missions:[],
  agentsDB:[],
  
  // Mission courante
  currentMissionId:null,
  currentPrelId:null,
  activeSubIndex:0,
  
  // UI
  searchText:'',
  expandedGeh:{},
  
  // Modes
  coPrelMode:false,
  selectedForCoPrel:[],
  coPrelGroups:null,
  
  // Saisie rapide
  quickPrelType:'8h',
  quickPrelReg:true,
  quickAgentSearch:'',
  quickGehId:null,
  quickMission:null,
  
  // Échantillons
  echantillonSort:'date',
  
  // Blancs
  blancAgentSearch:'',
  blancAgents:[],
  
  // Préparation
  newPrelData:null,
  
  // Co-prélèvement
  coPrelTargetPid:null,
  coPrelTargetSubIdx:null,
  coPrelTargetAgent:null,
  coPrelDetectedGroups:null,
  coPrelEditGroups:null,
  
  // Timers
  timers:{}
};

// === UTILITAIRES ESSENTIELS ===

function escapeHtml(t){
  if(!t)return'';
  return String(t)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function escapeJs(t){
  if(!t)return'';
  var s=String(t);
  s=s.split(String.fromCharCode(92)).join(String.fromCharCode(92,92));
  s=s.split(String.fromCharCode(39)).join(String.fromCharCode(92,39));
  s=s.replace(/"/g,'&quot;');
  s=s.replace(/\r/g,'\\r');
  s=s.replace(/\n/g,'\\n');
  return s;
}

function generateId(){
  return Date.now()*1000+Math.floor(Math.random()*1000);
}

function saveData(k,d){
  if(k==='vlep_missions_v3'&&typeof daterSaisies==='function')daterSaisies(d); // fusion-missions.js
  try{
    localStorage.setItem(k,JSON.stringify(d));
  }catch(e){}
}

function lightenColor(h,p){
  var n=parseInt(h.replace('#',''),16);
  var r=Math.min(255,Math.floor((n>>16)+(255-(n>>16))*p));
  var g=Math.min(255,Math.floor(((n>>8)&0xFF)+(255-((n>>8)&0xFF))*p));
  var b=Math.min(255,Math.floor((n&0xFF)+(255-(n&0xFF))*p));
  return'#'+(0x1000000+r*0x10000+g*0x100+b).toString(16).slice(1);
}

// === CHARGEMENT DONNÉES ===

function loadData(){
  try{
    var m=localStorage.getItem('vlep_missions_v3');
    var d=localStorage.getItem('vlep_database');
    // Base collée à la main (Importer) : abandonnée dès que l'appli embarque une base plus récente
    // que celle qu'elle avait au moment de l'import, sinon le technicien ne recevrait jamais les mises à jour
    var versionBase=(typeof BUILTIN_DB_VERSION!=='undefined')?BUILTIN_DB_VERSION:'';
    if(d&&localStorage.getItem('vlep_database_base')!==versionBase){
      localStorage.removeItem('vlep_database');
      d=null;
    }
    if(m)state.missions=JSON.parse(m);
    if(d)state.agentsDB=JSON.parse(d);
    else state.agentsDB=JSON.parse(JSON.stringify(BUILTIN_DB));
    repairMissions();
  }catch(e){}
}

function repairMissions(){
  state.missions.forEach(function(m){
    if(m.prelevements){
      m.prelevements.forEach(function(p){
        if(!p.agents)p.agents=[];
      });
    }
    // Migration : déplacer isReg vers isReg8h et isRegCT
    if(m.affectations){
      for(var an in m.affectations){
        var af=m.affectations[an];
        if(af.gehs){
          for(var gid in af.gehs){
            var gaf=af.gehs[gid];
            var oldIsReg=(gaf.isReg!==undefined)?gaf.isReg:((af.isReg!==undefined)?af.isReg:true);
            if(gaf.isReg8h===undefined){
              gaf.isReg8h=oldIsReg;
            }
            if(gaf.isRegCT===undefined){
              gaf.isRegCT=oldIsReg;
            }
          }
        }
      }
    }
  });
}

// === ACCESSEURS ===

function getCurrentMission(){
  for(var i=0;i<state.missions.length;i++){
    if(state.missions[i].id===state.currentMissionId)return state.missions[i];
  }
  return null;
}

function getAgentColor(m,n){
  if(!m.agentColors)m.agentColors={};
  if(!m.agentColors[n]){
    var u=Object.values(m.agentColors);
    for(var i=0;i<AGENT_COLORS.length;i++){
      if(u.indexOf(AGENT_COLORS[i])===-1){
        m.agentColors[n]=AGENT_COLORS[i];
        break;
      }
    }
    if(!m.agentColors[n])m.agentColors[n]=AGENT_COLORS[Object.keys(m.agentColors).length%AGENT_COLORS.length];
  }
  return m.agentColors[n];
}

// === UTILITAIRES DB ===

// Statut réglementaire d'un agent : VLEP réglementaire contraignante ou indicative dans la base
// (agent absent de la base : réglementaire, comme avant)
function agentEstReglementaire(n){
  var a=getAgentFromDB(n);
  if(!a)return true;
  return a['VLEP Reglementaire contraignante']==='X'||a['VLEP Reglementaire Indicative']==='X';
}
// Nombre de sous-prélèvements prévus pour une affectation agent/GEH : celui du devis (gaf.nb8h / gaf.nbCT),
// sinon 3 en réglementaire et 1 sinon. Le statut réglementaire ne dépend pas de ce nombre.
function nbPrelPrevu(gaf,type){
  var n=type==='CT'?gaf.nbCT:gaf.nb8h;
  if(n)return n;
  var reg=type==='CT'?gaf.isRegCT:gaf.isReg8h;
  if(reg===undefined)reg=gaf.isReg!==undefined?gaf.isReg:true;
  return reg?3:1;
}
var JUSTIF_NB_DEFAUT='Prélèvement unique prévu par la stratégie de prélèvement.';

// Agent de la base au même nom, aux accents, majuscules, espaces et apostrophes près (« epichlorhydrine »)
function agentBaseProche(n){
  var k=function(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();};
  var c=k(n);
  if(!c||getAgentFromDB(n))return null;
  for(var i=0;i<state.agentsDB.length;i++)if(k(state.agentsDB[i]['Agent chimique'])===c)return state.agentsDB[i]['Agent chimique'];
  return null;
}
// Ajout manuel : si la base connaît l'agent, le technicien peut prendre sa fiche (support, méthode, VLEP)
function nomAgentManuel(n){
  var b=agentBaseProche(n);
  return b&&confirm('« '+b+' » existe dans la base (support, méthode, VLEP).\n\nOK : utiliser l’agent de la base\nAnnuler : garder « '+n+' » saisi à la main')?b:null;
}

// Copie de la mission sans les prélèvements marqués « non réalisé » (exports : feuille de calcul, rapport, activité)
// (agent saisi à la main ayant une fiche de la base au même nom, aux accents près : nom de la base, partout dans la copie)
function missionRealisee(m){
  var j=JSON.stringify(m);
  (m.agents||[]).forEach(function(a){var b=agentBaseProche(a.name);if(b)j=j.split(JSON.stringify(a.name)).join(JSON.stringify(b));});
  var c=JSON.parse(j);
  c.prelevements=(c.prelevements||[]).map(function(p){p.nbPrevus=(p.subPrelevements||[]).length;p.subPrelevements=(p.subPrelevements||[]).filter(function(s){return !s.nonRealise;});return p;})
    .filter(function(p){return p.subPrelevements.length;});
  return c;
}

function getAgentFromDB(n){
  for(var i=0;i<state.agentsDB.length;i++){
    if(state.agentsDB[i]['Agent chimique']===n)return state.agentsDB[i];
  }
  return null;
}

function getCodeAnalytique(agent){
  if(!agent)return'';
  return agent['code_analyse']||agent['Code analytique']||agent['Code analyse']||'';
}

function hasVLEP8h(n){
  var a=getAgentFromDB(n);
  if(!a || !a['VLEP 8h (mg/m3)']) return false;
  var v=String(a['VLEP 8h (mg/m3)']).trim();
  return v!=='' && v!=='-';
}

function hasVLEPCT(n){
  var a=getAgentFromDB(n);
  if(!a || !a['VLEP CT (mg/m3)']) return false;
  var v=String(a['VLEP CT (mg/m3)']).trim();
  return v!=='' && v!=='-';
}

// === TYPE DE DÉBITMÈTRE ===
// Détermine le bloc de vérification du débit rempli à l'export (feuille de calcul) :
// « débitmètre massique » ou « débitmètre à lame de savon ou à piston ».
// Mission sans type choisi (anciennes missions) : massique, comme avant.
var DEBITMETRE_TYPES=[
  {value:'massique',label:'Massique'},
  {value:'piston',label:'Lame de savon / piston'}
];

function getDebitmetreType(m){
  return (m&&m.debitmetreType==='piston')?'piston':'massique';
}

function renderDebitmetreTypeSelect(id,value,onchange){
  var h='<select class="input" id="'+id+'"'+(onchange?' onchange="'+onchange+'"':'')+'>';
  if(!value)h+='<option value="" selected>Type à choisir…</option>';
  DEBITMETRE_TYPES.forEach(function(t){
    h+='<option value="'+t.value+'"'+(value===t.value?' selected':'')+'>'+t.label+'</option>';
  });
  return h+'</select>';
}

// === MULTI-SUPPORTS (prélèvement fractionné, ex. 3 x 2 h sur 3 supports) ===
// Le support n°1 reste porté par le sous-prélèvement lui-même (sb.plages, sb.agentData) ;
// les supports suivants sont dans sb.supportsSupp = [{plages:[...], agentData:{agent:{...}}}].
function getSupportsSupp(sb){
  return (sb&&sb.supportsSupp)||[];
}

// Pour les exports : un sous-prélèvement « virtuel » par support (mêmes opérateur, date, EPI…,
// plages et données agents propres au support). supportNum vaut 1 pour le support d'origine.
function expandSubSupports(sb){
  var ex=getSupportsSupp(sb);
  if(!ex.length)return [sb];
  var out=[Object.assign({},sb,{supportNum:1,nbSupports:ex.length+1})];
  ex.forEach(function(s,k){
    out.push(Object.assign({},sb,{plages:s.plages||[],agentData:s.agentData||{},supportNum:k+2,nbSupports:ex.length+1}));
  });
  return out;
}

// === DURÉES ===
// Durée de prélèvement en minutes, tous supports confondus (plages débutées et finies)
function dureePrelevementMin(sb){
  var mn=0;
  expandSubSupports(sb).forEach(function(s){
    (s.plages||[]).forEach(function(pl){
      var d=/^(\d{1,2}):(\d{2})/.exec(pl.debut||''),f=/^(\d{1,2}):(\d{2})/.exec(pl.fin||'');
      if(d&&f){var x=(+f[1]*60+ +f[2])-(+d[1]*60+ +d[2]);if(x>0)mn+=x;}
    });
  });
  return mn;
}

// Durée d'exposition (minutes) : saisie pour un 8h (sb.dureeExpo « HH:MM ») ;
// pour un court-terme, c'est la durée du prélèvement. null si inconnue.
function dureeExpositionMin(p,sb){
  if(p&&p.type==='CT'){var d=dureePrelevementMin(sb);return d>0?d:null;}
  var m=/^(\d{1,2}):(\d{2})$/.exec(String(sb.dureeExpo||'').trim());
  return m?(+m[1]*60+ +m[2]):null;
}

function formatHeuresMinutes(mn){
  if(mn===null||mn===undefined)return '';
  return Math.floor(mn/60)+'h'+(mn%60<10?'0':'')+(mn%60);
}

// === CRÉATION MISSION ===

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
    gehs:g,
    agents:[],
    affectations:{},
    prelevements:[],
    conditionsAmbiantes:[],
    agentColors:{}
  };
}

console.log('✓ State chargé');
