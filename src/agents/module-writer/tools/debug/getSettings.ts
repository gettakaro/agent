import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const getSettings: ToolDefinition = {
  name: 'getSettings',
  description:
    'Get Takaro settings. Important for getting the commandPrefix which is needed to test commands (e.g., "/" or "+").',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'Game server ID to get settings for (optional, returns global settings if not provided)',
      },
      keys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific setting keys to retrieve. Common: "commandPrefix", "serverChatName"',
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const gameServerId = args.gameServerId as string | undefined;
    const keys = args.keys as string[] | undefined;

    const response = await context.takaroClient.settings.settingsControllerGet(keys as any, gameServerId);

    const settings = response.data.data.map((setting) => ({
      key: setting.key,
      value: setting.value,
      type: setting.type,
    }));

    return {
      success: true,
      output: {
        settings,
        count: settings.length,
        message: `Retrieved ${settings.length} setting(s)`,
      },
    };
  },
};
