'use strict';
/* IMPORTADOR MASIVO — trae el catalogo oficial de Pragmatic desde su endpoint
 * publico getGameList.do y lo deja listo para la plataforma.
 * Devuelve [{id, nombre, categoria}] reales (solo slots vs20xxx jugables). */
const HOSTS = ['https://demogamesfree.pragmaticplay.net','https://demogamesfree-asia.pragmaticplay.net'];

async function traerLista(lang) {
  let ultimoError = null;
  for (const host of HOSTS) {
    try {
      const r = await fetch(host + '/gs2c/getGameList.do?lang=' + (lang || 'en'), {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36' }
      });
      if (!r.ok) { ultimoError = new Error('HTTP ' + r.status); continue; }
      const texto = await r.text();
      // getGameList.do responde XML: <game gameID="vs20xxx" gameName="..." .../>
      const juegos = [];
      const re = /<game\s+([^>]+)>/g;
      let m;
      const attr = (blob, campo) => {
        const rx = new RegExp(campo + '=\"([^\"]*)\"');
        const x = rx.exec(blob); return x ? x[1] : '';
      };
      while ((m = re.exec(texto))) {
        const blob = m[1];
        const gid = attr(blob, 'gameID');
        const gname = attr(blob, 'gameName');
        const tech = attr(blob, 'technology');
        const type = attr(blob, 'gameType');
        if (!gid || !/^vs[0-9]/i.test(gid)) continue;      // solo slots html5
        if (/flash|download/i.test(tech || '')) continue;
        // descarta terminales antiguos y no-slots
        if (type && !/slot|SLOT/i.test(type)) continue;
        juegos.push({ id: gid, nombre: gname || gid, tecnologia: tech || 'HTML5' });
      }
      if (juegos.length) return juegos;
      // fallback: parseo por juegoID plano si el XML viene con otro shape
      const ids = [...new Set([...texto.matchAll(/gameID=\"(vs[0-9][a-z0-9]+)\"/gi)].map(x => x[1]))];
      return ids.map(id => ({ id, nombre: id, tecnologia: 'HTML5' }));
    } catch (e) { ultimoError = e; }
  }
  throw ultimoError || new Error('getGameList inaccesible');
}

/* quita duplicados/slots no deseados y arma categoria */
function normalizar(juegos) {
  const vistos = new Set();
  const out = [];
  for (const j of juegos) {
    if (vistos.has(j.id)) continue;
    vistos.add(j.id);
    out.push({
      id: j.id,
      nombre: j.nombre.replace(/&amp;/g, '&').trim(),
      categoria: categoriaDe(j.nombre)
    });
  }
  return out;
}

function categoriaDe(nombre) {
  const n = (nombre || '').toLowerCase();
  const TABLA = [
    ['megaways', 'Megaways'], ['bonanza', 'Bonanza'], ['dog house', 'Dog House'],
    ['sweet bonanza', 'Bonanza'], ['gates of olympus', 'Olympus'], ['starlight', 'Olympus'],
    ['big bass', 'Pesca'], ['fish', 'Pesca'], ['fruit', 'Frutales'],
    ['wolf', 'Clasicos'], ['fire', 'Clasicos'], ['gold', 'Oro y Tesoros'],
    ['treasure', 'Oro y Tesoros'], ['jackpot', 'Jackpots'], ['mega', 'Jackpots'],
    ['wild', 'Wilds'], ['buffalo', 'Animales'], ['rhino', 'Animales'],
    ['elephant', 'Animales'], ['tiger', 'Animales'], ['panda', 'Animales'],
    ['bee', 'Animales'], ['dog', 'Animales'], ['cat', 'Animales'],
    ['egypt', 'Egipto'], ['pharaoh', 'Egipto'], ['cleo', 'Egipto'],
    ['aztec', 'Civilizaciones'], ['maya', 'Civilizaciones'], ['greek', 'Civilizaciones'],
    ['viking', 'Civilizaciones'], ['pirate', 'Aventura'], ['western', 'Aventura'],
    ['west', 'Aventura'], ['travel', 'Aventura'], ['olympus', 'Mitologia'],
    ['zeus', 'Mitologia'], ['dragon', 'Fantasia'], ['wizard', 'Fantasia'],
    ['magic', 'Fantasia'], ['party', 'Fiesta'], ['candy', 'Dulces'],
    ['sugar', 'Dulces'], ['sweet', 'Dulces'], ['holiday', 'Temporada'],
    ['christmas', 'Temporada'], ['halloween', 'Temporada'], [' santa', 'Temporada']
  ];
  for (const [clave, cat] of TABLA) if (n.includes(clave)) return cat;
  return 'Slots';
}

module.exports = { traerLista, normalizar };
