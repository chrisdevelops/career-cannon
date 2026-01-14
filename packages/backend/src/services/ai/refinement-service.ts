/**
 * Refinement Service
 * 
 * Handles iterative chat-based refinement of generated resumes and cover letters.
 * Maintains conversation context to allow natural back-and-forth editing.
 */

import { getOpenAIProvider } from './openai-provider.js';
import type { RefinementRequest, RefinementResult, ChatMessage, KBContext } from './types.js';

/**
 * Format KB context as a brief reference for the AI.
 */
function formatKBReference(kb: KBContext): string {
  const parts: string[] = [];

  if (kb.profile?.name) {
    parts.push(`Candidate: ${kb.profile.name}`);
  }

  if (kb.roles.length > 0) {
    const rolesList = kb.roles
      .slice(0, 5)
      .map((r) => `${r.title} at ${r.company}`)
      .join(', ');
    parts.push(`Roles: ${rolesList}`);
  }

  if (kb.skills.length > 0) {
    const skillsList = kb.skills.slice(0, 10).map((s) => s.name).join(', ');
    parts.push(`Skills: ${skillsList}`);
  }

  return parts.join('\n');
}

/**
 * Build the system prompt for refinement.
 */
function buildRefinementSystemPrompt(type: 'resume' | 'cover_letter', kbReference: string): string {
  const docType = type === 'resume' ? 'resume' : 'cover letter';

  return `You are helping refine a ${docType}. You have been collaborating with the user to improve it.

YOUR ROLE:
- Make specific edits based on user requests
- Maintain consistency with the overall document
- Only use information from the candidate's knowledge base (below)
- Explain what you changed and why (briefly)

CANDIDATE'S BACKGROUND (use ONLY this information):
${kbReference}

GUIDELINES:
1. When the user asks to add something, integrate it naturally
2. When the user asks to remove something, remove it cleanly
3. When the user asks to rephrase, keep the same information but change the wording
4. When the user asks for suggestions, offer 2-3 specific options
5. Preserve formatting and structure unless asked to change it
6. NEVER fabricate information not in the knowledge base

OUTPUT FORMAT:
First, briefly explain what you changed (1-2 sentences).
Then output the complete updated ${docType} in Markdown format.

Format your response as:
**Changes:** [Brief explanation]

---

[Complete updated ${docType}]`;
}

/**
 * Refine a resume or cover letter based on user feedback.
 */
export async function refineGeneration(request: RefinementRequest): Promise<RefinementResult> {
  const provider = getOpenAIProvider();

  if (!provider.isConfigured()) {
    throw new Error('AI provider is not configured');
  }

  const kbReference = formatKBReference(request.kbContext);
  const systemPrompt = buildRefinementSystemPrompt(request.type, kbReference);

  // Build message history
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add the current document as the first context
  messages.push({
    role: 'assistant',
    content: `Here is the current ${request.type === 'resume' ? 'resume' : 'cover letter'}:\n\n${request.currentContent}`,
  });

  // Add chat history
  for (const msg of request.chatHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push(msg);
    }
  }

  // Add the new user message
  messages.push({
    role: 'user',
    content: request.userMessage,
  });

  const result = await provider.complete(messages, {
    temperature: 0.7,
    maxTokens: 4096,
  });

  // Parse the response to separate explanation from content
  const { explanation, content } = parseRefinementResponse(result.content, request.currentContent);

  return {
    content,
    explanation,
  };
}

/**
 * Parse the AI response to extract the explanation and updated content.
 */
function parseRefinementResponse(
  response: string,
  fallbackContent: string
): { explanation: string; content: string } {
  // Try to find the "Changes:" section
  const changesMatch = response.match(/\*\*Changes:\*\*\s*(.+?)(?=\n---|\n\n#|\n#)/s);
  const explanation = changesMatch?.[1]?.trim() || '';

  // Find the content after the separator
  const separatorIndex = response.indexOf('---');
  if (separatorIndex !== -1) {
    const content = response.slice(separatorIndex + 3).trim();
    if (content.length > 100) {
      // Reasonable content length
      return { explanation, content };
    }
  }

  // Fallback: try to find markdown content starting with #
  const markdownMatch = response.match(/(^#.+)/ms);
  if (markdownMatch) {
    return { explanation, content: markdownMatch[1].trim() };
  }

  // Last resort: return the whole response as content
  if (response.length > 100) {
    return { explanation: '', content: response };
  }

  // If all else fails, return the original content
  return { explanation: 'No changes made', content: fallbackContent };
}

/**
 * Refine with streaming output.
 */
export async function refineGenerationStream(
  request: RefinementRequest,
  onChunk: (chunk: string) => void
): Promise<RefinementResult> {
  const provider = getOpenAIProvider();

  if (!provider.isConfigured()) {
    throw new Error('AI provider is not configured');
  }

  if (!provider.completeStream) {
    return refineGeneration(request);
  }

  const kbReference = formatKBReference(request.kbContext);
  const systemPrompt = buildRefinementSystemPrompt(request.type, kbReference);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'assistant',
      content: `Here is the current ${request.type === 'resume' ? 'resume' : 'cover letter'}:\n\n${request.currentContent}`,
    },
    ...request.chatHistory.filter((m) => m.role === 'user' || m.role === 'assistant'),
    { role: 'user', content: request.userMessage },
  ];

  const result = await provider.completeStream(messages, {
    temperature: 0.7,
    maxTokens: 4096,
    onChunk,
  });

  const { explanation, content } = parseRefinementResponse(result.content, request.currentContent);

  return {
    content,
    explanation,
  };
}

/**
 * Generate suggestions for improving a resume or cover letter.
 */
export async function generateSuggestions(
  content: string,
  type: 'resume' | 'cover_letter',
  kb: KBContext
): Promise<string[]> {
  const provider = getOpenAIProvider();

  if (!provider.isConfigured()) {
    throw new Error('AI provider is not configured');
  }

  const docType = type === 'resume' ? 'resume' : 'cover letter';
  const kbReference = formatKBReference(kb);

  const systemPrompt = `You are a career coach reviewing a ${docType}. Provide 3-5 specific, actionable suggestions for improvement.

CANDIDATE'S BACKGROUND:
${kbReference}

FORMAT YOUR RESPONSE AS A JSON ARRAY OF STRINGS:
["suggestion 1", "suggestion 2", "suggestion 3"]

FOCUS ON:
- Missing relevant experience that could be added
- Achievements that could use more quantification
- Sections that could be more impactful
- Formatting or structure improvements
- Ways to better target the role (if job description context is present)

DO NOT suggest:
- Adding information not in the knowledge base
- Generic advice that could apply to anyone
- Major structural overhauls`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Review this ${docType} and suggest improvements:\n\n${content}`,
    },
  ];

  const result = await provider.complete(messages, {
    temperature: 0.7,
    maxTokens: 1024,
  });

  try {
    // Try to parse as JSON array
    const suggestions = JSON.parse(result.content);
    if (Array.isArray(suggestions)) {
      return suggestions.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // If not valid JSON, try to extract bullet points
    const lines = result.content.split('\n').filter((line) => line.trim());
    return lines
      .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter((line) => line.length > 10 && line.length < 500);
  }

  return [];
}
