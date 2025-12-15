import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const getBan: ToolDefinition = {
  name: 'getBan',
  description: 'Get details of a specific ban by its ID.',
  parameters: {
    type: 'object',
    properties: {
      banId: {
        type: 'string',
        description: 'The ban ID to look up',
      },
    },
    required: ['banId'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const banId = args.banId as string;

    const response = await context.takaroClient.player.banControllerGetOne(banId);

    const ban = response.data.data;

    return {
      success: true,
      output: {
        id: ban.id,
        playerId: ban.playerId,
        gameServerId: ban.gameServerId,
        isGlobal: ban.isGlobal,
        reason: ban.reason,
        until: ban.until,
        takaroManaged: ban.takaroManaged,
        createdAt: ban.createdAt,
        updatedAt: ban.updatedAt,
      },
    };
  },
};
