import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState } from './index.js';

export const setConfigSchema: ToolDefinition = {
  name: 'setConfigSchema',
  description:
    'Set the JSON Schema for admin-configurable module options. This defines what settings admins can customize.',
  parameters: {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description:
          'JSON Schema (draft-07) defining configurable options. Should have type: "object" and properties.',
      },
    },
    required: ['schema'],
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

    const schema = args['schema'] as Record<string, unknown>;

    // Basic schema validation
    if (schema['type'] !== 'object') {
      return {
        success: false,
        output: null,
        error: 'Config schema must have type: "object"',
      };
    }

    if (!schema['properties'] || typeof schema['properties'] !== 'object') {
      return {
        success: false,
        output: null,
        error: 'Config schema must have a "properties" object',
      };
    }

    // Add schema metadata if not present
    const fullSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      additionalProperties: false,
      ...schema,
    };

    moduleState.configSchema = fullSchema;

    return {
      success: true,
      output: {
        message: 'Config schema set successfully',
        schema: fullSchema,
      },
    };
  },
};
