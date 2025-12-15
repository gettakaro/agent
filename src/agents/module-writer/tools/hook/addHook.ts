import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const addHook: ToolDefinition = {
  name: 'addHook',
  description:
    'Add an event hook to the current module version. Hooks trigger code when specific events occur (player connect, chat message, etc.). Requires createModule to be called first.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Internal hook name (used as identifier)',
      },
      eventType: {
        type: 'string',
        description: 'Event that triggers the hook',
        enum: [
          'log',
          'player-connected',
          'player-disconnected',
          'chat-message',
          'player-death',
          'entity-killed',
          'discord-message',
          'role-assigned',
          'role-removed',
          'command-executed',
          'hook-executed',
          'cronjob-executed',
          'currency-added',
          'currency-deducted',
          'player-new-ip-detected',
          'server-status-changed',
        ],
      },
      regex: {
        type: 'string',
        description: 'Regex pattern to filter events (use ".*" to match all)',
      },
      function: {
        type: 'string',
        description:
          'JavaScript code that executes when the event occurs. Has access to takaro, data (with eventData), and TakaroUserError from @takaro/helpers.',
      },
      description: {
        type: 'string',
        description: 'Description of what this hook does',
      },
    },
    required: ['name', 'eventType', 'regex', 'function'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const versionId = context.state.versionId as string | undefined;
    if (!versionId) {
      return {
        success: false,
        output: null,
        error: 'No module version found. Call createModule first.',
      };
    }

    const name = args.name as string;
    const eventType = args.eventType as string;
    const regex = args.regex as string;
    const functionCode = args.function as string;
    const description = args.description as string | undefined;

    const response = await context.takaroClient.hook.hookControllerCreate({
      name,
      eventType: eventType as any,
      regex,
      versionId,
      function: functionCode,
      description,
    });

    const hookId = response.data.data.id;

    return {
      success: true,
      output: {
        hookId,
        name,
        eventType,
        message: `Hook "${name}" added successfully for event "${eventType}"`,
      },
    };
  },
};
