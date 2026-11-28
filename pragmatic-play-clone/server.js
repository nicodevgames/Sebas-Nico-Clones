// Proxy al demo público de Pragmatic Play para Dog House (vs20doghouse).
// En vez de falsificar el protocolo, reenvía todo al host del demo y reescribe
// sus URLs absolutas a relativas, así el navegador habla solo con este servidor.
const express = require('express');
const path = require('path');
const motor = require('./engine/motor');
const generador = require('./engine/generador');
const harvest = require('./engine/harvest');

const DEMO = 'https://demogamesfree.pragmaticplay.net';
const JUEGO = '/gs2c/common/v3/games-html5/games/vs/vs20doghouse/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const app = express();
app.disable('x-powered-by');
app.use(express.raw({ type: '*/*', limit: '20mb' }));

let cookies = '';

function guardarCookies(r) {
  const puestas = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  for (const c of puestas) {
    const par = c.split(';')[0];
    const nombre = par.split('=')[0];
    cookies = cookies.split('; ').filter((x) => x && x.split('=')[0] !== nombre).concat(par).join('; ');
  }
}

function cabeceras(req) {
  const h = {
    'user-agent': UA,
    referer: DEMO + '/',
    accept: req.headers.accept || '*/*',
  };
  if (req.headers['content-type']) h['content-type'] = req.headers['content-type'];
  if (req.headers['accept-language']) h['accept-language'] = req.headers['accept-language'];
  if (cookies) h.cookie = cookies;
  return h;
}

const ADAPTADOR = '<script>window.UHT_PACKAGES_INFO=\'{"languages":[]}\';window.UHT_SCRIPTS_SIZE=\'build.js?key=442773:3131544\';window.__CFG=__CONFIG__;window.gameConfig=JSON.parse(window.__CFG);' +
  '(function(){var d=document.createElement("div");d.id="__dbg";d.style.cssText="position:fixed;z-index:99999;bottom:0;left:0;right:0;max-height:38%;overflow:auto;background:rgba(0,0,0,.85);color:#7f7;font:11px monospace;padding:4px;white-space:pre-wrap;pointer-events:none";document.addEventListener("DOMContentLoaded",function(){document.body.appendChild(d)});' +
  'window.__dbg=function(m){try{d.textContent+=(d.textContent?"\\n":"")+m;d.scrollTop=d.scrollHeight}catch(e){}};' +
  'window.addEventListener("error",function(e){var t=e.target;if(t&&(t.src||t.href))window.__dbg("[RES-FAIL] "+(t.src||t.href));else window.__dbg("[JS-ERR] "+(e.message||e.error)+" @"+(e.filename||"")+":"+e.lineno)},true);' +
  'var of=window.fetch;if(of)window.fetch=function(u,o){return of(u,o).then(function(r){if(!r.ok)window.__dbg("[FETCH "+r.status+"] "+u);return r}).catch(function(x){window.__dbg("[FETCH-ERR] "+u+" :: "+x.message);throw x})};' +
  'var ox=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var s=this;this.addEventListener("load",function(){if(s.status>=400)window.__dbg("[XHR "+s.status+"] "+u)});this.addEventListener("error",function(){window.__dbg("[XHR-ERR] "+u)});return ox.call(this,m,u)};' +
  'window.addEventListener("DOMContentLoaded",function(){window.__dbg("[stage] DOM listo, esperando Loader...")});' +
  'setInterval(function(){var L=window.Loader;window.__dbg("[tick] Loader="+(L?"SI":"no")+" GAME_URL="+(window.UHT_CONFIG&&window.UHT_CONFIG.GAME_URL||"-")+" scripts="+document.scripts.length+" step="+(window.LoadingStep!==undefined?window.LoadingStep:"-"))},2000);})();' +
  '</script>';
const GOOG = '<script>window.goog=window.goog||{provide:function(){},require:function(){},define:function(){},exportSymbol:function(){},exportProperty:function(){}};' +
  'window.goog.dom=window.goog.dom||{};window.goog.isFunction=function(f){return typeof f=="function"};' +
  'window.goog.isDef=function(v){return v!==undefined};window.goog.isDefAndNotNull=function(v){return v!=null};' +
  'window.goog.inherits=function(c,p){function F(){this.constructor=c}F.prototype=p.prototype;c.prototype=new F();c.superClass_=p.prototype};' +
  'window.goog.array={forEach:function(a,f){for(var i=0;i<a.length;i++)f(a[i],i,a)}};' +
  'window.Wrapper={domElement:document.createElement("div"),onLoad:function(){},addChild:function(){},removeChild:function(){},visible:true,alpha:1};' +
  'window.SystemMessageManager={Wrapper:window.Wrapper,OnLoad:function(){},getInstance:function(){return this}};</script>';

