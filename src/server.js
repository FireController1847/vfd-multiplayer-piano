const WebSocket = require('ws');
const wss = new WebSocket({ port: 8080 });

wss.on('client')