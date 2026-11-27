(function(){
  console.log("✅ Build.js loading");
  
  var gameManager = window.Html5GameManager;
  if(gameManager && gameManager.init) {
    console.log("✅ Iniciando juego...");
    gameManager.init();
    if(gameManager.onLoadingComplete) {
      setTimeout(function() {
        gameManager.onLoadingComplete();
        console.log("✅ Juego cargado");
      }, 500);
    }
  }
  
  // Enviar evento de carga completa
  if(window.UHT_EVENT_BROKER && window.UHT_EVENT_BROKER.publish) {
    window.UHT_EVENT_BROKER.publish('gameLoaded', {status: 'ready'});
  }
})();
