// Modules
const WebSocket = require('ws');
// Make Server
const wss = new WebSocket.Server({ port: 8080 });
const users = new Map();
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
  users.set(ws.id, ws);
  console.log(`New Connection. WebSocket Assigned ID: ${ws.id}`);
});
function handleData(ws, data) {
  if (!data.hasOwnProperty("m")) return;
  if (data.m == "hi") {
    return ws.sendData([{
      m: 'hi',
      u: {
        _id: ws.id,
        name: 'Anonymous',
        color: '#FFFFFF'
      },
      t: Date.now()
    }]);
  }
  if (data.m == "t") {
    console.log('time');
    console.log(Date.now() - data.e);
    console.log(data.e - Date.now());
    return ws.sendData([{
      m: 't',
      t: Date.now(),
      e: Date.now() - data.e
    }]);
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