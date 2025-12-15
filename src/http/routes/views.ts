import { Router, Response } from 'express';
import { ConversationService } from '../../conversations/service.js';
import { agentRegistry } from '../../agents/registry.js';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { ApiKeyService } from '../../auth/api-key.service.js';
import { ClaudeTokenService } from '../../auth/claude-token.service.js';

const router = Router();
const conversationService = new ConversationService();
const apiKeyService = new ApiKeyService();
const claudeTokenService = new ClaudeTokenService();

// Apply auth middleware to all routes
router.use(authMiddleware({ redirect: true }));

// Home / Dashboard
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);
  const agents = agentRegistry.listAgents();

  res.render('index', {
    title: 'Takaro Agent',
    conversationCount: conversations.length,
    agentCount: agents.length,
    recentConversations: conversations.slice(0, 5),
    user: req.user,
  });
});

// Agents list
router.get('/agents', async (req: AuthenticatedRequest, res: Response) => {
  const agentIds = agentRegistry.listAgents();
  const agents = agentIds.map((id) => {
    const factory = agentRegistry.getFactory(id)!;
    return {
      id,
      versions: factory.listVersions(),
      defaultVersion: factory.getDefaultVersion(),
    };
  });

  res.render('agents', {
    title: 'Agents',
    agents,
    user: req.user,
  });
});

// Conversations list
router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);

  res.render('conversations', {
    title: 'Conversations',
    conversations,
    user: req.user,
  });
});

// Single conversation view
router.get('/conversations/:id', async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await conversationService.get(req.params['id']!);

  if (!conversation) {
    res.status(404).render('error', {
      title: 'Not Found',
      message: 'Conversation not found',
      user: req.user,
    });
    return;
  }

  // Check ownership
  if (conversation.userId !== req.user!.id) {
    res.status(403).render('error', {
      title: 'Forbidden',
      message: 'You do not have access to this conversation',
      user: req.user,
    });
    return;
  }

  const messages = await conversationService.getMessages(conversation.id);

  res.render('conversation', {
    title: `Chat - ${conversation.agentId}`,
    conversation,
    messages,
    user: req.user,
  });
});

// New conversation form
router.get('/new', async (req: AuthenticatedRequest, res: Response) => {
  const agentIds = agentRegistry.listAgents();
  const agents = agentIds.map((id) => {
    const factory = agentRegistry.getFactory(id)!;
    return {
      id,
      versions: factory.listVersions(),
      defaultVersion: factory.getDefaultVersion(),
    };
  });

  res.render('new', {
    title: 'New Conversation',
    agents,
    user: req.user,
  });
});

// Settings page
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, 'openrouter');
  const hasClaude = await claudeTokenService.hasToken(req.user!.id);

  // Check for OAuth callback result from query params
  const claudeAuthResult = req.query['claude_auth'] as string | undefined;
  const claudeAuthMessage = req.query['message'] as string | undefined;

  res.render('settings', {
    title: 'Settings',
    providers: {
      openrouter: { connected: hasOpenRouter },
      claude: { connected: hasClaude },
    },
    claudeAuthResult,
    claudeAuthMessage,
    user: req.user,
  });
});

export { router as viewRoutes };
