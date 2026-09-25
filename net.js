/* =============================================================================
   OVERKILL - CAPA DE RED (multijugador Host/Cliente)
   =============================================================================
   Este archivo es independiente de game.js: no modifica sus funciones, solo
   LEE y ESCRIBE en unas pocas variables globales que game.js ya expone
   (P, S, enemies, CFG, IN, MODE, etc) y llama a unas pocas funciones ya
   existentes (newRun, showScreen, flashMsg...).

   MODELO DE RED
   -------------
   HOST      = el navegador que crea la partida. Su game.js corre EXACTAMENTE
               igual que en un juego 1 jugador: fisica, oleadas, enemigos,
               jefes... todo local, como siempre. Es la autoridad.
               Ademas: (a) aplica los inputs que le llegan del Cliente sobre
               un "jugador remoto" simulado con las mismas reglas de
               movimiento, y (b) emite ~20 veces por segundo un SNAPSHOT
               completo del estado de la partida.

   CLIENTE   = el navegador que se une. NO ejecuta updateEnemies, updateWaves,
               ni la fisica del Host. Solo:
                 - manda su input (movimiento, mirada, disparo, salto...)
                 - recibe snapshots y PINTA ese estado (interpolando)
               Su propio jugador SI usa su fisica local de movimiento
               (para que responda al instante, ver mas abajo "prediccion"),
               pero la posicion final que ve todo el mundo (incluido el
               propio Cliente) se corrige suavemente hacia lo que dice el
               Host, que es quien manda de verdad.

   Esto cumple "todos los clientes reciben el mismo estado" (enemigos,
   oleadas, jefes, vida, daño... los decide el Host) y a la vez el jugador
   local responde al instante a sus propios controles (prediccion local +
   reconciliacion, igual que hacen los shooters online clasicos).
   ============================================================================= */

/* =====================================================================
   PUENTE HACIA game.js
   -----------------------------------------------------------------------
   game.js esta envuelto en su propio IIFE y no expone nada al scope global
   por defecto. Al final de game.js se publica window.__OVK con todo lo que
   este archivo necesita. Los objetos/arrays de abajo (P, S, enemies, world,
   CFG, WEAPONS, ammoState) NUNCA se reasignan dentro de game.js, solo se
   mutan, asi que desestructurarlos una vez aqui es seguro: la referencia
   sigue siendo la misma siempre. MODE, bossActive, wIdx y fireCd SI se
   reasignan con '=' dentro de game.js, asi que para esos se usan getters
   directos sobre OVK (OVK.MODE, OVK.bossActive...) en vez de una copia
   local, para no quedarnos con un valor congelado del momento de la carga.
   ===================================================================== */
const OVK = window.__OVK;
const { P, S, MODES, CFG, enemies, world, camera, scene, WEAPONS, ammoState, EYE, $, IN, G, WALK, ACCEL, AIR_ACCEL, JUMP_V } = OVK;
const {
  movePlayer, spawnEnemy, damageEnemy, killEnemyQuiet, updateEnemies,
  rayWorld, rayEnemy, generateLevel, resetPlayer, startMode, newRun,
  hurtEitherPlayer, hurtPlayer, die, checkLava,
  setWeapon, updateWeaponHUD, setControls, showScreen, flashMsg,
  triggerMuzzle, burst, tracer, impactRing, randomSeed, clamp, lerp,
  haptic, sfx,
} = OVK;

const NET = {
  ws: null,
  role: null,            // 'host' | 'client' | null (singleplayer)
  roomCode: null,
  serverUrl: '',
  connected: false,
  peerConnected: false,  // el Host tiene cliente, o el Cliente esta unido
  localId: null,         // 'player_1' (host) o 'player_2' (cliente)
  remoteId: null,
  lastSnapshotAt: 0,
  pingMs: 0,
  _pingSentAt: 0,
};

// Estado remoto recibido (lo rellena onSnapshot / onInput). No se toca desde game.js directamente.
const NETSTATE = {
  // En el CLIENTE: ultimo snapshot recibido del Host y el anterior, para interpolar.
  snapFrom: null, snapTo: null, snapFromT: 0, snapToT: 0,
  // En el HOST: ultimo input recibido del Cliente remoto. La simulacion real del
  // jugador remoto vive en el objeto RP (definido mas abajo), no aqui.
  remoteInput: { mx: 0, mz: 0, yaw: 0, pitch: 0, fire: false, jump: false, dash: false, slide: false, slideHeld: false, jumpHeld: false, weaponSwap: false },
};

function netIsOnline() { return NET.role === 'host' || NET.role === 'client'; }
function netIsHost() { return NET.role === 'host'; }
function netIsClient() { return NET.role === 'client'; }

