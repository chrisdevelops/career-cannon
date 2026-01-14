/**
 * API Client
 * 
 * Typed fetch wrapper for backend communication.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiRequestError(data.error.code, data.error.message, data.error.details);
    }

    return data.data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiRequestError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.details = details;
  }
}

export const api = new ApiClient();

// =============================================================================
// API Types
// =============================================================================

// Profile
export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Role
export interface Role {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  experienceItems?: ExperienceItem[];
  achievements?: Achievement[];
}

export interface ExperienceItem {
  id: string;
  roleId: string;
  content: string;
  type: 'responsibility' | 'initiative' | 'contribution';
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  roleId?: string | null;
  problem: string;
  action: string;
  outcome: string;
  metrics?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Skill
export interface Skill {
  id: string;
  name: string;
  category?: 'technical' | 'soft' | 'tool' | 'language' | null;
  proficiency?: 'expert' | 'advanced' | 'intermediate' | 'beginner' | null;
  evidence?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  learnings?: string | null;
  technologies?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// Education
export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
  honors?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Voice Blueprint
export interface VoiceBlueprint {
  id: string;
  tone?: string | null;
  formality?: string | null;
  vocabularyNotes?: string | null;
  sentenceLength?: string | null;
  avoid?: string[] | null;
  samples?: string[] | null;
  customPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Generation
export interface Generation {
  id: string;
  company: string;
  position: string;
  jobDescription: string;
  temperature: number;
  createdAt: string;
  updatedAt: string;
  versions?: GenerationVersion[];
}

export interface GenerationVersion {
  id: string;
  generationId: string;
  type: 'resume' | 'cover_letter';
  content: string;
  chatContext?: ChatMessage[] | null;
  version: number;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// AI Responses
export interface AiStatus {
  provider: string;
  configured: boolean;
}

export interface GeneratedResume {
  content: string;
  selectedItems: {
    roleIds: string[];
    skillIds: string[];
    projectIds: string[];
    educationIds: string[];
  };
}

export interface GeneratedCoverLetter {
  content: string;
}

export interface RefinementResult {
  content: string;
  explanation?: string;
}

export interface SuggestionsResult {
  suggestions: string[];
}

// =============================================================================
// API Methods
// =============================================================================

export const profileApi = {
  get: () => api.get<Profile | null>('/profile'),
  create: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<Profile>('/profile', data),
  update: (data: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Profile>('/profile', data),
  delete: () => api.delete<{ deleted: boolean }>('/profile'),
};

export const rolesApi = {
  list: () => api.get<Role[]>('/roles'),
  get: (id: string) => api.get<Role>(`/roles/${id}`),
  create: (data: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'experienceItems' | 'achievements'>) =>
    api.post<Role>('/roles', data),
  update: (id: string, data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Role>(`/roles/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/roles/${id}`),
};

export const experienceItemsApi = {
  list: (roleId?: string) => api.get<ExperienceItem[]>(`/experience-items${roleId ? `?roleId=${roleId}` : ''}`),
  get: (id: string) => api.get<ExperienceItem>(`/experience-items/${id}`),
  create: (data: Omit<ExperienceItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<ExperienceItem>('/experience-items', data),
  update: (id: string, data: Partial<Omit<ExperienceItem, 'id' | 'roleId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<ExperienceItem>(`/experience-items/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/experience-items/${id}`),
};

export const achievementsApi = {
  list: (roleId?: string) => api.get<Achievement[]>(`/achievements${roleId ? `?roleId=${roleId}` : ''}`),
  get: (id: string) => api.get<Achievement>(`/achievements/${id}`),
  create: (data: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Achievement>('/achievements', data),
  update: (id: string, data: Partial<Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Achievement>(`/achievements/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/achievements/${id}`),
};

export const skillsApi = {
  list: () => api.get<Skill[]>('/skills'),
  get: (id: string) => api.get<Skill>(`/skills/${id}`),
  create: (data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Skill>('/skills', data),
  update: (id: string, data: Partial<Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Skill>(`/skills/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/skills/${id}`),
};

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/projects/${id}`),
};

export const educationApi = {
  list: () => api.get<Education[]>('/education'),
  get: (id: string) => api.get<Education>(`/education/${id}`),
  create: (data: Omit<Education, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Education>('/education', data),
  update: (id: string, data: Partial<Omit<Education, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Education>(`/education/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/education/${id}`),
};

export const voiceBlueprintApi = {
  get: () => api.get<VoiceBlueprint | null>('/voice-blueprint'),
  update: (data: Partial<Omit<VoiceBlueprint, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<VoiceBlueprint>('/voice-blueprint', data),
  delete: () => api.delete<{ deleted: boolean }>('/voice-blueprint'),
};

export const aiApi = {
  status: () => api.get<AiStatus>('/ai/status'),
  
  generateResume: (data: {
    jobDescription: string;
    company: string;
    position: string;
    temperature?: number;
    userPrompt?: string;
  }) => api.post<GeneratedResume>('/ai/generate-resume', data),

  generateCoverLetter: (data: {
    jobDescription: string;
    company: string;
    position: string;
    temperature?: number;
    userPrompt?: string;
  }) => api.post<GeneratedCoverLetter>('/ai/generate-cover-letter', data),

  refine: (data: {
    currentContent: string;
    chatHistory: ChatMessage[];
    userMessage: string;
    type: 'resume' | 'cover_letter';
  }) => api.post<RefinementResult>('/ai/refine', data),

  suggestions: (data: {
    content: string;
    type: 'resume' | 'cover_letter';
  }) => api.post<SuggestionsResult>('/ai/suggestions', data),
};

export const generationsApi = {
  list: () => api.get<Generation[]>('/generations'),
  get: (id: string) => api.get<Generation>(`/generations/${id}`),
  create: (data: {
    company: string;
    position: string;
    jobDescription: string;
    temperature: number;
  }) => api.post<Generation>('/generations', data),
  
  addVersion: (generationId: string, data: {
    type: 'resume' | 'cover_letter';
    content: string;
    chatContext?: ChatMessage[];
  }) => api.post<GenerationVersion>(`/generations/${generationId}/versions`, data),
  
  getVersions: (generationId: string) => 
    api.get<GenerationVersion[]>(`/generations/${generationId}/versions`),
};
