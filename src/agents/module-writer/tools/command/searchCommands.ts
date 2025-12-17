import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const searchCommands: ToolDefinition = {
  name: "searchCommands",
  description: "Search for commands. Can filter by moduleId, versionId, name, or trigger.",
  parameters: {
    type: "object",
    properties: {
      moduleId: {
        type: "string",
        description: "Filter by module ID",
      },
      versionId: {
        type: "string",
        description: "Filter by version ID",
      },
      name: {
        type: "string",
        description: "Filter by command name",
      },
      trigger: {
        type: "string",
        description: "Filter by trigger",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 100)",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const searchParams: Record<string, unknown> = {};
    const filters: Record<string, string[]> = {};

    if (args.moduleId) filters.moduleId = [args.moduleId as string];
    if (args.versionId) filters.versionId = [args.versionId as string];
    if (args.name) filters.name = [args.name as string];
    if (args.trigger) filters.trigger = [args.trigger as string];

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }
    if (args.limit) searchParams.limit = args.limit;

    const response = await context.takaroClient.command.commandControllerSearch(searchParams as any);

    const commands = response.data.data.map((command) => ({
      id: command.id,
      name: command.name,
      trigger: command.trigger,
      helpText: command.helpText,
      versionId: command.versionId,
    }));

    return {
      success: true,
      output: {
        commands,
        count: commands.length,
        message: `Found ${commands.length} command(s)`,
      },
    };
  },
};
