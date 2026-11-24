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

app.get('/', async (req, res) => {
  const juego = String(req.query.juego || 'vs20doghouse').replace(/[^a-z0-9]/gi, '');
  try {
    const r = await fetch(DEMO + '/gs2c/openGame.do?gameSymbol=' + juego + '&jurisdiction=99&lang=en&websiteUrl=' +
      encodeURIComponent(DEMO), { headers: cabeceras(req), redirect: 'manual' });
    guardarCookies(r);
    const destino = r.headers.get('location');
    if (!destino) return res.status(502).type('text').send('El demo no redirigió');
    res.redirect(302, destino.split(DEMO).join(''));
  } catch (e) {
    res.status(502).type('text').send('No se pudo abrir el demo: ' + e.message);
  }
});

app.use(express.static(path.join(__dirname)));

app.use(async (req, res) => {
  console.log(new Date().toISOString().slice(11, 19), req.method, req.originalUrl);
  try {
    const opciones = { method: req.method, headers: cabeceras(req), redirect: 'follow' };
    if (req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length) {
      opciones.body = req.body;
    }
    const r = await fetch(DEMO + req.originalUrl, opciones);
    console.log('   ->', r.status, r.headers.get('content-length'), r.headers.get('content-type'));
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
  } catch (e) {
    res.status(502).type('text').send('Error del proxy: ' + e.message);
  }
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log('Proxy Dog House en http://localhost:' + PUERTO + JUEGO));
