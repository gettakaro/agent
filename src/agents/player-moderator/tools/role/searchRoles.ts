import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const searchRoles: ToolDefinition = {
  name: 'searchRoles',
  description: 'Search for available roles in the system. Use this to find role IDs before assigning them to players.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Filter by role name (partial match)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const searchParams: Record<string, unknown> = {
      limit: (args.limit as number) || 20,
    };

    if (args.name) {
      searchParams.search = { name: [args.name as string] };
    }

    const response = await context.takaroClient.role.roleControllerSearch(searchParams as any);

    const roles = response.data.data.map((role) => ({
      id: role.id,
      name: role.name,
      system: role.system,
      createdAt: role.createdAt,
    }));

    return {
      success: true,
      output: {
        roles,
        count: roles.length,
        message: `Found ${roles.length} role(s)`,
      },
    };
  },
};
