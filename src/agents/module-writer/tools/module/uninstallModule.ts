import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const uninstallModule: ToolDefinition = {
  name: "uninstallModule",
  description:
    "Uninstall a module from a game server. The module definition remains, but it will no longer run on that server.",
  parameters: {
    type: "object",
    properties: {
      gameServerId: {
        type: "string",
        description: "The game server ID to uninstall from",
      },
      moduleId: {
        type: "string",
        description: "The module ID to uninstall",
      },
    },
    required: ["gameServerId", "moduleId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const gameServerId = args.gameServerId as string;
    const moduleId = args.moduleId as string;

    await context.takaroClient.module.moduleInstallationsControllerUninstallModule(gameServerId, moduleId);

    return {
      success: true,
      output: {
        uninstalled: true,
        gameServerId,
        moduleId,
        message: `Module uninstalled from game server successfully`,
      },
    };
  },
};
