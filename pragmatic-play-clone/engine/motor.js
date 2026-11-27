'use strict';
/* MOTOR DE SLOTS PROPIO — plataforma independiente, 0 dependencias.
 * Slot 5x3, lineas fijas, wild x2/x3 en columnas centrales, scatter.
 * Cada juego = carpeta /games/<simbolo>/game.json. */
const fs = require('fs');
const path = require('path');

const DIR_GAMES = path.join(__dirname, '..', 'games');
const cacheGames = new Map();
const cuentas = new Map();

function listarJuegos() {
  if (!fs.existsSync(DIR_GAMES)) return [];
  return fs.readdirSync(DIR_GAMES).filter(d =>
    fs.existsSync(path.join(DIR_GAMES, d, 'game.json')));
}

function cargarJuego(id) {
  const safe = String(id).replace(/[^a-z0-9-]/gi, '');
  if (cacheGames.has(safe)) return cacheGames.get(safe);
  const ruta = path.join(DIR_GAMES, safe, 'game.json');
  if (!fs.existsSync(ruta)) return null;
  const g = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  g.id = safe;
  g._tiras = Object.values(g.reel_sets).map(set => set.map(colArr => {
    let acc = 0;
    const pesos = colArr.map(pair => (acc += pair[1], [pair[0], acc]));
    return { pesos, total: acc };
  }));
  cacheGames.set(safe, g);
  return g;
}

function girarGrid(g, setId) {
  const tiras = g._tiras[setId] || g._tiras[0];
  const grid = [];
  for (let c = 0; c < g.reels; c++) {
    const n = tiras[c].pesos.length;
    const ini = Math.floor(Math.random() * n);
    const col = [];
    for (let f = 0; f < g.rows; f++) col.push(Number(tiras[c].pesos[(ini + f) % n][0]));
    grid.push(col);
  }
  return grid;
}

function evaluar(g, grid, coin) {
  const pt = g.paytable;
  const wMin = (g.wild_col_min == null) ? 0 : g.wild_col_min;
  const wMax = (g.wild_col_max == null) ? (g.reels - 1) : g.wild_col_max;
  const multAleatorio = () => (Math.random() < 0.5 ? 2 : 3);
  const premios = [];
  g.lineas.forEach((fila, li) => {
    const sims = fila.map((f, c) => grid[c][f]);
    const esWild = (s, c) => s === g.wild && c >= wMin && c <= wMax;
    let base = 0;
    for (const s of sims) if (s !== g.wild) { base = s; break; }
    const candidatos = base ? [base] : g.simbolos_ids.filter(id => id !== g.scatter);
    let mejor = null;
    for (const cand of candidatos) {
      let k = 0, mult = 1;
      for (let c = 0; c < sims.length; c++) {
        const s = sims[c];
        if (s === cand || esWild(s, c)) {
          k++;
          if (esWild(s, c) && g.wild_mult) mult *= multAleatorio();
        } else break;
      }
      while (k >= g.min_match) {
        const pago = (pt[String(k)] || [])[cand] || 0;
        if (pago > 0) { mejor = { linea: li + 1, cols: k, simbolo: cand, monto: pago * coin * mult, mult: mult }; break; }
        k--;
      }
      if (mejor) break;
    }
    if (mejor) premios.push(mejor);
  });
  const sc = grid.flat().filter(s => s === g.scatter).length;
  let scatterMonto = 0;
  if (g.scatter_paga && g.scatter_paga[sc]) scatterMonto = g.scatter_paga[sc] * coin;
  return { premios: premios, scatters: sc, scatterMonto: scatterMonto };
}

function cuenta(id) {
  if (!cuentas.has(id)) cuentas.set(id, { saldo: 100000, apuesta: 0 });
  return cuentas.get(id);
}

function jugar(cuentaId, gameId, coin) {
  const g = cargarJuego(gameId);
  if (!g) throw new Error('juego inexistente: ' + gameId);
  const cta = cuenta(cuentaId);
  const apuesta = +(g.lineas.length * coin).toFixed(2);
  if (cta.saldo < apuesta) return { error: 'saldo insuficiente', saldo: cta.saldo };
  const grid = girarGrid(g, 0);
  const res = evaluar(g, grid, coin);
  const totalPremio = res.premios.reduce((a, p) => a + p.monto, 0) + res.scatterMonto;
  cta.saldo = +(cta.saldo - apuesta + totalPremio).toFixed(2);
  cta.apuesta = apuesta;
  return { grid: grid, premios: res.premios, scatters: res.scatters, scatterMonto: res.scatterMonto,
    totalPremio: +totalPremio.toFixed(2), apuesta: apuesta, saldo: cta.saldo, moneda: 'USD' };
}

module.exports = { listarJuegos, cargarJuego, girarGrid, evaluar, jugar, cuenta };
