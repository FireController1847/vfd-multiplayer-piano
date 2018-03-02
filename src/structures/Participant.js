class Participant {
  constructor(_id, name, color) {
    this._id = _id;
    this.name = name;
    this.color = color;
    this.room = null;
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