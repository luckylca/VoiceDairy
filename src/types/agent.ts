export type AgentActionType =
  | 'create_idea'
  | 'create_todo'
  | 'create_reminder'
  | 'create_project_update'
  | 'create_project_requirement'
  | 'complete_project_requirement';

export type AgentActionStatus =
  | 'pending'
  | 'executing'
  | 'success'
  | 'failed'
  | 'cancelled';

export type AgentAction = {
  id: string;
  type: AgentActionType;
  title: string;
  description: string;
  projectId?: string | null;
  projectName?: string | null;
  requirementId?: string | null;
  datetime?: string | null;
  dueDate?: string | null;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  confidence: number;
  requiresConfirmation: boolean;
  status: AgentActionStatus;
};

export type ActionExecutionResult = {
  actionId: string;
  success: boolean;
  createdEntityId?: string;
  message: string;
  errorCode?: string;
};

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  source?: 'text' | 'voice';
  responseState?: 'reply_only' | 'needs_clarification' | 'awaiting_confirmation' | 'completed';
  actions?: AgentAction[];
  executionResults?: ActionExecutionResult[];
  rawRequest?: string;
};
