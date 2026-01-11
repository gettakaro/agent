import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const checkModuleExists: ToolDefinition = {
  name: "checkModuleExists",
  description:
    "Check if a module with the given name already exists. ALWAYS use this before createModule to avoid duplicates.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Module name to search for (exact or partial match)",
      },
    },
    required: ["name"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const searchName = (args.name as string).toLowerCase();
    const response = await context.takaroClient.module.moduleControllerSearch();

    const matches = response.data.data.filter((m) => m.name.toLowerCase().includes(searchName));

    if (matches.length === 0) {
      return {
        success: true,
        output: {
          exists: false,
          message: `No modules found matching "${args.name}". Safe to create new module.`,
        },
      };
    }

    return {
      success: true,
      output: {
        exists: true,
        matches: matches.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.latestVersion?.description,
        })),
        message: `Found ${matches.length} existing module(s). Consider updating instead of creating new.`,
      },
    };
  },
};
