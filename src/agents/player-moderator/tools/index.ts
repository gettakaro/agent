import type { ToolDefinition } from '../../types.js';

// Reuse from module-writer
import { searchPlayers } from '../../module-writer/tools/debug/searchPlayers.js';
import { getOnlinePlayers } from '../../module-writer/tools/gameserver/getOnlinePlayers.js';
import { searchEvents } from '../../module-writer/tools/debug/searchEvents.js';
import { getGameServers } from '../../module-writer/tools/gameserver/getGameServers.js';
import { getGameServer } from '../../module-writer/tools/gameserver/getGameServer.js';
import { getSettings } from '../../module-writer/tools/debug/getSettings.js';

// New player-moderator specific tools
import { getPlayer } from './player/getPlayer.js';
import { createBan } from './ban/createBan.js';
import { removeBan } from './ban/removeBan.js';
import { searchBans } from './ban/searchBans.js';
import { getBan } from './ban/getBan.js';
import { searchRoles } from './role/searchRoles.js';
import { assignRole } from './role/assignRole.js';
import { removeRole } from './role/removeRole.js';

export const playerModeratorTools: ToolDefinition[] = [
  // Player lookup (2 reused + 1 new)
  searchPlayers,
  getOnlinePlayers,
  getPlayer,

  // Ban management (4 new)
  createBan,
  removeBan,
  searchBans,
  getBan,

  // Role management (3 new)
  searchRoles,
  assignRole,
  removeRole,

  // Server context (2 reused)
  getGameServers,
  getGameServer,

  // Investigation & debug (2 reused)
  searchEvents,
  getSettings,
];
