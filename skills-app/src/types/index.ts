export interface Skill {
  id: string;
  name: string;
  description: string;
  repository: 'claude-skills' | 'superpowers' | 'anthropic-skills';
  category: string;
  categoryName: string;
  tags: string[];
  path: string;
  externalUrl?: string;
  isLocal: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  skillCount: number;
  repository: 'claude-skills' | 'superpowers' | 'anthropic-skills';
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  isLocal: boolean;
  skillCount: number;
}

export type FilterType = 'all' | 'local' | 'external';
