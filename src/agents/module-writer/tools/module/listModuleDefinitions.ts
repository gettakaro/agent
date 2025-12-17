import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const listModuleDefinitions: ToolDefinition = {
  name: "listModuleDefinitions",
  description: "List all module definitions available in Takaro",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  execute: async (_args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const response = await context.takaroClient.module.moduleControllerSearch();
    return { success: true, output: response.data.data };
  },
};
