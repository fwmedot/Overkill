# GUÍA DE AUDIO — HELLRUSH

Esta guía es para cambiar la **música** y los **sonidos** del juego **sin tocar código**.
Solo necesitas GitHub y tus archivos de audio.

---

## LA IDEA EN 30 SEGUNDOS

1. Cada sonido del juego tiene un **nombre de archivo fijo** y vive en una **carpeta fija** (están todos listados abajo).
2. Tú subes tu archivo con **exactamente ese nombre**, en esa carpeta.
3. Al subirlo, **reemplaza** al anterior. El juego lo usa solo.
4. Si un archivo **no existe**, el juego usa un sonido interno de respaldo. **Nunca se queda mudo ni se rompe.**

> **Hoy no hay ningún archivo de audio subido**: el juego suena con sus sonidos internos (fabricados por código). Cada archivo que subas sustituye a su sonido interno.

---

## CÓMO REEMPLAZAR UN SONIDO DESDE GITHUB (paso a paso)

**Ejemplo: cambiar el disparo del revolver.**

1. Prepara tu sonido en tu ordenador y **renómbralo** a `disparo-revolver.mp3` (mira la tabla de abajo para saber el nombre).
2. Entra a tu repositorio en **github.com**.
3. Abre la carpeta **audio**, luego **sfx**, luego **weapons**.
4. Arriba a la derecha pulsa **Add file → Upload files**.
5. **Arrastra** tu archivo `disparo-revolver.mp3` a la zona de subida.
6. Baja y pulsa el botón verde **Commit changes**.
7. **Espera 1 o 2 minutos** (GitHub Pages tarda en actualizarse).
8. Abre el juego y pulsa **Ctrl + F5** (en móvil: cierra la pestaña y ábrela de nuevo) para que no use la versión vieja guardada.

**Si el archivo ya existía**, GitHub te dejará subirlo igualmente y lo reemplaza. No hace falta borrar el anterior.

---

## REGLAS DE ORO (lo que más falla)

| Regla | Por qué |
|---|---|
| El nombre debe ser **idéntico**: mismas mayúsculas/minúsculas, mismos guiones, sin espacios | `Disparo-Revolver.mp3` NO es lo mismo que `disparo-revolver.mp3` |
| La extensión también cuenta: `.mp3` ≠ `.MP3` | GitHub distingue mayúsculas |
| Formatos válidos: **.mp3, .ogg, .wav** | Otros (`.m4a`, `.flac`) pueden no sonar en todos los móviles |
| Los sonidos cortos deben ser **cortos** (menos de 1–2 segundos) | Suenan muchas veces por segundo |
| Recorta el silencio del principio del archivo | Si empieza con silencio, parecerá que el sonido llega tarde |
| Mantén los archivos **pequeños** | Muchos archivos grandes hacen tardar la carga en móvil |

**Si tu archivo es `.wav` u `.ogg`** y quieres conservarlo así, tienes dos opciones:
- **Fácil:** conviértelo a `.mp3` y usa el nombre de la tabla.
- **Sin convertir:** abre `audio-config.js` en GitHub, pulsa el lápiz ✏️, cambia SOLO la extensión en esa línea (por ejemplo `disparo-revolver.mp3` → `disparo-revolver.wav`) y pulsa **Commit changes**.

**Si subes un archivo roto o que no es audio**, el juego lo ignora y usa el sonido interno. No se rompe nada.

---

## 🎵 MÚSICA — 5 canciones que cambian solas

La música **reacciona a lo que pasa**. Se mezcla suavemente (unos 1,5 segundos) entre estas capas:

| Archivo | Carpeta | Cuándo suena |
|---|---|---|
| `musica-menu.mp3` | `audio/music/` | **Menú principal**, opciones y pantalla de muerte |
| `musica-calma.mp3` | `audio/music/` | Al empezar la partida y **entre oleadas** (poca acción) |
| `musica-batalla.mp3` | `audio/music/` | **Durante el combate** normal |
| `musica-jefe.mp3` | `audio/music/` | Cuando hay un **jefe** en pantalla (oleadas 5, 10, 15, 20, 25…) |
| `musica-versus.mp3` | `audio/music/` | **Modo Versus**. Si no existe, suena `musica-batalla.mp3` |

**Detalles útiles:**
- La música vuelve a *calma* solo tras unos **4 segundos sin combate**, para que no cambie de golpe entre oleadas seguidas.
- Usa canciones que **se puedan repetir en bucle** sin cortes raros: se reproducen en bucle continuo.
- Si subes solo `musica-batalla.mp3` y no `musica-calma.mp3`, la de batalla suena siempre. Puedes subir solo las que quieras.
- Si **no subes ninguna**, suena la música interna del juego, que además se vuelve más intensa cuanto mejor juegas.

### Cómo poner una canción distinta en una oleada concreta

