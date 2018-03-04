const fs = require('fs');

class Participant {
  constructor(_id, name, color) {
    this._id = _id;
    this.name = name;
    this.color = color;
    this.room = null;

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
      return JSON.parse(fs.readFileSync('../database/participants.json'));
    } catch (e) {
      return null;
    }
  }
  updateFile(raw) {
    try {
      fs.writeFileSync('../database/participants.json', JSON.stringify(raw));
    } catch (e) {
      // ...
    }
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