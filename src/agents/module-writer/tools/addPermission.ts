import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState, Permission } from './index.js';

export const addPermission: ToolDefinition = {
  name: 'addPermission',
  description:
    'Add a permission to the module. Permissions control access to commands and can be assigned to roles.',
  parameters: {
    type: 'object',
    properties: {
      permission: {
        type: 'string',
        description:
          'Permission key (uppercase with underscores, e.g., TELEPORT_USE)',
      },
      friendlyName: {
        type: 'string',
        description: 'Human-readable permission name',
      },
      description: {
        type: 'string',
        description: 'What this permission allows',
      },
      canHaveCount: {
        type: 'boolean',
        description:
          'Whether this permission can have a count (e.g., for limits or multipliers)',
      },
    },
    required: ['permission', 'friendlyName', 'description'],
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

    const permission = args['permission'] as string;
    const friendlyName = args['friendlyName'] as string;
    const description = args['description'] as string;
    const canHaveCount = (args['canHaveCount'] as boolean) || false;

    // Check for duplicate permission
    if (moduleState.permissions.some((p) => p.permission === permission)) {
      return {
        success: false,
        output: null,
        error: `Permission "${permission}" already exists`,
      };
    }

    // Validate permission format (uppercase with underscores)
    if (!/^[A-Z][A-Z0-9_]*$/.test(permission)) {
      return {
        success: false,
        output: null,
        error:
          'Permission key must be uppercase with underscores (e.g., TELEPORT_USE)',
      };
    }

    const perm: Permission = {
      permission,
      friendlyName,
      description,
      canHaveCount,
    };

    moduleState.permissions.push(perm);

    return {
      success: true,
      output: {
        message: `Permission "${permission}" added successfully`,
        permission: perm,
      },
    };
  },
};
