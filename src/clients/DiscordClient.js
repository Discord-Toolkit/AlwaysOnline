const EventEmitter = require('node:events');
const { WebSocket } = require('ws');

module.exports = class DiscordClient extends EventEmitter {
  #sessionId;
  #resumeGatewayUrl;
  #activities;

  #resuming = false;

  constructor() {
    super();
    this.connect();
    this.#activities = [];
  }

  connect() {
    this.socket = new WebSocket(
      this.#resuming
        ? this.#resumeGatewayUrl
        : 'wss://gateway.discord.gg/?v=10&encoding=json'
    );
    this.socket.on('message', (data) => this.#handleMessage(data));
  }

  reconnectAndResume() {
    console.debug('Resuming connection...');
    this.socket.close();
    this.#resuming = true;
    this.connect();
  }

  identify() {
    this.write(require('../fakeIdentify'));
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
        start: event.state.timestamp - event.state.progress_ms,
        end: event.state.timestamp - event.state.progress_ms + item.duration_ms,
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
    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(error);
    }
  }

  #handleMessage(message) {
    try {
      const data = JSON.parse(message.toString());
      this.lastSequenceNumber = data.s;

      if (data.op === 7) {
        // Reconnect and resume
        this.reconnectAndResume();
      }

      if (data.op === 9) {
        // Invalid session
        const shouldResume = data.d;
        if (shouldResume) this.reconnectAndResume();
        else {
          console.debug('Reconnecting...');
          this.socket.close();
          this.connect();
        }
      }

      if (data.op === 10) {
        // Gateway Hello
        setTimeout(() => {
          this.write({
            op: 1,
            d: this.lastSequenceNumber,
          });
        }, data.d.heartbeat_interval * Math.random());
        this.heartbeatInterval = data.d.heartbeat_interval;

        this.heartbeat();

        if (this.#resuming) {
          this.write({
            op: 6,
            d: {
              token: process.env.TOKEN,
              session_id: this.#sessionId,
              seq: this.lastSequenceNumber,
            },
          });
          this.#resuming = false;
        } else this.identify();
      }

      if (data.op === 0 && data.t === 'READY') {
        // READY event (dispatch)
        const connectedAccount = data.d.connected_accounts.find(
          (v) => v.type === 'spotify' && v.show_activity
        );
        if (connectedAccount) {
          this.spotifyAccessToken = connectedAccount.access_token;
        }

        this.#sessionId = data.d.session_id;
        this.#resumeGatewayUrl = data.d.resume_gateway_url;
        this.userId = data.d.user.id;
      }

      if (data.op === 0) this.emit(data.t, data);
      this.emit(data.op, data);
    } catch (error) {
      // Empty catch block
    }
  }
};
