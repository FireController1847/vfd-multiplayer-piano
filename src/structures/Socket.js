const { EventEmitter } = require('events');
const sha1 = require('sha1');
const WebSocket = require('ws');

class Socket extends EventEmitter {
  /**
   * Set the param so VSCode understands.
   * @param {WebSocket} ws
   */
  constructor(server, ws, req) {
    super();
    console.log('1');
    this.server = server;
    this.ws = ws;
    this.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    this.id = sha1(this.ip).substring(0, 20);
    this.debug('2');
    this.isAlive = true;
    this.bindEvents();
    this.debug('3');
    this.bindEventListeners();
    this.debug('New Socket Constructed');
  }
  bindEvents() {
    this.ws.eventNames().forEach(event => {
      this.ws.on(event, (...args) => {
        this.emit(event, ...args);
      });
    });
  }
  bindEventListeners() {
    this.on('error', e => {
      this.debugErr(e);
      this.close();
    });
    this.on('message', raw => {
      let d;
      try {
        d = JSON.parse(raw);
      } catch (e) {
        return 'Invalid Request';
      }
      if (!Array.isArray(d)) return this.server.handleData(this, d);
      for (let i = 0; i < d.length; i++) {
        this.server.handleData(this, d[i]);
      }
    });
    this.on('pong', () => {
      this.heartbeat();
    });
    this.on('close', () => {
      this.close();
    });
  }
  send(raw, cb) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(raw, cb);
  }
  sendArray(arr, cb) {
    this.send(JSON.stringify(arr), cb);
  }
  sendObject(obj, cb) {
    this.sendArray([obj], cb);
  }
  debug() {
    return Function.prototype.bind.call(console.log, console, `[${this.id.substring(0, 5)}] `);
  }
  debugErr() {
    return Function.prototype.bind.call(console.error, console, `[${this.id.substring(0, 5)}] `);
  }
  close() {
    this.debug('Connection Closed');
  }
  ping(noop) {
    return this.ws.ping(noop);
  }
  // Broken Connections
  heartbeat() {
    this.isAlive = true;
  }
}

module.exports = Socket;