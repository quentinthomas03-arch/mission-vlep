/*
 * VLEP Mission v3.8 - state.js
 * © 2025 Quentin THOMAS - Tous droits réservés
 * 
 * État global, constantes et variables partagées
 */

// ===== CONSTANTES =====
var AGENT_COLORS = [
  '#00a878', '#0f4c81', '#e63946', '#7c3aed', '#f59e0b',
  '#0891b2', '#c026d3', '#65a30d', '#0284c7', '#db2777',
  '#4f46e5', '#059669', '#d97706', '#7c2d12', '#1d4ed8'
];

var DEFAULT_GEH_COUNT = 5;

// ===== ÉTAT PRINCIPAL =====
var state = {
  _author: 'Quentin THOMAS',
  _copyright: '© 2025 Quentin THOMAS',
  view: 'home',
  missions: [],
  agentsDB: [],
  currentMissionId: null,
  currentPrelId: null,
  activeSubIndex: 0,
  showModal: null,
  searchText: '',
  expandedGeh: {},
  fusionMode: false,
  selectedForFusion: [],
  quickPrelType: '8h',
  quickPrelReg: true,
  quickAgentSearch: '',
  quickGehId: null,
  echantillonSort: 'date',
  blancAgentSearch: '',
  blancAgents: [],
  quickMission: null,
  newPrelData: null,
  timers: {},
  showCIPSection: false
};

// ===== TIMER GLOBAL (flottant) =====
var globalTimerState = {
  running: false,
  startTime: 0,
  elapsed: 0,
  interval: null
};

// ===== DICTÉE VOCALE =====
var activeDictation = null;
