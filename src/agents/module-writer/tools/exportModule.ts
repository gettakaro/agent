import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState } from './index.js';

export const exportModule: ToolDefinition = {
  name: 'exportModule',
  description:
    'Export the module as a TypeScript class definition that can be used in Takaro.',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['typescript', 'json'],
        description: 'Export format (default: typescript)',
      },
    },
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

    const format = (args['format'] as string) || 'typescript';

    if (format === 'json') {
      return {
        success: true,
        output: {
          format: 'json',
          module: moduleState,
        },
      };
    }

    // Generate TypeScript export
    const className = toPascalCase(moduleState.name);
    const configSchemaStr = moduleState.configSchema
      ? JSON.stringify(moduleState.configSchema, null, 2)
      : 'null';

    const commandsStr = moduleState.commands
      .map(
        (cmd) => `
          {
            name: '${cmd.name}',
            trigger: '${cmd.trigger}',
            helpText: '${escapeString(cmd.helpText)}',
            function: \`${escapeTemplate(cmd.function)}\`,
            arguments: ${JSON.stringify(cmd.arguments, null, 2)},
            requiredPermissions: ${JSON.stringify(cmd.requiredPermissions)},
          }`
      )
      .join(',');

    const hooksStr = moduleState.hooks
      .map(
        (hook) => `
          {
            name: '${hook.name}',
            eventType: '${hook.eventType}',
            function: \`${escapeTemplate(hook.function)}\`,
            ${hook.regex ? `regex: '${escapeString(hook.regex)}',` : ''}
          }`
      )
      .join(',');

    const cronJobsStr = moduleState.cronJobs
      .map(
        (cron) => `
          {
            name: '${cron.name}',
            temporalValue: '${cron.temporalValue}',
            function: \`${escapeTemplate(cron.function)}\`,
          }`
      )
      .join(',');

    const functionsStr = moduleState.functions
      .map(
        (fn) => `
          {
            name: '${fn.name}',
            function: \`${escapeTemplate(fn.function)}\`,
          }`
      )
      .join(',');

    const permissionsStr = moduleState.permissions
      .map(
        (perm) => `
          {
            permission: '${perm.permission}',
            friendlyName: '${escapeString(perm.friendlyName)}',
            description: '${escapeString(perm.description)}',
            ${perm.canHaveCount ? 'canHaveCount: true,' : ''}
          }`
      )
      .join(',');

    const typescript = `import { BuiltinModule, ModuleTransferDTO, ModuleTransferVersionDTO } from '@takaro/lib-modules';

export class ${className} extends ModuleTransferDTO<${className}> {
  constructor() {
    super();
    this.name = '${moduleState.name}';
    this.author = '${escapeString(moduleState.author)}';
    this.supportedGames = ${JSON.stringify(moduleState.supportedGames)};
    this.versions = [
      new ModuleTransferVersionDTO({
        tag: '0.0.1',
        description: '${escapeString(moduleState.description)}',
        configSchema: JSON.stringify(${configSchemaStr}),
        commands: [${commandsStr}
        ],
        hooks: [${hooksStr}
        ],
        cronJobs: [${cronJobsStr}
        ],
        functions: [${functionsStr}
        ],
        permissions: [${permissionsStr}
        ],
      }),
    ];
  }
}
`;

    return {
      success: true,
      output: {
        format: 'typescript',
        code: typescript,
        className,
      },
    };
  },
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function escapeTemplate(str: string): string {
  return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