/* =====================================================================
   REPRESENTACION VISUAL DEL JUGADOR REMOTO
   -----------------------------------------------------------------------
   El juego es en primera persona y no tiene un modelo de cuerpo para el
   jugador local, asi que creamos uno sencillo solo para el jugador remoto,
   para que se vea en pantalla tanto en el Host como en el Cliente.
   ===================================================================== */
let _remoteMesh = null;
function netBuildRemoteMesh() {
  if (_remoteMesh) return _remoteMesh;
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x4fd8ff });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.35), mat);
  torso.position.set(0, 1.2, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), mat);
  head.position.set(0, 1.75, 0);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.24), mat); legL.position.set(-0.16, 0.4, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.24), mat); legR.position.set(0.16, 0.4, 0);
  g.add(torso, head, legL, legR);
  g.visible = false;
  scene.add(g);
  _remoteMesh = g;
  return g;
}
function netUpdateRemoteMesh(pos, yaw, alive) {
  const g = netBuildRemoteMesh();
  g.visible = !!alive;
  if (!alive) return;
  g.position.set(pos.x, pos.y - 1.7, pos.z);
  g.rotation.y = yaw;
}

/* =====================================================================
   CONEXION AL RELAY
   ===================================================================== */
function netDefaultServerUrl() {
  // Si la pagina se sirve por https, el relay debe ser wss (mismo dominio o uno propio).
  const saved = localStorage.getItem('overkill_relay_url');
  if (saved) return saved;
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  return proto + location.hostname + ':8787';
}

function netConnect(serverUrl) {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(serverUrl);
      NET.ws = ws;
      NET.serverUrl = serverUrl;
      localStorage.setItem('overkill_relay_url', serverUrl);

      const timeout = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('timeout')); }, 8000);

      ws.addEventListener('open', () => { clearTimeout(timeout); NET.connected = true; resolve(ws); });
      ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('connection_error')); });
      ws.addEventListener('close', () => { NET.connected = false; netOnDisconnected(); });
      ws.addEventListener('message', (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        netHandleMessage(msg);
      });
    } catch (e) { reject(e); }
  });
}

function netSend(obj) {
  if (NET.ws && NET.ws.readyState === WebSocket.OPEN) {
    try { NET.ws.send(JSON.stringify(obj)); } catch (e) {}
  }
}

/* =====================================================================
   CREAR PARTIDA (HOST)
   ===================================================================== */
async function netCreateRoom(modeId) {
  const url = $('mpServerUrl').value.trim() || netDefaultServerUrl();
  mpShowStatus('CREANDO PARTIDA...', 'Conectando con el servidor relay', '');
  try {
    await netConnect(url);
  } catch (e) {
    mpShowStatus('NO SE PUDO CONECTAR', 'No se pudo contactar con el servidor relay (' + url + ').', '', true);
    return;
  }
  NET.role = 'host';
  NET.localId = 'player_1';
  NET.remoteId = 'player_2';
  netSend({ t: 'create_room', mode: modeId, name: 'HOST' });
  // La respuesta 'room_created' llega por netHandleMessage y continua el flujo.
  NET._pendingMode = modeId;
}

/* =====================================================================
   UNIRSE A PARTIDA (CLIENTE)
   ===================================================================== */
async function netJoinRoom(code) {
  const url = $('mpServerUrl').value.trim() || netDefaultServerUrl();
  mpShowStatus('CONECTANDO...', 'Contactando con el servidor relay', '');
  try {
    await netConnect(url);
  } catch (e) {
    mpShowStatus('NO SE PUDO CONECTAR', 'No se pudo contactar con el servidor relay (' + url + ').', '', true);
    return;
  }
  NET.role = 'client';
  NET.localId = 'player_2';
  NET.remoteId = 'player_1';
  NET.roomCode = code;
  netSend({ t: 'join_room', code, name: 'JUGADOR 2' });
}

/* =====================================================================
   MANEJO DE MENSAJES DEL RELAY
   ===================================================================== */
