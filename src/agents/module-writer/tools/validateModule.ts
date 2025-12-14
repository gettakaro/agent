import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState } from './index.js';

export const validateModule: ToolDefinition = {
  name: 'validateModule',
  description:
    'Validate the current module structure. Checks for errors and missing components.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (
    _args: Record<string, unknown>,
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

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check module has at least one component
    const totalComponents =
      moduleState.commands.length +
      moduleState.hooks.length +
      moduleState.cronJobs.length;

    if (totalComponents === 0) {
      errors.push(
        'Module has no commands, hooks, or cron jobs. Add at least one component.'
      );
    }

    // Check all referenced permissions exist
    for (const cmd of moduleState.commands) {
      for (const perm of cmd.requiredPermissions) {
        if (!moduleState.permissions.some((p) => p.permission === perm)) {
          errors.push(
            `Command "${cmd.name}" references undefined permission "${perm}"`
          );
        }
      }
    }

    // Check for empty function code
    for (const cmd of moduleState.commands) {
      if (!cmd.function.trim()) {
        errors.push(`Command "${cmd.name}" has empty function code`);
      }
    }

    for (const hook of moduleState.hooks) {
      if (!hook.function.trim()) {
        errors.push(`Hook "${hook.name}" has empty function code`);
      }
    }

    for (const cron of moduleState.cronJobs) {
      if (!cron.function.trim()) {
        errors.push(`Cron job "${cron.name}" has empty function code`);
      }
    }

    // Warnings for best practices
    if (!moduleState.description) {
      warnings.push('Module has no description');
    }

    if (moduleState.commands.length > 0 && moduleState.permissions.length === 0) {
      warnings.push(
        'Module has commands but no permissions. Consider adding permissions for access control.'
      );
    }

    const isValid = errors.length === 0;

    return {
      success: isValid,
      output: {
        valid: isValid,
        errors,
        warnings,
        summary: {
          name: moduleState.name,
          commands: moduleState.commands.length,
          hooks: moduleState.hooks.length,
          cronJobs: moduleState.cronJobs.length,
          functions: moduleState.functions.length,
          permissions: moduleState.permissions.length,
          hasConfigSchema: moduleState.configSchema !== null,
        },
      },
    };
  },
};
