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
window.UHT_GAME_CONFIG = {gameId:"vs20doghouse",serverUrl:"http://localhost:3000",environmentId:1};
window.UHT_GAME_CONFIG_SRC = window.UHT_GAME_CONFIG;
window.UHT_PACKAGES_INFO_OBJ = {soundLoader:true,assets:[],packages:[]};
window.UHT_SOUNDS_SIZES = {mp3:{},ogg:{},sounds:[{id:"main",size:100}]};
window.UHT_DEVICE_TYPE = "DESKTOP";
window.UHT_UA_INFO = {browser:{name:"Chrome"}};
window.UHT_CONFIG = {MINI_MODE:false};
window.UHT_EVENT_BROKER = {subscribe:function(){},publish:function(){},addEventListener:function(){}};
window.Html5GameManager = {balance:1000,init:function(){},getInstance:function(){return this;}};
window.eventHandlers = {};
window.messagesToGame = [];
</script>`;

  const bodyInjection = `<div id="gameContent" style="width:100%;height:100%;position:absolute;top:0;left:0;"></div>`;

  html = html.replace('<head>', '<head>' + headInjection);
  html = html.replace('</body>', bodyInjection + '</body>');
  
  res.send(html);
});

app.use(express.static(path.join(__dirname)));
app.get(/\.js$/, (req, res) => { res.set('Content-Type', 'application/javascript'); res.send(`(function(){})();`); });
app.get(/\.json$/, (req, res) => res.json({status: "SUCCESS"});
app.all('*', (req, res) => res.json({status: "SUCCESS"});

app.listen(3000, () => console.log('🎰 #gameContent EN BODY'));