Por ejemplo, una canción especial para la **oleada 10**:

1. Sube tu canción a `audio/music/` con el nombre `musica-oleada-10.mp3`.
2. En GitHub abre el archivo **`audio-config.js`** y pulsa el lápiz ✏️.
3. Busca este texto:
```js
  musicByWave: {
    // 10: "audio/music/musica-oleada-10.mp3",
    // 15: "audio/music/musica-oleada-15.mp3"
  },
```
4. **Borra las dos barras `//`** delante de la línea de la oleada 10, dejándola así:
```js
  musicByWave: {
    10: "audio/music/musica-oleada-10.mp3",
    // 15: "audio/music/musica-oleada-15.mp3"
  },
```
5. Pulsa **Commit changes**.

> ⚠️ **Nota importante:** para una canción por oleada **sí hay que editar `audio-config.js`** (solo quitar `//`). Es la única parte de la música que no se puede hacer solo subiendo un archivo, porque el juego necesita saber en qué oleada quieres usarla.
> Esa canción reemplaza a la de *batalla* en esa oleada. Los **jefes** siempre usan `musica-jefe.mp3`.

Para añadir otra oleada (por ejemplo la 20), copia una línea, cambia el número y el nombre del archivo, y **cuida la coma `,`** al final de cada línea excepto la última.

---

## 🔊 EFECTOS DE SONIDO — LISTA COMPLETA (25)

Cada uno con su nombre exacto, carpeta y cuándo suena.

### ARMAS — carpeta `audio/sfx/weapons/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `disparo-revolver.mp3` | Disparo del **revolver** (arma 1, la que empiezas usando). | armas |
| `disparo-escopeta.mp3` | Disparo de la **escopeta** (arma 2). | armas |
| `disparo-riel.mp3` | Disparo del **riel** (arma 3). Se desbloquea al llegar a la oleada 3. | armas |
| `disparo-clavos.mp3` | Disparo de la **clavadora** (arma 4). Se desbloquea al llegar a la oleada 5. | armas |

### ENEMIGOS — carpeta `audio/sfx/enemies/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `impacto-enemigo.mp3` | Un enemigo **recibe un golpe** pero no muere. Suena muchas veces por segundo en combate: mejor corto (menos de 0.2 s). | enemigos |
| `muerte-enemigo.mp3` | Un enemigo normal **muere**. | enemigos |
| `muerte-enemigo-grande.mp3` | Un enemigo **pesado** muere (los grandes). | enemigos |
| `disparo-enemigo.mp3` | Un enemigo **dispara** un proyectil contra ti. | enemigos |
| `aviso-ataque.mp3` | **Aviso**: un enemigo esta a punto de atacar o explotar. Sirve para que sepas que debes moverte. Que se oiga claro. | enemigos |
| `rugido-jefe.mp3` | **Rugido** cuando aparece un jefe. | enemigos |

### JUGADOR — carpeta `audio/sfx/player/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `jugador-herido.mp3` | **Tu** recibes dano. | jugador y entorno |
| `jugador-muere.mp3` | **Tu** mueres. | jugador y entorno |
| `salto.mp3` | **Saltas**. | jugador y entorno |
| `dash.mp3` | Haces un **dash**. | jugador y entorno |
| `deslizar.mp3` | Te **deslizas**. | jugador y entorno |
| `gancho-lanzar.mp3` | **Lanzas** el gancho. | jugador y entorno |
| `gancho-clavar.mp3` | El gancho **se clava** en algo. | jugador y entorno |
| `parry.mp3` | Haces un **parry** (devuelves un proyectil). | jugador y entorno |

### PASOS — carpeta `audio/sfx/steps/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `pasos.mp3` | **Un solo paso** del jugador. Se repite solo al caminar o correr por el suelo. Suena **más seguido cuanto más rápido vas**. **No suena** en el aire, al deslizarte, en dash ni colgado del gancho. Debe ser **corto** (menos de 0.4 s) y **de un solo paso** (no una tanda de pasos). | jugador y entorno |

> Para cambiar los pasos: sube tu sonido con el nombre `pasos.mp3` a `audio/sfx/steps/`. Nada más. No hay controles de pasos en Opciones: usa el volumen de **Jugador y entorno**.

### ENTORNO — carpeta `audio/sfx/environment/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `explosion.mp3` | Una **explosion** (bombas enemigas) o tu **golpe al suelo**. Es el mismo sonido para las dos cosas. | jugador y entorno |
| `lava.mp3` | Caes a la **lava**. | jugador y entorno |

### INTERFAZ — carpeta `audio/sfx/ui/`

