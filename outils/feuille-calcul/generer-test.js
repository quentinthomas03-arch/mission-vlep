// Banc d'essai de l'export « feuille de calcul » : charge les vrais fichiers de l'appli dans Node,
// construit une mission de test variée et écrit le .xlsm rempli (à ouvrir dans Excel ou à vérifier
// avec verifier-excel.ps1).
//
// Usage : node outils/feuille-calcul/generer-test.js "<modèle .xlsm>" "<sortie .xlsm>"
// Prérequis : JSZip (npm install jszip@3.10.1 dans un dossier de travail, ou js/jszip.min.js de l'appli)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const racine = path.join(__dirname, '..', '..');
const [modele, sortie] = process.argv.slice(2);
if (!modele || !sortie) { console.error('Usage : node generer-test.js <modèle.xlsm> <sortie.xlsm>'); process.exit(1); }

// Contexte navigateur minimal
const store = {};
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Uint8Array, ArrayBuffer, Blob: undefined,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {} }; } },
  navigator: {}, alert: m => console.log('[alert]', m), confirm: () => true
};
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
const charger = f => vm.runInContext(fs.readFileSync(path.join(racine, f), 'utf8'), ctx, { filename: f });
ctx.JSZip = require(path.join(racine, 'js', 'jszip.min.js'));
['js/database.js', 'js/state.js', 'js/terrain.js', 'js/echantillons.js', 'js/xlsm-moteur.js', 'js/feuille-calcul.js'].forEach(charger);
vm.runInContext('state.agentsDB = JSON.parse(JSON.stringify(BUILTIN_DB));', ctx);

// Mission de test : Tube Reg (J1-J3), Cassette non Reg, Tube Reg (multi), 8h fractionné (séq), CIP10 silice Reg
const mission = vm.runInContext(`(function(){
  var m = createEmptyMission();
  m.clientSite = 'SITE TEST'; m.preleveur = 'Quentin THOMAS'; m.debitmetre = '24367'; m.tachymetre = 'T-88'; m.debitmetreType = 'piston';
  m.gehs = [{id:1,num:1,name:'Peinture'},{id:2,num:2,name:'Montage'},{id:3,num:3,name:'Ponçage'}];
  var jours = ['2026-10-13','2026-10-14','2026-10-15'];
  m.conditionsAmbiantes = jours.map(function(d,i){ return {date:d,tempI:String(20+i),tempF:String(22+i),pressionI:'1010',pressionF:'1012',humiditeI:'50',humiditeF:'48'}; });
  m.blancs = [{ref:'BT-1',date:'2026-10-13',lot:'LOT-A',agents:['toluène']}];
  function sub(i, agents, deb){ var s={id:i+1,operateur:'Opérateur '+(i+1),date:jours[i%3],plages:[{debut:'08:00',fin:'10:00'},{debut:'13:00',fin:'15:00'}],observations:'RAS J'+(i+1),dureeExpo:'07:30',ventEnv:'Local standard industriel',ventGenerale:'oui',ventCaptage:'Inducteur',scolaTache:'Encollage par pulvérisation (pistolet, bombe aérosol)',scolaMetier:'Peintre automobile',scolaProcede:'Procédé ouvert (anciennement Procédé semi-ouvert)',epiType:'sans objet',epiDuree:'',agentData:{}};
    agents.forEach(function(a){ s.agentData[a]={numPompe:'P-'+(i+1),debitInitial:deb[0],debitFinal:deb[1],refEchantillon:a.slice(0,3).toUpperCase()+'-'+(i+1)}; }); return s; }
  function prel(id, gehId, type, reg, agents, n, deb){ var p={id:id,gehId:gehId,gehName:'',gehNum:gehId,type:type,isReglementaire:reg,agents:agents.map(function(a){return {name:a};}),subPrelevements:[]};
    for(var i=0;i<n;i++) p.subPrelevements.push(sub(i,agents,deb)); return p; }
  var p1 = prel(101,1,'8h',true,['toluène'],3,['0,102','0,1']);
  var p2 = prel(102,1,'8h',false,['acide fluorhydrique'],1,['1,95','1,9']);
  var p3 = prel(103,2,'8h',true,['o-xylène','éthylbenzène'],3,['0,1','0,1']);
  p3.subPrelevements.forEach(function(s){ s.coPrelGroups=[['o-xylène','éthylbenzène']]; });
  var p4 = prel(104,2,'8h',false,['méthanol'],1,['0,1','0,1']);
  p4.subPrelevements[0].plages=[{debut:'08:00',fin:'10:00'}];
  p4.subPrelevements[0].supportsSupp=[{plages:[{debut:'10:00',fin:'12:00'}],agentData:{'méthanol':{numPompe:'P-1',debitInitial:'0,101',debitFinal:'0,099',refEchantillon:'MET-2'}}}];
  var p5 = prel(105,3,'8h',true,['fraction alvéolaire de silice cristalline (quartz)'],3,['','']);
  p5.subPrelevements.forEach(function(s){ s.agentData['fraction alvéolaire de silice cristalline (quartz)'].debitRef='7000'; s.agentData['fraction alvéolaire de silice cristalline (quartz)'].debitInitial='7010'; s.agentData['fraction alvéolaire de silice cristalline (quartz)'].debitFinal='6990'; });
  var p6 = prel(106,1,'8h',false,['oxyde de carbone'],1,['','']);
  Object.assign(p6.subPrelevements[0].agentData['oxyde de carbone'],{numPompe:'25385',refEchantillon:'CO-PF1',bouteilleZero:'Z-1',bouteilleEtalon:'E-9',gazEtalon:'CO 50 ppm',attenduZero:'0',attenduEtalon:'50',ctrlZeroAvant:'0',ctrlSensAvant:'49,5',ctrlZeroApres:'0,2',ctrlSensApres:'48'});
  m.prelevements=[p1,p2,p3,p4,p5,p6];
  return m;
})()`, ctx);

// Agents présents dans la base ?
['toluène', 'acide fluorhydrique', 'o-xylène', 'éthylbenzène', 'méthanol', 'fraction alvéolaire de silice cristalline (quartz)'].forEach(n => {
  const ok = vm.runInContext('!!getAgentFromDB(' + JSON.stringify(n) + ')', ctx);
  if (!ok) console.warn('Agent absent de la base :', n);
});

ctx.__mission = mission;
ctx.__data = fs.readFileSync(modele);
vm.runInContext(`
  var plan = fcPlan(__mission);
  console.log('Plan :', plan.onglets.map(function(o){ return 'GEH '+o.geh.num+' -> '+o.modele+' ('+o.series.length+' série(s))'; }));
  if (plan.alertes.length) console.log('Alertes :', plan.alertes);
  XlsmMoteur.Classeur.charger(__data).then(function(){});
`, ctx);
// generer('nodebuffer') plutôt que blob sous Node
vm.runInContext(`
  var _gen = XlsmMoteur.Classeur.prototype.generer;
  XlsmMoteur.Classeur.prototype.generer = function(){ return _gen.call(this, 'nodebuffer'); };
`, ctx);
vm.runInContext('construireFeuilleCalcul(__mission, __data)', ctx).then(r => {
  fs.writeFileSync(sortie, r.blob);
  console.log('Écrit :', sortie);
  console.log('Onglets :', r.onglets);
  if (r.alertes.length) console.log('À vérifier :', r.alertes);
}).catch(e => { console.error(e); process.exit(1); });
