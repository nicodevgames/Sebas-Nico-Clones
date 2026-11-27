# 🎰 PP SLOTS — Plataforma Propia de Games (estilo Pragmatic)

**Plataforma 100% propia**: motor matemático local, RNG propio, jugador web
propio y definición de juegos como datos. **Sin dependencia del demo** ni de
terceros en runtime. El modo demo queda solo como referencia opcional.

---

## 🚀 Arranque

```bash
cd pragmatic-play-clone
npm install
npm start                      # http://localhost:3100
```

- **Tu plataforma:** `http://localhost:3100/` (jugador propio + motor local)
- **Referencia demo (opcional):** `http://localhost:3100/demo?juego=vs20doghouse`

## 🔌 API propia

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/games` | GET | Lista los juegos instalados (carpetas en `games/`) |
| `/api/:juego/init` | GET | Config + símbolos visibles + saldo |
| `/api/:juego/spin` | POST `{coin}` | Gira con el motor local: grid, premios, mult, saldo |

## 🧩 Plantilla: agregar un juego nuevo (sin programar)

Crear carpeta y JSON — la plataforma lo detecta solo:

```
games/<mi-juego>/
└── game.json
```

Campos de `game.json`: `reels`, `rows`, `lineas` (matriz filas por reel),
`simbolos` (id→nombre/glifo/color), `paytable` (`{coincidencias:{simbolo:pago}}`),
`reel_sets` (tiras ponderadas `[simbolo,peso]` por columna), `wild` +
`wild_mult` (x2/x3) + rango de columnas, `scatter` + `scatter_paga`, `monedas`.

Fuentes de matemática: copiar estructura desde un fixture (`respuestas/`),
diseñar la tuya, o extraer de cualquier slot clásico.

## ⚙️ Motor y calibración

- **Motor:** `engine/motor.js` — evaluador de líneas con wild sustituto y
  multiplicadores x2/x3 en columnas centrales, scatter anywhere, cuentas.
- **Calibración RTP:**
  ```bash
  node engine/test/rtp.js   vs20doghouse 500000   # medir RTP
  node engine/test/tuner.js vs20doghouse 96 300000  # ajustar paytable al objetivo
  ```
  La tabla propuesta se guarda en `engine/test/tabla-propuesta.json`.
- Estado actual Dog House propio: RTP centrado ~96% (banda 93–98.5% según
  muestras de 100k–250k giros), hit freq ~27%, máximos >1000x apuesta.

## 🗺️ Roadmap natural

1. Más juegos = más carpetas `game.json` (Sweet Bonanza cascada, Megaways engine…)
2. Persistencia (SQLite) en `cuentas`
3. Sesiones multiusuario + JWT
4. FS bonus (free spins) — el motor ya tiene `reel_sets` múltiples para ello
5. Panel admin: RTP realtime, límites, configuración

---

Ver historial técnico y hallazgos del protocolo original en
[`PROTOCOLO.md`](PROTOCOLO.md). Modo referencia demo: ver `/demo`.


