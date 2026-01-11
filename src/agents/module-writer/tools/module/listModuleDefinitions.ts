import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const listModuleDefinitions: ToolDefinition = {
  name: "listModuleDefinitions",
  description:
    "List all module definitions available in Takaro. ALWAYS use this FIRST to check if a module with the requested name or functionality already exists before creating a new one. This helps avoid duplicate modules.",
  parameters: {
    type: "object",
    properties: {
      nameFilter: {
        type: "string",
        description: "Optional: Filter modules by name (case-insensitive substring match)",
      },
      limit: {
        type: "number",
        description: "Optional: Maximum number of results to return (default: 100)",
        default: 100,
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const nameFilter = args.nameFilter as string | undefined;
    const limit = (args.limit as number) || 100;

    const response = await context.takaroClient.module.moduleControllerSearch({
      extend: ["latestVersion"],
    });

    let results = response.data.data;

    // Client-side filtering by name if filter provided
    if (nameFilter) {
      const lowerFilter = nameFilter.toLowerCase();
      results = results.filter((m) => m.name.toLowerCase().includes(lowerFilter));
    }

    return {
      success: true,
      output: {
        modules: results.slice(0, limit),
        total: results.length,
        filtered: !!nameFilter,
      },
    };
  },
};
