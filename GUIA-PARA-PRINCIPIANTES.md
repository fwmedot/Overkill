# GUIA DE HELLRUSH PARA PRINCIPIANTES

Esta guia esta escrita para alguien que **nunca ha usado GitHub ni programado**.
Sigue los pasos en orden. No te saltes ninguno.

---

## PARTE 0: QUE ES CADA ARCHIVO DE TU JUEGO

Tu juego ahora esta dividido en archivos. Antes era uno solo enorme. Asi es mucho mas facil de manejar.

| Archivo / Carpeta | Para que sirve | Lo vas a tocar? |
|---|---|---|
| `index.html` | La "portada" del juego: enlaza todo lo demas | Casi nunca |
| `style.css` | Los **colores** y el aspecto de los botones y barras | A veces |
| `game.js` | El **motor** del juego (movimiento, enemigos, oleadas) | Solo valores sueltos |
| `audio-config.js` | La **lista de sonidos y musica** | Si quieres cambiar nombres |
| carpeta `audio/music/` | Aqui va tu **musica** | **SI, la mas comun** |
| carpeta `audio/sfx/` | Aqui van tus **efectos de sonido** | **SI, la mas comun** |
| carpeta `images/` | Para futuras imagenes | Cuando las necesites |

**Regla de oro:** si solo quieres cambiar musica o sonidos, **NO necesitas tocar ningun archivo de codigo**. Solo subes archivos de audio a las carpetas.

---

## PARTE 1: CREAR TU CUENTA Y TU REPOSITORIO EN GITHUB

**Que es un repositorio?** Es una carpeta en internet donde vive tu juego. Piensa en el como "el Google Drive de tu proyecto".

### Paso 1.1: Crear la cuenta
1. Abre el navegador y entra a **github.com**
2. Pulsa el boton **Sign up** (arriba a la derecha).
3. Escribe tu correo, crea una contrasena y elige un nombre de usuario.
4. Verifica tu correo (te llegara un codigo).

### Paso 1.2: Crear el repositorio
1. Ya dentro de GitHub, pulsa el boton **+** (arriba a la derecha, junto a tu foto).
2. Elige **New repository**.
3. En **Repository name** escribe: `hellrush` (sin espacios, sin acentos).
4. Elige **Public** (necesitas que sea publico para poder jugarlo por internet gratis).
5. **NO marques** ninguna de las casillas de abajo (README, .gitignore, license).
6. Pulsa el boton verde **Create repository**.

### Paso 1.3: Subir tus archivos por primera vez
Veras una pagina con instrucciones raras. **Ignorala**. Busca la frase pequena que dice **"uploading an existing file"** y pulsa ese enlace azul.

1. Abre la carpeta `hellrush` que te entrego en tu computadora.
2. **Selecciona TODO su contenido** (no la carpeta en si, lo que hay DENTRO): `index.html`, `style.css`, `game.js`, `audio-config.js`, `GUIA-PARA-PRINCIPIANTES.md` y las carpetas `audio` e `images`.
3. **Arrastralo** todo a la zona de GitHub que dice "Drag files here".
4. Espera a que termine de cargar (veras la lista de archivos).
5. Abajo, en el cuadro **Commit changes**, escribe: `Primera version`
6. Pulsa el boton verde **Commit changes**.

> **Termino tecnico: "commit".** Es simplemente "guardar los cambios con una nota". Como pulsar Guardar y escribir que hiciste.

### Paso 1.4: Comprobar que se subio bien
En la pagina principal de tu repositorio debes ver esta lista:
```
audio/
images/
GUIA-PARA-PRINCIPIANTES.md
audio-config.js
game.js
index.html
style.css
```
Si falta algo, repite el paso 1.3 solo con lo que falte.

---

## PARTE 2: JUGAR TU JUEGO EN INTERNET (GITHUB PAGES)

GitHub puede convertir tu repositorio en una pagina web que cualquiera puede abrir, gratis.

1. En tu repositorio, pulsa **Settings** (pestana de arriba, con un engranaje).
2. En el menu de la izquierda, pulsa **Pages**.
3. En **Source** (o "Build and deployment"), elige **Deploy from a branch**.
4. En **Branch**, elige `main` y en la carpeta `/ (root)`.
5. Pulsa **Save**.
6. **Espera 1 o 2 minutos** y recarga la pagina.
7. Arriba aparecera un cuadro con tu direccion: `https://TU-USUARIO.github.io/hellrush/`
8. **Abre esa direccion en tu telefono.** Ese es tu juego.

> **IMPORTANTE:** Cada vez que subas un cambio, tarda **1 a 2 minutos** en verse en la pagina. Si no ves el cambio, espera y recarga con fuerza (en el telefono: cierra la pestana y vuelve a abrirla).

---

## PARTE 3: CAMBIAR LA MUSICA Y LOS SONIDOS

### Como funciona (version simple)
El juego busca archivos con **nombres exactos** en las carpetas de audio.
- Si encuentra el archivo, **lo usa**.
- Si no lo encuentra, usa su sonido interno de siempre.

