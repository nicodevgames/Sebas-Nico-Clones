'use strict';
/* STORE PERSISTENTE — cuentas, rondas y marca en archivos JSON.
 * Escritura atomica (tmp+rename). Sin dependencias. */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'data');

function archivo(nombre) { return path.join(DIR, nombre + '.json'); }
function leer(nombre, def) {
  try { return JSON.parse(fs.readFileSync(archivo(nombre), 'utf8')); }
  catch (e) { return def; }
}
function guardar(nombre, dato) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = archivo(nombre) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(dato, null, 2));
  fs.renameSync(tmp, archivo(nombre));
}

/* ---- cuentas ---- */
let cuentas = leer('cuentas', {});
let sucio = false;
function flush() { if (sucio) { guardar('cuentas', cuentas); sucio = false; } }
setInterval(flush, 3000).unref();

function usuario(id) {
  if (!cuentas[id]) {
    cuentas[id] = { saldo: 100000, apuesta: 0, creado: new Date().toISOString(), rondas: 0, apostado: 0, ganado: 0 };
    sucio = true;
  }
  return cuentas[id];
}
function aplicar(id, delta, estat) {
  const c = usuario(id);
  c.saldo = +(c.saldo + delta).toFixed(2);
  c.rondas++;
  c.apostado = +(c.apostado + (estat.apuesta || 0)).toFixed(2);
  c.ganado = +(c.ganado + (estat.premio || 0)).toFixed(2);
  sucio = true;
  return c;
}
function todos() { return cuentas; }

module.exports = { leer, guardar, usuario, aplicar, todos, flush, DIR };
