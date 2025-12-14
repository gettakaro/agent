import type { IAgentFactory } from './types.js';

class AgentRegistry {
  private factories = new Map<string, IAgentFactory>();

  register(factory: IAgentFactory): void {
    this.factories.set(factory.agentId, factory);
  }

  getFactory(agentId: string): IAgentFactory | undefined {
    return this.factories.get(agentId);
  }

  listAgents(): string[] {
    return Array.from(this.factories.keys());
  }
}

export const agentRegistry = new AgentRegistry();