| Nombre exacto | Cuándo suena | Volumen que lo controla |
|---|---|---|
| `recoger-item.mp3` | **Recoges** un item (vida, municion). | interfaz |
| `nueva-oleada.mp3` | Empieza una **oleada** nueva. | interfaz |
| `subir-rango.mp3` | Subes de **rango de estilo** o de nivel de **FUEGO**. | interfaz |
| `boton.mp3` | Pulsas un **boton** de los menus. | interfaz |

---

## 🎚️ VOLÚMENES

Hay **5 controles de volumen** + el general. Cada sonido pertenece a uno (última columna de las tablas).

| Control | Afecta a |
|---|---|
| **Música** | Las 3 canciones y la música interna |
| **Armas** | Los 4 disparos |
| **Enemigos** | Golpes, muertes, disparos y avisos de enemigos, rugido del jefe |
| **Jugador y entorno** | Saltar, dash, deslizar, gancho, parry, daño, explosiones, lava |
| **Interfaz** | Botones, nueva oleada, subida de rango, recoger items |

### Cambiarlos mientras juegas
Abre el **MOD MENU** del juego: están los sliders (música, armas, enemigos, jugador y entorno, interfaz).

### Cambiar el volumen por defecto (el que tiene al abrir el juego)
1. En GitHub abre **`audio-config.js`** y pulsa ✏️.
2. Busca el bloque `volume:`:
```js
  volume: {
    music:   0.6,
    weapons: 1.0,
    enemies: 1.0,
    player:  1.0,
    ui:      1.0
  },
```
3. Cambia solo los **números** (0 = silencio, 1 = máximo; puedes usar decimales como 0.5).
4. **Commit changes**.

> Si un sonido de tu propio archivo suena **demasiado fuerte o flojo**, lo más sencillo es ajustar su volumen en tu editor de audio antes de subirlo, o bajar el control de su categoría aquí.

---

## ¿YA HABÍAS SUBIDO AUDIOS ANTES?

Antes, todos los efectos iban juntos en `audio/sfx/`. Ahora están **organizados en subcarpetas** (`weapons`, `enemies`, `player`, `environment`, `ui`).

**No pierdes nada:** si tus archivos siguen en la carpeta antigua `audio/sfx/`, **el juego los sigue encontrando** y funcionan igual.

Si existe el mismo archivo en las dos ubicaciones, **gana el de la subcarpeta nueva**.

Cuando quieras ordenarlo bien, en GitHub abre el archivo, pulsa `⋯` → *Rename* y escribe la ruta nueva delante del nombre (por ejemplo `weapons/disparo-revolver.mp3`). O simplemente vuelve a subirlo a su carpeta nueva y borra el viejo.

---

## RECETAS RÁPIDAS

**Cambiar la música de combate**
→ Sube `musica-batalla.mp3` a `audio/music/`.

**Cambiar un sonido de arma**
→ Sube el archivo con el nombre de la tabla ARMAS a `audio/sfx/weapons/` (ej: `disparo-escopeta.mp3`).

**Cambiar un sonido de enemigo**
→ Sube el archivo con el nombre de la tabla ENEMIGOS a `audio/sfx/enemies/` (ej: `muerte-enemigo.mp3`).

**Cambiar un sonido de la interfaz**
→ Sube el archivo con el nombre de la tabla INTERFAZ a `audio/sfx/ui/` (ej: `boton.mp3`).

**Volver al sonido original de un efecto**
→ En GitHub abre la carpeta, pulsa sobre tu archivo, pulsa el icono de la papelera 🗑️ y **Commit changes**. El juego vuelve a usar su sonido interno.

---

## ¿NO SUENA MI ARCHIVO? Revisa esto en orden

1. ¿El **nombre es idéntico** al de la tabla (mayúsculas, guiones, extensión)?
2. ¿Está en la **carpeta correcta**?
3. ¿Esperaste **1–2 minutos** tras el Commit?
4. ¿Hiciste **Ctrl + F5** (o cerraste y abriste la pestaña en móvil)?
5. ¿El archivo es **audio de verdad** y no está roto? Pruébalo en tu ordenador.
6. ¿Pusiste el **Volumen** del control correspondiente por encima de 0?
7. ¿Están los **efectos** y la **música** activados en el MOD MENU?

Para comprobar si el juego **está leyendo tus archivos**: abre el **MOD MENU**, activa la casilla **Mostrar FPS / estado** y mira abajo a la izquierda de la pantalla. Verás una línea como `audio: 3 efectos + 1 musicas desde archivo`. Si ese número **sube** cuando añades tu archivo, el juego lo está usando. Si no sube, el nombre, la carpeta o el formato no son correctos.

---

## ⚖️ AVISO SOBRE DERECHOS DE AUTOR

Usa música y sonidos **que sean tuyos o que tengan licencia libre** (por ejemplo Creative Commons o sitios de audio libre de derechos). **No uses canciones o sonidos de otros juegos** (como ULTRAKILL) ni música comercial: si publicas el juego, podrías tener problemas.

