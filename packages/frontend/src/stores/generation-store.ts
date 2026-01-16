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
  loadSession: (payload: {
    id: string;
    type: GenerationType;
    input: GenerationInput;
    versions: GenerationVersion[];
    currentVersionIndex: number;
    currentContent: string;
    chatHistory: ChatMessage[];
  }) => void;
  setVersions: (versions: GenerationVersion[], currentIndex?: number) => void;
  upsertDraft: (draft: GenerationVersion) => void;
  replaceDraftWithVersion: (draftId: string, version: GenerationVersion) => void;
  removeDraft: (draftId: string, baseVersionId?: string | null) => void;
  updateVersionMeta: (versionId: string, data: Partial<GenerationVersion>) => void;
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

const sortVersions = (versions: GenerationVersion[]) => {
  return [...versions].sort((a, b) => {
    if (a.version !== b.version) return a.version - b.version;
    if (a.isDraft && !b.isDraft) return 1;
    if (!a.isDraft && b.isDraft) return -1;
    const aTime = a.updatedAt || a.createdAt;
    const bTime = b.updatedAt || b.createdAt;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });
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

  loadSession: (payload) => {
    const sorted = sortVersions(payload.versions);
    const currentIndex = payload.currentVersionIndex >= 0
      ? payload.currentVersionIndex
      : sorted.length - 1;

    set({
      session: {
        id: payload.id,
        type: payload.type,
        input: payload.input,
        currentContent: payload.currentContent,
        versions: sorted,
        currentVersionIndex: currentIndex,
        chatHistory: payload.chatHistory,
        status: 'idle',
        error: null,
      },
    });
  },

  setVersions: (versions, currentIndex) => {
    const { session } = get();
    if (!session) return;
    const sorted = sortVersions(versions);
    const nextIndex = currentIndex !== undefined
      ? currentIndex
      : Math.min(session.currentVersionIndex, sorted.length - 1);
    set({
      session: {
        ...session,
        versions: sorted,
        currentVersionIndex: nextIndex,
      },
    });
  },

  upsertDraft: (draft) => {
    const { session } = get();
    if (!session) return;
    const withoutDraft = session.versions.filter((v) => v.id !== draft.id);
    const sorted = sortVersions([...withoutDraft, draft]);
    const draftIndex = sorted.findIndex((v) => v.id === draft.id);
    set({
      session: {
        ...session,
        versions: sorted,
        currentVersionIndex: draftIndex,
        currentContent: draft.content,
        chatHistory: draft.chatContext || [],
      },
    });
  },

  replaceDraftWithVersion: (draftId, version) => {
    const { session } = get();
    if (!session) return;
    const filtered = session.versions.filter((v) => v.id !== draftId);
    const sorted = sortVersions([...filtered, version]);
    const versionIndex = sorted.findIndex((v) => v.id === version.id);
    set({
      session: {
        ...session,
        versions: sorted,
        currentVersionIndex: versionIndex,
        currentContent: version.content,
        chatHistory: version.chatContext || [],
      },
    });
  },

  removeDraft: (draftId, baseVersionId) => {
    const { session } = get();
    if (!session) return;
    const filtered = session.versions.filter((v) => v.id !== draftId);
    const baseIndex = baseVersionId
      ? filtered.findIndex((v) => v.id === baseVersionId)
      : -1;
    const nextIndex = baseIndex >= 0
      ? baseIndex
      : Math.min(session.currentVersionIndex, filtered.length - 1);
    const nextVersion = filtered[nextIndex];
    set({
      session: {
        ...session,
        versions: filtered,
        currentVersionIndex: nextIndex,
        currentContent: nextVersion?.content || '',
        chatHistory: nextVersion?.chatContext || [],
      },
    });
  },

  updateVersionMeta: (versionId, data) => {
    const { session } = get();
    if (!session) return;
    const updated = session.versions.map((version) => {
      if (version.id === versionId || version.baseVersionId === versionId) {
        return { ...version, ...data };
      }
      return version;
    });
    const sorted = sortVersions(updated);
    const current = sorted[session.currentVersionIndex];
    set({
      session: {
        ...session,
        versions: sorted,
        currentContent: current?.content || session.currentContent,
        chatHistory: current?.chatContext || session.chatHistory,
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

    const sorted = sortVersions([...session.versions, version]);
    const nextIndex = sorted.findIndex((v) => v.id === version.id);
    set({
      session: {
        ...session,
        versions: sorted,
        currentVersionIndex: nextIndex,
        currentContent: version.content,
        chatHistory: version.chatContext || [],
      },
    });
  },

  selectVersion: (index) => {
    const { session } = get();
    if (!session || index < 0 || index >= session.versions.length) return;
    if (session.currentVersionIndex === index) return;

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
