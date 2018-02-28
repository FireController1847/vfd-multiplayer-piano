// Modules
const WebSocket = require('ws');
const sha1 = require("sha1");
const fs = require("fs");
// Make Server
const wss = new WebSocket.Server({ port: 8080 });
// Database
const clients = {};
// Classes
class Client {
  constructor(hash, color, name) {
    this.color = color;
    this.name = name;
    this._id = hash;
  }
  setName(n) {
    this.name = n;
  }
  setColor(c) {
    this.color = c;
  }
}
class Room {
  constructor(name, count, settings) {
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
    this.ppl = {};
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
  ws.sendData = data => {
    ws.send(JSON.stringify(data));
  };
  ws.log = () => {
    return Function.prototype.bind.call(console.log, console, `WS ${ws.id}:`);
  };
  setupWSEvents(ws);
  console.log(`New Connection. WebSocket Assigned ID: ${ws.id}`);
});
function generateUser(ws) {
  const client = {
    _id: sha1(ws.ip).substring(0, 20),
    name: 'Anonymous',
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  // Search for client
  const users = JSON.parse(fs.readFileSync('./users.json'));
  if (users[client._id]) {
    // user found!
    client.name = users[client._id].name;
    client.color = users[client._id].color;
  }
  clients[ws.ip] = new Client(client._id, client.color, client.name);
  users[client._id] = client;
  fs.writeFileSync('./users.json', JSON.stringify(users));
  return clients[ws.ip];
}
function generateRoom(ws, data) {
  const room = new Room(data._id, 0, data.set);
  const roomCli = {
    count: room.count,
    settings: room.settings,
    _id: room._id
  }
  rooms.set(room._id, room);
  return roomCli;
}
function handleData(ws, data) {
  if (!data.hasOwnProperty("m")) return;
  if (data.m == "hi") {
    return ws.sendData([{
      m: 'hi',
      u: generateUser(ws),
      t: Date.now()
    }]);
  }
  if (data.m == "ch") {
    console.log(data);
    const client = clients[ws.ip];
    console.log(client);
    if (!client) return;
    const old = rooms.get(data._id);
    if (!old) {
      const room = generateRoom(ws, data);
      return ws.sendData([{
        m: 'ch',
        ch: room,
        ppl: [{
          id: client._id,
          name: client.name,
          color: client.color,
          _id: client._id
        }]
      }]);
    }
  }
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
  });
}
wss.on("error", console.error);
process.on("unhandledRejection", console.error);