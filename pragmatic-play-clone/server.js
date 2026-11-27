// Proxy al demo público de Pragmatic Play para Dog House (vs20doghouse).
// En vez de falsificar el protocolo, reenvía todo al host del demo y reescribe
// sus URLs absolutas a relativas, así el navegador habla solo con este servidor.
const express = require('express');
const path = require('path');

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

const ADAPTADOR = '<script>window.UHT_PACKAGES_INFO=\'{"languages":[]}\';window.UHT_SCRIPTS_SIZE=\'build.js?key=442773:3131544\';window.__CFG=__CONFIG__;window.gameConfig=JSON.parse(window.__CFG);setTimeout(function(){console.log("DBG",typeof window.gameConfig,typeof window.Loader,window.UHT_SCRIPTS_SIZE,window.UHT_CONFIG&&window.UHT_CONFIG.GAME_URL)},3000);</script>';
const GOOG = '<script>window.goog=window.goog||{provide:function(){},require:function(){},define:function(){},exportSymbol:function(){},exportProperty:function(){}};' +
  'window.goog.dom=window.goog.dom||{};window.goog.isFunction=function(f){return typeof f=="function"};' +
  'window.goog.isDef=function(v){return v!==undefined};window.goog.isDefAndNotNull=function(v){return v!=null};' +
  'window.goog.inherits=function(c,p){function F(){this.constructor=c}F.prototype=p.prototype;c.prototype=new F();c.superClass_=p.prototype};' +
  'window.goog.array={forEach:function(a,f){for(var i=0;i<a.length;i++)f(a[i],i,a)}};' +
  'window.Wrapper={domElement:document.createElement("div"),onLoad:function(){},addChild:function(){},removeChild:function(){},visible:true,alpha:1};' +
  'window.SystemMessageManager={Wrapper:window.Wrapper,OnLoad:function(){},getInstance:function(){return this}};</script>';

app.get('/', async (req, res) => {
  const juego = String(req.query.juego || 'vs20doghouse').replace(/[^a-z0-9]/gi, '');
  try {
    const r = await fetch(DEMO + '/gs2c/openGame.do?gameSymbol=' + juego + '&jurisdiction=99&lang=en', { headers: cabeceras(req), redirect: 'manual' });
    guardarCookies(r);
    const destino = r.headers.get('location');
    if (!destino) throw new Error('sin redireccion de openGame');
    // La sesion A creada aqui es la que queda embebida en el gameConfig del HTML.
    // La recordamos para NO reabrir otra (cada openGame.invalida la anterior).
    const mMgc = /mgckey=([^&]+)/.exec(destino);
    if (mMgc) {
      sesion = { mgckey: decodeURIComponent(mMgc[1]), ts: Date.now() };
      console.log('   sesion (pagina) recordada', sesion.mgckey.slice(0, 24));
    }
    const p = await fetch(destino, { headers: cabeceras(req) });
    guardarCookies(p);
    const base = '/gs2c/common/v3/games-html5/games/vs/' + juego + '/desktop/';
    let html = (await p.text()).split(DEMO).join('');
    html = html.replace('GAME_URL:""', 'GAME_URL:"' + base + '"')
               .replace('GAME_URL_ALTERNATIVE:""', 'GAME_URL_ALTERNATIVE:"' + base + '"')
               .replace(/<head[^>]*>/i, (x) => x + '<base href="' + base + '">');
    res.type('html').send(html);
  } catch (e) {
    res.status(502).type('text').send('No se pudo abrir el demo: ' + e.message);
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

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log('Proxy Dog House en http://localhost:' + PUERTO + JUEGO));