function netHandleMessage(msg) {
  switch (msg.t) {
    case 'room_created': {
      NET.roomCode = msg.code;
      mpShowStatus('ESPERANDO JUGADOR...', 'Dale este codigo a la otra persona para que se una', msg.code);
      break;
    }
    case 'peer_joined': {
      NET.peerConnected = true;
      flashMsg('JUGADOR 2 CONECTADO');
      // El Host ya tenia el menu de "esperando"; ahora arranca la partida para los dos.
      netHostStartGame();
      break;
    }
    case 'join_ok': {
      NET.roomCode = msg.code;
      NET.peerConnected = true;
      mpShowStatus('CONECTADO', 'Esperando a que el Host inicie la partida...', msg.code);
      netClientAwaitStart();
      break;
    }
    case 'join_error': {
      const reasons = { not_found: 'Ese codigo no existe.', full: 'Esa partida ya tiene 2 jugadores.', host_gone: 'El Host ya no esta disponible.' };
      mpShowStatus('NO SE PUDO CONECTAR', reasons[msg.reason] || 'No se pudo unir a la partida.', '', true);
      break;
    }
    case 'peer_left': {
      // Solo le llega al Host: el Cliente se desconecto. La partida sigue.
      NET.peerConnected = false;
      if (typeof RP !== 'undefined') { RP.alive = false; if (typeof netUpdateRemoteMesh === 'function') netUpdateRemoteMesh(RP.pos, RP.yaw, false); }
      flashMsg('JUGADOR 2 SE DESCONECTO');
      break;
    }
    case 'room_closed': {
      netOnHostClosedRoom(msg.reason);
      break;
    }
    case 'game_start': {
      // Solo le llega al Cliente.
      netClientOnGameStart(msg);
      break;
    }
    case 'input': {
      // Solo le llega al Host, viene del Cliente.
      Object.assign(NETSTATE.remoteInput, msg.input);
      break;
    }
    case 'snapshot': {
      // Solo le llega al Cliente, viene del Host.
      netClientOnSnapshot(msg);
      break;
    }
    case 'ping': { netSend({ t: 'pong', at: msg.at }); break; }
    case 'pong': { NET.pingMs = Math.round(performance.now() - msg.at); break; }
    case 'versus_end': {
      // Solo le llega al Cliente. El Host ya decidio el ganador (autoridad del Host).
      S.running = false;
      $('deadTitle').textContent = msg.winner === 'remote' ? '\u00a1GANASTE!' : 'HAS PERDIDO';
      $('deadInfo').innerHTML = 'Partida Versus finalizada';
      setTimeout(() => { showScreen('dead'); setControls(false); }, 260);
      break;
    }
  }
}

/* =====================================================================
   DESCONEXIONES
   ===================================================================== */
function netOnDisconnected() {
  if (!netIsOnline()) return; // ya estabamos en singleplayer, no hacer nada
  if (S.running) {
    // Se cayo la conexion en mitad de la partida.
    if (netIsClient()) {
      flashMsg('CONEXION PERDIDA');
      netReturnToMenu('Se perdio la conexion con el Host.');
    } else {
      // El Host pierde su propia conexion al relay: sigue jugando solo (localmente no cambia nada),
      // pero avisamos porque el Cliente ya no puede recibir nada.
      NET.peerConnected = false;
      flashMsg('SERVIDOR RELAY DESCONECTADO');
    }
  }
}

function netOnHostClosedRoom(reason) {
  if (netIsClient()) {
    netReturnToMenu(reason === 'host_left' ? 'El Host abandono la partida.' : 'La partida ha terminado.');
  }
}

function netReturnToMenu(reason) {
  netTeardown();
  S.running = false; S.paused = false;
  setControls(false);
  showScreen('title');
  flashMsg(reason || 'PARTIDA TERMINADA');
}

function netTeardown() {
  if (NET.ws) { try { NET.ws.close(); } catch (e) {} }
  NET.ws = null; NET.role = null; NET.roomCode = null; NET.connected = false; NET.peerConnected = false;
  NETSTATE.snapFrom = null; NETSTATE.snapTo = null;
}

/* Si el jugador local (Host) decide salir voluntariamente de una partida online. */
function netHostLeaveRoom() {
  if (netIsHost()) netSend({ t: 'leave_intentional' });
  netTeardown();
}

/* =====================================================================
   ARRANQUE DE PARTIDA
   ===================================================================== */
function netHostStartGame() {
  mpHideStatus();
  const seed = CFG.seed || randomSeed();
  netSend({ t: 'game_start', mode: MODE_PENDING_ONLINE || 'infinite', seed });
  startMode(MODE_PENDING_ONLINE || 'infinite');
  netHostResetRemotePlayer();
  netVersusReset();
}

function netClientAwaitStart() {
  // El Cliente espera pasivamente; netClientOnGameStart() hara showScreen(null) cuando el Host arranque.
}

function netClientOnGameStart(msg) {
  OVK.MODE = MODES[msg.mode] || MODES.infinite;
  S.mode = OVK.MODE.id;
  mpHideStatus();
  showScreen(null);
  setControls(true);
  S.running = true; S.paused = false;
  // El Cliente NO llama a newRun()/generateLevel(): el nivel visible se construye
  // a partir del primer snapshot (posiciones de enemigos, jugador, etc), no de una
  // semilla local. Preparamos un nivel vacio minimo para tener suelo bajo los pies
  // mientras llega el primer snapshot.
  if (typeof clientPrepareLevel === 'function') clientPrepareLevel(msg.seed);
}

/* =====================================================================
   BUCLE DE RED: enviar input (cliente) / enviar snapshot (host)
   ===================================================================== */
let _netSendAcc = 0;
const NET_SEND_HZ = 20; // 20 paquetes por segundo en cada sentido

