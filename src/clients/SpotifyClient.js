const EventEmitter = require('node:events');
const https = require('node:https');
const { URLSearchParams } = require('node:url');
const { WebSocket } = require('ws');

module.exports = class SpotifyClient extends EventEmitter {
  constructor(accessToken) {
    super();
    this.accessToken = accessToken;

    this.socket = new WebSocket(
      `wss://dealer.spotify.com/?access_token=${this.accessToken}`
    );
    this.socket.on('message', (data) => this.handleMessage(data));

    this.socket.on('open', () => {
      console.log('Successfuly connected to Spotify');
      this.ping();
    });
  }

  ping() {
    setInterval(() => {
      this.write({
        type: 'ping',
      });
    }, 30 * 1000); // 30 seconds
  }

  write(data) {
    this.socket.send(JSON.stringify(data));
  }

  handleMessage(message) {
    const data = JSON.parse(message);

    if (data.method === 'PUT') {
      this.connectionId = data.headers['Spotify-Connection-Id'];
      setTimeout(() => this.subscribe(), 1000)
    }

    this.emit(data.type, data);
  }

  subscribe() {
    const data = new URLSearchParams();
    data.set('connection_id', this.connectionId);
    const request = https.request(
      `https://api.spotify.com/v1/me/notifications/player?${data.toString()}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    request.end();
  }
};
