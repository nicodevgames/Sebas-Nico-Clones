# 🎮 PP Slots — Plataforma de Slots Pragmatic Play

Plataforma completa que sirve el catalogo de juegos de **Pragmatic Play**
(cliente oficial embebido) con lobby propio a marca blanca, wallet real,
gestion de catalogo dinamica y clonador universal de juegos.

![estado](https://img.shields.io/badge/pool-358_juegos-blue) ![act](https://img.shields.io/badge/activacion-automatica-green)

## 📦 Estructura

| Carpeta | Descripcion |
|---------|-------------|
| [`pragmatic-play-clone/`](pragmatic-play-clone/) | **La plataforma** — lobby, wallet, APIs, motor propio, importador masivo |
| [`pragmatic-play-motor/`](pragmatic-play-motor/) | Motor original inicial (referencia historica) |

👉 **Docs completas:** [`pragmatic-play-clone/README.md`](pragmatic-play-clone/README.md)

## ⚡ Arranque

```bash
cd pragmatic-play-clone
npm install
npm start
# Lobby:  http://localhost:3100/
```

## ✨ Funcionalidades

- **Lobby a marca blanca** — nombre/colores por API (`/api/marca`)
- **358 slots de Pragmatic** en pool, con activacion automatica en background
- **Caratulas oficiales** de cada juego (minadas del sitio oficial)
- **Cliente real de Pragmatic** embebido a pantalla completa por juego
- **Wallet completa** — depositos, retiros, ledger persistente (`/api/wallet/*`)
- **Clonador 1-paso** — `POST /api/clonar-completo {id}` agrega cualquier juego
- **Motor matematico propio** opcional (RNG, wilds x2/x3, calibrador de RTP)
- **Persistencia atomica** — cuentas y saldos sobreviven reinicios
- **Anti rate-limit** — cooldown por juego, backoff, mirrors, precalentador

## 🌿 Ramas

- `main` — linea principal estable
- `clone-pragmatic-play` — historia completa de desarrollo

## 📄 Licencia

MIT — los nombres/marcas de juegos pertenecen a Pragmatic Play; este
proyecto integra su cliente demo publico para fines de desarrollo.
