import { Router, Response } from 'express';
import { ConversationService } from '../../conversations/service.js';
import { agentRegistry } from '../../agents/registry.js';
import { parseAgentId } from '../../agents/experiments.js';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { ApiKeyService } from '../../auth/api-key.service.js';

// Helper to get experiment info for templates
function getExperimentInfo() {
  return agentRegistry.listAgents().map((compoundId) => {
    const { base, experiment } = parseAgentId(compoundId);
    const resolved = agentRegistry.resolve(compoundId);
    const model = resolved?.factory.createAgent(resolved.experimentOrVersion).config.model;
    return {
      id: compoundId,
      type: base,
      experiment: experiment || 'default',
      model: model || 'unknown',
    };
  });
}

const router = Router();
const conversationService = new ConversationService();
const apiKeyService = new ApiKeyService();

// Apply auth middleware to all routes
router.use(authMiddleware({ redirect: true }));

// Home / Dashboard
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);
  const experiments = getExperimentInfo();

  res.render('index', {
    title: 'Takaro Agent',
    conversationCount: conversations.length,
    experimentCount: experiments.length,
    recentConversations: conversations.slice(0, 5),
    user: req.user,
  });
});

// Agents list
router.get('/agents', async (req: AuthenticatedRequest, res: Response) => {
  const experiments = getExperimentInfo();

  res.render('agents', {
    title: 'Agents',
    experiments,
    user: req.user,
  });
});

// Combined conversations + chat view
router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);
  const experiments = getExperimentInfo();
  const selectedId = req.query['id'] as string | undefined;

  let selectedConversation = null;
  let messages: Awaited<ReturnType<typeof conversationService.getMessages>> = [];

  if (selectedId) {
    selectedConversation = await conversationService.get(selectedId);
    if (selectedConversation && selectedConversation.userId === req.user!.id) {
      messages = await conversationService.getMessages(selectedId);
    } else {
      selectedConversation = null;
    }
  }

  res.render('chat', {
    title: selectedConversation ? `Chat - ${selectedConversation.agentId}` : 'Conversations',
    conversations,
    experiments,
    selectedConversation,
    messages,
    user: req.user,
  });
});

// Redirect old conversation URLs to new combined view
router.get('/conversations/:id', async (req: AuthenticatedRequest, res: Response) => {
  res.redirect('/conversations?id=' + req.params['id']);
});

// New conversation form
router.get('/new', async (req: AuthenticatedRequest, res: Response) => {
  const experiments = getExperimentInfo();

  res.render('new', {
    title: 'New Conversation',
    experiments,
    user: req.user,
  });
});

// Settings page
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, 'openrouter');

  res.render('settings', {
    title: 'Settings',
    providers: {
      openrouter: { connected: hasOpenRouter },
    },
    user: req.user,
  });
});

// Knowledge bases page
router.get('/knowledge', async (req: AuthenticatedRequest, res: Response) => {
  res.render('knowledge', {
    title: 'Knowledge Bases',
    user: req.user,
  });
});

export { router as viewRoutes };
