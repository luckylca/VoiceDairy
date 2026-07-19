import { z } from 'zod';
import type { LlmOrganizeResult, LlmStructuredItem } from '../../types/llm';
import type { AgentAction, AgentActionType } from '../../types/agent';
import { createId } from '../../utils/id';

export const agentActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'create_idea',
    'create_todo',
    'create_reminder',
    'create_project_update',
    'create_project_requirement',
    'complete_project_requirement',
  ]),
  title: z.string().min(1),
  description: z.string(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  requirementId: z.string().nullable().optional(),
  datetime: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
  status: z.enum(['pending', 'executing', 'success', 'failed', 'cancelled']),
});

function actionTypeFor(item: LlmStructuredItem): AgentActionType {
  switch (item.type) {
    case 'todo':
      return 'create_todo';
    case 'reminder':
      return 'create_reminder';
    case 'project':
      return 'create_project_update';
    default:
      return 'create_idea';
  }
}

export type ParsedAgentPreview = {
  reply: string;
  actions: AgentAction[];
  clarificationQuestion?: string;
};

export function parseOrganizedResultForAgent(result: LlmOrganizeResult): ParsedAgentPreview {
  const missingReminderTime = result.items.find(
    item => item.type === 'reminder' && !item.datetime && !item.due_date,
  );

  if (missingReminderTime) {
    return {
      reply: '我理解你想创建提醒，但还缺少明确时间。',
      actions: [],
      clarificationQuestion: `“${missingReminderTime.title || '这个提醒'}”需要在什么时间提醒你？`,
    };
  }

  const actions = result.items.map(item => {
    const candidate: AgentAction = {
      id: createId('agent_action'),
      type: actionTypeFor(item),
      title: item.title || '未命名操作',
      description: item.content,
      projectName: item.project,
      datetime: item.datetime,
      dueDate: item.due_date,
      priority: item.priority,
      tags: item.tags,
      confidence: item.confidence,
      requiresConfirmation: true,
      status: 'pending',
    };
    return agentActionSchema.parse(candidate);
  });

  return {
    reply: result.summary || `我整理出了 ${actions.length} 个待确认操作。`,
    actions,
  };
}
