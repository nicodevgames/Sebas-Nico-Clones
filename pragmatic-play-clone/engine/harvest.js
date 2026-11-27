'use strict';
/* HARVEST — espejo automático de assets oficiales de un juego Pragmatic.
 * Descarga desde el CDN público la página del juego + cadena de scripts
 * + todos los recursos referenciados (png/jpg/json/mp3/ogg/atlas/info...)
 * y los guarda en mirror/<juego>/ respetando rutas, para clon 100% offline. */
const fs = require('fs');
const path = require('path');

const HOSTS = ['https://demogamesfree.pragmaticplay.net','https://demogamesfree-asia.pragmaticplay.net'];
const DIR_MIRROR = path.join(__dirname, '..', 'mirror');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const EXT_ASSETS = /\.(js|css|png|jpe?g|gif|webp|svg|json|mp3|ogg|wav|woff2?|ttf|atlas|info|plist|fnt)(\?|$)/i;

function rutaLocal(absUrl) {
  const u = new URL(absUrl);
  const limpio = u.pathname.replace(/[^\w./-]/g, '_');
  return path.join(DIR_MIRROR, u.hostname, limpio.replace(/^\//, ''));
}

function colectarRefs(body, baseUrl) {
  const refs = new Set();
  const patrones = [
    /(?:src|href)=["']([^"']+)["']/gi,
    /["'(]([\w./@~-]+\.(?:js|css|png|jpe?g|gif|webp|svg|json|mp3|ogg|wav|woff2?|ttf|atlas|info|plist|fnt))(?:\?[^"')]*)?["')]/gi,
    /"url"\s*:\s*["']([^"']+)["']/gi
  ];
  for (const re of patrones) {
    let m;
    while ((m = re.exec(body))) {
      let ref = m[1];
      if (!ref || ref.startsWith('data:') || ref.startsWith('#')) continue;
      try {
        const abs = new URL(ref, baseUrl).href;
        if (abs.includes(HOSTS[0].replace('https://','')) || abs.includes(HOSTS[1].replace('https://',''))) refs.add(abs.split('#')[0]);
      } catch (e) { /* ref externa, ignorar */ }
    }
  }
  return [...refs];
}

async function bajar(url, cookies) {
  for (let intento = 0; intento < HOSTS.length; intento++) {
    try {
      const destino = intento === 0 ? url : url.replace(HOSTS[0], HOSTS[1]);
      const r = await fetch(destino, { headers: { 'user-agent': UA, referer: HOSTS[0] + '/', ...(cookies ? { cookie: cookies } : {}) }, redirect: 'follow' });
      if (!r.ok) return { estado: r.status, buffer: null, tipo: '' };
      const buf = Buffer.from(await r.arrayBuffer());
      const setCookie = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
      return { estado: r.status, buffer: buf, tipo: r.headers.get('content-type') || '', setCookie };
    } catch (e) { if (intento === HOSTS.length - 1) return { estado: 0, buffer: null, tipo: '', error: e.message }; }
  }
}

/* abre sesion de juego y devuelve la URL html5Game.do */
async function abrirJuego(gameSymbol) {
  for (const host of HOSTS) {
    try {
      const r = await fetch(`${host}/gs2c/openGame.do?gameSymbol=${encodeURIComponent(gameSymbol)}&jurisdiction=99&lang=en`, { headers: { 'user-agent': UA }, redirect: 'manual' });
      const loc = r.headers.get('location');
      if (loc) return { destino: loc, cookies: (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '), host };
    } catch (e) { /* siguiente host */ }
  }
  throw new Error('openGame sin redirect para ' + gameSymbol);
}

/* Captura recursiva. profundidad: 0=page,1=scripts top,2+=recursos */
/* extrae listas de packs de la pagina: UHT_X_SIZE='nombre?key=hash:size,...' */
function packsDePagina(html) {
  const out = [];
  const re = /UHT_[A-Z_]*SIZE\s*=\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(html))) {
    for (const parte of m[1].split(',')) {
      const mm = /^([\w./-]+)\?key=([0-9a-f]+):(\d+)$/.exec(parte.trim());
      if (mm) out.push({ nombre: mm[1], key: mm[2], size: parseInt(mm[3], 10) });
    }
  }
  return out;
}

/* prueba layouts de URL para un pack; devuelve la que funcione */
function urlsDePack(baseDesk, pack) {
  const q = pack.nombre + '?key=' + pack.key;
  return [
    baseDesk + '/' + q,
    baseDesk.replace('/desktop/', '/mobile/') + '/' + q,
    HOSTS[0] + '/gs2c/res/v2/' + q,
    HOSTS[0] + '/gs2c/res/' + q
  ];
}

async function capturar(gameSymbol, opt) {
  const o = opt || {};
  const MAX_ARCHIVOS = o.max || 400;
  const { destino, cookies, host } = await abrirJuego(gameSymbol);
  const log = { juego: gameSymbol, pagina: destino, bajados: [], fallidos: [], bytes: 0 };
  // Semillas: ademas de la pagina, las rutas estandar del escritorio del juego
  // (el loader construye estos paths en runtime, invisibles al parseo estatico)
  const desk = `${host}/gs2c/common/v3/games-html5/games/vs/${gameSymbol}`;
  const cola = [
    [destino, 0],
    [desk + '/desktop/bootstrap.js', 1],
    [desk + '/mobile/bootstrap.js', 1]
  ];
  const vistos = new Set();
  let cookiesVivas = cookies;

  while (cola.length && log.bajados.length < MAX_ARCHIVOS) {
    const [url, prof] = cola.shift();
    const clave = url.split('?')[0];
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const res = await bajar(url, cookiesVivas);
    if (res.setCookie && res.setCookie.length) cookiesVivas = cookiesVivas.split('; ').concat(res.setCookie.map(c => c.split(';')[0])).filter((v,i,a)=>a.indexOf(v)===i).join('; ');
    if (res.estado !== 200 || !res.buffer) { log.fallidos.push({ url, estado: res.estado }); continue; }

    const local = rutaLocal(url);
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, res.buffer);
    log.bajados.push(url.replace(HOSTS[0], ''));
    log.bytes += res.buffer.length;

    // si es la pagina del juego: encolar TODOS los packs de recursos oficiales
    if (/html5Game\.do/.test(url) || /UHT_GAME_SIZE\s*=\s*'/.test(res.buffer.toString('utf8').slice(0, 200000))) {
      for (const pk of packsDePagina(res.buffer.toString('utf8'))) {
        for (const pu of urlsDePack(desk, pk)) {
          if (!vistos.has(pu.split('?')[0] + '|' + pk.key)) cola.push([pu, 2]);
        }
      }
      log.packsDetectados = packsDePagina(res.buffer.toString('utf8')).length;
    }

    // buscar mas refs en textos (js/css/html/json), profundidad acotada
    const tipo = res.tipo;
    if (prof < (o.profundidad || 3) && /javascript|css|json|html|text/.test(tipo)) {
      const texto = res.buffer.toString('utf8');
      for (const ref of colectarRefs(texto, url)) {
        if (!EXT_ASSETS.test(ref)) continue;
        if (!vistos.has(ref.split('?')[0])) cola.push([ref, prof + 1]);
      }
    }
  }
  // resumen
  log.kb = Math.round(log.bytes / 1024);
  const resumen = path.join(DIR_MIRROR, '_' + gameSymbol + '.captura.json');
  fs.mkdirSync(DIR_MIRROR, { recursive: true });
  fs.writeFileSync(resumen, JSON.stringify(log, null, 2));
  log.resumen = resumen;
  return log;
}

function serveDir() { return DIR_MIRROR; }

/* CLI: node engine/harvest.js vs20doghouse [max] */
if (require.main === module) {
  const sym = process.argv[2];
  const mx = parseInt(process.argv[3] || '500', 10);
  if (!sym) { console.log('Uso: node engine/harvest.js <vs20xxx> [max]'); process.exit(1); }
  capturar(sym, { max: mx }).then(l => {
    console.log('Juego    :', l.juego);
    console.log('Archivos :', l.bajados.length, '(' + l.kb + ' KB)');
    console.log('Fallidos :', l.fallidos.length);
    if (l.packsDetectados) console.log('Packs page:', l.packsDetectados);
    console.log('Resumen  :', l.resumen);
  }).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
}

module.exports = { capturar, packsDePagina, rutaLocal, serveDir, DIR_MIRROR };
