import type { ProjectItem } from '../../types/project';
import { createId } from '../../utils/id';
import { nowIso } from '../../utils/date';
import { loadSnapshot, saveSnapshot } from './Database';

export type CompletedProjectRequirement = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
};

export async function listProjects(): Promise<ProjectItem[]> {
  const snapshot = await loadSnapshot();
  return [...snapshot.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectById(projectId: string): Promise<ProjectItem | null> {
  const snapshot = await loadSnapshot();
  return snapshot.projects.find(project => project.id === projectId) ?? null;
}

export async function createProject(name: string, description?: string): Promise<ProjectItem> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('项目名称不能为空');
  }

  const now = nowIso();
  const project: ProjectItem = {
    id: createId('project'),
    name: normalizedName,
    description: description?.trim() || null,
    requirements: [],
    createdAt: now,
    updatedAt: now,
  };

  const snapshot = await loadSnapshot();
  await saveSnapshot({
    ...snapshot,
    projects: [project, ...snapshot.projects],
  });
  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const snapshot = await loadSnapshot();
  await saveSnapshot({
    ...snapshot,
    projects: snapshot.projects.filter(project => project.id !== projectId),
  });
}

export async function addProjectRequirement(projectId: string, title: string): Promise<ProjectItem> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw new Error('需求内容不能为空');
  }

  const snapshot = await loadSnapshot();
  const now = nowIso();
  let updatedProject: ProjectItem | null = null;
  const projects = snapshot.projects.map(project => {
    if (project.id !== projectId) return project;
    updatedProject = {
      ...project,
      updatedAt: now,
      requirements: [
        ...project.requirements,
        {
          id: createId('requirement'),
          title: normalizedTitle,
          done: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    return updatedProject;
  });

  if (!updatedProject) {
    throw new Error('项目不存在');
  }

  await saveSnapshot({ ...snapshot, projects });
  return updatedProject;
}

export async function setProjectRequirementDone(
  projectId: string,
  requirementId: string,
  done: boolean,
): Promise<ProjectItem> {
  const snapshot = await loadSnapshot();
  const now = nowIso();
  let updatedProject: ProjectItem | null = null;
  const projects = snapshot.projects.map(project => {
    if (project.id !== projectId) return project;
    updatedProject = {
      ...project,
      updatedAt: now,
      requirements: project.requirements.map(requirement =>
        requirement.id === requirementId
          ? { ...requirement, done, updatedAt: now }
          : requirement,
      ),
    };
    return updatedProject;
  });

  if (!updatedProject) {
    throw new Error('项目不存在');
  }

  await saveSnapshot({ ...snapshot, projects });
  return updatedProject;
}

export async function toggleProjectRequirement(projectId: string, requirementId: string): Promise<ProjectItem> {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('项目不存在');
  }
  const requirement = project.requirements.find(item => item.id === requirementId);
  if (!requirement) {
    throw new Error('项目需求不存在');
  }
  return setProjectRequirementDone(projectId, requirementId, !requirement.done);
}

export async function completeProjectRequirements(
  requirementIds: string[],
): Promise<CompletedProjectRequirement[]> {
  const requestedIds = new Set(requirementIds.map(id => id.trim()).filter(Boolean));
  if (requestedIds.size === 0) return [];

  const snapshot = await loadSnapshot();
  const now = nowIso();
  const completed: CompletedProjectRequirement[] = [];

  const projects = snapshot.projects.map(project => {
    let projectChanged = false;
    const requirements = project.requirements.map(requirement => {
      if (!requestedIds.has(requirement.id) || requirement.done) return requirement;
      projectChanged = true;
      completed.push({
        id: requirement.id,
        title: requirement.title,
        projectId: project.id,
        projectName: project.name,
      });
      return { ...requirement, done: true, updatedAt: now };
    });

    return projectChanged
      ? { ...project, requirements, updatedAt: now }
      : project;
  });

  if (completed.length > 0) {
    await saveSnapshot({ ...snapshot, projects });
  }
  return completed;
}

export async function deleteProjectRequirement(projectId: string, requirementId: string): Promise<ProjectItem> {
  const snapshot = await loadSnapshot();
  const now = nowIso();
  let updatedProject: ProjectItem | null = null;
  const projects = snapshot.projects.map(project => {
    if (project.id !== projectId) return project;
    updatedProject = {
      ...project,
      updatedAt: now,
      requirements: project.requirements.filter(requirement => requirement.id !== requirementId),
    };
    return updatedProject;
  });

  if (!updatedProject) {
    throw new Error('项目不存在');
  }

  await saveSnapshot({ ...snapshot, projects });
  return updatedProject;
}
