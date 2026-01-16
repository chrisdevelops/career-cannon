/**
 * Cover Letter Generation Service
 * 
 * Generates personalized cover letters by:
 * 1. Understanding the job requirements and company
 * 2. Selecting compelling evidence from the KB
 * 3. Maintaining the user's authentic voice
 * 
 * Cover letters prioritize:
 * - User's custom prompt/instructions (if provided)
 * - Voice blueprint for authentic tone
 * - Specific evidence from achievements
 */

import { getOpenAIProvider } from './openai-provider.js';
import { getPromptText } from './prompts.js';
import type { KBContext, GenerationRequest, GeneratedCoverLetter, ChatMessage } from './types.js';

/**
 * Build voice instructions for cover letter (similar to resume but with different emphasis).
 */
function buildVoiceInstructions(voice: KBContext['voiceBlueprint']): string {
  if (!voice) return '';

  const parts: string[] = [];

  if (voice.tone) {
    parts.push(`Write with a ${voice.tone} tone`);
  }
  if (voice.formality) {
    parts.push(`Maintain ${voice.formality} formality`);
  }
  if (voice.audience) {
    parts.push(`Audience: ${voice.audience}`);
  }
  if (voice.pointOfView) {
    parts.push(`Point of view: ${voice.pointOfView}`);
  }
  if (voice.energy) {
    parts.push(`Energy level: ${voice.energy}`);
  }
  if (voice.confidence) {
    parts.push(`Confidence level: ${voice.confidence}`);
  }
  if (voice.pacing) {
    parts.push(`Pacing: ${voice.pacing}`);
  }
  if (voice.structureStyle) {
    parts.push(`Structure style: ${voice.structureStyle}`);
  }
  if (voice.emphasis) {
    parts.push(`Emphasis: ${voice.emphasis}`);
  }
  if (voice.sentenceLength) {
    parts.push(`Use ${voice.sentenceLength} sentences`);
  }
  if (voice.vocabularyNotes) {
    parts.push(`Vocabulary guidance: ${voice.vocabularyNotes}`);
  }
  if (voice.grammarNotes) {
    parts.push(`Grammar notes: ${voice.grammarNotes}`);
  }
  if (voice.punctuationStyle) {
    parts.push(`Punctuation style: ${voice.punctuationStyle}`);
  }
  if (voice.preferredVerbs && voice.preferredVerbs.length > 0) {
    parts.push(`Preferred verbs: ${voice.preferredVerbs.join(', ')}`);
  }
  if (voice.preferredPhrases && voice.preferredPhrases.length > 0) {
    parts.push(`Preferred phrases: ${voice.preferredPhrases.join(', ')}`);
  }
  if (voice.bannedPhrases && voice.bannedPhrases.length > 0) {
    parts.push(`Banned phrases: ${voice.bannedPhrases.join(', ')}`);
  }
  if (voice.avoid && voice.avoid.length > 0) {
    parts.push(`Avoid these words/phrases: ${voice.avoid.join(', ')}`);
  }
  if (voice.customPrompt) {
    parts.push(`Special instructions: ${voice.customPrompt}`);
  }
  if (voice.samples && voice.samples.length > 0) {
    parts.push(`Match the style of these writing samples:\n${voice.samples.map((s, i) => `Sample ${i + 1}: "${s}"`).join('\n')}`);
  }
  if (voice.samplePairs && voice.samplePairs.length > 0) {
    parts.push(`Prompted samples:\n${voice.samplePairs.map((p) => `Prompt: "${p.prompt}"\nResponse: "${p.response}"`).join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\nVOICE & STYLE (CRITICAL - match the candidate's authentic voice):\n${parts.join('\n')}`;
}

/**
 * Format relevant KB context for cover letter generation.
 * Cover letters need less detail but more narrative context.
 */
function formatKBForCoverLetter(kb: KBContext): string {
  const sections: string[] = [];

  // Profile summary
  if (kb.profile) {
    sections.push(`CANDIDATE: ${kb.profile.name}
${kb.profile.summary ? `Background: ${kb.profile.summary}` : ''}`);
  }

  // Top achievements (prioritize those with metrics)
  const achievementsWithMetrics = kb.roles
    .flatMap((r) => r.achievements.map((a) => ({ ...a, company: r.company, title: r.title })))
    .filter((a) => a.metrics)
    .slice(0, 5);

  const otherAchievements = kb.roles
    .flatMap((r) => r.achievements.map((a) => ({ ...a, company: r.company, title: r.title })))
    .filter((a) => !a.metrics)
    .slice(0, 3);

  const allAchievements = [...achievementsWithMetrics, ...otherAchievements];

  if (allAchievements.length > 0) {
    const achievementText = allAchievements.map((a) =>
      `- At ${a.company} as ${a.title}: ${a.action} → ${a.outcome}${a.metrics ? ` (${a.metrics})` : ''}`
    ).join('\n');
    sections.push(`KEY ACHIEVEMENTS:\n${achievementText}`);
  }

  // Recent roles
  const recentRoles = kb.roles.slice(0, 3);
  if (recentRoles.length > 0) {
    const rolesText = recentRoles.map((r) =>
      `- ${r.title} at ${r.company}${r.current ? ' (current)' : ''}`
    ).join('\n');
    sections.push(`RECENT EXPERIENCE:\n${rolesText}`);
  }

  // Top skills
  if (kb.skills.length > 0) {
    const topSkills = kb.skills
      .filter((s) => s.proficiency === 'expert' || s.proficiency === 'advanced')
      .slice(0, 10);
    if (topSkills.length > 0) {
      sections.push(`TOP SKILLS: ${topSkills.map((s) => s.name).join(', ')}`);
    }
  }

  // Notable projects
  if (kb.projects.length > 0) {
    const projectText = kb.projects.slice(0, 3).map((p) =>
      `- ${p.name}: ${p.description || 'No description'}`
    ).join('\n');
    sections.push(`NOTABLE PROJECTS:\n${projectText}`);
  }

  return sections.join('\n\n');
}

/**
 * Build the system prompt for cover letter generation.
 */
function buildSystemPromptTemplate(): string {
  return `You are an expert cover letter writer. Your task is to create a compelling, personalized cover letter.

COVER LETTER REQUIREMENTS:
1. Length: 3-4 paragraphs (roughly 250-400 words)
2. Tone: Professional but personable - this should sound like a real person, not a template
3. Structure:
   - Opening: Hook + why this specific role/company
   - Body (1-2 paragraphs): Specific evidence of relevant accomplishments
   - Closing: Clear call to action + enthusiasm
4. CRITICAL: Use specific examples and metrics from the candidate's background
5. NEVER fabricate information - only use provided facts
6. Address the company's needs, not just the candidate's qualifications
7. Show genuine interest in THIS specific role, not just any job

WHAT TO AVOID:
- Generic phrases like "I am writing to apply for..."
- Restating the resume - this should add narrative
- Humble bragging or excessive self-promotion
- Desperation or over-eagerness
- Clichés like "passionate" or "team player" without evidence

OUTPUT FORMAT:
Return ONLY the cover letter content in Markdown format. Do not include meta-commentary.
The letter should be ready to send (no placeholders like [DATE] or [HIRING MANAGER]).

[Voice Instructions Injected Here]`;
}

function applyCoverLetterTemplate(template: string, voiceInstructions: string): string {
  return template.replace('[Voice Instructions Injected Here]', voiceInstructions || '');
}

/**
 * Generate a tailored cover letter.
 */
export async function generateCoverLetter(request: GenerationRequest): Promise<GeneratedCoverLetter> {
  const provider = getOpenAIProvider();

  if (!(await provider.isConfiguredAsync())) {
    throw new Error('AI provider is not configured');
  }

  const voiceInstructions = buildVoiceInstructions(request.kbContext.voiceBlueprint);
  const defaultTemplate = buildSystemPromptTemplate();
  const overrideTemplate = await getPromptText('cover-letter-generator');
  const systemPrompt = applyCoverLetterTemplate(
    overrideTemplate || defaultTemplate,
    voiceInstructions
  );
  const kbContext = formatKBForCoverLetter(request.kbContext);

  // User prompt gets priority in cover letters
  const userGuidance = request.userPrompt
    ? `\nUSER'S SPECIFIC INSTRUCTIONS (PRIORITIZE THESE):\n${request.userPrompt}\n`
    : '';

  const userPrompt = `Write a cover letter for the following position:

COMPANY: ${request.company}
POSITION: ${request.position}
${userGuidance}
JOB DESCRIPTION:
${request.jobDescription}

CANDIDATE'S BACKGROUND:
${kbContext}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // Use slightly higher temperature for more natural, varied writing
  const result = await provider.complete(messages, {
    temperature: 0.8,
    maxTokens: 2048,
  });

  return {
    content: result.content,
  };
}

/**
 * Generate cover letter with streaming output.
 */
export async function generateCoverLetterStream(
  request: GenerationRequest,
  onChunk: (chunk: string) => void
): Promise<GeneratedCoverLetter> {
  const provider = getOpenAIProvider();

  if (!(await provider.isConfiguredAsync())) {
    throw new Error('AI provider is not configured');
  }

  if (!provider.completeStream) {
    return generateCoverLetter(request);
  }

  const voiceInstructions = buildVoiceInstructions(request.kbContext.voiceBlueprint);
  const defaultTemplate = buildSystemPromptTemplate();
  const overrideTemplate = await getPromptText('cover-letter-generator');
  const systemPrompt = applyCoverLetterTemplate(
    overrideTemplate || defaultTemplate,
    voiceInstructions
  );
  const kbContext = formatKBForCoverLetter(request.kbContext);

  const userGuidance = request.userPrompt
    ? `\nUSER'S SPECIFIC INSTRUCTIONS (PRIORITIZE THESE):\n${request.userPrompt}\n`
    : '';

  const userPrompt = `Write a cover letter for the following position:

COMPANY: ${request.company}
POSITION: ${request.position}
${userGuidance}
JOB DESCRIPTION:
${request.jobDescription}

CANDIDATE'S BACKGROUND:
${kbContext}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const result = await provider.completeStream(messages, {
    temperature: 0.8,
    maxTokens: 2048,
    onChunk,
  });

  return {
    content: result.content,
  };
}
