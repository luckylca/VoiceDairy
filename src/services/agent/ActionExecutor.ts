import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EntryType } from '../../types/entry';
import type { AgentAction, ActionExecutionResult } from '../../types/agent';
import { agentActionSchema } from './AgentResponseParser';
import { saveOrganizedResult } from '../records/CreateRecordService';
import {
  addProjectRequirement,
  getProjectById,
  listProjects,
  setProjectRequirementDone,
} from '../database/ProjectRepository';

const EXECUTED_ACTIONS_KEY = 'voicediary.agent.executed-actions.v1';

async function loadExecutedActionIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(EXECUTED_ACTIONS_KEY);
  if (!raw) return new Set();
  try {
    const ids = JSON.parse(raw) as string[];
    return new Set(ids.filter(id => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

async function markExecuted(actionId: string): Promise<void> {
  const ids = await loadExecutedActionIds();
  ids.add(actionId);
  await AsyncStorage.setItem(EXECUTED_ACTIONS_KEY, JSON.stringify([...ids].slice(-1000)));
}

async function resolveProject(action: AgentAction) {
  if (action.projectId) {
    const project = await getProjectById(action.projectId);
    if (!project) throw new Error('目标项目已不存在');
    return project;
  }

  if (!action.projectName?.trim()) return null;
  const normalized = action.projectName.trim().toLowerCase();
  const matches = (await listProjects()).filter(project => project.name.trim().toLowerCase() === normalized);
  if (matches.length === 0) throw new Error(`找不到项目“${action.projectName}”`);
  if (matches.length > 1) throw new Error(`存在多个名为“${action.projectName}”的项目，请先明确选择`);
  return matches[0];
}

function entryTypeFor(action: AgentAction): EntryType {
  switch (action.type) {
    case 'create_todo':
      return 'todo';
    case 'create_reminder':
      return 'reminder';
    case 'create_project_update':
      return 'project';
    default:
      return 'idea';
  }
}

export async function executeAgentAction(
  candidate: AgentAction,
  options?: { modelName?: string },
): Promise<ActionExecutionResult> {
  const parsed = agentActionSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      actionId: candidate.id,
      success: false,
      message: '动作数据验证失败，未修改任何内容。',
      errorCode: 'INVALID_ACTION',
    };
  }

  const action = parsed.data;
  const executed = await loadExecutedActionIds();
  if (executed.has(action.id)) {
    return {
      actionId: action.id,
      success: false,
      message: '该动作已经执行过，为防止重复写入，本次已取消。',
      errorCode: 'DUPLICATE_ACTION',
    };
  }

  try {
    if (action.type === 'create_reminder' && !action.datetime && !action.dueDate) {
      throw new Error('提醒缺少明确时间，不能创建');
    }

    if (action.type === 'create_project_requirement') {
      const project = await resolveProject(action);
      if (!project) throw new Error('缺少目标项目，不能添加需求');
      const updated = await addProjectRequirement(project.id, action.title);
      const created = updated.requirements[updated.requirements.length - 1];
      await markExecuted(action.id);
      return {
        actionId: action.id,
        success: true,
        createdEntityId: created?.id,
        message: `已向项目“${project.name}”添加需求。`,
      };
    }

    if (action.type === 'complete_project_requirement') {
      if (!action.projectId || !action.requirementId) {
        throw new Error('缺少项目或需求标识，不能完成需求');
      }
      const project = await getProjectById(action.projectId);
      if (!project) throw new Error('目标项目已不存在');
      const requirement = project.requirements.find(item => item.id === action.requirementId);
      if (!requirement) throw new Error('目标需求已不存在');
      if (requirement.done) throw new Error('该需求已经完成');
      await setProjectRequirementDone(project.id, requirement.id, true);
      await markExecuted(action.id);
      return {
        actionId: action.id,
        success: true,
        createdEntityId: requirement.id,
        message: `已完成需求“${requirement.title}”。`,
      };
    }

    const project = await resolveProject(action);
    const entryType = entryTypeFor(action);
    const saved = await saveOrganizedResult({
      rawText: action.description,
      source: 'text',
      modelName: options?.modelName,
      result: {
        summary: action.title,
        items: [
          {
            type: entryType,
            title: action.title,
            content: action.description,
            datetime: entryType === 'reminder' ? action.datetime ?? null : null,
            due_date: entryType === 'reminder' ? action.dueDate ?? null : null,
            priority: action.priority ?? 'normal',
            tags: action.tags ?? [],
            project: project?.name ?? action.projectName ?? null,
            confidence: action.confidence,
          },
        ],
      },
    });
    await markExecuted(action.id);
    return {
      actionId: action.id,
      success: true,
      createdEntityId: saved.entries[0]?.id,
      message: `已创建${entryType === 'todo' ? '待办' : entryType === 'reminder' ? '提醒' : entryType === 'project' ? '项目进展' : '想法'}。`,
    };
  } catch (error) {
    return {
      actionId: action.id,
      success: false,
      message: error instanceof Error ? error.message : '动作执行失败，未完成写入。',
      errorCode: 'EXECUTION_FAILED',
    };
  }
}
