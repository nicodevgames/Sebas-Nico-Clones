# 🎰 Pragmatic Play - Motor Original Completo

## ¿Qué es esto?
Motor ORIGINAL de Pragmatic Play "Dog House" con backend Node.js funcional.

## Requisitos
- Node.js v20+
- npm

## Instalación
```bash
npm install
```

## Ejecución LOCAL
```bash
node server.js
# Acceder a: http://localhost:3000/vs20doghouse_completo.html
```

## Ejecución en DROPLET DigitalOcean
```bash
nohup node server.js > /tmp/motor.log 2>&1 &
# Acceder a: http://162.243.162.154:3000/vs20doghouse_completo.html
```

## Archivos
- `vs20doghouse_completo.html` - Motor original Pragmatic Play (3.4MB)
- `server.js` - Backend Express con API de juego
- `package.json` - Dependencias Node.js

## Endpoints
- GET `/` - Status
- GET `/health` - Health check
- POST `/gs2c/gameService` - API del juego
- GET `/vs20doghouse_completo.html` - Motor

## Git
Sincronizado automáticamente con:
https://github.com/nicodevgames/Sebas-Nico-Clones
