/* =====================================================================
   HELLRUSH - CONFIGURACION DE AUDIO
   =====================================================================
   PARA CAMBIAR UN SONIDO O UNA CANCION SIN TOCAR CODIGO:
   Sube a GitHub un archivo con EXACTAMENTE el mismo nombre y en la
   misma carpeta que aparece abajo. Reemplaza al anterior. Listo.

   COMO FUNCIONA:
   - Cada linea dice:  nombreInterno : ["categoria", "carpeta/archivo.mp3"]
   - Si el archivo EXISTE, el juego lo usa.
   - Si NO existe, el juego usa su sonido interno (fabricado por codigo).
     Asi el juego NUNCA se queda mudo ni se rompe.

   NUNCA CAMBIES la palabra de la izquierda (nombreInterno): el juego
   la usa por dentro. Solo cambia la ruta de la derecha si quieres otro
   nombre de archivo.

   FORMATOS ACEPTADOS: .mp3  .ogg  .wav
   Si tu archivo es de otro formato, cambia SOLO la extension en la linea
   (por ejemplo "disparo-revolver.mp3" -> "disparo-revolver.wav").

   IMPORTANTE: respeta las comillas "" y la coma , al final de cada linea
   (menos la ultima de cada bloque, que no lleva coma).
   ===================================================================== */

window.HELLRUSH_AUDIO = {

  /* ---------- MUSICA ----------
     Suena en bucle. Son 3 capas que se mezclan solas segun lo que pasa:
       calm   -> poca accion: entre oleadas y al empezar
       battle -> combate normal
       boss   -> cuando hay un jefe
     Si dejas una ruta vacia ("") esa capa usa la musica interna del juego. */
  music: {
    calm:    "audio/music/musica-calma.mp3",
    battle:  "audio/music/musica-batalla.mp3",
    boss:    "audio/music/musica-jefe.mp3"
  },

  /* ---------- MUSICA POR OLEADA (opcional) ----------
     Si quieres una cancion distinta en una oleada concreta, escribe el
     numero de oleada y la ruta. Ejemplo (quita las // del principio):
        10: "audio/music/musica-oleada-10.mp3",
     Si la oleada no esta en la lista, se usa la musica normal de arriba.
     Solo cambia la cancion de "combate"; el jefe siempre usa "boss". */
  musicByWave: {
    // 10: "audio/music/musica-oleada-10.mp3",
    // 15: "audio/music/musica-oleada-15.mp3"
  },

  /* ---------- VOLUMENES ----------
     0 = silencio total, 1 = maximo. Puedes usar decimales (0.5 = mitad).
     El jugador tambien puede moverlos en MOD MENU > AUDIO.
     Cada categoria se multiplica por el volumen general.            */
  volume: {
    music:   0.6,    // canciones
    weapons: 1.0,    // disparos de tus armas
    enemies: 1.0,    // ataques, golpes y muertes de enemigos
    player:  1.0,    // tus movimientos, dano, lava, gancho
    ui:      1.0      // botones, oleadas, rangos, items
  },

  /* ---------- EFECTOS DE SONIDO ----------
     Cada linea:  nombreInterno: ["categoria", "ruta"]
     La categoria decide que control de volumen le afecta:
       weapons / enemies / player / ui
     No cambies la categoria salvo que quieras que otro control lo maneje. */
  sfx: {

    /* ARMAS -> audio/sfx/weapons/ */
    pistol:    ["weapons", "audio/sfx/weapons/disparo-revolver.mp3"],
    shotgun:   ["weapons", "audio/sfx/weapons/disparo-escopeta.mp3"],
    rail:      ["weapons", "audio/sfx/weapons/disparo-riel.mp3"],
    nail:      ["weapons", "audio/sfx/weapons/disparo-clavos.mp3"],

    /* ENEMIGOS -> audio/sfx/enemies/ */
    hit:       ["enemies", "audio/sfx/enemies/impacto-enemigo.mp3"],
    kill:      ["enemies", "audio/sfx/enemies/muerte-enemigo.mp3"],
    bigKill:   ["enemies", "audio/sfx/enemies/muerte-enemigo-grande.mp3"],
    enemyShot: ["enemies", "audio/sfx/enemies/disparo-enemigo.mp3"],
    telegraph: ["enemies", "audio/sfx/enemies/aviso-ataque.mp3"],
    boss:      ["enemies", "audio/sfx/enemies/rugido-jefe.mp3"],

    /* JUGADOR -> audio/sfx/player/ */
    hurt:      ["player", "audio/sfx/player/jugador-herido.mp3"],
    death:     ["player", "audio/sfx/player/jugador-muere.mp3"],
    jump:      ["player", "audio/sfx/player/salto.mp3"],
    dash:      ["player", "audio/sfx/player/dash.mp3"],
    slide:     ["player", "audio/sfx/player/deslizar.mp3"],
    hookFire:  ["player", "audio/sfx/player/gancho-lanzar.mp3"],
    hookHit:   ["player", "audio/sfx/player/gancho-clavar.mp3"],
    parry:     ["player", "audio/sfx/player/parry.mp3"],

    /* ENTORNO -> audio/sfx/environment/ */
    slam:      ["player", "audio/sfx/environment/explosion.mp3"],
    lava:      ["player", "audio/sfx/environment/lava.mp3"],

    /* INTERFAZ -> audio/sfx/ui/ */
    pickup:    ["ui", "audio/sfx/ui/recoger-item.mp3"],
    wave:      ["ui", "audio/sfx/ui/nueva-oleada.mp3"],
    rank:      ["ui", "audio/sfx/ui/subir-rango.mp3"],
    button:    ["ui", "audio/sfx/ui/boton.mp3"]
  }
};
