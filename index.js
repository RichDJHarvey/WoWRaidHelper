const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

require('dotenv').config();

console.log("Loaded token:", process.env.DISCORD_TOKEN ? "OK" : "NOT FOUND");

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Events,
} = require('discord.js');

const { commands } = require('./commands');
const { raids, raidsByChannel } = require('./raid-store');
const {
  canManageRaids,
  renderRaidEmbed,
  buildButtons,
  buildDisabledButtons,
} = require('./raid-helpers');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const RAIDER_ROLE = process.env.RAIDER_ROLE;
const TRUE_GAMER_ROLE = process.env.TRUE_GAMER_ROLE;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;

      if (command === 'raid') {
        const raidBase = interaction.options.getString('raid', true);
        const details = interaction.options.getString('details') || '';
        const displayName = details ? `${raidBase} — ${details}` : raidBase;

        const raid = {
          raidName: raidBase,
          details: details,
          cancelled: false,
          signups: new Map(),
        };

        const embed = renderRaidEmbed(raid);
        const components = buildButtons();
        const content = `<@&${RAIDER_ROLE}> <@&${TRUE_GAMER_ROLE}> New raid signup: **${displayName}**`;

        const message = await interaction.reply({
          content: content,
          embeds: [embed],
          components: components,
          fetchReply: true,
        });

        raids.set(message.id, raid);
        raidsByChannel.set(interaction.channelId, message.id);
        return;
      }

      if (command === 'cancelraid') {
        const allowed = canManageRaids(interaction);
        if (!allowed) {
          await interaction.reply({
            content: 'You do not have permission to cancel raids.',
            ephemeral: true,
          });
          return;
        }

        const channelId = interaction.channelId;
        const messageId = raidsByChannel.get(channelId);

        if (!messageId) {
          await interaction.reply({
            content: 'There is no active raid to cancel in this channel.',
            ephemeral: true,
          });
          return;
        }

        const raid = raids.get(messageId);

        if (!raid) {
          await interaction.reply({
            content: 'There is no active raid to cancel in this channel.',
            ephemeral: true,
          });
          return;
        }

        if (raid.cancelled) {
          await interaction.reply({
            content: 'This raid is already cancelled.',
            ephemeral: true,
          });
          return;
        }

        raid.cancelled = true;

        const embed = renderRaidEmbed(raid);
        const disabledComponents = buildDisabledButtons();

        const channel = interaction.channel;
        const message = await channel.messages.fetch(messageId);

        let cancelledTitle = `❌ **Raid Cancelled — ${raid.raidName}`;
        if (raid.details) {
            cancelledTitle += ` - ${raid.details}`;
        }
        cancelledTitle += `**`;

        await message.edit({
          content: cancelledTitle,
          embeds: [embed],
          components: disabledComponents,
        });

        await interaction.reply({
          content: 'Raid cancelled.',
          ephemeral: true,
        });

        return;
      }

      if (command === 'editraid') {
        const allowed = canManageRaids(interaction);
        if (!allowed) {
          await interaction.reply({
            content: 'You do not have permission to edit raids.',
            ephemeral: true,
          });
          return;
        }

        const channelId = interaction.channelId;
        const messageId = raidsByChannel.get(channelId);

        if (!messageId) {
          await interaction.reply({
            content: 'There is no active raid to edit in this channel.',
            ephemeral: true,
          });
          return;
        }

        const raid = raids.get(messageId);

        if (!raid) {
          await interaction.reply({
            content: 'There is no active raid to edit in this channel.',
            ephemeral: true,
          });
          return;
        }

        if (raid.cancelled) {
          await interaction.reply({
            content: 'You cannot edit a cancelled raid.',
            ephemeral: true,
          });
          return;
        }

        const newRaidName = interaction.options.getString('raid');
        const newDetails = interaction.options.getString('details');

        if (!newRaidName && !newDetails) {
          await interaction.reply({
            content: 'Please provide at least one field to edit (raid or details).',
            ephemeral: true,
          });
          return;
        }

        if (newRaidName) {
          raid.raidName = newRaidName;
        }

        if (typeof newDetails === 'string') {
          raid.details = newDetails;
        }

        const embed = renderRaidEmbed(raid);

        let newDisplayName = raid.raidName;
        if (raid.details) {
            newDisplayName = `${raid.raidName} — ${raid.details}`;
        }

        const channel = interaction.channel;
        const message = await channel.messages.fetch(messageId);

        await message.edit({
          content: `<@&${RAIDER_ROLE}> <@&${TRUE_GAMER_ROLE}> New raid signup: **${newDisplayName}**`,
          embeds: [embed],
        });

        await interaction.reply({
          content: 'Raid updated.',
          ephemeral: true,
        });

        return;
      }

      return;
    }

    if (interaction.isButton()) {
      const messageId = interaction.message.id;
      const raid = raids.get(messageId);

      if (!raid) {
        await interaction.reply({
          content: 'This raid signup is no longer active.',
          ephemeral: true,
        });
        return;
      }

      if (raid.cancelled) {
        await interaction.reply({
          content: 'This raid has been cancelled.',
          ephemeral: true,
        });
        return;
      }

      const userId = interaction.user.id;
      let entry = raid.signups.get(userId);

      if (!entry) {
        entry = {
          status: null,
          roles: new Set(),
        };
        raid.signups.set(userId, entry);
      }

      const id = interaction.customId;

      if (id === 'raid_confirm') {
        entry.status = 'confirm';
      } else if (id === 'raid_maybe') {
        entry.status = 'maybe';
      } else if (id === 'raid_no') {
        entry.status = 'declined';
      }

      if (id.startsWith('role_')) {
        let roleName = null;

        if (id === 'role_tank') {
          roleName = 'Tank';
        } else if (id === 'role_dps') {
          roleName = 'DPS';
        } else if (id === 'role_healer') {
          roleName = 'Healer';
        }

        if (roleName !== null) {
          if (entry.roles.has(roleName)) {
            entry.roles.delete(roleName);
          } else {
            entry.roles.add(roleName);
          }

          if (!entry.status) {
            entry.status = 'maybe';
          }
        }
      }

      const updatedEmbed = renderRaidEmbed(raid);

      await interaction.update({
        embeds: [updatedEmbed],
        components: buildButtons(),
      });

      return;
    }
  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'Something went wrong while handling that.',
          ephemeral: true,
        });
      } catch (_) {}
    }
  }
});

client.login(TOKEN);
