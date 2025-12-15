import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const triggerHook: ToolDefinition = {
  name: 'triggerHook',
  description:
    'Trigger a hook for testing purposes. Simulates an event occurring. The eventMeta must match the expected structure for the eventType.',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'The game server ID where the hook should be triggered',
      },
      moduleId: {
        type: 'string',
        description: 'The module ID containing the hook',
      },
      eventType: {
        type: 'string',
        description: 'The event type to simulate',
        enum: [
          'log',
          'player-connected',
          'player-disconnected',
          'chat-message',
          'player-death',
          'entity-killed',
          'discord-message',
        ],
      },
      eventMeta: {
        type: 'object',
        description:
          'Event metadata matching the event type structure. For chat-message: { msg, channel }. For player-connected: { player: { gameId, name } }',
      },
    },
    required: ['gameServerId', 'moduleId', 'eventType', 'eventMeta'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const gameServerId = args.gameServerId as string;
    const moduleId = args.moduleId as string;
    const eventType = args.eventType as string;
    const eventMeta = args.eventMeta as Record<string, unknown>;

    await context.takaroClient.hook.hookControllerTrigger({
      gameServerId,
      moduleId,
      eventType: eventType as any,
      eventMeta,
    });

    return {
      success: true,
      output: {
        triggered: true,
        gameServerId,
        moduleId,
        eventType,
        message: `Hook for "${eventType}" triggered successfully. Check searchEvents for execution results.`,
      },
    };
  },
};
