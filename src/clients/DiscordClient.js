const EventEmitter = require('node:events');
const { WebSocket } = require('ws');

module.exports = class DiscordClient extends EventEmitter {
  #activities;

  constructor() {
    super();

    this.socket = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    this.socket.on('message', (data) => this.handleMessage(data));

    this.#activities = [];
  }

  identify() {
    const payload = require('../fakeIdentify');

    this.write(payload);
  }

  setStatus(status, clear) {
    this.#activities = this.#activities.filter(
      (a) => a.name !== 'Custom Status'
    );
    if (clear) return this.#updateActivites();

    this.#activities.push(status);
    this.#updateActivites();
  }

  heartbeat() {
    setInterval(() => {
      this.write({
        op: 1,
        d: this.lastSequenceNumber,
      });
    }, this.heartbeatInterval);
  }

  setSpotifyActivity({ event }, clear) {
    this.#activities = this.#activities.filter((a) => a.name !== 'Spotify');

    if (clear) return this.#updateActivites();

    const item = event.state.item;
    const album = item.album;
    const imageId = album.images[0].url.replace('https://i.scdn.co/image/', '');

    this.#activities.push({
      assets: {
        large_image: `spotify:${imageId}`,
        large_text: album.name,
      },
      details: item.name,
      flags: 48,
      metadata: {
        album_id: album.id,
        artist_ids: item.artists.map((a) => a.id),
      },
      name: 'Spotify',
      party: {
        id: `spotify:${this.userId}`,
      },
      state: item.artists.map((a) => a.name).join(';'),
      sync_id: item.id,
      timestamps: {
        start: event.state.timestamp,
        end: event.state.timestamp + item.duration_ms,
      },
      type: 2,
    });

    this.#updateActivites();
  }

  #updateActivites() {
    this.write({
      op: 3,
      d: {
        activities: this.#activities,
        afk: false,
        since: 0,
        status: 'online',
      },
    });
  }

  write(message) {
    this.socket.send(JSON.stringify(message));
  }

  handleMessage(message) {
    try {
      const data = JSON.parse(message.toString());

      this.lastSequenceNumber = data.s;

      if (data.op === 10) {
        // Gateway Hello
        this.heartbeatInterval = data.d.heartbeat_interval * Math.random();

        this.heartbeat();
        this.identify();
      }

      if (data.op === 0 && data.t === 'READY') {
        const connectedAccount = data.d.connected_accounts.find(
          (v) => v.type === 'spotify' && v.show_activity
        );
        if (connectedAccount) {
          this.spotifyAccessToken = connectedAccount.access_token;
        }

        this.userId = data.d.user.id;
      }

      if (data.op === 0) this.emit(data.t, data);
      this.emit(data.op, data);
    } catch (error) {
      // Empty catch block
    }
  }
};