function netNetworkTick(dt) {
  if (!netIsOnline() || !NET.connected) return;
  _netSendAcc += dt;
  if (_netSendAcc < 1 / NET_SEND_HZ) return;
  _netSendAcc = 0;

  if (netIsClient()) {
    netSend({
      t: 'input',
      input: {
        mx: IN.mx, mz: IN.mz, yaw: P.yaw, pitch: P.pitch,
        fire: IN.fire, jump: IN.jump, dash: IN.dash,
        slide: IN.slide, slideHeld: IN.slideHeld, jumpHeld: IN.jumpHeld,
        wIdx: OVK.wIdx,
        pos: { x: P.pos.x, y: P.pos.y, z: P.pos.z }, // para reconciliacion suave, no como autoridad
      }
    });
    IN.jump = false; IN.dash = false; IN.slide = false; // consumibles de un solo disparo
  } else if (netIsHost() && NET.peerConnected) {
    netSend({ t: 'snapshot', ...netBuildSnapshot() });
  }
}

/* Construye el snapshot que el Host manda al Cliente. Solo datos, nada de logica. */
function netBuildSnapshot() {
  const boss = OVK.bossActive ? enemies.find(x => x.d.boss) : null;
  return {
    time: S.time,
    wave: S.wave, waveState: S.waveState, waveIsBoss: !!S.waveIsBoss,
    running: S.running,
    bossActive: !!OVK.bossActive,
    bossName: boss ? (boss.d.bossName || 'JEFE') : '',
    bossHpPct: boss ? clamp(boss.hp / (boss.maxHp || boss.d.hp) * 100, 0, 100) : 0,
    versus: OVK.MODE.rivals ? { hostKills: VS.hostKills, remoteKills: VS.remoteKills, killsToWin: OVK.MODE.killsToWin } : null,
    hostPlayer: {
      pos: { x: P.pos.x, y: P.pos.y, z: P.pos.z }, yaw: P.yaw, pitch: P.pitch,
      hp: P.hp, alive: P.alive, sliding: P.sliding, dashT: P.dashT,
    },
    remotePlayer: {
      pos: { x: RP.pos.x, y: RP.pos.y, z: RP.pos.z }, yaw: RP.yaw, pitch: RP.pitch,
      hp: RP.hp, alive: RP.alive,
    },
    enemies: (typeof enemies !== 'undefined' ? enemies : []).map(e => ({
      id: e.netId, type: e.type,
      pos: { x: e.mesh.position.x, y: e.mesh.position.y, z: e.mesh.position.z },
      hp: e.hp, maxHp: e.maxHp || e.d.hp,
    })),
  };
}

/* En el Cliente: guarda el snapshot recibido para interpolar entre el anterior y este. */
function netClientOnSnapshot(msg) {
  NETSTATE.snapFrom = NETSTATE.snapTo;
  NETSTATE.snapFromT = NETSTATE.snapToT;
  NETSTATE.snapTo = msg;
  NETSTATE.snapToT = performance.now();
  NET.lastSnapshotAt = performance.now();
  if (typeof clientApplyRemoteWaveHud === 'function') clientApplyRemoteWaveHud(msg);
}

/* =====================================================================
   UI: pantallas del menu de multijugador
   ===================================================================== */
let MODE_PENDING_ONLINE = 'infinite';

function mpShowStatus(title, sub, code, isError) {
  showScreen('mpStatus');
  $('mpStatusTitle').textContent = title;
  $('mpStatusTitle').style.color = isError ? 'var(--blood)' : '';
  $('mpStatusSub').textContent = sub || '';
  $('mpRoomCode').textContent = code || '';
  $('mpRoomCode').style.display = code ? 'block' : 'none';
  $('mpStatusHint').textContent = code ? 'Comparte este codigo con la otra persona.' : '';
}
function mpHideStatus() { /* se sustituye por showScreen(null) al arrancar la partida */ }

function openOnline() { showScreen('mpMenu'); $('mpServerUrl').value = netDefaultServerUrl(); }

