const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'vs20doghouse_completo.html'), 'utf8');
  
  // Inyección total en el <head> para blindar el DOM y los objetos globales antes del parseo de scripts
  const headInjection = `<script>
window.UHT_GAME_CONFIG = {gameId:"vs20doghouse",serverUrl:"http://localhost:3000",environmentId:1,mode:"real"};
window.UHT_GAME_CONFIG_SRC = window.UHT_GAME_CONFIG;
window.UHT_PACKAGES_INFO_OBJ = {
  soundLoader: true,
  assets: [],
  packages: [],
  resources: []
};
window.UHT_SOUNDS_SIZES = {
  mp3: { "main": 100, "spin": 50, "win": 80 },
  ogg: { "main": 100, "spin": 50, "win": 80 },
  sounds: [
    { id: "main", size: 100 },
    { id: "spin", size: 50 },
    { id: "win", size: 80 }
  ]
};
window.UHT_DEVICE_TYPE = "DESKTOP";
window.UHT_UA_INFO = {browser:{name:"Chrome"}};
window.UHT_CONFIG = {MINI_MODE:false};
window.UHT_EVENT_BROKER = {
  subscribe: function(){},
  publish: function(){},
  addEventListener: function(){},
  fire: function(){}
};
window.Html5GameManager = {
  balance: 1000,
  init: function(){console.log("✅ Game init");},
  getInstance: function(){return this;},
  onLoadingComplete: function(){console.log("✅ Game complete");},
  getGameConfig: function(){return window.UHT_GAME_CONFIG;}
};
window.eventHandlers = {};
window.messagesToGame = [];

// 🛡️ CREACIÓN AUTOMÁTICA DE NODOS DOM QUE BUSCA EL SCALEHELPER
document.addEventListener("DOMContentLoaded", function() {
  const requiredIds = ["gameContent", "canvas", "viewport", "mainContainer", "wrapper"];
  requiredIds.forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement(id === 'canvas' ? 'canvas' : 'div');
      el.id = id;
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.position = 'absolute';
      document.body.appendChild(el);
    }
  });
});
console.log("✅ Parches estructurales y DOM inyectados");
</script>`;

  html = html.replace('<head>', '<head>' + headInjection);
  res.send(html);
});

app.use(express.static(path.join(__dirname)));

app.get(/\.js$/, (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(`(function(){})();`);
});

app.get(/\.json$/, (req, res) => {
  res.json({
    status: "SUCCESS",
    extend_events: {},
    assets: [],
    sounds: [
      { id: "main", size: 100 },
      { id: "spin", size: 50 },
      { id: "win", size: 80 }
    ]
  });
});

app.all('*', (req, res) => {
  res.json({
    status: "SUCCESS",
    balance: 1000,
    sounds: [
      { id: "main", size: 100 },
      { id: "spin", size: 50 },
      { id: "win", size: 80 }
    ]
  });
});

app.listen(3000, () => console.log('🎰 MOTOR PRAGMATIC - MODO BLINDADO ACTIVO EN 3000'));
