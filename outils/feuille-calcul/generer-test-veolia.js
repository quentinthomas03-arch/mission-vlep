// Banc d'essai de l'export Véolia (assistant « Choix Site ») sur une mission fictive.
// Usage : node outils/feuille-calcul/generer-test-veolia.js "<modèle .xlsm>" "<sortie .xlsm>" "<site tel qu'écrit dans l'onglet VEOLIA>"
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const racine = path.join(__dirname, '..', '..');
const [modele, sortie, site] = process.argv.slice(2);
const store = {};
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Uint8Array, ArrayBuffer,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {} }; } },
  navigator: {}, alert: m => console.log('[alert]', m), confirm: () => true
};
ctx.window = ctx;
vm.createContext(ctx);
ctx.JSZip = require(path.join(racine, 'js', 'jszip.min.js'));
['js/database.js', 'js/state.js', 'js/terrain.js', 'js/export-excel.js', 'js/xlsm-moteur.js', 'js/feuille-calcul.js', 'js/veolia.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(racine, f), 'utf8'), ctx, { filename: f }));
vm.runInContext('state.agentsDB = JSON.parse(JSON.stringify(BUILTIN_DB));', ctx);
if (!site) { console.error('Indiquer le site Véolia (3e argument).'); process.exit(1); }
ctx.__site = site;
ctx.__data = fs.readFileSync(modele);
const mission = vm.runInContext(`(function(){
  var m = createEmptyMission();
  m.clientSite = 'SITE VEOLIA TEST'; m.preleveur = 'Quentin THOMAS'; m.debitmetre = '24367'; m.debitmetreType = 'piston'; m.veoliaSite = __site;
  m.gehs = [{id:1,num:1,name:'Tri'},{id:2,num:2,name:'Maintenance'}];
  var jours = ['2026-10-13','2026-10-14','2026-10-15'];
  m.conditionsAmbiantes = jours.map(function(d){ return {date:d,tempI:'18',tempF:'20',pressionI:'1005',pressionF:'1007',humiditeI:'60',humiditeF:'58'}; });
  function prel(id,gehId,agent,n){ var p={id:id,gehId:gehId,type:'8h',isReglementaire:true,agents:[{name:agent}],subPrelevements:[]};
    for(var i=0;i<n;i++){ var s={id:id*10+i,operateur:'Op '+(i+1),date:jours[i],plages:[{debut:'07:00',fin:'11:00'},{debut:'12:00',fin:'15:00'}],dureeExpo:'07:00',epiType:'sans objet',agentData:{}};
      s.agentData[agent]={numPompe:'P'+i,debitInitial:'2,01',debitFinal:'1,98',refEchantillon:agent.slice(0,3).toUpperCase()+'-G'+gehId+'-'+(i+1)}; p.subPrelevements.push(s); }
    return p; }
  m.prelevements=[prel(1,1,'plomb métallique et ses composés',3), prel(2,1,'chrome VI et ses composés',3), prel(3,2,'plomb métallique et ses composés',3), prel(4,2,'toluène',3)];
  return m;
})()`, ctx);
ctx.__mission = mission;
vm.runInContext(`var _gen = XlsmMoteur.Classeur.prototype.generer; XlsmMoteur.Classeur.prototype.generer = function(){ return _gen.call(this, 'nodebuffer'); };`, ctx);
vm.runInContext('construireFeuilleCalcul(__mission, __data)', ctx).then(r => {
  fs.writeFileSync(sortie, r.blob);
  console.log('Écrit :', sortie);
  console.log('Onglets :', r.onglets);
  if (r.alertes.length) console.log('À vérifier :', r.alertes);
}).catch(e => { console.error(e); process.exit(1); });
