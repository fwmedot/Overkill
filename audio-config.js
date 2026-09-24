/* =====================================================================
   HELLRUSH - CONFIGURACION DE AUDIO
   =====================================================================
   ESTE ES EL ARCHIVO QUE TU EDITAS PARA CAMBIAR SONIDOS Y MUSICA.

   COMO FUNCIONA (version simple):
   - Cada linea de abajo dice: "nombre del sonido" : "ruta del archivo".
   - Si el archivo EXISTE en la carpeta audio/, el juego lo usa.
   - Si NO existe, el juego usa su sonido interno de siempre.
     (Asi el juego NUNCA se queda sin sonido ni se rompe.)

   PARA CAMBIAR UN SONIDO SIN TOCAR ESTE ARCHIVO:
   Simplemente sube un archivo con EXACTAMENTE el mismo nombre
   a la carpeta correcta, reemplazando el anterior.

   FORMATOS ACEPTADOS: .mp3  .ogg  .wav
   (Recomendado: .mp3 para musica, .ogg o .wav para efectos cortos.)
   Si quieres usar otro formato, cambia solo la extension en la linea
   correspondiente (por ejemplo "disparo.mp3" a "disparo.wav").

   IMPORTANTE: respeta las comillas "" y las comas , al final de cada linea.
   ===================================================================== */

window.HELLRUSH_AUDIO = {

  /* ---------- MUSICA DE FONDO ----------
     Suena en bucle mientras juegas. Un solo archivo largo.
     Si lo dejas vacio (""), se usa la musica interna del juego. */
  music: {
    battle:  "audio/music/musica-batalla.mp3",
    boss:    "audio/music/musica-jefe.mp3"      // suena durante el combate contra el jefe
  },

  /* ---------- VOLUMEN INDIVIDUAL ----------
     0 = silencio total, 1 = volumen maximo.
     Si un sonido te parece muy fuerte o muy bajo, cambia su numero aqui. */
  volume: {
    music: 0.6,
    sfx:   1.0
  },

  /* ---------- EFECTOS DE SONIDO ----------
     Cada nombre de la izquierda NO se debe cambiar (el juego lo usa).
     Solo cambia la ruta de la derecha si quieres otro nombre de archivo. */
  sfx: {

    /* ARMAS (disparos) */
    pistol:    "audio/sfx/disparo-revolver.mp3",
    shotgun:   "audio/sfx/disparo-escopeta.mp3",
    rail:      "audio/sfx/disparo-riel.mp3",
    nail:      "audio/sfx/disparo-clavos.mp3",

    /* IMPACTOS Y MUERTES */
    hit:       "audio/sfx/impacto-enemigo.mp3",     // le pegas a un enemigo
    kill:      "audio/sfx/muerte-enemigo.mp3",      // matas a un enemigo normal
    bigKill:   "audio/sfx/muerte-enemigo-grande.mp3", // matas a un bruto o jefe
    slam:      "audio/sfx/explosion.mp3",           // explosiones y golpe al suelo
    parry:     "audio/sfx/parry.mp3",               // devuelves un proyectil

    /* ENEMIGOS */
    enemyShot: "audio/sfx/disparo-enemigo.mp3",
    telegraph: "audio/sfx/aviso-ataque.mp3",        // pitido antes de un ataque
    boss:      "audio/sfx/rugido-jefe.mp3",         // aparece el jefe

    /* JUGADOR */
    hurt:      "audio/sfx/jugador-herido.mp3",
    death:     "audio/sfx/jugador-muere.mp3",
    lava:      "audio/sfx/lava.mp3",                // caes en la lava
    jump:      "audio/sfx/salto.mp3",
    dash:      "audio/sfx/dash.mp3",
    slide:     "audio/sfx/deslizar.mp3",

    /* GANCHO */
    hookFire:  "audio/sfx/gancho-lanzar.mp3",
    hookHit:   "audio/sfx/gancho-clavar.mp3",

    /* JUEGO / INTERFAZ */
    pickup:    "audio/sfx/recoger-item.mp3",
    wave:      "audio/sfx/nueva-oleada.mp3",
    rank:      "audio/sfx/subir-rango.mp3",
    button:    "audio/sfx/boton.mp3"                // al pulsar botones de los menus
  }
};
