const Participant = require('./Participant.js');
const Socket = require('./Socket.js');
const WebSocket = require('ws');

class Server extends WebSocket.Server {
  constructor() {
    super({ port: 8080 });
    console.log('Server Launched');
    this.sockets = new Set();
    this.participants = new Set();
    this.bindEventListeners();
    // Broken Connections
    setInterval(() => {
      this.sockets.forEach(s => {
        if (s.isAlive == false) return s.ws.terminate();
        s.isAlive = false;
        s.ping(() => {}); // eslint-disable-line no-empty-function
      });
    }, 30000);
  }
  bindEventListeners() {
    this.on('connection', (ws, req) => {
      this.sockets.add(new Socket(this, ws, req));
    });
  }
  broadcast(item, ignore = []) {
    this.sockets.forEach(s => {
      if (ignore.includes(s.id)) return;
      if (Array.isArray(item)) return s.sendArray(item);
      else return s.sendObject(item);
    });
  }
  // EVENT TIME!
  handleData(s, data) {
    if (!data.hasOwnProperty('m')) return;
    console.log(data);
    if (data.m == 'hi') {
      const p = this.newParticipant(s);
      return s.sendObject({
        m: 'hi',
        u: p.generateJSON(),
        t: Date.now()
      });
    }
  }
  newParticipant(s) {
    const p = new Participant(s._id, 'Anonymous',
      `#${Math.floor(Math.random() * 16777215).toString(16)}`);
    this.participants.add(p);
    return p;
  }
}

module.exports = Server;