'use strict';
/* PUENTE CON INFINITE ABYSS — protocolo seamless v1.
 * Saliente: {ABYSS_URL}/hub/v1/wallet/<action> con cabeceras
 *   X-Provider-Id: pp-slots
 *   X-Signature: hex(HMAC-SHA256(SECRET, rawBody))
 * Montos: string entero en unidades minimas (2 decimales => x100). */
const fs = require('fs');
const path = require('path');

const ARCHIVO_CFG = path.join(__dirname, '..', 'data', 'abyss.json');
function leerCfgDisco() {
  try { return JSON.parse(fs.readFileSync(ARCHIVO_CFG, 'utf8')); }
  catch (e) { return {}; }
}

const ENV = {
  url: process.env.ABYSS_URL || '',
  secret: process.env.ABYSS_PROVIDER_SECRET || '',
  providerId: process.env.ABYSS_PROVIDER_ID || 'pragmatic-play',
  defaultCurrency: process.env.ABYSS_CURRENCY || 'USD'
};

const CFG = Object.assign({
  url: '',
  secret: '',
  providerId: 'pragmatic-play',
  defaultCurrency: 'USD'
}, leerCfgDisco(), ENV);

/* Guardar configuracion persistente (tambien via API /api/abyss/configurar) */
function configurar(partial) {
  const actual = leerCfgDisco();
  const nueva = Object.assign(actual, partial);
  fs.mkdirSync(path.dirname(ARCHIVO_CFG), { recursive: true });
  fs.writeFileSync(ARCHIVO_CFG, JSON.stringify(nueva, null, 2));
  Object.assign(CFG, nueva);
  return CFG;
}

function activo() { return Boolean(CFG.url && CFG.secret); }

function aUnidades(montoDecimal) {
  // '0.20' -> '20' sin coma flotante
  const s = Number(montoDecimal).toFixed(2);
  const [entero, frac] = s.split('.');
  return String(BigInt(entero) * 100n + BigInt(frac));
}

function firmar(rawBody) {
  return crypto.createHmac('sha256', CFG.secret).update(rawBody).digest('hex');
}

async function walletCall(action, body) {
  const raw = JSON.stringify(body);
  const r = await fetch(`${CFG.url}/wallet/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-provider-id': CFG.providerId,
      'x-signature': firmar(raw)
    },
    body: raw
  });
  const texto = await r.text();
  let json; try { json = JSON.parse(texto); } catch (e) { json = { raw: texto.slice(0, 300) }; }
  return { estado: r.status, json };
}

/* saldo del jugador segun token de sesion del Hub */
async function saldo(sessionToken) {
  const { estado, json } = await walletCall('balance', { sessionToken });
  if (estado !== 200 || json.status !== 'OK') throw new Error('balance ' + estado + ' ' + JSON.stringify(json).slice(0, 140));
  return { unidades: BigInt(json.balance), cash: BigInt(json.cash || 0), bonus: BigInt(json.bonus || 0), moneda: json.currency || CFG.defaultCurrency };
}

function decimal(unidades) { return (Number(unidades) / 100).toFixed(2); }

module.exports = { CFG, activo, aUnidades, decimal, walletCall, saldo, firmar, configurar };
