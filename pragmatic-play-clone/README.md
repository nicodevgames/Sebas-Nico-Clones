# 🎰 CLON PRAGMATIC PLAY - MOTOR EXACTO

Clon exacto del motor de Pragmatic Play con backend completo.

---

## ⭐ CATÁLOGO DE JUEGOS (API)

Ver lista completa de juegos disponibles:
```bash
curl 'https://demogamesfree.pragmaticplay.net/gs2c/getGameList.do?lang=en'
```

Ejemplo de uso:
- Dog House: `http://localhost:3000/?juego=vs20doghouse`
- Sweet Bonanza: `http://localhost:3000/?juego=sweetbonanza`

---

## 🚀 INSTALACIÓN Y EJECUCIÓN

```bash
cd /root/Sebas-Nico-Clones/pragmatic-play-clone
npm install
npm start
```

El servidor estará disponible en: **http://localhost:3000/**

---

## 🎮 FEATURES

✅ Clon exacto del motor original
✅ Sistema de sesiones con mgckey
✅ Protocolo doInit/doSpin completo
✅ Escaparate HTML generado dinámicamente
✅ CORS habilitado
✅ Internacionalización soportada
✅ Backend completo y funcional

---

## 📋 ARCHIVOS CLAVE

- `server.js` - Motor principal con WebSocket
- `build.js` - Inicializador del juego
- `index.html` - Escaparate web
- `vs20doghouse_completo.html` - Documento completo
- `README-FINAL.md` - Documentación detallada

---

## 🛠️ PANADERÍA DE SABORES DE JUEGO

Este proyecto demuestra que es posible crear un **motor composicional** que:
1. Disecciona el escaparate de Pragmatic Play (Escaparate -> pantallas de contexto)
2. Extrae cada componente de forma modular (Jugadores, Botones, Teclas de sticker, Lanzamientos, Clusters)
3. Aplica la aritmética de lotería para hacer funcionar modos de juego (Non-Weighted, Opening, Live)
4. Escale咨询师 (Scale Helper + Globals) para personalizar listas de ganancias
5. Desarrolla lógica de ganancias escalables y reparto equitativo entre puntajes
6. Es extensible y fácil de actualizar

---

## 🎯 VERSIÓN DEL PROYECTO

- Nombre: pragmatic-play-clone (v1.0.0)
- Motor: Dog House vs20doghouse
- Lenguajes: En español
- Endpoint: /gs2c/common/v3/games-html5/games/vs/vs20doghouse/

---

**Status:** 🚀 Funcional y listo para producción
