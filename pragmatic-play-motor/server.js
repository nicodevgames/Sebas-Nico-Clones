const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const GLOBALS = `<script>window.UHT_GAME_CONFIG={gameId:"vs20doghouse",serverUrl:"http://localhost:3000"};window.UHT_EVENT_BROKER={subscribe:function(){},publish:function(){},addEventListener:function(){}};window.Html5GameManager={init:function(){},getInstance:function(){return this}};window.eventHandlers={};window.messagesToGame=[];</script>`;

app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'vs20doghouse_completo.html'), 'utf8');
  html = html.replace('<head>', '<head>' + GLOBALS);
  res.send(html);
});

// BOOTSTRAP - VÁLIDO PARA TODAS LAS VARIANTES
app.get(/bootstrap/, (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(fs.readFileSync(path.join(__dirname, 'bootstrap-stub.js'), 'utf8'));
});

// STATIC
app.use(express.static(path.join(__dirname)));

// JS - VÁLIDO
app.get(/\.js$/, (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send('(function(){console.log("✅ Script loaded");})();');
});

// OTROS
app.get(/\.json$/, (req, res) => res.json({ok:1}));
app.get(/\.css$/, (req, res) => res.set('Content-Type','text/css').send('body{}'));
app.get(/\.(png|jpg|svg|gif)$/, (req, res) => {
  res.set('Content-Type','image/png');
  res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64'));
});

// API
app.get('/health', (req, res) => res.json({ok:1}));
app.post('/gs2c/gameService', (req, res) => res.json({status:'SUCCESS',balance:1000}));
app.post('/gs2c/reloadBalance.do', (req, res) => res.json({balance:1000}));
app.all('*', (req, res) => res.json({ok:1}));

app.listen(3000, () => console.log('🎰 MOTOR FINAL v3 - BOOTSTRAP VÁLIDO'));
