// Modules
const { EventEmitter } = require('events');
const { WebhookClient } = require('discord.js');
const WebSocket = require('ws');
const sha1 = require("sha1");
const fs = require("fs");
const readline = require("readline");
// Make Server
const wss = new WebSocket.Server({ port: 8080 });
const webhook = new WebhookClient("418653029546328064", "EhMWO3en6RjzRbGL-RkZfPfaFYxaN0XEumi7eRJKqZ60pDIDk1WzoKdxD6Xolkd25hOw", {disableEveryone: true});
// Readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', evt => {
  if (evt.startsWith('setowner')) {
    const id = evt.replace(/setowner /g, '');
    try {
      const participants = JSON.parse(fs.readFileSync("./participants.json"));
      for (const key in participants) {
        if (participants[key] && participants[key].name == "Sustain") {
          delete participants[key];
          participants[id] = {
            _id: id,
            name: 'Sustain',
            color: '#47923d'
          };
        }
      }
      fs.writeFileSync('./participants.json', JSON.stringify(participants));
      console.log(`NEW PARTICIPANTS: ${JSON.stringify(participants, null, 2)}`);
      return;
    } catch (e) {
      console.error(e);
    }
  }
});
// Database
const participantsUtil = {};
// Classes
class Chat {
  constructor() {
    this.messages = [];
  }
  insert(msg) {
    this.messages.unshift(msg);
    if (this.messages.length > 500) this.messages.length = 500;
  }
}
class Participant {
  constructor(hash, color, name) {
    this.color = color;
    this.name = name;
    this._id = hash;
    this.room = null;
  }
  setName(n) {
    this.name = n;
  }
  setColor(c) {
    this.color = c;
  }
  setRoom(r) {
    this.room = r;
  }
}
class Room extends EventEmitter {
  constructor(name, count, settings) {
    super();
    if (!settings) settings = {};
    this.count = count;
    this._id = name;
    const isLobby = name.toLowerCase().includes('lobby');
    this.settings = {
      chat: isLobby ? true : (settings.chat != null ? settings.chat : true),
      color: isLobby ? "#3b5054" : (settings.color != null ? settings.color : "#3b5054"),
      crownsolo: isLobby ? false : (settings.crownsolo != null ? settings.crownsolo : false),
      lobby: isLobby,
      visible: isLobby ? true : (settings.visible != null ? settings.visible : true)
    };
    this.ppl = [];
    this.chat = new Chat();
  }
  findParticipant(_id) {
    return this.ppl.find(p => p._id == _id);
  }
  removeParticipant(p, _id) {
    this.ppl = this.ppl.filter(p => p._id != _id);
  }
  connect(part) {
    this.count++;
    const partR = {
      id: sha1(Date.now()).substring(0, 20),
      name: part.name,
      color: part.color,
      _id: part._id
    };
    this.ppl.push(partR);
    broadcast([{
      m: 'p',
      color: part.color,
      displayX: 150,
      displayY: 50,
      id: partR.id,
      name: part.name,
      x: 0,
      y: 0,
      _id: part._id
    }]);
  }
  disconnect(_id) {
    const p = this.findParticipant(_id);
    this.removeParticipant(p, _id);
    broadcast([{
      m: 'bye',
      p: p.id
    }]);
  }
  broadcast(data, ignore) {
    if (!ignore) ignore = [];
    wss.clients.forEach(ws => {
      const part = this.findParticipant(ws._id);
      if (!part) return;
      if (ignore.includes(ws._id)) return;
      ws.sendData(data);
    });
  }
}
// Variables
const rooms = new Map();
// Events
let nextId = 0;
wss.on('connection', (ws, req) => {
  pingConnection(ws);
  ws.id = nextId;
  ws.ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  nextId++;
  handleErrors(ws);
  ws.sendData = (data, cb) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(data), cb);
  };
  ws.log = () => {
    return Function.prototype.bind.call(console.log, console, `WS ${ws.id}:`);
  };
  ws.broadcast = broadcast;
  setupWSEvents(ws);
  console.log(`New Connection. WebSocket Assigned ID: ${ws.id}`);
});
function broadcast(data, ignore) {
  if (!ignore) ignore = [];
  wss.clients.forEach(ws => {
    if (ignore.includes(ws._id)) return;
    ws.sendData(data);
  });
}
function generateParticipant(ws) {
  const part = {
    _id: sha1(ws.ip).substring(0, 20),
    name: 'Anonymous',
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  ws._id = part._id;
  // Search for client
  try {
    const participants = JSON.parse(fs.readFileSync('./participants.json'));
    if (participants[part._id]) {
      // user found!
      part.name = participants[part._id].name;
      part.color = participants[part._id].color;
    } else {
      participants[part._id] = part;
      fs.writeFileSync('./participants.json', JSON.stringify(participants));
    }
  } catch (e) {}
  participantsUtil[part._id] = new Participant(part._id, part.color, part.name);
  return participantsUtil[part._id];
}
function generateRoom(ws, data, part) {
  const room = new Room(data._id, 0, data.set);
  room.connect(part);
  rooms.set(room._id, room);
  return room;
}
function handleData(ws, data) {
  if (!data.hasOwnProperty("m")) return;
  if (data.m == "hi") {
    return ws.sendData([{
      m: 'hi',
      u: generateParticipant(ws),
      t: Date.now()
    }]);
  }
  if (data.m == "ch") {
    const part = participantsUtil[ws._id];
    if (!part) return;
    const old = rooms.get(part.room);
    if (old) old.disconnect(part._id);
    let room = rooms.get(data._id);
    if (!room) room = generateRoom(ws, data, part);
    else room.connect(part);
    part.setRoom(room._id);
    ws.sendData([{
      m: 'c'
    }], () => {
      let chatobjs = [];
      for (let i = 0; i < (room.chat.messages.length > 50 ? 50 : room.chat.messages.length); i++) {
        chatobjs.unshift(room.chat.messages[i]);
      }
      return ws.sendData(chatobjs);
    });
    return ws.sendData([{
      m: 'ch',
      ch: {
        count: room.count,
        settings: room.settings,
        _id: room._id
      },
      p: room.findParticipant(part._id).id,
      ppl: (room.ppl.length > 0 ? room.ppl : null)
    }]);
  }
  if (data.m == "a") {
    const part = participantsUtil[ws._id];
    if (!part) return;
    const room = rooms.get(part.room);
    if (!room) return;
    const partR = room.findParticipant(part._id);
    const chatobj = {
      m: "a",
      p: partR,
      a: data.message
    };
    room.chat.insert(chatobj);
    try {
      webhook.send(`\`${part._id.substring(0, 5)}\` **${part.name}:**  ${chatobj.a}`);
    } catch (e) {}
    return broadcast([chatobj]);
  }
  if (data.m == "n") {
    const part = participantsUtil[ws._id];
    if (!part) return;
    const room = rooms.get(part.room);
    if (!room) return;
    const partR = room.findParticipant(part._id);
    if (!partR) return;
    room.broadcast([{
      m: "n",
      n: data.n,
      p: partR.id,
      t: data.t
    }], [part._id]);
  }
  if (data.m == "t") {
    const now = Date.now();
    return ws.sendData([{
      m: "t",
      t: now,
      echo: data.e - now
    }]);
  }
}
function handleClose(ws) {
  const part = participantsUtil[ws._id];
  if (part) {
    delete participantsUtil[ws._id]
  }
  rooms.forEach(r => {
    if (r.findParticipant(ws._id)) {
      r.disconnect(ws._id);
    }
  });
}
function setupWSEvents(ws) {
  ws.on("message", raw => {
    let d;
    try {
      d = JSON.parse(raw);
    } catch(e) { return "Invalid Request"; }
    if (!Array.isArray(d)) return handleData(ws, d);
    for (let i = 0; i < d.length; i++) {
      handleData(ws, d[i]);
    }
    return;
  });
  ws.on("close", () => {
    ws.log("Connection Closed");
    handleClose(ws);
  });
}
// Broken Connections
function noop() {}
function heartbeat() {
  this.isAlive = true;
}
function pingConnection(ws) {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
}
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);
// Error Handling
function handleErrors(ws) {
  ws.on("error", e => {
    console.error(`WS ${ws.id}: Errored!\n`, e);
    handleClose(ws);
  });
}
wss.on("error", console.error);
process.on("unhandledRejection", console.error);
