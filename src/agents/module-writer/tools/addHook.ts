import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState, Hook } from './index.js';

const VALID_EVENT_TYPES = [
  'player-connected',
  'player-disconnected',
  'chat-message',
  'player-death',
  'entity-killed',
  'log',
  'discord-message',
  'role-assigned',
  'role-removed',
  'currency-added',
  'currency-deducted',
  'player-banned',
  'player-unbanned',
  'server-status-changed',
  'module-installed',
  'module-uninstalled',
  'module-updated',
];

export const addHook: ToolDefinition = {
  name: 'addHook',
  description:
    'Add an event hook to the module. Hooks are triggered by game or system events.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Internal hook name (unique identifier)',
      },
      eventType: {
        type: 'string',
        enum: VALID_EVENT_TYPES,
        description: 'Event that triggers this hook',
      },
      functionCode: {
        type: 'string',
        description:
          'JavaScript code for the hook function. Use data.eventData to access event payload.',
      },
      regex: {
        type: 'string',
        description:
          'Optional regex pattern for chat-message hooks to filter messages',
      },
    },
    required: ['name', 'eventType', 'functionCode'],
  },
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const moduleState = context.state['module'] as ModuleState | undefined;

    if (!moduleState) {
      return {
        success: false,
        output: null,
        error: 'No module initialized. Call createModule first.',
      };
    }

    const name = args['name'] as string;
    const eventType = args['eventType'] as string;
    const functionCode = args['functionCode'] as string;
    const regex = args['regex'] as string | undefined;

    // Check for duplicate hook name
    if (moduleState.hooks.some((h) => h.name === name)) {
      return {
        success: false,
        output: null,
        error: `Hook "${name}" already exists`,
      };
    }

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return {
        success: false,
        output: null,
        error: `Invalid event type "${eventType}". Valid types: ${VALID_EVENT_TYPES.join(', ')}`,
      };
    }

    const hook: Hook = {
      name,
      eventType,
      function: functionCode,
      regex,
    };

    moduleState.hooks.push(hook);

    return {
      success: true,
      output: {
        message: `Hook "${name}" (${eventType}) added successfully`,
        hook,
      },
    };
  },
};
