import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState } from './index.js';

export const createModule: ToolDefinition = {
  name: 'createModule',
  description:
    'Initialize a new Takaro module. This must be called first before adding any components.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description:
          'Module name (3-50 characters, alphanumeric and hyphens only)',
        minLength: 3,
        maxLength: 50,
      },
      description: {
        type: 'string',
        description: 'A brief description of what the module does',
      },
      author: {
        type: 'string',
        description: 'Author name or organization',
      },
      supportedGames: {
        type: 'array',
        items: { type: 'string' },
        description:
          'List of supported games (e.g., ["rust", "7d2d"]) or ["all"] for all games',
      },
    },
    required: ['name'],
  },
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const name = args['name'] as string;
    const description = (args['description'] as string) || '';
    const author = (args['author'] as string) || 'Unknown';
    const supportedGames = (args['supportedGames'] as string[]) || ['all'];

    // Validate name
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return {
        success: false,
        output: null,
        error: 'Module name must contain only alphanumeric characters and hyphens',
      };
    }

    const moduleState: ModuleState = {
      name,
      description,
      author,
      supportedGames,
      commands: [],
      hooks: [],
      cronJobs: [],
      functions: [],
      permissions: [],
      configSchema: null,
    };

    context.state['module'] = moduleState;

    return {
      success: true,
      output: {
        message: `Module "${name}" initialized successfully`,
        module: moduleState,
      },
    };
  },
};
