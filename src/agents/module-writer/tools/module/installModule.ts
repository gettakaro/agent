import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const installModule: ToolDefinition = {
  name: 'installModule',
  description:
    'Install the current module version on a game server. Use getGameServers first to find available servers.',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'ID of the game server to install the module on',
      },
      versionId: {
        type: 'string',
        description:
          'ID of the module version to install (optional, uses the current version from createModule if not provided)',
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
    const versionId = (args.versionId as string) || (context.state.versionId as string);

    if (!versionId) {
      return {
        success: false,
        output: null,
        error: 'No version ID provided and no module version in state. Call createModule first.',
      };
    }

    await context.takaroClient.module.moduleInstallationsControllerInstallModule({
      versionId,
      gameServerId,
    });

    const moduleName = context.state.moduleName as string | undefined;

    return {
      success: true,
      output: {
        installed: true,
        gameServerId,
        versionId,
        message: moduleName
          ? `Module "${moduleName}" installed successfully on server`
          : `Module installed successfully on server`,
      },
    };
  },
};
