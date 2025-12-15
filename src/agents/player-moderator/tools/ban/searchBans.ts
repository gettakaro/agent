import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const searchBans: ToolDefinition = {
  name: 'searchBans',
  description:
    'Search for existing bans. Can filter by player, game server, or global status.',
  parameters: {
    type: 'object',
    properties: {
      playerId: {
        type: 'string',
        description: 'Filter by player ID',
      },
      gameServerId: {
        type: 'string',
        description: 'Filter by game server ID',
      },
      isGlobal: {
        type: 'boolean',
        description: 'Filter by global ban status',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const searchParams: Record<string, unknown> = {
      limit: (args.limit as number) || 20,
      extend: ['player', 'gameServer'],
    };

    const filters: Record<string, unknown> = {};
    if (args.playerId) filters.playerId = [args.playerId as string];
    if (args.gameServerId) filters.gameServerId = [args.gameServerId as string];
    if (args.isGlobal !== undefined) filters.isGlobal = [args.isGlobal as boolean];

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }

    const response = await context.takaroClient.player.banControllerSearch(searchParams as any);

    const bans = response.data.data.map((ban) => {
      const extended = ban as any;
      return {
        id: ban.id,
        playerId: ban.playerId,
        playerName: extended.player?.name,
        gameServerId: ban.gameServerId,
        gameServerName: extended.gameServer?.name,
        isGlobal: ban.isGlobal,
        reason: ban.reason,
        until: ban.until,
        createdAt: ban.createdAt,
      };
    });

    return {
      success: true,
      output: {
        bans,
        count: bans.length,
        message: `Found ${bans.length} ban(s)`,
      },
    };
  },
};
