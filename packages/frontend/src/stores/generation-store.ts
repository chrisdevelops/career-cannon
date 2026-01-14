/**
 * Generation Store
 * 
 * Zustand store for managing generation state:
 * - Active generation session
 * - Version history
 * - Chat refinement context
 */

import { create } from 'zustand';
import type { ChatMessage, GenerationVersion } from '@/lib/api';

export type GenerationType = 'resume' | 'cover_letter';
export type GenerationStatus = 'idle' | 'generating' | 'refining' | 'error';

interface GenerationInput {
  company: string;
  position: string;
  jobDescription: string;
  temperature: number;
  userPrompt: string;
}

interface GenerationSession {
  id: string | null; // null if not yet persisted
  type: GenerationType;
  input: GenerationInput;
  currentContent: string;
  versions: GenerationVersion[];
  currentVersionIndex: number;
  chatHistory: ChatMessage[];
  status: GenerationStatus;
  error: string | null;
}

interface GenerationState {
  // Current session
  session: GenerationSession | null;
  
  // Actions
  startNewSession: (type: GenerationType) => void;
  updateInput: (input: Partial<GenerationInput>) => void;
  setContent: (content: string) => void;
  addVersion: (version: GenerationVersion) => void;
  selectVersion: (index: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setStatus: (status: GenerationStatus, error?: string) => void;
  setSessionId: (id: string) => void;
  resetSession: () => void;
}

const defaultInput: GenerationInput = {
  company: '',
  position: '',
  jobDescription: '',
  temperature: 0.8,
  userPrompt: '',
};

export const useGenerationStore = create<GenerationState>((set, get) => ({
  session: null,

  startNewSession: (type) => {
    set({
      session: {
        id: null,
        type,
        input: { ...defaultInput },
        currentContent: '',
        versions: [],
        currentVersionIndex: -1,
        chatHistory: [],
        status: 'idle',
        error: null,
      },
    });
  },

  updateInput: (input) => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        input: { ...session.input, ...input },
      },
    });
  },

  setContent: (content) => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        currentContent: content,
      },
    });
  },

  addVersion: (version) => {
    const { session } = get();
    if (!session) return;
    
    const versions = [...session.versions, version];
    set({
      session: {
        ...session,
        versions,
        currentVersionIndex: versions.length - 1,
        currentContent: version.content,
      },
    });
  },

  selectVersion: (index) => {
    const { session } = get();
    if (!session || index < 0 || index >= session.versions.length) return;
    
    const version = session.versions[index];
    set({
      session: {
        ...session,
        currentVersionIndex: index,
        currentContent: version.content,
        chatHistory: version.chatContext || [],
      },
    });
  },

  addChatMessage: (message) => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        chatHistory: [...session.chatHistory, message],
      },
    });
  },

  clearChat: () => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        chatHistory: [],
      },
    });
  },

  setStatus: (status, error) => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        status,
        error: error || null,
      },
    });
  },

  setSessionId: (id) => {
    const { session } = get();
    if (!session) return;
    
    set({
      session: {
        ...session,
        id,
      },
    });
  },

  resetSession: () => {
    set({ session: null });
  },
}));

// Selector hooks for convenience
export const useGenerationSession = () => useGenerationStore((s) => s.session);
export const useGenerationInput = () => useGenerationStore((s) => s.session?.input);
export const useGenerationContent = () => useGenerationStore((s) => s.session?.currentContent);
export const useGenerationStatus = () => useGenerationStore((s) => s.session?.status);
export const useGenerationVersions = () => useGenerationStore((s) => s.session?.versions);
export const useGenerationChat = () => useGenerationStore((s) => s.session?.chatHistory);
