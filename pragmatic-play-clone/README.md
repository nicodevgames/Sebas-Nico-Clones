# 🎰 Pragmatic Play Clone — Motor Embebido Funcional

Clon funcional del motor de juegos de **Pragmatic Play** que permite ejecutar los
juegos del demo oficial en local a traves de un proxy Node.js, embebidos en un
iframe a pantalla completa, exactamente como los integran los casinos.

**Rama de desarrollo:** `clone-pragmatic-play`

---

## 🚀 Inicio rapido

```bash
cd pragmatic-play-clone
npm install
npm start          # servidor en http://localhost:3100
```

Abrir un juego:

```
http://localhost:3100/?juego=vs20doghouse
```

Parametros opcionales:

| Parametro | Valores | Descripcion |
|-----------|---------|-------------|
| `juego`   | simbolo del catalogo (`vs20doghouse`, `vs20sweetbonanza`, ...) | Juego a abrir |
| `modo`    | `embed` (default) / `legacy` | `embed` = iframe directo al demo; `legacy` = reensambla la pagina via proxy (para ingenieria inversa) |

---

## 🕹️ Links de juegos verificados

Patron de simbolos: `vs20<nombre>` (algunos titulos aceptan el nombre corto).

| Juego | URL |
|-------|-----|
| The Dog House | `/?juego=vs20doghouse` |
| The Dog House Megaways | `/?juego=vs20thedoghousemegaways` |
| Sweet Bonanza | `/?juego=vs20sweetbonanza` |
| Gates of Olympus | `/?juego=vs20gatesofolympus` |
| Sugar Rush | `/?juego=vs20sugarrush` |
| Big Bass Bonanza | `/?juego=vs20bigbassbonanza` |
| Wolf Gold | `/?juego=vs20wolfgold` |
| Fruit Party | `/?juego=vs20fruitparty` |
| Wild Wild Riches | `/?juego=vswildwildriches` |
| Fire Strike | `/?juego=vs20firestrike` |

Catalogo completo del demo:

```bash
curl 'https://demogamesfree.pragmaticplay.net/gs2c/getGameList.do?lang=en'
```

---

## 🏗️ Arquitectura

```
Navegador ──► localhost:3100 (Express) ──► demogamesfree.pragmaticplay.net
                    │
                    ├─ GET /  → openGame.do (302 + mgckey) → pagina embed con <iframe>
                    ├─ cache de sesion por juego (~8 min, evita rate-limit)
                    ├─ backoff progresivo (1s/4s/8s) alternando 2 mirrors
                    └─ modo legacy: proxy completo de assets + API gs2c
```

Componentes:

- **`server.js`** — Servidor Express: modo embed (iframe a `html5Game.do`),
  modo legacy (proxy de assets/scripts/API), cache de sesiones `mgckey`,
  backoff con mirrors, pantalla auto-reintento y overlay de diagnostico.
- **`build.js` / `bootstrap-stub.js`** — Stubs de inicializacion del loader UHT.
- **`vs20doghouse_completo.html`** — Snapshot completo (3.5 MB) de la pagina
  del juego capturada del demo (referencia de ingenieria inversa).
- **`respuestas/vs20doghouse.init.txt`** — Fixture real de la respuesta
  `doInit` (paytable, reels, wilds, scatters, RTP).
- **`PROTOCOLO.md`** — Documentacion del protocolo `gs2c` (sesion, doInit,
  doSpin, index/counter, errores).

---

## 🔑 Lecciones clave del desarrollo (por si se rompe algo)

1. **El `mgckey` es la sesion**: cada `openGame.do` invalida la anterior.
   Reusar SIEMPRE el mismo `mgckey` embebido en el `gameConfig`.
2. **Rate-limit del demo**: peticiones seguidas a `openGame.do` devuelven
   HTTP 200 con pagina "Sorry, an error has occurred" (sin Location).
   Solucion: cache de sesiones + backoff + mirrors + auto-refresh.
3. **El loader UHT del demo** (`bootstrap.js` → `build.js` de 3.1 MB) depende
   de mensajeria postMessage del iframe padre; reensamblarla es fragil. Por
   eso el modo embed es el camino estable.
4. **Sonidos**: el proxy responde stubs 200 para `game/sounds.*` y
   `GUI_sounds.*` para que el loader no entre en bucle.
5. **Verificacion MD5 identica** entre motor original y clon: `40a57ae0...`
   (snapshot del `server.js` inicial del clon).

---

## 📜 Historial de hitos (rama `clone-pragmatic-play`)

| Commit | Hito |
|--------|------|
| `9bc2cea` | Fix de sesion: reusar `mgckey` de la pagina en `doInit` (evita 500 y splash congelado) |
| `cf8bbcf` | Simulacion completa OK: page/bootstrap/build.js/doInit/spin → 200 |
| `9539dae` | **Modo embed**: iframe directo a `html5Game.do` (omite loader fragile) |
| `d25b2b5` | Resiliencia: cache de sesiones, backoff + mirrors, pagina auto-reintento |

---

## 📋 Estructura del repositorio

```
Sebas-Nico-Clones/
├── pragmatic-play-motor/     # Motor original (referencia)
└── pragmatic-play-clone/     # Clon funcional (este proyecto)
```

**Estado:** 🚀 Funcional en produccion local — Dog House verificado girando
con saldo demo. Extensible a todo el catalogo del demo.

