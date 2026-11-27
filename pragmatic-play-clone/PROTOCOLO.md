# Protocolo gs2c (demo Pragmatic)

## Sesión
- GET /gs2c/openGame.do?gameSymbol=<sym>&jurisdiction=99&lang=en
  responde 302 a html5Game.do con `mgckey=<style>@generic~SESSION@<uuid>`.
- El mgckey viaja en el query de gameService y también en el cuerpo.
- La cookie de sesión es obligatoria. Cada openGame.do invalida la anterior.

## Init
POST /gs2c/ge/v3/gameService?mgckey=...
action=doInit&symbol=<sym>&cver=<UHT_REVISION.common>&index=1&counter=1&repeat=0

## Spin
POST /gs2c/ge/v3/gameService?mgckey=...
action=doSpin&symbol=<sym>&cver=...&c=<coin>&l=<lineas>&index=N&counter=M&repeat=0

- index arranca en 1 y se incrementa con cada respuesta.
- counter = counter de la respuesta anterior + 1.
- Los nombres son literales: index, counter, repeat.
- cver = UHT_REVISION.common del build (442773 en vs20doghouse).

## Respuesta de init
Incluye el math completo: paytable, reel_set0, reel_set1, wilds,
scatters y rtp. Fixture guardado en respuestas/.

## Errores
- msg_code=11 / ext_code=SystemError: index o counter desfasados, o mgckey de otra sesion.
