/* =============================================================================
   OVERKILL - SERVIDOR RELAY DE MULTIJUGADOR
   =============================================================================
   Este servidor NO simula el juego. No conoce nada de fisica, enemigos, oleadas
   ni vida. Su unico trabajo es:

     1. Dejar que un jugador cree una "sala" (partida) y le da un CODIGO corto.
     2. Dejar que otro jugador se una a esa sala usando el codigo.
     3. Reenviar los mensajes que un lado manda al otro lado (host <-> cliente).
     4. Si el Host se desconecta, avisar al Cliente y cerrar la sala.
     5. Si el Cliente se desconecta, avisar al Host para que siga solo.

   Por que asi: el enunciado pide "no servidores dedicados por partida" y un
   modelo tipo Minecraft LAN (Host = autoridad). Este relay es un unico proceso
   compartido por TODAS las partidas; cada partida es solo una entrada en un
   mapa (Map) en memoria, no un proceso ni recurso dedicado. El que hace de
   servidor de verdad de cada partida es el propio navegador del Host: el
   relay solo entrega los paquetes, como un cable de red.

   Requiere: npm install ws   (dentro de esta carpeta server/)
   Arrancar: node relay.js
   Variable de entorno opcional: PORT (por defecto 8787)
   ============================================================================= */

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;
const wss = new WebSocketServer({ port: PORT });

// rooms: codigo de sala -> { host: ws|null, client: ws|null, mode: string, hostName, createdAt }
const rooms = new Map();

// Genera un codigo corto y facil de dictar/escribir (sin caracteres ambiguos 0/O/1/I).
function makeRoomCode() {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(obj)); } catch (e) { /* ignorar, la conexion ya esta muerta */ }
  }
}

function closeRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.host && room.host !== 'closing') send(room.host, { t: 'room_closed', reason });
  if (room.client) send(room.client, { t: 'room_closed', reason });
  rooms.delete(code);
  console.log(`[relay] sala ${code} cerrada (${reason})`);
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.role = null;   // 'host' | 'client'
  ws.roomCode = null;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.t) {
      /* ---------------------------------------------------------------
         Jugador A pide crear una partida.
         --------------------------------------------------------------- */
      case 'create_room': {
        const code = makeRoomCode();
        rooms.set(code, { host: ws, client: null, mode: msg.mode || 'infinite', hostName: msg.name || 'HOST', createdAt: Date.now() });
        ws.role = 'host';
        ws.roomCode = code;
        send(ws, { t: 'room_created', code });
        console.log(`[relay] sala ${code} creada (modo ${msg.mode || 'infinite'})`);
        break;
      }

      /* ---------------------------------------------------------------
         Jugador B pide unirse con un codigo.
         --------------------------------------------------------------- */
      case 'join_room': {
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { t: 'join_error', reason: 'not_found' }); return; }
        if (!room.host || room.host.readyState !== room.host.OPEN) { send(ws, { t: 'join_error', reason: 'host_gone' }); return; }
        if (room.client) { send(ws, { t: 'join_error', reason: 'full' }); return; }

        room.client = ws;
        ws.role = 'client';
        ws.roomCode = code;

        send(ws, { t: 'join_ok', code, mode: room.mode, hostName: room.hostName });
        send(room.host, { t: 'peer_joined', name: msg.name || 'JUGADOR 2' });
        console.log(`[relay] cliente se unio a sala ${code}`);
        break;
      }

      /* ---------------------------------------------------------------
         Cualquier otro mensaje de juego (input, snapshot, evento) se
         reenvia sin tocarlo al otro lado de la sala. El relay no
         interpreta el contenido: eso es tarea del Host y del Cliente.
         --------------------------------------------------------------- */
      default: {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const target = ws.role === 'host' ? room.client : room.host;
        send(target, msg);
      }
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;

    if (ws.role === 'host') {
      // El Host se fue -> la partida termina para todos. Sin transferencia de Host.
      closeRoom(ws.roomCode, 'host_left');
    } else if (ws.role === 'client') {
      // El Cliente se fue -> el Host sigue jugando solo.
      room.client = null;
      send(room.host, { t: 'peer_left' });
      console.log(`[relay] cliente salio de sala ${ws.roomCode}, el host continua`);
    }
  });

  ws.on('error', () => { try { ws.terminate(); } catch (e) {} });
});

// Ping periodico para detectar conexiones muertas (movil que pierde red, pestaña congelada, etc).
const pingInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 15000);

wss.on('close', () => clearInterval(pingInterval));

console.log(`[relay] servidor de multijugador escuchando en ws://0.0.0.0:${PORT}`);
