'use strict';
/* GENERADOR UNIVERSAL — plantilla clonadora de slots estilo Pragmatic.
 * Fixture gs2c -> game.json, o juego nuevo desde plantilla tematica.
 * CLI: node engine/generador.js [fixture archivo id | base id [tema]] */
const fs = require('fs');
const path = require('path');
const DIR_BASE = path.join(__dirname, '..', 'games');

function num(s, d) { const n = parseFloat(s); return isNaN(n) ? d : n; }
function kv(cadena) {
  const out = {};
  for (const par of String(cadena).split('&')) {
    const i = par.indexOf('=');
    if (i < 0) continue;
    const k = par.slice(0, i), v = par.slice(i + 1);
    out[k] = v.includes(',') ? v.split(',') : v;
  }
  return out;
}

const TEMAS = {
  clasico: ['🍒','🔔','🍫','🍋','🍇','🍊','⭐','💎','7','BAR'],
  frutas: ['🍎','🍒','🍑','🍌','🍉','🍅','🫐','💎','⭐'],
  egipcio: ['🏜','📜','🐫','🐝','🧝','💀','📜','💎','⭐'],
  mar: ['🐠','🐟','🐬','🐱','🧜','🦈','🍋','💎','⭐'],
  dorado: ['👑','💍','🍀','⏰','💎','⭐','💰','🏦','🎁'],
  perros: ['🐕','🐩','🦴','😺','🐾','👑','🍖','💎','⭐']
};

const LINEAS20 = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,0,1],
  [1,2,1,2,1],[0,1,1,1,0],[2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],
  [1,1,0,1,1],[1,1,2,1,1],[0,0,2,0,0],[2,2,0,2,2],[0,2,0,2,0]
];

function paytableBase(ids) {
  const t = { 3: {}, 4: {}, 5: {} };
  const escalera = [150,100,60,40,25,20,15,12,10,8,6,5,4,3];
  ids.forEach((id, idx) => {
    const b = escalera[Math.min(idx, escalera.length-1)];
    t[3][id] = b; t[4][id] = b*3; t[5][id] = b*8;
  });
  return t;
}

function simbolosDeTema(tema, ids, o) {
  const glyphs = TEMAS[tema] || TEMAS.clasico;
  const colores = ['#ffd54a','#ff8a3d','#9fe0c0','#7fd6ff','#d7b8ff','#ff9d9d','#b8ffa8','#ffe27a','#ffb0c8','#cfe8ff'];
  const out = {
    1: { nombre: 'Scatter', glifo: o.glifoScatter || '💣', color: '#ffd54a' },
    2: { nombre: 'Wild', glifo: o.glifoWild || '🎯', color: '#ff8a3d' }
  };
  ids.forEach((id, i) => out[id] = { nombre: o.nombres ? o.nombres[i] : ('Sim' + (i+1)), glifo: glyphs[i % glyphs.length], color: colores[i % colores.length] });
  return out;
}

function escribir(id, juego) {
  const safe = String(id).replace(/[^a-z0-9-]/gi, '');
  const dir = path.join(DIR_BASE, safe);
  fs.mkdirSync(dir, { recursive: true });
  const ruta = path.join(dir, 'game.json');
  fs.writeFileSync(ruta, JSON.stringify(juego, null, 2));
  return ruta;
}

/* Juego nuevo desde plantilla tematica */
function base(id, opt) {
  const o = opt || {};
  const reels = o.reels || 5, rows = o.rows || 3;
  const cant = o.simbolos || 9;
  const ids = []; for (let i = 0; i < cant; i++) ids.push(10 + i);
  const L = (o.lineas || LINEAS20).slice(0, o.cantLineas || 20);
  const pesoDe = i => i < 2 ? 2 : i < 4 ? 3 : i < 7 ? 5 : 7;
  const reel_sets = { 0: [] };
  for (let c = 0; c < reels; c++) {
    const col = [[1, 2], [2, c >= 1 && c <= 3 ? 4 : 1]];
    ids.forEach((sid, i) => col.push([sid, pesoDe(i)]));
    reel_sets[0].push(col);
  }
  const juego = {
    nombre: o.nombre || id, version: 1,
    reels, rows, min_match: 3,
    monedas: [0.01,0.02,0.03,0.05,0.1,0.2,0.3,0.5,1,2],
    wild: 2, scatter: 1,
    scatter_paga: { 3: 2, 4: 10, 5: 50 },
    wild_mult: true, wild_col_min: 1, wild_col_max: reels >= 5 ? 3 : reels - 2,
    simbolos: simbolosDeTema(o.tema || 'clasico', ids, o),
    simbolos_ids: ids, lineas: L,
    paytable: paytableBase(ids), reel_sets
  };
  const ruta = escribir(id, juego);
  return { juego, ruta };
}

