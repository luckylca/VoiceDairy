export type ConfigurableCategoryType = 'idea' | 'todo' | 'project' | 'reminder';

export type CategorySetting = {
  type: ConfigurableCategoryType;
  label: string;
  description: string;
  icon: string;
  requiresTime: boolean;
};

export const DEFAULT_CATEGORY_SETTINGS: CategorySetting[] = [
  {
    type: 'idea',
    label: '想法',
    description: '灵感、观点和值得保留的思考。',
    icon: 'lightbulb-outline',
    requiresTime: false,
  },
  {
    type: 'todo',
    label: '待办',
    description: '没有指定时间、之后需要完成的事项。',
    icon: 'checkbox-marked-circle-outline',
    requiresTime: false,
  },
  {
    type: 'project',
    label: '项目进度',
    description: '项目状态、阶段成果和下一步计划。',
    icon: 'folder-outline',
    requiresTime: false,
  },
  {
    type: 'reminder',
    label: '提醒',
    description: '包含明确日期或时间，需要按时处理的事项。',
    icon: 'bell-outline',
    requiresTime: true,
  },
];

export function normalizeCategorySettings(value: unknown): CategorySetting[] {
  const supplied = Array.isArray(value) ? value : [];

  return DEFAULT_CATEGORY_SETTINGS.map(defaultCategory => {
    const saved = supplied.find(
      candidate =>
        candidate &&
        typeof candidate === 'object' &&
        'type' in candidate &&
        candidate.type === defaultCategory.type,
    ) as Partial<CategorySetting> | undefined;

    return {
      ...defaultCategory,
      label:
        typeof saved?.label === 'string' && saved.label.trim()
          ? saved.label.trim()
          : defaultCategory.label,
      description:
        typeof saved?.description === 'string' && saved.description.trim()
          ? saved.description.trim()
          : defaultCategory.description,
    };
  });
}

export function getCategorySetting(
  settings: CategorySetting[],
  type: ConfigurableCategoryType,
): CategorySetting {
  return settings.find(item => item.type === type) ?? DEFAULT_CATEGORY_SETTINGS.find(item => item.type === type)!;
}