$('mpBack').onclick = () => showScreen('title');
$('mpCreateInfinite').onclick = () => { MODE_PENDING_ONLINE = 'infinite'; netCreateRoom('infinite'); };
$('mpCreateVersus').onclick = () => { MODE_PENDING_ONLINE = 'versus'; netCreateRoom('versus'); };
$('mpJoinOpen').onclick = () => { $('mpJoinCode').value = ''; $('mpJoinErr').textContent = ''; showScreen('mpJoin'); };
$('mpJoinBack').onclick = () => showScreen('mpMenu');
$('mpJoinGo').onclick = () => {
  const code = $('mpJoinCode').value.trim().toUpperCase();
  if (code.length < 4) { $('mpJoinErr').textContent = 'Escribe el codigo completo'; return; }
  netJoinRoom(code);
};
$('mpJoinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('mpJoinGo').click(); });
$('mpCancel').onclick = () => { netTeardown(); showScreen('mpMenu'); };

/* =====================================================================
   FASE 7: MODO VERSUS (jugador contra jugador real)
   -----------------------------------------------------------------------
   MODES.versus ya existia en game.js (rivals:true, killsToWin:10, respawnT:3)
   pero esos valores no los usaba ninguna funcion: no habia rival real. Aqui
   se implementa la parte que faltaba, sin tocar la declaracion de MODES.
   Reglas: el Host y el Cliente se disparan y se hacen dano DIRECTAMENTE
   (no hay enemigos ni oleadas en Versus). Cuando uno de los dos llega a 0
   de vida: se cuenta una baja para el otro y reaparece pasado respawnT.
   Gana quien llegue primero a MODE.killsToWin.
   ===================================================================== */
const VS = { hostKills: 0, remoteKills: 0, hostRespawnT: 0, remoteRespawnT: 0 };

function netVersusReset() {
  VS.hostKills = 0; VS.remoteKills = 0; VS.hostRespawnT = 0; VS.remoteRespawnT = 0;
}

/* Llamado solo en el Host, solo cuando MODE.rivals es true. Sustituye el hitscan normal de
   fire() (que apunta a enemigos) por un hitscan contra el OTRO JUGADOR. */
function netVersusHostCheckHit(shooterIsRemote, origin, dir, range, dmg) {
  const targetPos = shooterIsRemote ? P.pos : RP.pos;
  const targetAlive = shooterIsRemote ? P.alive : RP.alive;
  if (!targetAlive) return false;
  const targetEye = new THREE.Vector3(targetPos.x, targetPos.y - 0.8, targetPos.z);
  const toTarget = targetEye.clone().sub(origin);
  const dist = toTarget.length();
  if (dist > range) return false;
  toTarget.normalize();
  const cosAngle = toTarget.dot(dir);
  const closeApproach = origin.clone().addScaledVector(dir, dist).distanceTo(targetEye);
  if (cosAngle > 0 && closeApproach < 0.9) {
    if (shooterIsRemote) versusDamageHost(dmg); else versusDamageRemote(dmg);
    return true;
  }
  return false;
}

function versusDamageHost(dmg) {
  if (!P.alive || P.iframes > 0 || CFG.god) return;
  P.hp -= dmg; P.iframes = 0.25;
  haptic(60); P.shake = Math.max(P.shake || 0, 0.4); sfx('hurt');
  $('hpFill').classList.toggle('low', P.hp < 30);
  if (P.hp <= 0) versusOnDeath('host');
}
function versusDamageRemote(dmg) {
  if (!RP.alive || RP.iframes > 0 || CFG.god) return;
  RP.hp -= dmg; RP.iframes = 0.25;
  if (RP.hp <= 0) versusOnDeath('remote');
}

function versusOnDeath(who) {
  if (who === 'host') {
    P.hp = 0; P.alive = false;
    VS.remoteKills++;
    VS.hostRespawnT = OVK.MODE.respawnT || 3;
    flashMsg('JUGADOR 2 TE ELIMINO \u00b7 ' + VS.remoteKills + '/' + OVK.MODE.killsToWin);
  } else {
    RP.hp = 0; RP.alive = false;
    netUpdateRemoteMesh(RP.pos, RP.yaw, false);
    VS.hostKills++;
    VS.remoteRespawnT = OVK.MODE.respawnT || 3;
    flashMsg('ELIMINASTE A JUGADOR 2 \u00b7 ' + VS.hostKills + '/' + OVK.MODE.killsToWin);
  }
  netVersusUpdateHud(VS.hostKills, VS.remoteKills);
  const winner = VS.hostKills >= (OVK.MODE.killsToWin || 10) ? 'host' : (VS.remoteKills >= (OVK.MODE.killsToWin || 10) ? 'remote' : null);
  if (winner) netVersusEndMatch(winner);
}

/* Reutiliza el marcador "OLEADA" del HUD para mostrar el resultado en Versus (tu/rival),
   ya que ese modo no tiene oleadas de enemigos. Se usa tanto en el Host como en el Cliente. */
function netVersusUpdateHud(hostKills, remoteKills) {
  const mine = netIsClient() ? remoteKills : hostKills;
  const theirs = netIsClient() ? hostKills : remoteKills;
  $('waveNum').textContent = mine + ' - ' + theirs;
}

function netVersusEndMatch(winner) {
  S.running = false;
  netSend({ t: 'versus_end', winner });
  $('deadTitle').textContent = winner === 'host' ? '\u00a1GANASTE!' : 'HAS PERDIDO';
  $('deadInfo').innerHTML = `Bajas: TU ${VS.hostKills} \u00b7 RIVAL ${VS.remoteKills}`;
  setTimeout(() => { showScreen('dead'); setControls(false); }, 260);
}

/* Respawn temporizado, comprobado cada frame en el Host mientras la partida sigue corriendo. */
function netVersusTick(dt) {
  if (!OVK.MODE.rivals || !S.running) return;
  if (!P.alive) {
    VS.hostRespawnT -= dt;
    if (VS.hostRespawnT <= 0) { resetPlayer(); P.pos.copy(world.spawn); }
  }
  if (!RP.alive) {
    VS.remoteRespawnT -= dt;
    if (VS.remoteRespawnT <= 0) { RP.pos.copy(world.spawn).add(new THREE.Vector3(3, 0, 3)); RP.vel.set(0, 0, 0); RP.hp = 100; RP.alive = true; }
  }
}

/* =====================================================================
   FASE 2/3/4: SIMULACION DEL JUGADOR REMOTO EN EL HOST
   -----------------------------------------------------------------------
   El Host recibe el input del Cliente (mx, mz, yaw, pitch, fire, jump...)
   y lo aplica sobre un objeto "jugador" independiente de P, usando la
   MISMA funcion de colisiones del mundo (movePlayer) para que el remoto
   choque contra las mismas paredes/plataformas que el Host ve. Esto NO
   toca la fisica del jugador local (P) en ningun momento.
   ===================================================================== */
const RP = { // "jugador remoto" simulado en el Host. Misma forma que P.
  pos: new THREE.Vector3(0, 3, 3),
  vel: new THREE.Vector3(0, 0, 0),
  yaw: 0, pitch: 0, r: 0.45, h: 1.7, hp: 100, alive: true, sliding: false,
  onGround: false, dashT: 0, coyote: 0, jumpBuf: 0, stamina: 3, maxStamina: 3,
  wIdx: 0, fireCd: 0, iframes: 0, ammo: {},
};
function netResetRemoteAmmo() { for (const w of WEAPONS) RP.ammo[w.id] = w.ammo; }

function netHostResetRemotePlayer() {
  RP.pos.copy(world.spawn).add(new THREE.Vector3(1.5, 0, 1.5));
  RP.vel.set(0, 0, 0); RP.hp = 100; RP.alive = true; RP.sliding = false; RP.dashT = 0;
  netResetRemoteAmmo();
}

/* Version equivalente a checkLava() pero para el jugador remoto (RP), simulado en el Host.
   Igual que el jugador local: si god/lava desactivada, teleporta a un sitio seguro; si no, mata. */
let _remoteLastSafe = null;
function netHostCheckRemoteLava() {
  if (!RP.alive) return;
  if (!_remoteLastSafe) _remoteLastSafe = RP.pos.clone();
  if (RP.onGround && RP.pos.y > 0) _remoteLastSafe.copy(RP.pos);
  const feet = RP.pos.y - RP.h;
  if (feet <= world.lavaY + 0.4) {
    if (CFG.god || !CFG.lava) {
      RP.pos.copy(_remoteLastSafe.lengthSq() ? _remoteLastSafe : world.spawn); RP.pos.y += 1.5; RP.vel.set(0, 6, 0);
      return;
    }
    RP.hp = 0; RP.alive = false;
    netUpdateRemoteMesh(RP.pos, RP.yaw, false);
  }
}

/* En el Cliente: la lava no mata por si sola (eso lo decide el Host por snapshot), pero mostramos
   el mismo destello visual si el jugador esta tocando lava, para que no se sienta "raro" o roto. */
function netClientLavaFx() {
  const feet = P.pos.y - P.h;
  if (feet <= world.lavaY + 0.4 && P.alive) {
    const f = $('lavaFlash'); f.style.transition = 'none'; f.style.opacity = 0.95;
    requestAnimationFrame(() => { f.style.transition = 'opacity 1.2s'; f.style.opacity = 0; });
  }
}

/* En el Cliente: reproduce el destello/sonido/animacion de disparo, y consume la cadencia local,
   pero NUNCA llama a damageEnemy(): el dano real lo calcula el Host con el mismo input por red. */
function clientFireFx() {
  const w = WEAPONS[OVK.wIdx];
  const inf = CFG.infAmmo || ammoState[w.id] === Infinity;
  if (!inf && ammoState[w.id] <= 0) { setWeapon(0); return; }
  if (!inf) ammoState[w.id]--;
  OVK.fireCd = w.rate / CFG.fireRate;
  OVK.gunKick = 1;
  haptic(w.id === 'shotgun' ? 30 : 10);
  sfx(w.id);
  P.shake = Math.max(P.shake || 0, w.id === 'shotgun' ? 0.22 : 0.08);
  triggerMuzzle(w.color, w.id === 'shotgun' ? 1.8 : (w.id === 'rail' ? 1.5 : 1));
  const mz = new THREE.Vector3(0.32, -0.28, -1.1).applyMatrix4(camera.matrixWorld);
  burst(mz, w.color, 5, 4.5);
  updateWeaponHUD();
}

/* Version reducida de updatePlayer() para el remoto: mismo movimiento base (WASD + salto),
   sin dash/slide/gancho para mantener la logica simple y confiable en la Fase 3. */
function netHostSimulateRemotePlayer(dt) {
  if (!RP.alive) return;
  RP.iframes -= dt;
  const inp = NETSTATE.remoteInput;
  RP.yaw = inp.yaw; RP.pitch = inp.pitch;
  const sinY = Math.sin(RP.yaw), cosY = Math.cos(RP.yaw);
  let mx = inp.mx, mz = inp.mz;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const wishX = (mx * cosY + mz * sinY), wishZ = (-mx * sinY + mz * cosY);
  const spd = WALK * CFG.speed;

  RP.coyote = RP.onGround ? 0.1 : RP.coyote - dt;
  if (inp.jump) RP.jumpBuf = 0.12; else RP.jumpBuf -= dt;

  if (RP.onGround) {
    const ax = wishX * spd, az = wishZ * spd, a = ACCEL * dt;
    RP.vel.x += clamp(ax - RP.vel.x, -a, a);
    RP.vel.z += clamp(az - RP.vel.z, -a, a);
  } else {
    const a = AIR_ACCEL * dt;
    RP.vel.x += wishX * a; RP.vel.z += wishZ * a;
  }
  RP.vel.y -= G * CFG.gravity * dt;

  if (RP.jumpBuf > 0 && RP.coyote > 0) {
    RP.vel.y = JUMP_V * CFG.jump; RP.jumpBuf = 0; RP.coyote = 0; RP.onGround = false;
  }

  movePlayer(dt, RP);
  if (RP.pos.y < -60) { RP.pos.copy(world.spawn); RP.vel.set(0, 0, 0); }
  netHostCheckRemoteLava();

  // Disparo remoto: mismo hitscan que fire(), pero centrado en la vista remota. Sin municion propia
  // en esta fase (comparte el arma seleccionada por el propio Cliente para mantenerlo simple).
  RP.fireCd -= dt;
  if (inp.fire && RP.fireCd <= 0) {
    const w = WEAPONS[inp.wIdx] || WEAPONS[0];
    const inf = CFG.infAmmo || RP.ammo[w.id] === Infinity;
    if (!inf && (RP.ammo[w.id] || 0) <= 0) { /* sin municion: no dispara */ }
    else {
      if (!inf) RP.ammo[w.id]--;
      RP.fireCd = w.rate / CFG.fireRate;
      const origin = new THREE.Vector3(RP.pos.x, RP.pos.y - RP.h + EYE, RP.pos.z);
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(RP.pitch, RP.yaw, 0, 'YXZ'));
      const wallT = rayWorld(origin, dir, w.range);
      if (OVK.MODE && OVK.MODE.rivals) {
        // VERSUS: el remoto dispara al Host, no hay enemigos que comprobar.
        netVersusHostCheckHit(true, origin, dir, Math.min(wallT, w.range), w.dmg);
      } else {
        const hits = [];
        for (const e of enemies) { const t = rayEnemy(origin, dir, e); if (t < Math.min(wallT, w.range)) hits.push({ e, t }); }
        hits.sort((a, b) => a.t - b.t);
        if (hits.length) damageEnemy(hits[0].e, w.dmg);
      }
    }
  }

  netUpdateRemoteMesh(RP.pos, RP.yaw, RP.alive);
}

