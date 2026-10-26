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
  
  const headInjection = `<script>
window.UHT_GAME_CONFIG = {gameId:"vs20doghouse",serverUrl:"http://localhost:3000",environmentId:1,mode:"real"};
window.UHT_GAME_CONFIG_SRC = window.UHT_GAME_CONFIG;
window.UHT_PACKAGES_INFO_OBJ = {soundLoader:true,assets:[],packages:[],resources:[]};
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
window.UHT_EVENT_BROKER = {subscribe:function(){},publish:function(){},addEventListener:function(){}};
window.Html5GameManager = {balance:1000,init:function(){},getInstance:function(){return this;},onLoadingComplete:function(){}};
window.eventHandlers = {};
window.messagesToGame = [];

// 🛡️ Blindaje extremo de Element y Prototype para evitar null.setAttribute
if (typeof Element !== 'undefined') {
  const origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    try {
      if (!this) return;
      return origSetAttr ? origSetAttr.call(this, name, value) : (this[name] = value);
    } catch(e) {
      this[name] = value;
    }
  };
}

// Asegurar elementos raíz del DOM preventivamente
document.addEventListener("DOMContentLoaded", () => {
  ['gameContent', 'canvas', 'viewport', 'mainContainer'].forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement(id === 'canvas' ? 'canvas' : 'div');
      el.id = id;
      document.body.appendChild(el);
    }
  });
});
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

app.listen(3000, () => console.log('🎰 MOTOR COMPLETAMENTE ESTABILIZADO EN 3000'));
