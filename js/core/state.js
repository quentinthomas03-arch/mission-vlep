// state.js - État global de l'application VLEP Mission v3.8
export const state = {
  view: 'home',
  missions: [],
  currentMissionId: null,
  currentPrelId: null,
  activeSubIndex: 0,
  expandedGeh: {},
  showModal: null,
  
  // NOUVELLES VARIABLES POUR CO-PRÉLÈVEMENT ET FUSION
  coPrelevementAgentsMode: false,
  selectedForCoPrel: [],
  fusionPrelevementsMode: false,
  selectedForFusion: [],
  
  // Autres variables existantes
  fusionMode: false, // Ancienne variable, peut être gardée pour compatibilité
  timers: {},
  validationResult: null,
  dictating: false,
  showCIPSection: false
};

export const AGENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e'
];

export const DEFAULT_GEH_COUNT = 5;