**Por eso puedes subir solo los que quieras.** No hace falta subirlos todos.

### Formatos aceptados
- **MP3** (recomendado para musica)
- **OGG** o **WAV** (buenos para efectos cortos)

> Si tu archivo tiene otro formato (por ejemplo `.wav`), tienes que decirselo al juego. Ver "Paso 3.4".

### Paso 3.1: TABLA DE NOMBRES DE ARCHIVO

Estos son los nombres **exactos**. Respeta mayusculas, minusculas y guiones.

#### MUSICA, va en la carpeta `audio/music/`
| Nombre del archivo | Cuando suena |
|---|---|
| `musica-batalla.mp3` | Durante toda la partida (en bucle) |
| `musica-jefe.mp3` | Solo durante el combate contra el jefe |

#### EFECTOS, van en la carpeta `audio/sfx/`

**Armas:**
| Nombre | Cuando suena |
|---|---|
| `disparo-revolver.mp3` | Disparas el revolver |
| `disparo-escopeta.mp3` | Disparas la escopeta |
| `disparo-riel.mp3` | Disparas el riel |
| `disparo-clavos.mp3` | Disparas la de clavos |

**Impactos y muertes:**
| Nombre | Cuando suena |
|---|---|
| `impacto-enemigo.mp3` | Le pegas a un enemigo |
| `muerte-enemigo.mp3` | Matas un enemigo normal |
| `muerte-enemigo-grande.mp3` | Matas un bruto o un jefe |
| `explosion.mp3` | Explosiones y golpe fuerte al suelo |
| `parry.mp3` | Devuelves un proyectil |

**Enemigos:**
| Nombre | Cuando suena |
|---|---|
| `disparo-enemigo.mp3` | Un enemigo dispara |
| `aviso-ataque.mp3` | Pitido antes de que ataque un enemigo |
| `rugido-jefe.mp3` | Aparece el jefe |

**Jugador:**
| Nombre | Cuando suena |
|---|---|
| `jugador-herido.mp3` | Recibes dano |
| `jugador-muere.mp3` | Mueres |
| `lava.mp3` | Caes en la lava |
| `salto.mp3` | Saltas |
| `dash.mp3` | Haces dash |
| `deslizar.mp3` | Te deslizas |

**Gancho:**
| Nombre | Cuando suena |
|---|---|
| `gancho-lanzar.mp3` | Lanzas el gancho |
| `gancho-clavar.mp3` | El gancho se clava en algo |

**Juego e interfaz:**
| Nombre | Cuando suena |
|---|---|
| `recoger-item.mp3` | Recoges vida, municion o dash |
| `nueva-oleada.mp3` | Empieza una oleada |
| `subir-rango.mp3` | Subes de rango (D, C, B...) |
| `boton.mp3` | Pulsas un boton de un menu |

### Paso 3.2: REEMPLAZAR UN SONIDO O CANCION (paso a paso)

Ejemplo: quieres cambiar el sonido del **salto**.

1. Consigue tu sonido y **renombralo** a `salto.mp3` (exactamente asi).
2. Entra a **github.com** y abre tu repositorio `hellrush`.
3. Pulsa la carpeta **audio**.
4. Pulsa la carpeta **sfx**.
5. Arriba a la derecha pulsa **Add file** y luego **Upload files**.
6. Arrastra tu `salto.mp3` a la zona de subida.
7. Abajo, en **Commit changes**, escribe: `Nuevo sonido de salto`
8. Pulsa el boton verde **Commit changes**.
9. Espera 1 o 2 minutos y abre el juego. Ya suena tu nuevo sonido.

> Si ya existia un `salto.mp3`, **se reemplaza solo**. No tienes que borrar nada.

### Paso 3.3: CAMBIAR LA MUSICA
Igual que el paso anterior, pero en la carpeta `audio/music/` y con el nombre `musica-batalla.mp3`.

> **Consejo:** para musica usa MP3 de maximo 3 a 5 MB. Si es muy pesado, el juego tarda en cargar.

### Paso 3.4: SI TU ARCHIVO NO ES MP3 (usar .wav u .ogg)
Si tu archivo es, por ejemplo, `disparo-revolver.wav`, tienes que decirselo al juego:

1. En tu repositorio, pulsa el archivo **audio-config.js**.
2. Pulsa el **icono del lapiz** (arriba a la derecha, "Edit this file").
3. Usa **Ctrl+F** (en el telefono, el buscador del navegador) y busca: `disparo-revolver.mp3`
4. Veras esta linea:
   ```
   pistol:    "audio/sfx/disparo-revolver.mp3",
   ```
5. Cambia **solo** `.mp3` por `.wav`:
   ```
   pistol:    "audio/sfx/disparo-revolver.wav",
   ```
6. Arriba a la derecha pulsa **Commit changes...**
7. En el cuadro que aparece, pulsa el boton verde **Commit changes**.

> **Cuidado:** no borres las comillas `"` ni la coma `,` del final.