/* =====================================================================
   FASE 3: interpolacion del estado recibido, en el Cliente
   ===================================================================== */
function netClientInterpolate() {
  if (!NETSTATE.snapFrom || !NETSTATE.snapTo) {
    if (NETSTATE.snapTo) netClientApplySnapshotDirect(NETSTATE.snapTo);
    return;
  }
  const now = performance.now();
  const span = Math.max(1, NETSTATE.snapToT - NETSTATE.snapFromT);
  const t = clamp((now - NETSTATE.snapToT) / span + 1, 0, 1.6); // permite pequena extrapolacion si llega tarde el siguiente
  const a = NETSTATE.snapFrom, b = NETSTATE.snapTo;

  // Jugador Host (visto desde el Cliente) -> jugador remoto visual
  const hp = { x: lerp(a.hostPlayer.pos.x, b.hostPlayer.pos.x, t), y: lerp(a.hostPlayer.pos.y, b.hostPlayer.pos.y, t), z: lerp(a.hostPlayer.pos.z, b.hostPlayer.pos.z, t) };
  netUpdateRemoteMesh(hp, b.hostPlayer.yaw, b.hostPlayer.alive);

  // Vida del jugador Host y del propio Cliente (autoridad del Host)
  netClientApplyOwnVitals(b.remotePlayer.hp, b.remotePlayer.alive);

  // Enemigos: reconciliar la lista local con la del snapshot (crear/mover/borrar)
  netClientReconcileEnemies(b.enemies, a.enemies, t);

  // Ronda / oleada (solo HUD, el Cliente no calcula nada de esto)
  S.wave = b.wave; S.waveState = b.waveState; S.waveIsBoss = b.waveIsBoss;
  $('waveNum').textContent = b.wave + (b.waveIsBoss ? ' \u00b7 JEFE' : '');
  netClientApplyBossHud(b);
}

