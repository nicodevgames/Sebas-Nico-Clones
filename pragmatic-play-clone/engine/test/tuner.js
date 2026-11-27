'use strict';
/* Calibra los multiplicadores de la paytable hasta RTP objetivo.
 * Uso: node engine/test/tuner.js <juego> <objetivoRTP> <giros> */
const fs = require('fs');
const path = require('path');
const motor = require('../motor');

const GAME = process.argv[2] || 'vs20doghouse';
const OBJETIVO = parseFloat(process.argv[3] || '96.0');
const N = parseInt(process.argv[4] || '300000', 10);
const COIN = 0.10;

const g = motor.cargarJuego(GAME);
if (!g) { console.error('No existe', GAME); process.exit(1); }

const set = g._tiras[0];
function columna(c) {
  const n = set[c].pesos.length;
  const ini = Math.floor(Math.random() * n);
  const out = [];
  for (let f = 0; f < g.rows; f++) out.push(Number(set[c].pesos[(ini + f) % n][0]));
  return out;
}

function rtpDe(tabla) {
  const gg = JSON.parse(JSON.stringify(g));
  gg.paytable = tabla;
  let ap = 0, ga = 0;
  const refCols = [columna(0)];
  for (let i = 0; i < N; i++) {
    const grid = [columna(0), columna(1), columna(2), columna(3), columna(4)];
    const r = motor.evaluar(gg, grid, COIN);
    ap += g.lineas.length * COIN;
    ga += r.premios.reduce((a, p) => a + p.monto, 0) + r.scatterMonto;
  }
  return (ga / ap) * 100;
}

let factor = OBJETIVO / rtpDe(g.paytable);
console.log('RTP inicial :', rtpDe(g.paytable).toFixed(2) + '%');
console.log('Factor calc :', factor.toFixed(4));

// aplica factor y valida
const tablaNueva = JSON.parse(JSON.stringify(g.paytable));
for (const k of Object.keys(tablaNueva))
  for (const s of Object.keys(tablaNueva[k]))
    if (tablaNueva[k][s] > 0) tablaNueva[k][s] = Math.max(1, Math.round(tablaNueva[k][s] * factor * 2) / 2);

const rtpNuevo = rtpDe(tablaNueva);
console.log('RTP ajustado:', rtpNuevo.toFixed(2) + '%', '(objetivo', OBJETIVO + ')');
console.log('\nPaytable propuesta:');
console.log(JSON.stringify(tablaNueva, null, 2).slice(0, 900));
fs.writeFileSync(path.join(__dirname, 'tabla-propuesta.json'), JSON.stringify(tablaNueva, null, 2));
console.log('\nGuardada en engine/test/tabla-propuesta.json');
