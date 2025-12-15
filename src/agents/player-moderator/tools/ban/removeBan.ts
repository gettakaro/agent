import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const removeBan: ToolDefinition = {
  name: 'removeBan',
  description:
    'Remove a ban (unban a player). Requires the ban ID, which can be found using searchBans.',
  parameters: {
    type: 'object',
    properties: {
      banId: {
        type: 'string',
        description: 'The ban ID to remove',
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

    await context.takaroClient.player.banControllerDelete(banId);

    return {
      success: true,
      output: {
        banId,
        message: 'Ban removed successfully. Player can now rejoin.',
      },
    };
  },
};
