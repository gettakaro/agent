import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const searchFunctions: ToolDefinition = {
  name: 'searchFunctions',
  description: 'Search for shared functions. Can filter by moduleId, versionId, or name.',
  parameters: {
    type: 'object',
    properties: {
      moduleId: {
        type: 'string',
        description: 'Filter by module ID',
      },
      versionId: {
        type: 'string',
        description: 'Filter by version ID',
      },
      name: {
        type: 'string',
        description: 'Filter by function name',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 100)',
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const searchParams: Record<string, unknown> = {};
    const filters: Record<string, string[]> = {};

    if (args.moduleId) filters.moduleId = [args.moduleId as string];
    if (args.versionId) filters.versionId = [args.versionId as string];
    if (args.name) filters.name = [args.name as string];

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }
    if (args.limit) searchParams.limit = args.limit;

    const response = await context.takaroClient.function.functionControllerSearch(searchParams as any);

    const functions = response.data.data.map((func) => ({
      id: func.id,
      name: func.name,
      description: func.description,
      versionId: func.versionId,
    }));

    return {
      success: true,
      output: {
        functions,
        count: functions.length,
        message: `Found ${functions.length} function(s)`,
      },
    };
  },
};
