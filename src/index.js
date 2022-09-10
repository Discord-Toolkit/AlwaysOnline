require('./utils/logger');
require('./utils/env');

const DiscordClient = require('./clients/DiscordClient');
const SpotifyClient = require('./clients/SpotifyClient');

const discord = new DiscordClient();

discord.on('10', ({ d }) => {
  const server = JSON.parse(d._trace[0])[0];
  console.log(`Connected to Discord Gateway (${server})`);
});

discord.once('READY', ({ d }) => {
  console.log(`Logged in as ${d.user.username}#${d.user.discriminator}`);

  if (process.env.STATUS === 'true') {
    discord.setStatus({
      emoji:
        process.env.STATUS_EMOJI === 'NO'
          ? null
          : { animated: false, id: null, name: process.env.STATUS_EMOJI },
      name: 'Custom Status',
      state: process.env.STATUS_TEXT,
      type: 4,
    });
  }

  const spotify = new SpotifyClient(discord.spotifyAccessToken);

  spotify.on('message', (data) => {
    if (!data.payloads || !data.payloads[0].events) return;

    const event = data.payloads[0].events[0];

    if (event.event.state.item === null) return;

    discord.setSpotifyActivity(event);
    console.debug(
      'Updated Spotify Activity',
      `(album=${event.event.state.item.album.name}`,
      `song=${event.event.state.item.name})`
    );
  });
});
