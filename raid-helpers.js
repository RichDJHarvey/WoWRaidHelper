const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');

const OFFICER_ROLE = process.env.OFFICER_ROLE;
const BOT_MANAGER_ROLE = process.env.BOT_MANAGER_ROLE;
const KIRBY = process.env.KIRBY_CUM;

function canManageRaids(interaction) {
  const member = interaction.member;
  if (!member) {
    return false;
  }

  const permissions = member.permissions;
  if (permissions && permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  if (OFFICER_ROLE) {
    const roles = member.roles;
    if (roles && roles.cache && roles.cache.has(OFFICER_ROLE)) {
      return true;
    }
  }

  if (BOT_MANAGER_ROLE) {
    const roles = member.roles;
    if (roles && roles.cache && roles.cache.has(BOT_MANAGER_ROLE)) {
      return true;
    }
  }

  return false;
}

function renderRaidEmbed(raid) {
  let description = `**Raid:** ${raid.raidName}\n`;

  if (raid.details) {
    description += `**Details:** ${raid.details}\n`;
  }

  if (raid.cancelled) {
    description += `**Status:** Cancelled\n`;
  }

  description += `\n`;

  const confirmed = [];
  const maybe = [];
  const declined = [];

  for (const [userId, entry] of raid.signups.entries()) {
    const roles = Array.from(entry.roles);
    const rolesText = roles.length ? ` — ${roles.join(', ')}` : '';
    const baseLine = `<@${userId}>`;

    if (entry.status === 'confirm') {
      confirmed.push(baseLine + rolesText);
    } else if (entry.status === 'maybe') {
      maybe.push(baseLine + rolesText);
    } else if (entry.status === 'declined') {
      declined.push(`${baseLine} — Fat Neek`);
    }
  }

  description += `**Confirmed (${confirmed.length})**\n`;
  if (confirmed.length > 0) {
    description += confirmed.join('\n');
  } else {
    description += 'No signups';
  }

  description += '\n\n';

  description += `**Maybe (${maybe.length})**\n`;
  if (maybe.length > 0) {
    description += maybe.join('\n');
  } else {
    description += 'No maybes';
  }

  description += '\n\n';

  description += `**Declined (${declined.length})**\n`;
  if (declined.length > 0) {
    description += declined.join('\n');
  } else {
    description += 'No declines';
  }

  return new EmbedBuilder()
    .setTitle('Raid Signup')
    .setDescription(description)
    .setColor(0x00ae86);
}

function buildButtons() {
  const statusRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('raid_confirm')
      .setEmoji(KIRBY)
      .setLabel('Sounds gay.... Im in')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('raid_maybe')
      .setLabel('Hmmmmmm...')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('raid_no')
      .setLabel('Declined')
      .setStyle(ButtonStyle.Danger)
  );

  const roleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('role_tank')
      .setEmoji('🛡️')
      .setLabel('TONK')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('role_dps')
      .setEmoji('⚔️')
      .setLabel('DOOPS')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('role_healer')
      .setEmoji('💊')
      .setLabel('Gay like Bratch')
      .setStyle(ButtonStyle.Primary)
  );

  return [statusRow, roleRow];
}

function buildDisabledButtons() {
  const [statusRow, roleRow] = buildButtons();

  statusRow.components.forEach((b) => {
    b.setDisabled(true);
  });

  roleRow.components.forEach((b) => {
    b.setDisabled(true);
  });

  return [statusRow, roleRow];
}

module.exports = {
  canManageRaids,
  renderRaidEmbed,
  buildButtons,
  buildDisabledButtons,
};
