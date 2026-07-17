export type ProjectRequirement = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  description?: string | null;
  requirements: ProjectRequirement[];
  createdAt: string;
  updatedAt: string;
};
