const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const PAYLOAD = `<script>
(function(){
  if (typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && AudioCtx.prototype && AudioCtx.prototype.decodeAudioData) {
      AudioCtx.prototype.decodeAudioData = function(audioData, successCallback, errorCallback) {
        try {
          const sampleRate = 44100;
          const frames = sampleRate * 1;
          const buffer = this.createBuffer(2, frames, sampleRate);
          if (successCallback) successCallback(buffer);
          return Promise.resolve(buffer);
        } catch (e) {
          if (errorCallback) errorCallback(e);
          return Promise.reject(e);
        }
      };
    }
  }

  const origAtob = window.atob;
  window.atob = function(str) {
    try {
      return origAtob.call(window, str);
    } catch (e) {
      return "\\xff\\xfb\\x90\\x00\\x00\\x00\\x00\\x00";
    }
  };

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
  var orig = document.getElementById;
  document.getElementById = function(id) {
    var el = orig.call(document, id);
    if (!el) {
      var newEl = document.createElement('div');
      newEl.id = id;
      if (id === 'ScaleRoot') {
        newEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;margin:0;padding:0;overflow:hidden;';
      } else if (id === 'ScaleRootLoading') {
        newEl.style.display = 'none';
      } else {
        newEl.style.cssText = 'width:100%;height:100%;position:relative;';
      }
      if (!newEl.setAttribute) {
        newEl.setAttribute = function(k, v) { this[k] = v; };
      }
      document.documentElement.appendChild(newEl);
      return newEl;
    }
    return el;
  };
})();

// MOCK GLOBAL DE WRAPPER EN TODOS LOS POSIBLES NAMESPACES
const mockWrapper = {
  domElement: document.createElement('div'),
  onLoad: function() {},
  addChild: function() {},
  removeChild: function() {}
};

window.Wrapper = mockWrapper;
window.Engine = window.Engine || {};
window.Engine.Wrapper = mockWrapper;
window.Game = window.Game || {};
window.Game.Wrapper = mockWrapper;
window.Core = window.Core || {};
window.Core.Wrapper = mockWrapper;

window.UHT_GAME_CONFIG = {
  gameId: "vs20doghouse",
  serverUrl: "http://localhost:3000",
  environmentId: 1,
  mode: "real",
  cdnUrl: "http://localhost:3000"
};
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
    { id: "main", name: "main", url: "", size: 100 },
    { id: "spin", name: "spin", url: "", size: 50 },
    { id: "win", name: "win", url: "", size: 80 }
  ]
};

window.UHT_DEVICE_TYPE = "DESKTOP";
window.UHT_UA_INFO = { browser: { name: "Chrome" } };
window.UHT_CONFIG = { MINI_MODE: false };

window.UHT_EVENT_BROKER = {
  subscribe: function() {},
  publish: function() {},
  addEventListener: function() {}
};
window.UHTEventBroker = window.UHT_EVENT_BROKER;

window.Html5GameManager = {
  balance: 1000,
  init: function() {},
  getInstance: function() { return this; },
  onLoadingComplete: function() {}
};
window.eventHandlers = {};
window.messagesToGame = [];
</script>`;

app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'vs20doghouse_completo.html'), 'utf8');
  res.send(PAYLOAD + html);
});

app.get(/bootstrap/, (req, res) => { 
  res.set('Content-Type', 'application/javascript'); 
  res.send(`(function(){})();`); 
});

app.get(/build/, (req, res) => { 
  res.set('Content-Type', 'application/javascript'); 
  res.send(`(function(){})();`); 
});

app.use(express.static(path.join(__dirname)));

app.get(/\.js$/, (req, res) => { 
  res.set('Content-Type', 'application/javascript'); 
  res.send(`(function(){})();`); 
});

app.get(/\.json$/, (req, res) => res.json({
  status: "SUCCESS",
  sounds: [
    { id: "main", name: "main", url: "", size: 100 },
    { id: "spin", name: "spin", url: "", size: 50 },
    { id: "win", name: "win", url: "", size: 80 }
  ],
  assets: []
}));

app.get(/\.css$/, (req, res) => res.set('Content-Type','text/css').send('body{}'));

app.all('*', (req, res) => res.json({
  status: "SUCCESS",
  balance: 1000,
  sounds: [
    { id: "main", name: "main", url: "", size: 100 },
    { id: "spin", name: "spin", url: "", size: 50 },
    { id: "win", name: "win", url: "", size: 80 }
  ]
}));

app.listen(3000, () => console.log('🚀 100% ULTIMATE WRAPPER MOCK'));
