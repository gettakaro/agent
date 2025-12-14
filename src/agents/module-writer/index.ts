import type { IAgent, IAgentFactory } from '../types.js';
import { AgentRuntime } from '../AgentRuntime.js';
import { MODULE_WRITER_VERSIONS, DEFAULT_VERSION } from './versions.js';

export class ModuleWriterFactory implements IAgentFactory {
  readonly agentId = 'module-writer';

  createAgent(version: string): IAgent {
    const config = MODULE_WRITER_VERSIONS[version];
    if (!config) {
      throw new Error(`Unknown version: ${version}`);
    }
    return new AgentRuntime(this.agentId, version, config);
  }

  listVersions(): string[] {
    return Object.keys(MODULE_WRITER_VERSIONS);
  }

  getDefaultVersion(): string {
    return DEFAULT_VERSION;
  }
}