### Paso 3.5: CAMBIAR EL VOLUMEN DE UN SONIDO O DE LA MUSICA
1. Abre `audio-config.js` y pulsa el lapiz para editar.
2. Busca el bloque que dice `volume:`
3. Cambia los numeros. **0 = silencio, 1 = maximo**.
   ```
   volume: {
     music: 0.6,     <- volumen de la musica
     sfx:   1.0      <- volumen de los efectos
   },
   ```
4. Pulsa **Commit changes...** y luego **Commit changes**.

---

## PARTE 4: CAMBIAR LOS COLORES DEL JUEGO

1. En tu repositorio, pulsa el archivo **style.css**.
2. Pulsa el **lapiz** para editar.
3. Al principio veras esto:
   ```
   :root {
     --blood: #d40f0f;    /* rojo sangre */
     --furnace: #ff6a1a;  /* naranja */
     --iron: #ffc933;     /* amarillo */
     ...
   ```
4. Cambia el codigo que empieza con `#` por otro color.
   - **Como encontrar un codigo de color:** busca en Google "selector de color" o "color picker". Elige el color y copia el codigo (ejemplo: `#00ff88` es verde).
5. Pulsa **Commit changes...** y luego **Commit changes**.

---

## PARTE 5: CAMBIAR VALORES DEL JUEGO (vida, velocidad, dificultad)

Casi todo lo ajustable esta en un solo bloque, cerca del inicio de `game.js`.

1. Abre **game.js** en tu repositorio.
2. Pulsa el **lapiz** para editar.
3. Busca (Ctrl+F) el texto: `const CFG = {`
4. Veras una lista de ajustes. Los mas utiles:

| Ajuste | Que hace | Valor normal |
|---|---|---|
| `speed: 1` | Velocidad del jugador | 1 (2 = el doble de rapido) |
| `jump: 1` | Altura del salto | 1 |
| `enemyDmg: 1` | Dano que hacen los enemigos | 1 (0.5 = mitad, 2 = doble) |
| `enemyCount: 1` | Cantidad de enemigos por oleada | 1 (2 = el doble) |
| `bossEvery: 5` | Un jefe cada X oleadas | 5 (0 = sin jefes) |
| `waveMaxTime: 45` | Segundos maximos por oleada | 45 |
| `fov: 90` | Campo de vision | 90 |

5. Cambia **solo el numero** despues de los dos puntos.
6. Pulsa **Commit changes...** y luego **Commit changes**.

> **Tambien puedes cambiar casi todo esto SIN tocar codigo**, desde el boton **MOD** dentro del propio juego.

---

## PARTE 6: SI ALGO SALE MAL (SOLUCIONES)

### "Rompi el juego despues de editar un archivo"
**No pasa nada, GitHub guarda TODAS las versiones anteriores.** Para volver atras:
1. Abre el archivo que editaste en GitHub.
2. Pulsa **History** (arriba a la derecha, con un reloj).
3. Veras la lista de cambios. Pulsa el que fue **antes** de tu error.
4. Pulsa los tres puntos `...` y elige **View file**.
5. Pulsa el icono de **Copiar contenido** (Copy raw file).
6. Vuelve al archivo actual, pulsa el lapiz, **borra todo** (Ctrl+A, Borrar) y **pega** lo copiado.
7. **Commit changes**.

### "Cambie un sonido y sigue sonando el de antes"
- Espera 2 minutos (GitHub tarda en actualizar).
- Cierra la pestana del juego y vuelve a abrirla. El navegador guarda versiones viejas.
- Comprueba que el **nombre del archivo esta exacto** (mayusculas, guiones, extension).

### "No suena nada"
- Los navegadores solo dejan sonar despues de que **toques la pantalla**. Toca **ENTRAR** y sonara.
- Abre el **MOD** y comprueba que **Efectos de sonido** y **Musica** esten marcados.

### "Como se si el juego esta cargando mis archivos de audio?"
1. Entra al juego y abre el **MOD**.
2. Baja hasta **DEPURACION** y activa **Mostrar FPS / estado**.
3. Entra a jugar. Abajo a la izquierda veras una linea como:
   `audio: 5 efectos + 1 musicas desde archivo`
4. Ese numero es cuantos de tus archivos reconocio el juego.
   Si dice `0 efectos`, el juego no encontro ninguno (revisa nombres y carpetas).

### "La pagina de GitHub Pages da error 404"
- Espera unos minutos tras activarlo.
- Comprueba que `index.html` esta en la **raiz** del repositorio (no dentro de otra carpeta).

---

## PARTE 7: RESUMEN DE 30 SEGUNDOS

- **Cambiar musica o sonidos:** sube un archivo con el nombre exacto a `audio/music/` o `audio/sfx/`. Sin tocar codigo.
- **Cambiar colores:** edita `style.css`.
- **Cambiar dificultad o velocidad:** edita el bloque `const CFG` en `game.js`, o usa el boton MOD.
- **Algo se rompio:** GitHub guarda todo, usa **History** para volver atras.
- **Los cambios tardan 1 o 2 minutos** en verse en la pagina.
