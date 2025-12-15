import type { IAgentFactory, IAgent } from './types.js';
import { parseAgentId } from './experiments.js';

export interface ResolvedAgent {
  factory: IAgentFactory;
  experimentOrVersion: string;
}

class AgentRegistry {
  private factories = new Map<string, IAgentFactory>();

  register(factory: IAgentFactory): void {
    this.factories.set(factory.agentId, factory);
  }

  /**
   * Get factory for an agent type.
   * Accepts compound IDs (e.g., 'module-writer/grok-minimal') and
   * returns the base factory.
   */
  getFactory(agentId: string): IAgentFactory | undefined {
    const { base } = parseAgentId(agentId);
    return this.factories.get(base);
  }

  /**
   * Resolve compound agent ID to factory + experiment/version.
   *
   * @example
   * resolve('module-writer/grok-minimal')
   * // → { factory, experimentOrVersion: 'grok-minimal' }
   *
   * resolve('module-writer')
   * // → { factory, experimentOrVersion: factory.getDefaultVersion() }
   */
  resolve(agentId: string): ResolvedAgent | undefined {
    const { base, experiment, version } = parseAgentId(agentId);
    const factory = this.factories.get(base);
    if (!factory) return undefined;

    const experimentOrVersion =
      experiment ?? version ?? factory.getDefaultVersion();
    return { factory, experimentOrVersion };
  }

  /**
   * Create agent from compound ID.
   * Convenience method that resolves and creates in one call.
   */
  createAgent(agentId: string): IAgent | undefined {
    const resolved = this.resolve(agentId);
    if (!resolved) return undefined;
    return resolved.factory.createAgent(resolved.experimentOrVersion);
  }

  /**
   * List registered base agent types.
   */
  listAgentTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * List all available agent IDs (base types + their experiments/versions).
   */
  listAgents(): string[] {
    const agents: string[] = [];
    for (const [baseId, factory] of this.factories) {
      for (const expOrVersion of factory.listVersions()) {
        agents.push(`${baseId}/${expOrVersion}`);
      }
    }
    return agents;
  }
}

export const agentRegistry = new AgentRegistry();
