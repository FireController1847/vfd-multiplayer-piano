const fs = require('fs');

/**
 * TODO: Impliment a system in which users will get their
 * user saved to MongoDB, and users who have not been seen
 * within 7 days will get their userinfo deleted. Similar to how
 * when your IP changes, you're a completely different user.
 */

class Participant {
  constructor(_id, name, color) {
    this._id = _id;
    this.name = name;
    this.color = color;
    this.room = null;
    this.updates = false;

    const pdb = this.requestFile();
    if (!pdb) return;
    if (pdb[this._id]) {
      this.name = pdb[this._id].name;
      this.color = pdb[this._id].color;
    } else {
      pdb[this._id] = this.generateJSON();
      this.updateFile(pdb);
    }
  }
  requestFile() {
    try {
      return JSON.parse(fs.readFileSync('./database/participants.json'));
    } catch (e) {
      console.error('DB REQUEST FILE', e);
      return null;
    }
  }
  updateFile(raw) {
    try {
      fs.writeFileSync('./database/participants.json', JSON.stringify(raw));
    } catch (e) {
      console.error('DB UPDATE FILE', e);
    }
  }
  updateUser(name, color) {
    const pdb = this.requestFile();
    if (!pdb) return;
    this.name = name || this.name;
    this.color = color || this.color;
    pdb[this._id] = this.generateJSON();
    this.updateFile(pdb);
  }
  generateJSON() {
    return {
      _id: this._id,
      name: this.name,
      color: this.color
    };
  }
}

module.exports = Participant;