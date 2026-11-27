'use strict';
/* Test de estres del motor: simula N giros y calcula RTP + distribucion. */
const path = require('path');
const motor = require('../motor');

const GAME = process.argv[2] || 'vs20doghouse';
const N = parseInt(process.argv[3] || '200000', 10);
const COIN = 0.10;

const g = motor.cargarJuego(GAME);
if (!g) { console.error('No existe', GAME); process.exit(1); }

let apostado = 0, ganado = 0, hits = 0, maxWin = 0, scatters3 = 0, bestLine = null;
const cuentaFake = { saldo: Infinity };

// jugamos manualmente para contar sin tocar cuentas compartidas
const set = g._tiras[0];
function columna(c) {
  const n = set[c].pesos.length;
  const ini = Math.floor(Math.random() * n);
  const col = [];
  for (let f = 0; f < g.rows; f++) col.push(Number(set[c].pesos[(ini + f) % n][0]));
  return col;
}

for (let i = 0; i < N; i++) {
  const grid = [columna(0), columna(1), columna(2), columna(3), columna(4)];
  const { premios, scatters, scatterMonto } = motor.evaluar(g, grid, COIN);
  const apostadoAqui = g.lineas.length * COIN;
  const ganadoAqui = premios.reduce((a, p) => a + p.monto, 0) + scatterMonto;
  apostado += apostadoAqui; ganado += ganadoAqui;
  if (ganadoAqui > 0) hits++;
  if (scatters >= 3) scatters3++;
  if (ganadoAqui > maxWin) maxWin = ganadoAqui;
  if (premios[0] && (!bestLine || premios[0].monto > bestLine.monto)) bestLine = premios[0];
}

const rtp = (ganado / apostado) * 100;
console.log('Juego      :', GAME);
console.log('Giros      :', N.toLocaleString('en-US'));
console.log('Coin       :', COIN);
console.log('Apostado   :', apostado.toFixed(2));
console.log('Ganado     :', ganado.toFixed(2));
console.log('RTP        :', rtp.toFixed(2) + '%');
console.log('Hit freq   :', ((hits / N) * 100).toFixed(2) + '%');
console.log('3+ scatters:', scatters3, '(1 en', Math.round(N / Math.max(scatters3,1)), 'giros)');
console.log('Max win    :', maxWin.toFixed(2), '(' + (maxWin / (g.lineas.length * COIN)).toFixed(0) + 'x apuesta)');
if (bestLine) console.log('Mejor linea:', JSON.stringify(bestLine));
console.log('Memoria juegos registrados:', motor.listarJuegos().join(', '));
