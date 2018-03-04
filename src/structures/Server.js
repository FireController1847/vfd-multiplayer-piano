const Participant = require('./Participant.js');
const Room = require('./Room.js');
const Socket = require('./Socket.js');
const WebSocket = require('ws');

class Server extends WebSocket.Server {
  constructor() {
    super({ port: 8080 });
    console.log('Server Launched');
    this.sockets = new Set();
    this.participants = new Map();
    this.rooms = new Map();
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
  broadcastTo(item, ppl, ignore = []) {
    this.sockets.forEach(s => {
      if (!ppl.includes(s.id) || ignore.includes(s.id)) return;
      if (Array.isArray(item)) return s.sendArray(item);
      else return s.sendObject(item);
    });
  }
  // EVENT TIME!
  handleData(s, data) {
    if (Array.isArray(data) || !data.hasOwnProperty('m')) return;
    if (!['t', 'm', 'n'].includes(data.m)) console.log(data);
    if (data.m == 'hi') {
      const p = this.newParticipant(s);
      return s.sendObject({
        m: 'hi',
        u: p.generateJSON(),
        t: Date.now()
      });
    }
    if (data.m == 'ch') {
      const p = this.getParticipant(s);
      if (!p) return;
      // Old Room
      const old = this.getRoom(p.room);
      if (old) old.disconnect(p._id);
      // New Room
      let r = this.getRoom(data._id);
      if (!r) r = this.newRoom(data, p);
      else r.newParticipant(p);
      p.room = r._id;
      // Clear Chat
      s.sendObject({
        m: 'c'
      }, () => {
        const chatobjs = [];
        for (let i = 0; i < (r.chat.messages.length > 50 ? 50 : r.chat.messages.length); i++) {
          chatobjs.unshift(r.chat.messages[i]);
        }
        return s.sendArray(chatobjs);
      });
      return s.sendObject({
        m: 'ch',
        ch: {
          _id: r._id,
          count: r.count,
          settings: r.settings
        },
        p: r.findParticipant(p._id).id,
        ppl: r.ppl.length > 0 ? r.ppl : null
      });
    }
    if (data.m == 'a') {
      const p = this.getParticipant(s);
      if (!p) return;
      const r = this.rooms.get(p.room);
      if (!r) return;
      const pR = r.findParticipant(p._id);
      const msg = {
        m: 'a',
        p: pR.generateJSON(),
        a: data.message
      };
      r.chat.insert(msg);
      return this.broadcastTo(msg, r.ppl.map(tpR => tpR._id));
    }
  }
  // Participants
  newParticipant(s) {
    const p = new Participant(s.id, 'Anonymous',
      `#${Math.floor(Math.random() * 16777215).toString(16)}`);
    this.participants.set(s.id, p);
    return p;
  }
  getParticipant(s) {
    return this.participants.get(s.id);
  }
  // Rooms
  newRoom(data, p) {
    const room = new Room(this, data._id, 0, data.set);
    room.newParticipant(p);
    this.rooms.set(room._id, room);
    return room;
  }
  getRoom(id) {
    return this.rooms.get(id);
  }
}

module.exports = Server;