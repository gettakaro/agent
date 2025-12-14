import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState, ModuleFunction } from './index.js';

export const addFunction: ToolDefinition = {
  name: 'addFunction',
  description:
    'Add a shared utility function to the module. Functions can be imported by commands, hooks, and cron jobs.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Function file name (without .js extension)',
      },
      functionCode: {
        type: 'string',
        description:
          'JavaScript code with exported functions. Use export syntax for functions to share.',
      },
    },
    required: ['name', 'functionCode'],
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
    const functionCode = args['functionCode'] as string;

    // Check for duplicate function name
    if (moduleState.functions.some((f) => f.name === name)) {
      return {
        success: false,
        output: null,
        error: `Function "${name}" already exists`,
      };
    }

    const moduleFunction: ModuleFunction = {
      name,
      function: functionCode,
    };

    moduleState.functions.push(moduleFunction);

    return {
      success: true,
      output: {
        message: `Function "${name}" added successfully`,
        function: moduleFunction,
      },
    };
  },
};
