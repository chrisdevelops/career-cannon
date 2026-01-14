/**
 * AI Provider abstraction layer
 * Allows swapping between OpenAI, Anthropic, local LLMs, etc.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /**
   * If provided, the AI will return structured JSON matching this schema.
   * Provider implementations should use their native structured output features.
   */
  responseSchema?: {
    name: string;
    description?: string;
    schema: Record<string, unknown>;
  };
}

export interface CompletionResult {
  content: string;
  /**
   * Parsed JSON if responseSchema was provided
   */
  parsed?: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamCompletionOptions extends CompletionOptions {
  onChunk?: (chunk: string) => void;
}

export interface AIProvider {
  readonly name: string;

  /**
   * Generate a completion from a list of messages
   */
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;

  /**
   * Generate a streaming completion
   */
  completeStream?(
    messages: ChatMessage[],
    options?: StreamCompletionOptions
  ): Promise<CompletionResult>;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;
}

/**
 * Knowledge Base types for AI context
 */
export interface KBContext {
  profile: {
    name: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin?: string | null;
    github?: string | null;
    website?: string | null;
    summary?: string | null;
  } | null;

  roles: Array<{
    id: string;
    company: string;
    title: string;
    startDate: Date;
    endDate?: Date | null;
    current: boolean;
    description?: string | null;
    experienceItems: Array<{
      id: string;
      content: string;
      type: string;
    }>;
    achievements: Array<{
      id: string;
      problem: string;
      action: string;
      outcome: string;
      metrics?: string | null;
    }>;
  }>;

  skills: Array<{
    id: string;
    name: string;
    category?: string | null;
    proficiency?: string | null;
  }>;

  projects: Array<{
    id: string;
    name: string;
    description?: string | null;
    url?: string | null;
    learnings?: string | null;
    technologies?: string[];
  }>;

  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    gpa?: string | null;
    honors?: string | null;
  }>;

  voiceBlueprint: {
    tone?: string | null;
    formality?: string | null;
    vocabularyNotes?: string | null;
    sentenceLength?: string | null;
    avoid?: string[];
    samples?: string[];
    customPrompt?: string | null;
  } | null;
}

/**
 * Parsed resume item from AI extraction
 */
export interface ParsedResumeRole {
  company: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  description?: string | null;
}

export interface ParsedResumeExperienceItem {
  roleIndex: number; // Reference to which role this belongs to
  content: string;
  type: 'responsibility' | 'initiative' | 'contribution';
}

export interface ParsedResumeAchievement {
  roleIndex?: number | null; // Optional reference to role
  problem: string;
  action: string;
  outcome: string;
  metrics?: string | null;
}

export interface ParsedResumeSkill {
  name: string;
  category?: 'technical' | 'soft' | 'tool' | 'language' | null;
  proficiency?: 'expert' | 'advanced' | 'intermediate' | 'beginner' | null;
}

export interface ParsedResumeEducation {
  institution: string;
  degree: string;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
  honors?: string | null;
}

export interface ParsedResumeProject {
  name: string;
  description?: string | null;
  url?: string | null;
  technologies?: string[];
}

export interface ParsedResume {
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    summary?: string;
  };
  roles: ParsedResumeRole[];
  experienceItems: ParsedResumeExperienceItem[];
  achievements: ParsedResumeAchievement[];
  skills: ParsedResumeSkill[];
  education: ParsedResumeEducation[];
  projects: ParsedResumeProject[];
}

/**
 * Generation request/response types
 */
export interface GenerationRequest {
  jobDescription: string;
  company: string;
  position: string;
  temperature: number; // 0-1, how tightly to map to JD
  userPrompt?: string;
  kbContext: KBContext;
}

export interface GeneratedResume {
  content: string; // Markdown formatted resume
  selectedItems: {
    roleIds: string[];
    skillIds: string[];
    projectIds: string[];
    educationIds: string[];
  };
}

export interface GeneratedCoverLetter {
  content: string; // Markdown formatted cover letter
}

export interface RefinementRequest {
  currentContent: string;
  chatHistory: ChatMessage[];
  userMessage: string;
  type: 'resume' | 'cover_letter';
  kbContext: KBContext;
}

export interface RefinementResult {
  content: string;
  explanation?: string;
}
