class Chat {
  constructor() {
    this.messages = [];
  }
  insert(msg) {
    this.messages.unshift(msg);
    if (this.messages.length > 500) this.messages.length = 500;
  }
}

module.exports = Chat;