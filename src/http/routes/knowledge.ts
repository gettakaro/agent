import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { knowledgeRegistry, vectorSearch, getDocumentCount, getLastCommitSha, getLastSyncTime, getSyncQueue } from '../../knowledge/index.js';
import { formatError } from '../../utils/formatError.js';

const router = Router();

// Apply auth middleware to all API routes
router.use(authMiddleware({ redirect: false }));

// List all knowledge bases with stats
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Use listKnowledgeBaseTypes() for base IDs - these are used in URL paths
    const kbIds = knowledgeRegistry.listKnowledgeBaseTypes();
    const knowledgeBases = await Promise.all(
      kbIds.map(async (kbId) => {
        const factory = knowledgeRegistry.getFactory(kbId);
        if (!factory) return null;

        const version = factory.getDefaultVersion();
        const kb = factory.createKnowledgeBase(version);
        const ingestionConfig = factory.getIngestionConfig?.();

        // Get stats
        const [documentCount, lastCommitSha, lastSyncedAt] = await Promise.all([
          getDocumentCount(kbId, version),
          getLastCommitSha(kbId),
          getLastSyncTime(kbId),
        ]);

        return {
          id: kbId,
          name: kb.name,
          description: kb.description,
          version,
          documentCount,
          lastCommitSha: lastCommitSha || null,
          lastSyncedAt: lastSyncedAt?.toISOString() || null,
          refreshSchedule: ingestionConfig?.refreshSchedule || null,
          source: ingestionConfig?.source || null,
        };
      })
    );

    res.json({ data: knowledgeBases.filter(Boolean) });
  } catch (error) {
    console.error('Error listing knowledge bases:', formatError(error));
    res.status(500).json({ error: 'Failed to list knowledge bases' });
  }
});

// Get single knowledge base details
router.get('/:kbId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kbId } = req.params;
    const factory = knowledgeRegistry.getFactory(kbId!);

    if (!factory) {
      res.status(404).json({ error: 'Knowledge base not found' });
      return;
    }

    const version = factory.getDefaultVersion();
    const kb = factory.createKnowledgeBase(version);
    const ingestionConfig = factory.getIngestionConfig?.();

    const [documentCount, lastCommitSha, lastSyncedAt] = await Promise.all([
      getDocumentCount(kbId!, version),
      getLastCommitSha(kbId!),
      getLastSyncTime(kbId!),
    ]);

    res.json({
      data: {
        id: kbId,
        name: kb.name,
        description: kb.description,
        version,
        documentCount,
        lastCommitSha: lastCommitSha || null,
        lastSyncedAt: lastSyncedAt?.toISOString() || null,
        refreshSchedule: ingestionConfig?.refreshSchedule || null,
        source: ingestionConfig?.source || null,
      },
    });
  } catch (error) {
    console.error('Error getting knowledge base:', formatError(error));
    res.status(500).json({ error: 'Failed to get knowledge base' });
  }
});

// Search knowledge base
router.get('/:kbId/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kbId } = req.params;
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const factory = knowledgeRegistry.getFactory(kbId!);
    if (!factory) {
      res.status(404).json({ error: 'Knowledge base not found' });
      return;
    }

    const results = await vectorSearch(kbId!, q, {
      limit: limit ? parseInt(limit as string, 10) : 5,
    });

    res.json({ data: results });
  } catch (error) {
    console.error('Error searching knowledge base:', formatError(error));
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Trigger manual sync
router.post('/:kbId/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kbId } = req.params;
    const factory = knowledgeRegistry.getFactory(kbId!);

    if (!factory) {
      res.status(404).json({ error: 'Knowledge base not found' });
      return;
    }

    const ingestionConfig = factory.getIngestionConfig?.();
    if (!ingestionConfig) {
      res.status(400).json({ error: 'Knowledge base does not support automatic ingestion' });
      return;
    }

    const queue = getSyncQueue();
    const job = await queue.add('sync', {
      knowledgeBaseId: kbId!,
      version: factory.getDefaultVersion(),
      source: ingestionConfig.source,
      extensions: ingestionConfig.extensions,
      chunkSize: ingestionConfig.chunkSize,
      chunkOverlap: ingestionConfig.chunkOverlap,
    });

    res.json({
      data: {
        jobId: job.id,
        status: 'queued',
      },
    });
  } catch (error) {
    console.error('Error triggering sync:', formatError(error));
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

export { router as knowledgeRoutes };
