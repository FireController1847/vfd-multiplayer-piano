const bgColor = '#206694';
const Chat = require('./Chat.js');
const ParticipantRoom = require('./ParticipantRoom.js');
const sha1 = require('sha1');

/**
 * TODO: ONLY ALLOW ONE BLACK MIDI ROOM AT A TIME
 */

class Room {
  constructor(p, server, _id, count, settings = {}) {
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
    this.settings.black = this.settings.lobby ? false : this._id.toLowerCase().includes('black');
    // eslint-disable-next-line no-extra-parens
    this.settings.original = !this.settings.black ? (!this.settings.lobby ? this._id.toLowerCase().includes('original') : false) : false;
    this.crown = null;
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
      id: pR.id,
      name: p.name,
      x: 0,
      y: 0,
      _id: p._id
    }, this.ppl.map(tpR => tpR._id), [p._id]);
    return pR;
  }
  findParticipant(_id) {
    return this.ppl.find(p => p._id == _id);
  }
  removeParticipant(_id) {
    const pR = this.findParticipant(_id);
    if (!pR) return;
    this.count--;
    this.ppl = this.ppl.filter(p => p._id != _id);
    this.server.broadcastTo({
      m: 'bye',
      p: pR.id
    }, this.ppl.map(tpR => tpR._id));
  }
  update(settings = {}) {
    this.settings = Object.assign(this.settings, {
      chat: settings.chat != null ? settings.chat : this.settings.chat,
      color: settings.color || this.settings.color,
      crownsolo: settings.crownsolo != null ? settings.crownsolo : this.settings.crownsolo,
      visible: settings.visible != null ? settings.visible : this.settings.visible
    });
  }
  generateJSON() {
    const obj = {
      _id: this._id,
      settings: this.settings,
      count: this.count
    };
    if (this.crown) {
      obj.crown = this.crown;
    }
    return obj;
  }
}

module.exports = Room;