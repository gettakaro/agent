import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const searchEvents: ToolDefinition = {
  name: 'searchEvents',
  description:
    'Search for events/execution logs. Essential for debugging - shows command/hook/cronjob execution results including console.log outputs and API call traces.',
  parameters: {
    type: 'object',
    properties: {
      eventName: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Filter by event names. Common values: "command-executed", "hook-executed", "cronjob-executed", "chat-message", "player-connected"',
      },
      gameserverId: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by game server IDs',
      },
      moduleId: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by module IDs',
      },
      playerId: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by player IDs',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
      },
      sortBy: {
        type: 'string',
        description: 'Field to sort by (default: "createdAt")',
      },
      sortDirection: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction (default: "desc" for newest first)',
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const searchParams: Record<string, unknown> = {
      limit: (args.limit as number) || 10,
      sortBy: (args.sortBy as string) || 'createdAt',
      sortDirection: (args.sortDirection as string) || 'desc',
    };

    const filters: Record<string, unknown> = {};
    if (args.eventName) filters.eventName = args.eventName;
    if (args.gameserverId) filters.gameserverId = args.gameserverId;
    if (args.moduleId) filters.moduleId = args.moduleId;
    if (args.playerId) filters.playerId = args.playerId;

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }

    const response = await context.takaroClient.event.eventControllerSearch(searchParams as any);

    const events = response.data.data.map((event) => ({
      id: event.id,
      eventName: event.eventName,
      createdAt: event.createdAt,
      gameserverId: event.gameserverId,
      moduleId: event.moduleId,
      playerId: event.playerId,
      meta: event.meta,
    }));

    return {
      success: true,
      output: {
        events,
        count: events.length,
        message: `Found ${events.length} event(s)`,
      },
    };
  },
};