// Cache de sesiones por juego: evita martillar openGame.do (nos rate-limita
// con una pagina de error 200 sin Location). Cada destino vive ~8 minutos.
const cacheSesiones = {}; // juego -> { destino, ts }
const cooldownHasta = {}; // juego -> ts hasta el cual NO reintentar upstream

const HOSTS = [
  'https://demogamesfree.pragmaticplay.net',
  'https://demogamesfree-asia.pragmaticplay.net'
];

async function obtenerDestino(juego, req) {
  const c = cacheSesiones[juego];
  if (c && Date.now() - c.ts < 480000) return c.destino;
  if (cooldownHasta[juego] && Date.now() < cooldownHasta[juego]) {
    throw new Error('demo en enfriamiento (' + Math.ceil((cooldownHasta[juego] - Date.now()) / 1000) + 's)');
  }
  let ultimoError = null;
  // Backoff creciente: 1s, 4s, 8s. Alterna hosts.
  const esperas = [1000, 4000, 8000];
  for (let i = 0; i < 3; i++) {
    const host = HOSTS[i % HOSTS.length];
    try {
      const r = await fetch(host + '/gs2c/openGame.do?gameSymbol=' + juego + '&jurisdiction=99&lang=en', { headers: cabeceras(req), redirect: 'manual' });
      guardarCookies(r);
      const destino = r.headers.get('location');
      if (destino) {
        cacheSesiones[juego] = { destino, ts: Date.now() };
        return destino;
      }
      const cuerpo = await r.text();
      ultimoError = new Error(cuerpo.includes('error has occurred') ? 'demo limitado temporalmente' : 'openGame HTTP ' + r.status);
    } catch (e) { ultimoError = e; }
    await new Promise(ok => setTimeout(ok, esperas[i]));
  }
  if (c) return c.destino;
  cooldownHasta[juego] = Date.now() + 90000; // 90s de enfriamiento por juego
  throw ultimoError || new Error('openGame agoto reintentos');
}

// ══════════ PLATAFORMA PROPIA (motor + matematica local) ══════════
const JUGADOR_HTML = path.join(__dirname, 'public', 'jugador.html');
const CUENTA_LOCAL = 'jugador1';

