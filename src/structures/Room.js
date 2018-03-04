const bgColor = '#3b5054';
const Chat = require('./Chat.js');
const ParticipantRoom = require('./ParticipantRoom.js');
const sha1 = require('sha1');

class Room {
  constructor(server, _id, count, settings) {
    this.server = server;
    this._id = _id;
    this.count = count;
    const isLobby = this._id.toLowerCase().includes('lobby');
    if (isLobby) {
      this.settings = {
        chat: true,
        color: bgColor,
        crownsolo: false,
        lobby: true,
        visible: true
      };
    } else {
      this.settings = {
        chat: settings.chat != null ? settings.chat : true,
        color: settings.color || bgColor,
        crownsolo: settings.crownsolo != null ? settings.crownsolo : false,
        lobby: false,
        visible: settings.visible != null ? settings.visible : true
      };
    }
    this.ppl = [];
    this.chat = new Chat();
  }
  newParticipant(p) {
    this.count++;
    const pR = new ParticipantRoom(
      sha1(Date.now()).substring(0, 20),
      p.name, p.color, p._id
    );
    this.ppl.push(pR);
    this.server.broadcastTo({
      m: 'p',
      color: p.color,
      displayX: 0,
      displayY: 0,
      id: pR.id,
      name: p.name,
      x: 0,
      y: 0,
      _id: p._id
    }, this.ppl.map(tpR => tpR._id));
  }
  findParticipant(_id) {
    return this.ppl.find(p => p._id == _id);
  }
  removeParticipant(_id) {
    const pR = this.findParticipant(_id);
    if (!pR) return;
    this.ppl = this.ppl.filter(p => p._id != _id);
    this.server.broadcastTo({
      m: 'bye',
      p: pR.id
    }, this.ppl.map(tpR => tpR._id));
  }
}

module.exports = Room;