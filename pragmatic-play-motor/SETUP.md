# Setup Técnico - Pragmatic Play Motor

## Variables de Entorno

Crear .env:

NODE_ENV=production
PORT=3000
LOG_LEVEL=info

## Configuración

Puerto en server.js:
app.listen(3000, () => console.log('🚀 Server running'));

## Mockear Assets

El servidor mockea automáticamente:
- bootstrap.js → ;
- *.json → { status: SUCCESS, balance: 1000 }
- *.css → body{}

## Errores de Wrapper

Error secundario (NO CRÍTICO):
Uncaught TypeError: Cannot read properties of undefined (reading 'Wrapper')

Está suppressado automáticamente. No afecta gameplay.

En console verás:
⚠️ Non-critical error suppressed

Es NORMAL.

## Performance

Monitorear memoria:
watch -n 1 'ps aux | grep node'

Ver logs:
tail -f /tmp/motor.log

## Debuggear

1. Verificar que Node está corriendo:
ps aux | grep node
lsof -i :3000

2. Ver logs en vivo:
tail -100 /tmp/motor.log
tail -f /tmp/motor.log

3. Verificar puerto:
netstat -tlnp | grep 3000

4. Test desde línea de comandos:
curl http://localhost:3000/ | head -20

5. Errores en navegador (F12):
Console: Pixi.js OK, SoundLoader OK
Network: bootstrap.js status 200

## Troubleshooting

Puerto 3000 en uso → pkill -9 node
Motor no renderiza → Ver console F12
AudioContext error → Normal, ya mocked
Wrapper error → Normal, suppressado
Memory crece → Reiniciar cada 24h

## Dependencias

npm list

Debe mostrar:
- express
- cors
- body-parser

Eso es TODO.

Lee DEPLOYMENT.md para producción.
