// timers.js - Timers CT et dictée vocale
// © 2025 Quentin THOMAS
// Chronomètres CT 15min, dictée vocale observations

// ===== DICTÉE VOCALE =====
var activeDictation=null;

function toggleDictation(prelId,subIdx){
  var SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    alert('La dictée vocale n\'est pas supportée par votre navigateur.\n\nUtilisez Chrome sur Android pour cette fonctionnalité.');
    return;
  }
  
  var key=prelId+'_'+subIdx;
  var btn=document.getElementById('dict-btn-'+prelId+'-'+subIdx);
  
  if(activeDictation&&activeDictation.key===key){
    activeDictation.recognition.stop();
    activeDictation=null;
    if(btn)btn.classList.remove('recording');
    return;
  }
  
  if(activeDictation){
    activeDictation.recognition.stop();
    var oldBtn=document.getElementById('dict-btn-'+activeDictation.prelId+'-'+activeDictation.subIdx);
    if(oldBtn)oldBtn.classList.remove('recording');
  }
  
  var recognition=new SpeechRecognition();
  recognition.lang='fr-FR';
  recognition.continuous=true;
  recognition.interimResults=true;
  
  var textarea=document.getElementById('obs-'+prelId+'-'+subIdx);
  var baseText=textarea?textarea.value:'';
  
  recognition.onresult=function(event){
    var transcript='';
    for(var i=event.resultIndex;i<event.results.length;i++){
      transcript+=event.results[i][0].transcript;
    }
    if(textarea){
      textarea.value=baseText+(baseText?' ':'')+transcript;
    }
    if(event.results[event.results.length-1].isFinal){
      baseText=textarea.value;
      updateSubFieldWithAutoDate(prelId,subIdx,'observations',textarea.value);
    }
  };
  
  recognition.onerror=function(event){
    if(event.error!=='aborted'&&event.error!=='no-speech'){
      alert('Erreur dictée : '+event.error);
    }
    activeDictation=null;
    if(btn)btn.classList.remove('recording');
  };
  
  recognition.onend=function(){
    if(textarea){
      updateSubFieldWithAutoDate(prelId,subIdx,'observations',textarea.value);
    }
    activeDictation=null;
    if(btn)btn.classList.remove('recording');
  };
  
  recognition.start();
  activeDictation={key:key,prelId:prelId,subIdx:subIdx,recognition:recognition};
  if(btn)btn.classList.add('recording');
}


console.log('✓ Timers chargé');
