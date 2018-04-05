const readline = require('readline');

class CLI {
  constructor(server) {
    this.server = server;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.rl.on('line', m => {
      try {
        return console.log(eval(m));
      } catch (e) {
        return console.error(e);
      }
    });
  }
}

module.exports = CLI;