# 🎮 Sebas-Nico-Clones

Coleccion de clones/motores de juegos de casino online, con fines de estudio
e ingenieria inversa del protocolo de los demos publicos.

## 📦 Proyectos

| Carpeta | Descripcion | Estado |
|---------|-------------|--------|
| [`pragmatic-play-motor/`](pragmatic-play-motor/) | Motor original de Pragmatic Play (Dog House) — referencia inicial | 🗄️ Referencia |
| [`pragmatic-play-clone/`](pragmatic-play-clone/) | **Clon funcional**: juegos del demo embebidos en iframe via proxy Node.js, con cache de sesiones, resiliencia y documentacion del protocolo | 🚀 Funcional |

👉 **Empezar por aca:** [`pragmatic-play-clone/README.md`](pragmatic-play-clone/README.md)

## ⚡ TL;DR

```bash
cd pragmatic-play-clone
npm install
npm start
# → http://localhost:3100/?juego=vs20doghouse
```

## 🌿 Ramas

- `main` — Linea principal estable.
- `clone-pragmatic-play` — Desarrollo del clon funcional (hitos: fix de
  sesion `mgckey`, modo embed con iframe, resiliencia ante rate-limit).

## 📄 Licencia

MIT
