import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const updateModule: ToolDefinition = {
  name: "updateModule",
  description:
    "Update module metadata (name, description). Does not update components - use specific update tools for commands/hooks/etc.",
  parameters: {
    type: "object",
    properties: {
      moduleId: {
        type: "string",
        description: "The module ID to update",
      },
      name: {
        type: "string",
        description: "New name for the module",
      },
      description: {
        type: "string",
        description: "New description for the module",
      },
    },
    required: ["moduleId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const moduleId = args.moduleId as string;
    const updateData: Record<string, unknown> = {};

    if (args.name) updateData.name = args.name;
    if (args.description) updateData.latestVersion = { description: args.description };

    const response = await context.takaroClient.module.moduleControllerUpdate(moduleId, updateData as any);

    return {
      success: true,
      output: {
        moduleId: response.data.data.id,
        name: response.data.data.name,
        message: `Module "${response.data.data.name}" updated successfully`,
      },
    };
  },
};
