class Participant {
  constructor(id, name, color, _id) {
    this.id = id;
    this.name = name;
    this.color = color;
    this._id = _id;
  }
  generateJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      _id: this._id
    };
  }
}

module.exports = Participant;