function netClientApplySnapshotDirect(b) {
  netUpdateRemoteMesh(b.hostPlayer.pos, b.hostPlayer.yaw, b.hostPlayer.alive);
  netClientApplyOwnVitals(b.remotePlayer.hp, b.remotePlayer.alive);
  netClientReconcileEnemies(b.enemies, null, 1);
  S.wave = b.wave; S.waveState = b.waveState; S.waveIsBoss = b.waveIsBoss;
  netClientApplyBossHud(b);
}

/* FASE 6: el Cliente no calcula rondas ni jefes, solo refleja lo que dice el snapshot. */
function netClientApplyBossHud(b) {
  if (b.versus) { netVersusUpdateHud(b.versus.hostKills, b.versus.remoteKills); return; }
  OVK.bossActive = !!b.bossActive;
  $('bossBar').classList.toggle('on', OVK.bossActive);
  if (OVK.bossActive) {
    $('bossName').textContent = b.bossName || 'JEFE';
    $('bossFill').style.width = b.bossHpPct + '%';
  }
}

/* El Cliente nunca decide si murio: solo refleja lo que dice el snapshot del Host (autoridad). */
function netClientApplyOwnVitals(hp, alive) {
  const wasAlive = P.alive;
  P.hp = hp; P.alive = alive;
  $('hpFill').classList.toggle('low', P.hp < 30);
  if (wasAlive && !alive) {
    S.running = false;
    $('deadTitle').textContent = 'MUERTO';
    $('deadInfo').innerHTML = `Oleada ${S.wave}<br>Partida multijugador`;
    setTimeout(() => { showScreen('dead'); setControls(false); }, 260);
  }
}

