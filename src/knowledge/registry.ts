import type { IKnowledgeBaseFactory, KnowledgeBase } from './types.js';
import { parseAgentId } from '../agents/experiments.js';

export interface ResolvedKnowledgeBase {
  factory: IKnowledgeBaseFactory;
  version: string;
}

class KnowledgeRegistry {
  private factories = new Map<string, IKnowledgeBaseFactory>();

  register(factory: IKnowledgeBaseFactory): void {
    this.factories.set(factory.knowledgeBaseId, factory);
  }

  /**
   * Get factory for a knowledge base.
   * Accepts compound IDs (e.g., 'takaro-docs/chunk-512') and
   * returns the base factory.
   */
  getFactory(kbId: string): IKnowledgeBaseFactory | undefined {
    const { base } = parseAgentId(kbId); // Reuse same parsing logic
    return this.factories.get(base);
  }

  /**
   * Resolve compound knowledge base ID to factory + version.
   *
   * @example
   * resolve('takaro-docs/chunk-512')
   * // → { factory, version: 'chunk-512' }
   *
   * resolve('takaro-docs')
   * // → { factory, version: factory.getDefaultVersion() }
   */
  resolve(kbId: string): ResolvedKnowledgeBase | undefined {
    const { base, experiment, version } = parseAgentId(kbId);
    const factory = this.factories.get(base);
    if (!factory) return undefined;

    const resolvedVersion = experiment ?? version ?? factory.getDefaultVersion();
    return { factory, version: resolvedVersion };
  }

  /**
   * Create knowledge base from compound ID.
   * Convenience method that resolves and creates in one call.
   */
  create(kbId: string): KnowledgeBase | undefined {
    const resolved = this.resolve(kbId);
    if (!resolved) return undefined;
    return resolved.factory.createKnowledgeBase(resolved.version);
  }

  /**
   * List registered knowledge base types.
   */
  listKnowledgeBaseTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * List all available knowledge base IDs (types + their versions).
   */
  listKnowledgeBases(): string[] {
    const kbs: string[] = [];
    for (const [baseId, factory] of this.factories) {
      for (const version of factory.listVersions()) {
        kbs.push(`${baseId}/${version}`);
      }
    }
    return kbs;
  }
}

export const knowledgeRegistry = new KnowledgeRegistry();