function leerJson(req) {
  if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8')); } catch (e) { return {}; } }
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

app.get('/api/games', (req, res) => res.json({ juegos: motor.listarJuegos() }));

app.get('/api/:juego/init', (req, res) => {
  const g = motor.cargarJuego(req.params.juego);
  if (!g) return res.status(404).json({ error: 'juego inexistente' });
  const cta = motor.cuenta(CUENTA_LOCAL);
  const muestra = motor.girarGrid(g, 0); // grid[col][fila]
  const vista = muestra.map(col => col.map(id => ({ id, glifo: (g.simbolos[id] || {}).glifo || '?' })));
  res.json({
    juego: g.id, nombre: g.nombre, reels: g.reels, rows: g.rows,
    lineas: g.lineas, lineas_count: g.lineas.length,
    monedas: g.monedas, catalogo: g.simbolos,
    simbolos: vista, saldo: cta.saldo
  });
});

app.post('/api/:juego/spin', (req, res) => {
  const datos = leerJson(req);
  const coin = Number(datos.coin) || 0.1;
  const usuario = String(datos.usuario || req.headers['x-usuario'] || 'invitado').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'invitado';
  try {
    const r = motor.jugar(usuario, req.params.juego, coin);
    if (!r.error) r.mejorMult = r.premios.length ? Math.max.apply(null, r.premios.map(p => p.mult || 1)) : 1;
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Marca blanca editable sin tocar codigo (data/marca.json)
const storage = require('./engine/storage');
app.get('/api/marca', (req, res) => {
  res.json(storage.leer('marca', {
    nombre: 'PP SLOTS', lema: 'PLATAFORMA PROPIA',
    colorAcento: '#f6a91d', pie: 'POWERED BY PP SLOTS ENGINE'
  }));
});
app.post('/api/marca', (req, res) => {
  const d = leerJson(req);
  if (!d || typeof d !== 'object') return res.status(400).json({ error: 'payload invalido' });
  const actual = storage.leer('marca', {});
  const nueva = Object.assign(actual, d);
  storage.guardar('marca', nueva);
  res.json({ ok: true, marca: nueva });
});

// Panel de cuentas (operador)
app.get('/api/cuentas', (req, res) => res.json(storage.todos()));

app.get('/jugador', (req, res) => res.sendFile(JUGADOR_HTML));

// ══════════ CLONADOR UNIVERSAL (plantilla de juegos) ══════════
// POST /api/clonar  { id, tema?, nombre?, fixture? }
//   con fixture (texto doInit gs2c) => importa matematica real
//   sin fixture => genera juego nuevo de plantilla tematica
app.post('/api/clonar', (req, res) => {
  const d = leerJson(req);
  const id = String(d.id || '').replace(/[^a-z0-9-]/gi, '');
  if (!id) return res.status(400).json({ error: 'falta id' });
  try {
    const opt = { nombre: d.nombre, tema: d.tema, glifoWild: d.glifoWild, glifoScatter: d.glifoScatter };
    const r = d.fixture
      ? generador.desdeFixture(String(d.fixture), id, opt)
      : generador.base(id, opt);
    res.json({ ok: true, juego: id, ruta: r.ruta, simbolos: r.juego.simbolos_ids });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════ HARVEST: espejo offline de assets oficiales ══════════
// POST /api/harvest { juego: 'vs20xxxx', max? }
//   Descarga al mirror local TODA la cadena de assets del juego (art, js,
//   sonidos, atlas). Luego el clon sirve esos assets desde /mirror/...
let cosechando = false;
app.post('/api/harvest', async (req, res) => {
  const d = leerJson(req);
  const juego = String(d.juego || '').replace(/[^a-z0-9-]/gi, '');
  if (!juego) return res.status(400).json({ error: 'falta juego' });
  if (cosechando) return res.status(429).json({ error: 'hay una captura en curso' });
  cosechando = true;
  try {
    const log = await harvest.capturar(juego, { max: Number(d.max) || 400 });
    res.json({ ok: true, juego, archivos: log.bajados.length, kb: log.kb, fallidos: log.fallidos.length, resumen: log.resumen });
  } catch (e) {
    res.status(502).json({ error: e.message });
  } finally { cosechando = false; }
});

// espejo de assets descargados (offline)
app.use('/mirror', express.static(harvest.DIR_MIRROR, { maxAge: '7d' }));
// caratulas oficiales (simbolo -> url de imagen real de Pragmatic)
app.get('/caratulas.json', (req, res) => {
  try { res.sendFile(path.join(__dirname, 'engine', 'caratulas.json')); }
  catch (e) { res.json({}); }
});

// ══════════ PUENTE INFINITE ABYSS (dinero real, ledger seamless) ══════════
const abyss = require('./engine/abyssBridge');
function caratulas() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'engine', 'caratulas.json'), 'utf8')); }
  catch (e) { return {}; }
}

app.get('/api/abyss/estado', (req, res) => res.json({ activo: abyss.activo(), url: abyss.CFG.url || null, providerId: abyss.CFG.providerId }));
// Configurar el puente sin reiniciar: {"url":"https://infinite-abyss.com/_svc/api/hub/v1","secret":"..."}
app.post('/api/abyss/configurar', (req, res) => {
  const d = leerJson(req);
  if (!d || typeof d !== 'object') return res.status(400).json({ error: 'payload invalido' });
  abyss.configurar(d);
  res.json({ ok: true, activo: abyss.activo(), url: abyss.CFG.url, providerId: abyss.CFG.providerId });
});

// Catalogo en formato GameDTO de Infinite Abyss (para syncCatalog del proveedor)
app.get('/api/abyss/catalogo', (req, res) => {
  const items = [];
  const enPool = storage.leer('seed_catalogo', []);
  for (const s of enPool) {
    const imagen = (caratulas()[s.id] || '').replace('™', '%E2%84%A2');
    items.push({
      externalId: s.id,
      title: s.nombre,
      category: 'slots',
      mechanic: s.id.includes('megaways') ? 'megaways' : 'lines',
      rtp: 96.5,
      volatility: 'medium',
      images: imagen ? { thumb: imagen, banner: imagen } : undefined,
      hasDemo: true
    });
  }
  res.json({ providerId: abyss.CFG.providerId, total: items.length, items });
});

// Spin dinero real: bet -> resultado (motor local) -> win. Autoritativo en servidor.
app.post('/api/spin-real', async (req, res) => {
  if (!abyss.activo()) return res.status(503).json({ error: 'puente abyss no configurado' });
  const d = leerJson(req);
  const token = String(d.token || '').trim();
  const coin = Number(d.coin) || 0.1;
  const gameId = String(d.gameId || 'vs20doghouse').replace(/[^a-z0-9-]/gi, '');
  if (!token) return res.status(400).json({ error: 'falta token de sesion' });
  const g = motor.cargarJuego(gameId);
  if (!g) return res.status(404).json({ error: 'juego inexistente' });

  const lineas = g.lineas.length;
  const apuestaU = abyss.aUnidades(lineas * coin);
  const txBase = 'pp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const roundId = 'rnd-' + txBase;

  try {
    const bet = await abyss.walletCall('bet', { sessionToken: token, transactionId: txBase + '-b', roundId, gameId, amount: apuestaU });
    if (bet.estado !== 200 || bet.json.status !== 'OK') {
      return res.status(bet.estado === 200 ? 400 : bet.estado).json({ error: 'bet rechazado', detalle: bet.json });
    }
    const grid = motor.girarGrid(g, 0);
    const ev = motor.evaluar(g, grid, coin);
    const premioTotal = +(ev.premios.reduce((a, p) => a + p.monto, 0) + ev.scatterMonto).toFixed(2);
    let winRes = null;
    if (premioTotal > 0) {
      const win = await abyss.walletCall('win', { sessionToken: token, transactionId: txBase + '-w', roundId, gameId, amount: abyss.aUnidades(premioTotal), roundClosed: true });
      if (win.estado !== 200 || win.json.status !== 'OK') {
        // rollback por consistencia (premio no acreditado -> devuelve la apuesta)
        await abyss.walletCall('rollback', { sessionToken: token, transactionId: txBase + '-r', referenceTransactionId: txBase + '-b', roundId });
        return res.status(500).json({ error: 'win rechazado, apuesta revertida', detalle: win.json });
      }
      winRes = win.json;
    }
    const saldoFinal = winRes ? winRes.balance : (bet.json.balance || null);
    res.json({
      grid, premios: ev.premios, scatters: ev.scatters, scatterMonto: ev.scatterMonto,
      apuesta: lineas * coin, premio: premioTotal,
      saldoUnidades: String(saldoFinal), saldo: saldoFinal != null ? abyss.decimal(saldoFinal) : null,
      moneda: (winRes || bet.json).currency, roundId, tx: txBase
    });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Saldo directo por token (consulta balance al Hub, sin mover dinero)
app.post('/api/abyss/saldo-directo', async (req, res) => {
  if (!abyss.activo()) return res.status(503).json({ error: 'puente no configurado' });
  const d = leerJson(req);
  const token = String(d.token || '').trim();
  if (!token) return res.json({ error: 'sin token' });
  try {
    const s = await abyss.saldo(token);
    res.json({ saldo: abyss.decimal(s.unidades), moneda: s.moneda });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Runner de dinero real (el Hub de Abyss llega aqui desde launchGame)
app.get('/real/:gameId', (req, res) => {
  const gameId = String(req.params.gameId || 'vs20doghouse').replace(/[^a-z0-9-]/gi, '');
  res.sendFile(path.join(__dirname, 'public', 'real.html'));
});
app.get('/real', (req, res) => res.sendFile(path.join(__dirname, 'public', 'real.html')));

// ══════════ LOBBY + JUEGOS ORIGINALES (cliente real de Pragmatic) ══════════
// Catalogo DINAMICO: persistido en data/catalogo.json, editable por API.
const DEFAULT_CATALOGO = [
  { id: 'vs20doghouse', nombre: 'The Dog House', categoria: 'Populares' },
  { id: 'vs20doghousemegaways', nombre: 'The Dog House Megaways', categoria: 'Populares' },
  { id: 'vs20sweetbonanza', nombre: 'Sweet Bonanza', categoria: 'Populares' },
  { id: 'vs20gatesofolympus', nombre: 'Gates of Olympus', categoria: 'Populares' },
  { id: 'vs20sugarrush', nombre: 'Sugar Rush', categoria: 'Populares' },
  { id: 'vs20starlightprincess', nombre: 'Starlight Princess', categoria: 'Populares' },
  { id: 'vs20bigbassbonanza', nombre: 'Big Bass Bonanza', categoria: 'Pesca' },
  { id: 'vs20biggerbassbonanza', nombre: 'Bigger Bass Bonanza', categoria: 'Pesca' },
  { id: 'vs20bigbasssplash', nombre: 'Big Bass Splash', categoria: 'Pesca' },
  { id: 'vs20fruitparty', nombre: 'Fruit Party', categoria: 'Frutales' },
  { id: 'vs20fruitparty2', nombre: 'Fruit Party 2', categoria: 'Frutales' },
  { id: 'vs20wolfgold', nombre: 'Wolf Gold', categoria: 'Clasicos' },
  { id: 'vs20firestrike', nombre: 'Fire Strike', categoria: 'Clasicos' },
  { id: 'vs20releasethekraken', nombre: 'Release the Kraken', categoria: 'Aventura' },
  { id: 'vs20greatrhinomegaways', nombre: 'Great Rhino Megaways', categoria: 'Aventura' },
  { id: 'vs20wildwestgold', nombre: 'Wild West Gold', categoria: 'Aventura' },
  { id: 'vs20aztecgems', nombre: 'Aztec Gems', categoria: 'Clasicos' },
  { id: 'vs20hotfiesta', nombre: 'Hot Fiesta', categoria: 'Fiesta' }
];
let CATALOGO = storage.leer('catalogo', DEFAULT_CATALOGO);
if (!Array.isArray(CATALOGO) || !CATALOGO.length) CATALOGO = DEFAULT_CATALOGO;
function salvarCatalogo() { storage.guardar('catalogo', CATALOGO); }

// Clonador completo en 1 paso: valida contra Pragmatic, calienta sesion,
// crea plantilla y agrega al catalogo visible.
app.post('/api/clonar-completo', async (req, res) => {
  const d = leerJson(req);
  const id = String(d.id || '').replace(/[^a-z0-9-]/gi, '');
  if (!id) return res.status(400).json({ error: 'falta id (ej: vs20flaminghot)' });
  const nombre = String(d.nombre || id).slice(0, 60);
  const categoria = String(d.categoria || 'Novedades').slice(0, 24);
  try {
    const resultado = { id, nombre, pasos: {} };
    try {
      const dest = await obtenerDestino(id, req);
      resultado.pasos.sesionPragmatic = 'ok';
      resultado.pasos.urlCliente = dest.split('?')[0];
    } catch (e) { resultado.pasos.sesionPragmatic = 'pendiente (' + e.message + ')'; }
    if (!motor.cargarJuego(id)) {
      generador.base(id, { nombre, tema: d.tema || 'clasico' });
      resultado.pasos.plantilla = 'creada';
    } else resultado.pasos.plantilla = 'ya existia';
    if (d.fixture) {
      generador.desdeFixture(String(d.fixture), id, { nombre });
      resultado.pasos.paytableReal = 'importada';
    }
    if (!CATALOGO.some(j => j.id === id)) {
      CATALOGO.unshift({ id, nombre, categoria });
      salvarCatalogo();
      resultado.pasos.catalogo = 'agregado';
    } else resultado.pasos.catalogo = 'ya estaba';
    res.json({ ok: true, ...resultado });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gestion del catalogo
app.get('/api/catalogo', (req, res) => {
  res.json(CATALOGO.map(j => ({
    ...j, href: '/jugar/' + j.id,
    plantillaExiste: !!motor.cargarJuego(j.id)
  })));
});
app.post('/api/catalogo/agregar', (req, res) => {
  const d = leerJson(req);
  const id = String(d.id || '').replace(/[^a-z0-9-]/gi, '');
  if (!id) return res.status(400).json({ error: 'falta id' });
  if (!CATALOGO.some(j => j.id === id)) {
    CATALOGO.unshift({ id, nombre: String(d.nombre || id).slice(0, 60), categoria: String(d.categoria || 'Novedades').slice(0, 24) });
    salvarCatalogo();
  }
  res.json({ ok: true, total: CATALOGO.length });
});
app.post('/api/catalogo/quitar', (req, res) => {
  const d = leerJson(req);
  CATALOGO = CATALOGO.filter(j => j.id !== String(d.id || ''));
  salvarCatalogo();
  res.json({ ok: true, total: CATALOGO.length });
});

// ══════════ WALLET (bisagra para dinero real) ══════════
// Ledger persistente; enchufa tu pasarela (MercadoPago/cripto/etc) a estos
// endpoints desde tu backend de pagos.
let transacciones = storage.leer('transacciones', []);
function anotarTx(tx) {
  transacciones.unshift(tx);
  transacciones = transacciones.slice(0, 5000);
  storage.guardar('transacciones', transacciones);
}
app.post(['/api/wallet/depositar', '/api/wallet/deposito'], (req, res) => {
  const d = leerJson(req);
  const usuario = String(d.usuario || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const monto = +(+d.monto || 0).toFixed(2);
  if (!usuario || monto <= 0) return res.status(400).json({ error: 'usuario y monto requeridos' });
  const cta = storage.aplicar(usuario, monto, {});
  const tx = { id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), usuario, tipo: 'deposito', monto, saldo: cta.saldo, fecha: new Date().toISOString() };
  anotarTx(tx);
  res.json({ ok: true, ...tx });
});
app.post('/api/wallet/retirar', (req, res) => {
  const d = leerJson(req);
  const usuario = String(d.usuario || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const monto = +(+d.monto || 0).toFixed(2);
  if (!usuario || monto <= 0) return res.status(400).json({ error: 'usuario y monto requeridos' });
  const cta = storage.usuario(usuario);
  if (monto > cta.saldo) return res.status(400).json({ error: 'saldo insuficiente', saldo: cta.saldo });
  const c2 = storage.aplicar(usuario, -monto, {});
  const tx = { id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), usuario, tipo: 'retiro', monto, saldo: c2.saldo, fecha: new Date().toISOString() };
  anotarTx(tx);
  res.json({ ok: true, ...tx });
});
app.get('/api/wallet/saldo/:usuario', (req, res) => {
  const c = storage.usuario(String(req.params.usuario).replace(/[^a-zA-Z0-9_-]/g, ''));
  res.json({ usuario: req.params.usuario, saldo: c.saldo });
});
app.get('/api/wallet/transacciones/:usuario', (req, res) => {
  res.json(transacciones.filter(t => t.usuario === req.params.usuario).slice(0, 100));
});

app.get('/lobby', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lobby.html')));

// /jugar/:id →Embed del CLIENTE REAL del demo (el mismo juego, misma fisica)
app.get('/jugar/:juego', async (req, res) => {
  const juego = String(req.params.juego || 'vs20doghouse').replace(/[^a-z0-9-]/gi, '');
  try {
    const destino = await obtenerDestino(juego, req);
    const mMgc = /mgckey=([^&]+)/.exec(destino);
    if (mMgc) { sesion = { mgckey: decodeURIComponent(mMgc[1]), ts: Date.now() }; }
    res.type('html').send(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + juego + '</title>' +
      '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style></head><body>' +
      '<iframe src="' + destino + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>' +
      '</body></html>');
  } catch (e) {
    res.status(200).type('html').send('<meta http-equiv="refresh" content="8"><body style="background:#000;color:#f6a91d;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">Abriendo ' + juego + '… reintentando</body>');
  }
});

// Jugador propio (motor local) en /propio
app.get('/propio', (req, res) => res.sendFile(path.join(__dirname, 'public', 'jugador.html')));
app.get('/propio/:juego', (req, res) => res.sendFile(path.join(__dirname, 'public', 'jugador.html')));
// Root = LOBBY
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lobby.html')));

// ══════════ IMPORTADOR MASIVO ══════════
const masivo = require('./engine/catalogo-masivo');
const importador = require('./engine/importador');

// Cargar catalogo persistente y anadir seed sin pisar lo existente
let seed = storage.leer('seed_catalogo', null);
if (!seed || !seed.length) {
  seed = masivo.semilla().map(j => ({ ...j, categoria: 'Por Verificar', estado: 'pendiente' }));
  // los ya presentes en CATALOGO arrancan activos
  for (const s of seed) {
    if (CATALOGO.some(c => c.id === s.id)) { s.estado = 'activo'; s.categoria = (CATALOGO.find(c => c.id === s.id) || {}).categoria || s.categoria; }
  }
  storage.guardar('seed_catalogo', seed);
}

// Validador background: abre openGame.do para pendientes, uno cada 12s.
// activo = tiene sesion; rate-limit = vuelve a la cola (retry); 404 = no existe.
let idxValidar = 0;
setInterval(() => {
  const pend = seed.filter(s => s.estado === 'pendiente' || /limitado/.test(s.estado || ''));
  if (!pend.length) return;
  const s = pend[idxValidar++ % pend.length];
  obtenerDestino(s.id, { headers: {} })
    .then(() => { s.estado = 'activo'; storage.guardar('seed_catalogo', seed); console.log('[validador] activo:', s.id); })
    .catch(e => {
      const msg = String(e.message || '');
      if (/limitado|enfriamiento/.test(msg)) { s.estado = 'pendiente'; /* retry en la vuelta */ }
      else { s.estado = 'no disponible (' + msg.slice(0, 30) + ')'; }
      storage.guardar('seed_catalogo', seed);
    });
}, 12000).unref();

app.get('/api/masivo/estado', (req, res) => {
  const activos = seed.filter(s => s.estado === 'activo').length;
  const pend = seed.filter(s => s.estado === 'pendiente').length;
  res.json({
    total: seed.length, activos, pendientes: pend,
    noDisponibles: seed.length - activos - pend,
    detalle: seed
  });
});
app.post('/api/masivo/importar', async (req, res) => {
  // fusiona seed con catalogo oficial por getGameList (si estuviera accesible)
  try {
    const lista = await importador.traerLista('en');
    const norm = importador.normalizar(lista);
    let nuevos = 0;
    for (const j of norm) {
      if (!seed.some(s => s.id === j.id)) {
        seed.push({ ...j, estado: 'pendiente' });
        nuevos++;
      }
    }
    storage.guardar('seed_catalogo', seed);
    res.json({ ok: true, nuevos, total: seed.length });
  } catch (e) { res.json({ ok: false, nota: 'getGameList no disponible, se usa seed interna', seedTotal: seed.length }); }
});
// Activar un juego del pool manualmente
app.post('/api/masivo/activar', (req, res) => {
  const d = leerJson(req);
  const s = seed.find(x => x.id === d.id);
  if (!s) return res.status(404).json({ error: 'no existe en seed' });
  s.estado = 'activo';
  if (!CATALOGO.some(c => c.id === s.id)) { CATALOGO.unshift({ id: s.id, nombre: s.nombre, categoria: s.categoria }); salvarCatalogo(); }
  storage.guardar('seed_catalogo', seed);
  res.json({ ok: true, juego: s.id, estado: s.estado });
});
const PRECALENTAR_CADA_MS = 360000;
let indicePrecalentar = 0;
setInterval(() => {
  if (!CATALOGO.length) return;
  const j = CATALOGO[indicePrecalentar % CATALOGO.length];
  indicePrecalentar++;
  const c = cacheSesiones[j.id];
  if (c && Date.now() - c.ts < 480000) return;
  if (cooldownHasta[j.id] && Date.now() < cooldownHasta[j.id]) return;
  obtenerDestino(j.id, { headers: {} })
    .then(() => console.log('[precalentar] sesion lista:', j.id))
    .catch(() => { /* reintenta en el proximo ciclo */ });
}, 45000).unref();
setInterval(() => { indicePrecalentar = 0; }, PRECALENTAR_CADA_MS).unref();

// ══════════ MODO REFERENCIA DEMO (opcional, ?origen=demo) ══════════
app.get('/demo', async (req, res) => {
  const juego = String(req.query.juego || 'vs20doghouse').replace(/[^a-z0-9-]/gi, '');
  const modo = String(req.query.modo || 'embed');
  try {
    const destino = await obtenerDestino(juego, req);
    const mMgc = /mgckey=([^&]+)/.exec(destino);
    if (mMgc) {
      sesion = { mgckey: decodeURIComponent(mMgc[1]), ts: Date.now() };
      console.log('   sesion (' + juego + ')', sesion.mgckey.slice(0, 24));
    }

    if (modo === 'embed') {
      // Modo embed: iframe directo a la URL oficial del demo (como hacen los casinos).
      res.type('html').send(
        '<!doctype html><html><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + juego + ' - Pragmatic Play</title>' +
        '<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}' +
        'iframe{display:block;width:100%;height:100%;border:0}</style></head><body>' +
        '<iframe src="' + destino + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>' +
        '</body></html>'
      );
      return;
    }

    // Modo legacy: reensamblar la pagina (conservado para depuracion)
    const p = await fetch(destino, { headers: cabeceras(req) });
    guardarCookies(p);
    const base = '/gs2c/common/v3/games-html5/games/vs/' + juego + '/desktop/';
    let html = (await p.text()).split(DEMO).join('');
    html = html.replace('GAME_URL:""', 'GAME_URL:"' + base + '"')
               .replace('GAME_URL_ALTERNATIVE:""', 'GAME_URL_ALTERNATIVE:"' + base + '"')
               .replace(/<head[^>]*>/i, (x) => x + '<base href="' + base + '">');
    // Inyectar tambien el ADAPTADOR (gameConfig + overlay de diagnostico)
    const mc = html.match(/gameConfig: '(\{[\s\S]*?\})'/);
    html = html.replace(/<head[^>]*>/i, (x) => x + ADAPTADOR.replace('__CONFIG__', JSON.stringify(mc ? mc[1] : '{}')));
    res.type('html').send(html);
  } catch (e) {
    // Pagina auto-refrescante: reintentara hasta conseguir sesion, sin 502 feo.
    res.type('html').send(
      '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="10">' +
      '<style>body{background:#000;color:#f80;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}</style></head>' +
      '<body><div><img alt="" style="opacity:.9" width="280" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyODAiIGhlaWdodD0iODAiPjx0ZXh0IHg9IjEwIiB5PSI1MCIgZmlsbD0iI2Y4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMyIj5QUkFHTUFUSUMgUExBWTwvdGV4dD48L3N2Zz4=">' +
      '<p>Abriendo <b>' + juego + '</b>… el demo está ocupado.</p>' +
      '<p>Reintentando automáticamente en <b>10 s</b>… (' + String(e.message || e) + ')</p></div></body></html>'
    );
  }
});

app.use(express.static(path.join(__dirname)));

// Los sonidos no están en el árbol público: se responde 200 vacío para que el
// loader no reintente en bucle. El juego queda mudo pero arranca.
app.get(/\/(game\/sounds|GUI_sounds)\.(ogg|mp3)$/, (req, res) => {
  res.status(200).type('application/json').send('{"sounds":[]}');
});

let sesion = null;
async function abrirSesion(symbol) {
  const r = await fetch(DEMO + '/gs2c/openGame.do?gameSymbol=' + encodeURIComponent(symbol) + '&jurisdiction=99&lang=en', { redirect: 'manual', headers: cabeceras({ headers: {} }) });
  const loc = r.headers.get('location') || '';
  const m = /mgckey=([^&]+)/.exec(loc) || /mgckey=([^&]+)/.exec(await r.text());
  guardarCookies(r);
  if (!m) throw new Error('openGame sin mgckey: ' + r.status);
  sesion = { mgckey: decodeURIComponent(m[1]), ts: Date.now() };
  console.log('   sesion abierta', sesion.mgckey.slice(0, 24));
  return sesion;
}
app.use(async (req, res) => {
  console.log(new Date().toISOString().slice(11, 19), req.method, req.originalUrl);
  try {
    const opciones = { method: req.method, headers: cabeceras(req), redirect: 'follow' };
    if (req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length) {
      opciones.body = req.body;
    }
    // Solo abrimos sesion si no existe o expiro (10 min). Nunca en doInit:
    // reabrir invalidaria la sesion embebida en el gameConfig que ya tiene el navegador.
    if (!sesion || Date.now() - sesion.ts > 6e5) {
      const mMgc = /(vs[a-z0-9]+)/i.exec(req.originalUrl + (Buffer.isBuffer(req.body) ? req.body.toString() : ''));
      await abrirSesion(mMgc ? mMgc[1] : 'vs20doghouse');
    }
    const tieneMgc = /[?&]mgckey=[^&]+/.test(req.originalUrl);
    const destino = tieneMgc ? req.originalUrl : req.originalUrl + (req.originalUrl.includes('?') ? '&' : '?') + 'mgckey=' + encodeURIComponent(sesion.mgckey);
    const r = await fetch(DEMO + destino, opciones);

    console.log('   ->', r.status, r.headers.get('content-length'), r.headers.get('content-type'));
    guardarCookies(r);
    if (sesion) sesion.ts = Date.now();
    // Si la sesion murio (5xx upstream), reabrimos una vez y reintentamos.
    if (r.status >= 500) {
      const mMgc2 = /(vs[a-z0-9]+)/i.exec(req.originalUrl + (Buffer.isBuffer(req.body) ? req.body.toString() : ''));
      await abrirSesion(mMgc2 ? mMgc2[1] : 'vs20doghouse');
      const destino2 = /[?&]mgckey=/.test(req.originalUrl) ? req.originalUrl : req.originalUrl + (req.originalUrl.includes('?') ? '&' : '?') + 'mgckey=' + encodeURIComponent(sesion.mgckey);
      const r2 = await fetch(DEMO + destino2, opciones);
      console.log('   (reintento) ->', r2.status);
      return enviarRespuesta(r2, res);
    }
    return enviarRespuesta(r, res);
  } catch (e) {
    res.status(502).type('text').send('Error del proxy: ' + e.message);
  }
});

async function enviarRespuesta(r, res) {
  guardarCookies(r);
  res.status(r.status);
  for (const c of ['content-type', 'cache-control', 'last-modified']) {
    const v = r.headers.get(c);
    if (v) res.set(c, v);
  }
  // Sin cache heuristica: evita que el navegador reutilize respuestas viejas
  // derivadas del Last-Modified que reenviamos.
  res.set('cache-control', 'no-store');
  res.set('last-modified', new Date().toUTCString());
  let cuerpo = Buffer.from(await r.arrayBuffer());
  const tipo = r.headers.get('content-type') || '';
  if (tipo.includes('text/html')) {
    let h = cuerpo.toString('utf8').split(DEMO).join('');
    const m = h.match(/gameConfig: '(\{[\s\S]*?\})'/);
    if (process.env.SHIM !== '0') h = h.replace(/<head[^>]*>/i, (x) => x + ADAPTADOR.replace('__CONFIG__', JSON.stringify(m ? m[1] : '{}')));
    cuerpo = Buffer.from(h);
  }
  res.send(cuerpo);
}

const PUERTO = process.env.PORT || 3100;
app.listen(PUERTO, () => console.log('Proxy Dog House en http://localhost:' + PUERTO + JUEGO));