/* Mapa netId -> mesh simple para enemigos vistos por el Cliente (el Cliente no usa spawnEnemy real:
   no tiene builders propios corriendo IA, solo pinta cajas simples en la posicion que dice el Host). */
const _clientEnemyMeshes = new Map();
function netClientReconcileEnemies(list, prevList, t) {
  const seen = new Set();
  const prevById = new Map((prevList || []).map(e => [e.id, e]));
  for (const e of list) {
    seen.add(e.id);
    let mesh = _clientEnemyMeshes.get(e.id);
    if (!mesh) {
      const geo = new THREE.BoxGeometry(0.9, 1.6, 0.9);
      const mat = new THREE.MeshBasicMaterial({ color: 0xd4260f });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      _clientEnemyMeshes.set(e.id, mesh);
    }
    const prev = prevById.get(e.id);
    const px = prev ? lerp(prev.pos.x, e.pos.x, t) : e.pos.x;
    const py = prev ? lerp(prev.pos.y, e.pos.y, t) : e.pos.y;
    const pz = prev ? lerp(prev.pos.z, e.pos.z, t) : e.pos.z;
    mesh.position.set(px, py, pz);
  }
  for (const [id, mesh] of [..._clientEnemyMeshes]) {
    if (!seen.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); _clientEnemyMeshes.delete(id); }
  }
}

/* =====================================================================
   PREPARAR NIVEL EN EL CLIENTE (Fase 1/2)
   -----------------------------------------------------------------------
   El Cliente si genera el mismo nivel localmente a partir de la MISMA
   semilla que uso el Host (mandada en 'game_start'), para tener el mismo
   escenario visual (paredes, plataformas, lava) sin tener que transmitir
   toda la geometria del mapa por red. Lo que NUNCA hace el Cliente es
   decidir por si mismo que enemigos salen o cuando: eso siempre llega
   por snapshot. Coincide con "no quiero que cada navegador genere su
   propia version de los enemigos o rondas" (el mapa no es una "ronda").
   ===================================================================== */
function clientPrepareLevel(seed) {
  generateLevel(seed || 'MULTIJUGADOR');
  resetPlayer();
  P.pos.copy(world.spawn).sub(new THREE.Vector3(1.5, 0, 1.5));
  for (const e of [...enemies]) killEnemyQuiet(e); // el Cliente no simula enemigos propios
}

function clientApplyRemoteWaveHud(msg) {
  // ya se aplica dentro de netClientInterpolate/netClientApplySnapshotDirect
}

/* =====================================================================
   GANCHO PRINCIPAL LLAMADO DESDE frame() EN game.js
   ===================================================================== */
function netFrameHook(dt) {
  if (!netIsOnline()) return;
  netNetworkTick(dt);
  if (netIsHost()) {
    netHostSimulateRemotePlayer(dt);
    netVersusTick(dt);
  } else if (netIsClient()) {
    netClientInterpolate();
  }
}
