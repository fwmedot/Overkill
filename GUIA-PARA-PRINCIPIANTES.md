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
| carpeta `audio/sfx/` | Aqui van tus **efectos de sonido**, ordenados en subcarpetas (`weapons`, `enemies`, `player`, `environment`, `ui`) | **SI, la mas comun** |
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
2. **Selecciona TODO su contenido** (no la carpeta en si, lo que hay DENTRO): `index.html`, `style.css`, `game.js`, `audio-config.js`, `GUIA-PARA-PRINCIPIANTES.md`, `GUIA_AUDIO.md` y las carpetas `audio` e `images`.
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

**Toda la explicacion del audio esta ahora en su propia guia: `GUIA_AUDIO.md`** (esta en la misma carpeta que este archivo).

Ahi encontraras:
- La **lista completa** de los 27 archivos de audio (3 musicas + 24 efectos), con el nombre exacto de cada uno.
- En que **carpeta** va cada uno (`weapons`, `enemies`, `player`, `environment`, `ui`).
- **Cuando suena** cada sonido.
- Como **reemplazarlos desde GitHub** paso a paso.
- Como cambiar el **volumen** (5 controles) y la **musica de una oleada concreta**.
- Que hacer si **no suena** tu archivo.

**Resumen de una linea:** sube tu archivo con el **mismo nombre exacto** a su carpeta de `audio/` y reemplaza al anterior, sin tocar codigo.

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

- **Cambiar musica o sonidos:** sube un archivo con el nombre exacto a su carpeta de `audio/`. Sin tocar codigo. Mira `GUIA_AUDIO.md`.
- **Cambiar colores:** edita `style.css`.
- **Cambiar dificultad o velocidad:** edita el bloque `const CFG` en `game.js`, o usa el boton MOD.
- **Algo se rompio:** GitHub guarda todo, usa **History** para volver atras.
- **Los cambios tardan 1 o 2 minutos** en verse en la pagina.
