import type { ProjectItem } from '../../types/project';

export const DEFAULT_SYSTEM_PROMPT = `你是一个个人知识管理和任务整理助手。

用户会输入一段由语音识别得到的中文文本。文本可能口语化、不完整、有错别字，也可能同时包含想法、待办、项目进度和提醒。

你的任务是：
1. 理解用户真正想表达的内容；
2. 将内容拆分为多个结构化条目；
3. 只使用 idea、todo、project、reminder 四种类型；
4. idea 表示灵感、观点和思考；
5. todo 表示没有明确执行时间、之后需要完成的事项，datetime 和 due_date 必须为 null；
6. project 表示项目进度、阶段成果、风险或下一步计划；
7. reminder 表示包含明确日期或时间、需要按时处理的事项，并尽量填写 datetime；
8. 如果提醒时间不完整，请保留原始表达，不要胡乱编造；
9. 可以修正常见语音识别错误，但不能改变事实；
10. 如果输入提到已有项目，必须优先使用下方项目清单中的真实项目名称；
11. 输出严格 JSON，不要输出 Markdown 或解释文字。

当前日期时间是：{{current_datetime}}
用户所在时区是：{{timezone}}

请输出以下 JSON 格式：
{
  "summary": "一句话总结",
  "items": [
    {
      "type": "idea | todo | project | reminder",
      "title": "简短标题",
      "content": "完整内容",
      "datetime": "提醒的 ISO8601 时间，其他类型为 null",
      "due_date": "提醒日期 YYYY-MM-DD，其他类型为 null",
      "priority": "low | normal | high",
      "tags": ["标签1", "标签2"],
      "project": "所属项目，如果没有则为 null",
      "confidence": 0.0
    }
  ]
}`;

function normalizePromptText(value: string | null | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n').trim();
}

export function buildProjectContext(projects: ProjectItem[]): string {
  if (projects.length === 0) {
    return '当前还没有保存任何项目。';
  }

  return projects
    .map((project, projectIndex) => {
      const lines = [
        `【项目 ${projectIndex + 1}】${normalizePromptText(project.name)}`,
        `项目 ID：${project.id}`,
        `项目说明：${normalizePromptText(project.description) || '无'}`,
        '项目需求：',
      ];

      if (project.requirements.length === 0) {
        lines.push('- 暂无需求');
      } else {
        project.requirements.forEach((requirement, requirementIndex) => {
          lines.push(
            `- 需求 ${requirementIndex + 1}：${normalizePromptText(requirement.title)}`,
            `  需求 ID：${requirement.id}`,
            `  当前状态：${requirement.done ? '已完成' : '未完成'}`,
          );
        });
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

export function buildSystemPrompt(
  template: string,
  timezone = 'Asia/Shanghai',
  projects: ProjectItem[] = [],
): string {
  const base = template
    .replace('{{current_datetime}}', new Date().toISOString())
    .replace('{{timezone}}', timezone);

  return `${base}\n\n下面是用户手机中当前保存的全部项目、项目说明、项目需求和完成状态。内容来自本地数据库，请完整参考，不要虚构项目或需求：\n\n${buildProjectContext(
    projects,
  )}`;
}

export function buildUserPrompt(text: string): string {
  return `请整理下面这段输入：\n\n${text}`;
}
