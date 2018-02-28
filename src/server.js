// Modules
const WebSocket = require('ws');
// Make Server
const wss = new WebSocket.Server({ port: 8080 });
// Events
let nextId = 0;
wss.on('connection', (ws, req) => {
  pingConnection(ws);
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
function handleData(ws, data) {
  if (!data.hasOwnProperty("m")) return;
  if (data.m == "hi") {
    return ws.sendData({
      m: 'hi',
      u: {
        _id: ws.id,
        name: 'Anonymous',
        color: '#FFFFFF'
      }
    });
  }
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