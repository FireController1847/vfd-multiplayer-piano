const readline = require('readline');

class CLI {
  constructor(client) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.rl.on('line', m => {
      if (m.startsWith('setowner')) {
        const id = evt.replace(/setowner /g, '');
      }
    });
  }
}

module.exports = CLI;