import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const getGameServer: ToolDefinition = {
  name: 'getGameServer',
  description: 'Get detailed information about a specific game server.',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'The game server ID to retrieve',
      },
    },
    required: ['gameServerId'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const gameServerId = args.gameServerId as string;

    const response = await context.takaroClient.gameserver.gameServerControllerGetOne(gameServerId);
    const server = response.data.data;

    return {
      success: true,
      output: {
        id: server.id,
        name: server.name,
        type: server.type,
        reachable: server.reachable,
        enabled: server.enabled,
        connectionInfo: server.connectionInfo,
      },
    };
  },
};
