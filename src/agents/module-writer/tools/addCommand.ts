import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState, Command, CommandArgument } from './index.js';

export const addCommand: ToolDefinition = {
  name: 'addCommand',
  description:
    'Add a chat command to the module. Commands are executed when players type the trigger in chat.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Internal command name (unique identifier)',
      },
      trigger: {
        type: 'string',
        description:
          'Chat trigger without the slash (e.g., "tp" for /tp command)',
      },
      helpText: {
        type: 'string',
        description: 'Help text shown to players',
      },
      functionCode: {
        type: 'string',
        description:
          'JavaScript code for the command function. Should import from @takaro/helpers and use async main() pattern.',
      },
      arguments: {
        type: 'array',
        description: 'Command arguments',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Argument name' },
            type: {
              type: 'string',
              enum: ['string', 'number', 'boolean', 'player'],
              description: 'Argument type',
            },
            helpText: { type: 'string', description: 'Help text for argument' },
            defaultValue: { type: 'string', description: 'Default value' },
            position: { type: 'number', description: 'Argument position (0-based)' },
          },
          required: ['name', 'type', 'position'],
        },
      },
      requiredPermissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Permission keys required to use this command',
      },
    },
    required: ['name', 'trigger', 'functionCode'],
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
    const trigger = args['trigger'] as string;
    const helpText = (args['helpText'] as string) || '';
    const functionCode = args['functionCode'] as string;
    const commandArgs = (args['arguments'] as CommandArgument[]) || [];
    const requiredPermissions = (args['requiredPermissions'] as string[]) || [];

    // Check for duplicate command name
    if (moduleState.commands.some((c) => c.name === name)) {
      return {
        success: false,
        output: null,
        error: `Command "${name}" already exists`,
      };
    }

    // Check for duplicate trigger
    if (moduleState.commands.some((c) => c.trigger === trigger)) {
      return {
        success: false,
        output: null,
        error: `Trigger "${trigger}" is already used by another command`,
      };
    }

    // Validate required permissions exist
    for (const perm of requiredPermissions) {
      if (!moduleState.permissions.some((p) => p.permission === perm)) {
        return {
          success: false,
          output: null,
          error: `Permission "${perm}" not found. Add it with addPermission first.`,
        };
      }
    }

    const command: Command = {
      name,
      trigger,
      helpText,
      function: functionCode,
      arguments: commandArgs,
      requiredPermissions,
    };

    moduleState.commands.push(command);

    return {
      success: true,
      output: {
        message: `Command "/${trigger}" added successfully`,
        command,
      },
    };
  },
};