/* Importa un fixture gs2c (doInit real) -> game.json */
function desdeFixture(texto, id, opt) {
  const o = opt || {};
  const d = kv(String(texto).trim());
  const sh = num(Array.isArray(d.sh) ? d.sh[0] : d.sh, 3);
  const defS = Array.isArray(d.def_s) ? d.def_s.map(v => num(v, 0)) : [];
  const unicos = [...new Set(defS)].sort((a,b)=>a-b);
  const ids = unicos.filter(v => v > 2);
  // paytable REAL gs2c: cada NIVEL (indice ni) = un SIMBOLO.
  // Sus celdas son pagos para k=1..sh coincidencias (sh=3 => celdas k=1,2,3).
  const pt = { 3: {}, 4: {}, 5: {} };
  if (d.paytable) {
    const sh = num(Array.isArray(d.sh) ? d.sh[0] : d.sh, 3);
    const niveles = Array.isArray(d.paytable) ? d.paytable : [d.paytable];
    niveles.forEach((nivel, simIdx) => {
      const celdas = String(nivel).split(',');
      // ultima celda = pago maximo (5-of-kind cuando hay 5 celdas)
      // mapeo: si hay `sh` celdas: [1..sh] -> usamos las ultimas 3 como 3/4/5
      const nv = celdas.map(x => num(x, 0));
      let p3 = 0, p4 = 0, p5 = 0;
      if (nv.length >= 5) { p3 = nv[2]; p4 = nv[3]; p5 = nv[4]; }
      else if (nv.length === 3) { p3 = nv[0]; p4 = nv[1]; p5 = nv[2]; }
      const sid = simIdx + 1; // indices paytable = ids de simbolo 1..N
      if (p3 > 0) pt[3][sid] = p3;
      if (p4 > 0) pt[4][sid] = p4;
      if (p5 > 0) pt[5][sid] = p5;
    });
  }
  // pesos inferidos: frecuencia en def_s refina uniforme
  const pesoDe = sid => {
    const f = defS.filter(v => v === sid).length;
    return Math.max(2, 6 - f * 2);
  };
  const reel_sets = { 0: [] };
  for (let c = 0; c < 5; c++) {
    const col = [[1, 2], [2, c >= 1 && c <= 3 ? 4 : 1]];
    ids.forEach(sid => col.push([sid, pesoDe(sid)]));
    reel_sets[0].push(col);
  }
  const juego = {
    nombre: o.nombre || id, version: 1,
    reels: 5, rows: sh, min_match: 3,
    monedas: d.sc ? (Array.isArray(d.sc) ? d.sc : [d.sc]).map(v => num(v, 0.1)) : [0.01,0.1,0.2,0.5,1,2],
    wild: 2, scatter: 1,
    scatter_paga: { 3: 2, 4: 10, 5: 50 },
    wild_mult: true, wild_col_min: 1, wild_col_max: 3,
    simbolos: simbolosDeTema(o.tema || 'perros', ids, o),
    simbolos_ids: ids.length ? ids : [4,5,6,7,8,9,10,11,12,13],
    lineas: o.lineas || LINEAS20,
    paytable: Object.keys(pt[5]).length ? pt : paytableBase(ids.length ? ids : [4,5,6,7,8,9,10,11,12,13]),
    reel_sets, _fuente: 'fixture-gs2c', _def_s_original: defS
  };
  const ruta = escribir(id, juego);
  return { juego, ruta };
}

/* CLI */
if (require.main === module) {
  const [, , cmd, a, b, c] = process.argv;
  if (cmd === 'fixture') {
    const texto = fs.readFileSync(a, 'utf8');
    const r = desdeFixture(texto, b || 'juego-importado', { nombre: c });
    console.log('IMPORTADO:', r.ruta);
    console.log('Simbolos:', r.juego.simbolos_ids.join(','));
    console.log('Paytable L5:', JSON.stringify(r.juego.paytable[5]));
  } else if (cmd === 'base') {
    const r = base(a || 'nuevo-juego', { tema: b || 'clasico', nombre: c });
    console.log('CREADO:', r.ruta, 'tema', b || 'clasico');
  } else {
    console.log('Uso:');
    console.log('  node engine/generador.js base <id> [tema] [nombre]');
    console.log('  node engine/generador.js fixture <archivo> <id> [nombre]');
    console.log('Temas:', Object.keys(TEMAS).join(', '));
  }
}

module.exports = { base, desdeFixture, lineasEstandar: LINEAS20, escribir, TEMAS };
