const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Create a raid signup for this channel.')
    .addStringOption((opt) =>
      opt
        .setName('raid')
        .setDescription('Which raid?')
        .setRequired(true)
        .addChoices(
          { name: "Nerub'ar Palace", value: "Nerub'ar Palace" },
          { name: 'Liberation of the Undermine', value: 'Liberation of the Undermine' },
          { name: 'Manaforge Omega', value: 'Manaforge Omega' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('details')
        .setDescription('Extra details (e.g. @21:00 ST)')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('cancelraid')
    .setDescription('Cancel the active raid in this channel.')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('editraid')
    .setDescription('Edit the active raid in this channel.')
    .addStringOption((opt) =>
      opt
        .setName('raid')
        .setDescription('New raid (optional)')
        .setRequired(false)
        .addChoices(
          { name: "Nerub'ar Palace", value: "Nerub'ar Palace" },
          { name: 'Liberation of the Undermine', value: 'Liberation of the Undermine' },
          { name: 'Manaforge Omega', value: 'Manaforge Omega' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('details')
        .setDescription('New details (optional)')
        .setRequired(false)
    )
    .toJSON(),
];

module.exports = { commands };
