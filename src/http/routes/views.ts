import { Router, Request, Response } from 'express';
import { ConversationService } from '../../conversations/service.js';
import { agentRegistry } from '../../agents/registry.js';

const router = Router();
const conversationService = new ConversationService();

// Home / Dashboard
router.get('/', async (_req: Request, res: Response) => {
  const conversations = await conversationService.list();
  const agents = agentRegistry.listAgents();

  res.render('index', {
    title: 'Takaro Agent',
    conversationCount: conversations.length,
    agentCount: agents.length,
    recentConversations: conversations.slice(0, 5),
  });
});

// Agents list
router.get('/agents', async (_req: Request, res: Response) => {
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
  });
});

// Conversations list
router.get('/conversations', async (_req: Request, res: Response) => {
  const conversations = await conversationService.list();

  res.render('conversations', {
    title: 'Conversations',
    conversations,
  });
});

// Single conversation view
router.get('/conversations/:id', async (req: Request, res: Response) => {
  const conversation = await conversationService.get(req.params['id']!);

  if (!conversation) {
    res.status(404).render('error', {
      title: 'Not Found',
      message: 'Conversation not found',
    });
    return;
  }

  const messages = await conversationService.getMessages(conversation.id);

  res.render('conversation', {
    title: `Chat - ${conversation.agentId}`,
    conversation,
    messages,
  });
});

// New conversation form
router.get('/new', async (_req: Request, res: Response) => {
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
  });
});

export { router as viewRoutes };
