import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const triggerCommand: ToolDefinition = {
  name: 'triggerCommand',
  description:
    'Trigger a command for testing purposes. Simulates a player executing the command. IMPORTANT: Use the gameServerId as the id parameter, not the commandId. The msg should include the command prefix (e.g., "/hello" or "+hello").',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'The game server ID where the command should be triggered',
      },
      playerId: {
        type: 'string',
        description: 'The Takaro player ID (not the gameId/steamId) to execute the command as',
      },
      msg: {
        type: 'string',
        description: 'The full command message including prefix (e.g., "/hello" or "+hello argument1")',
      },
    },
    required: ['gameServerId', 'playerId', 'msg'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const gameServerId = args.gameServerId as string;
    const playerId = args.playerId as string;
    const msg = args.msg as string;

    await context.takaroClient.command.commandControllerTrigger(gameServerId, {
      playerId,
      msg,
    });

    return {
      success: true,
      output: {
        triggered: true,
        gameServerId,
        playerId,
        msg,
        message: `Command "${msg}" triggered successfully. Check searchEvents for execution results.`,
      },
    };
  },
};
