require('./utils/logger');
require('./utils/env');

const DiscordClient = require('./clients/DiscordClient');
const SpotifyClient = require('./clients/SpotifyClient');

const discord = new DiscordClient();

discord.on('10', ({ d }) => {
  const server = JSON.parse(d._trace[0])[0];
  console.log(`Connected to Discord Gateway (${server})`);
});

/** @type {SpotifyClient} */
let spotify;
// Only doing once because if discord disconnects and resume it might break
discord.once('READY', () => {
  spotify = new SpotifyClient(discord.spotifyAccessToken);
});

discord.on('READY', ({ d }) => {
  console.log(`Logged in as ${d.user.username}#${d.user.discriminator}`);

  if (process.env.STATUS === 'true') {
    discord.setStatus(
      {
        emoji:
          process.env.STATUS_EMOJI === 'NO'
            ? null
            : { animated: false, id: null, name: process.env.STATUS_EMOJI },
        name: 'Custom Status',
        state: process.env.STATUS_TEXT,
        type: 4,
      },
      false
    );
  }

  spotify.on('message', (data) => {
    const event = data?.payloads?.['0']?.events?.['0'];
    if (!event) return;

    if (event.type === 'DEVICE_STATE_CHANGED') {
      if (event.event.devices.every((d) => d.is_active === false))
        return discord.setSpotifyActivity({}, true);
    }

    if (event.type === 'PLAYER_STATE_CHANGED') {
      if (event.event.state.is_playing === false)
        return discord.setSpotifyActivity({}, true);

      if (event.event.state.item === null) return;

      discord.setSpotifyActivity(event, false);
      console.debug(
        'Updated Spotify Activity',
        `(album=${event.event.state.item.album.name}`,
        `song=${event.event.state.item.name})`
      );
    }
  });
});
