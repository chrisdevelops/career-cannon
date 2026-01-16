/**
 * Resume Generation Service
 * 
 * Generates tailored resumes by:
 * 1. Analyzing the job description to identify key requirements
 * 2. Selecting relevant experience, skills, and achievements from the KB
 * 3. Synthesizing a targeted resume that maps to the JD
 * 
 * The temperature parameter controls how tightly the resume maps to the JD:
 * - 0.0 = General resume, focuses on breadth of experience
 * - 1.0 = Hyper-targeted, prioritizes exact JD keyword matching
 */

import { getOpenAIProvider } from './openai-provider.js';
import { getPromptText } from './prompts.js';
import type { KBContext, GenerationRequest, GeneratedResume, ChatMessage } from './types.js';

/**
 * Build a voice blueprint instruction block for the AI.
 */
function buildVoiceInstructions(voice: KBContext['voiceBlueprint']): string {
  if (!voice) return '';

  const parts: string[] = [];

  if (voice.tone) {
    parts.push(`Tone: ${voice.tone}`);
  }
  if (voice.formality) {
    parts.push(`Formality: ${voice.formality}`);
  }
  if (voice.audience) {
    parts.push(`Target audience: ${voice.audience}`);
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
    parts.push(`Sentence length preference: ${voice.sentenceLength}`);
  }
  if (voice.vocabularyNotes) {
    parts.push(`Vocabulary notes: ${voice.vocabularyNotes}`);
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
    parts.push(`Avoid: ${voice.avoid.join(', ')}`);
  }
  if (voice.customPrompt) {
    parts.push(`Additional instructions: ${voice.customPrompt}`);
  }
  if (voice.samples && voice.samples.length > 0) {
    parts.push(`Writing samples to emulate:\n${voice.samples.map((s) => `- "${s}"`).join('\n')}`);
  }
  if (voice.samplePairs && voice.samplePairs.length > 0) {
    parts.push(`Prompted samples:\n${voice.samplePairs.map((p) => `- Prompt: "${p.prompt}"\n  Response: "${p.response}"`).join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\nVOICE & STYLE GUIDELINES:\n${parts.join('\n')}`;
}

/**
 * Format the knowledge base context into a structured prompt section.
 */
function formatKBContext(kb: KBContext): string {
  const sections: string[] = [];

  // Profile
  if (kb.profile) {
    sections.push(`## CANDIDATE PROFILE
Name: ${kb.profile.name}
${kb.profile.location ? `Location: ${kb.profile.location}` : ''}
${kb.profile.email ? `Email: ${kb.profile.email}` : ''}
${kb.profile.phone ? `Phone: ${kb.profile.phone}` : ''}
${kb.profile.linkedin ? `LinkedIn: ${kb.profile.linkedin}` : ''}
${kb.profile.github ? `GitHub: ${kb.profile.github}` : ''}
${kb.profile.website ? `Website: ${kb.profile.website}` : ''}
${kb.profile.summary ? `\nProfessional Summary: ${kb.profile.summary}` : ''}`);
  }

  // Roles with experience items and achievements
  if (kb.roles.length > 0) {
    const rolesText = kb.roles.map((role) => {
      const dateRange = role.current
        ? `${formatDate(role.startDate)} - Present`
        : `${formatDate(role.startDate)} - ${role.endDate ? formatDate(role.endDate) : 'Present'}`;

      const experienceText = role.experienceItems.length > 0
        ? `\nResponsibilities & Contributions:\n${role.experienceItems.map((e) => `  - [${e.type}] ${e.content}`).join('\n')}`
        : '';

      const achievementsText = role.achievements.length > 0
        ? `\nAchievements:\n${role.achievements.map((a) => `  - Problem: ${a.problem}\n    Action: ${a.action}\n    Outcome: ${a.outcome}${a.metrics ? `\n    Metrics: ${a.metrics}` : ''}`).join('\n')}`
        : '';

      return `### ${role.title} at ${role.company}
${dateRange}
${role.description ? `Overview: ${role.description}` : ''}${experienceText}${achievementsText}`;
    }).join('\n\n');

    sections.push(`## WORK EXPERIENCE\n${rolesText}`);
  }

  // Skills
  if (kb.skills.length > 0) {
    const skillsByCategory: Record<string, typeof kb.skills> = {};
    for (const skill of kb.skills) {
      const category = skill.category || 'other';
      if (!skillsByCategory[category]) {
        skillsByCategory[category] = [];
      }
      skillsByCategory[category].push(skill);
    }

    const skillsText = Object.entries(skillsByCategory)
      .map(([category, skills]) => `${category}: ${skills.map((s) => s.name + (s.proficiency ? ` (${s.proficiency})` : '')).join(', ')}`)
      .join('\n');

    sections.push(`## SKILLS\n${skillsText}`);
  }

  // Projects
  if (kb.projects.length > 0) {
    const projectsText = kb.projects.map((p) => {
      const techText = p.technologies && p.technologies.length > 0
        ? `\nTechnologies: ${p.technologies.join(', ')}`
        : '';
      return `### ${p.name}${p.url ? ` (${p.url})` : ''}
${p.description || ''}${techText}${p.learnings ? `\nLearnings: ${p.learnings}` : ''}`;
    }).join('\n\n');

    sections.push(`## PROJECTS\n${projectsText}`);
  }

  // Education
  if (kb.education.length > 0) {
    const eduText = kb.education.map((e) => {
      const dateRange = e.endDate ? formatDate(e.endDate) : (e.startDate ? `Started ${formatDate(e.startDate)}` : '');
      return `### ${e.degree}${e.field ? ` in ${e.field}` : ''}
${e.institution}${dateRange ? ` (${dateRange})` : ''}${e.gpa ? `\nGPA: ${e.gpa}` : ''}${e.honors ? `\nHonors: ${e.honors}` : ''}`;
    }).join('\n\n');

    sections.push(`## EDUCATION\n${eduText}`);
  }

  return sections.join('\n\n');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Build the system prompt for resume generation.
 */
function buildSystemPromptTemplate(temperature: number): string {
  const targetingLevel = temperature < 0.3
    ? 'Create a general-purpose resume that showcases breadth of experience. Focus on transferable skills and overall career narrative.'
    : temperature < 0.7
    ? 'Create a balanced resume that highlights relevant experience while maintaining authenticity. Map key skills to job requirements where genuine matches exist.'
    : 'Create a highly targeted resume that closely maps to the job description. Prioritize experiences and skills that directly address stated requirements. Use terminology from the JD where it authentically represents the candidate.';

  return `You are an expert resume writer. Your task is to create a tailored, ATS-friendly resume.

TARGETING LEVEL (based on temperature ${temperature.toFixed(1)}):
${targetingLevel}

RESUME REQUIREMENTS:
1. Format in clean Markdown
2. Include only information from the provided knowledge base - NEVER fabricate
3. Quantify achievements with metrics where available
4. Use strong action verbs
5. Keep bullet points concise (1-2 lines each)
6. Prioritize recent and relevant experience
7. Ensure ATS compatibility:
   - Use standard section headings
   - Avoid tables, columns, or complex formatting
   - Include relevant keywords naturally
8. Total length: 1-2 pages worth of content

OUTPUT FORMAT:
Return ONLY the resume content in Markdown format. Do not include explanations or meta-commentary.

STRUCTURE:
# [Name]
[Contact Info Line]

## Summary
[2-3 sentence professional summary tailored to the role]

## Experience
### [Title] | [Company] | [Date Range]
- [Bullet points - most impactful first]

## Skills
[Grouped by category if helpful]

## Education
[Degree, Institution, Date]

## Projects (optional - include if relevant)

[Voice Instructions Injected Here]`;
}

function applyResumePromptTemplate(
  template: string,
  temperature: number,
  voiceInstructions: string
): string {
  const targetingLevel = temperature < 0.3
    ? 'Create a general-purpose resume that showcases breadth of experience. Focus on transferable skills and overall career narrative.'
    : temperature < 0.7
    ? 'Create a balanced resume that highlights relevant experience while maintaining authenticity. Map key skills to job requirements where genuine matches exist.'
    : 'Create a highly targeted resume that closely maps to the job description. Prioritize experiences and skills that directly address stated requirements. Use terminology from the JD where it authentically represents the candidate.';

  return template
    .replace('[Dynamic based on temperature setting]', targetingLevel)
    .replace('[Voice Instructions Injected Here]', voiceInstructions || '');
}

/**
 * Generate a tailored resume based on the job description and knowledge base.
 */
export async function generateResume(request: GenerationRequest): Promise<GeneratedResume> {
  const provider = getOpenAIProvider();

  if (!(await provider.isConfiguredAsync())) {
    throw new Error('AI provider is not configured');
  }

  const voiceInstructions = buildVoiceInstructions(request.kbContext.voiceBlueprint);
  const defaultTemplate = buildSystemPromptTemplate(request.temperature);
  const overrideTemplate = await getPromptText('resume-generator');
  const systemPrompt = applyResumePromptTemplate(
    overrideTemplate || defaultTemplate,
    request.temperature,
    voiceInstructions
  );
  const kbContext = formatKBContext(request.kbContext);

  const userPrompt = `Generate a resume for the following position:

COMPANY: ${request.company}
POSITION: ${request.position}

JOB DESCRIPTION:
${request.jobDescription}

${request.userPrompt ? `ADDITIONAL INSTRUCTIONS:\n${request.userPrompt}\n\n` : ''}CANDIDATE'S KNOWLEDGE BASE:
${kbContext}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const result = await provider.complete(messages, {
    temperature: 0.7, // Keep generation creative
    maxTokens: 4096,
  });

  // Extract which items were likely used (simple heuristic based on content matching)
  const selectedItems = extractSelectedItems(result.content, request.kbContext);

  return {
    content: result.content,
    selectedItems,
  };
}

/**
 * Analyze generated resume to determine which KB items were used.
 * This is a heuristic - checks if key identifying text appears in the output.
 */
function extractSelectedItems(
  resumeContent: string,
  kb: KBContext
): GeneratedResume['selectedItems'] {
  const contentLower = resumeContent.toLowerCase();

  const roleIds = kb.roles
    .filter((role) =>
      contentLower.includes(role.company.toLowerCase()) &&
      contentLower.includes(role.title.toLowerCase())
    )
    .map((r) => r.id);

  const skillIds = kb.skills
    .filter((skill) => contentLower.includes(skill.name.toLowerCase()))
    .map((s) => s.id);

  const projectIds = kb.projects
    .filter((project) => contentLower.includes(project.name.toLowerCase()))
    .map((p) => p.id);

  const educationIds = kb.education
    .filter((edu) =>
      contentLower.includes(edu.institution.toLowerCase()) ||
      contentLower.includes(edu.degree.toLowerCase())
    )
    .map((e) => e.id);

  return { roleIds, skillIds, projectIds, educationIds };
}

/**
 * Generate resume with streaming output.
 */
export async function generateResumeStream(
  request: GenerationRequest,
  onChunk: (chunk: string) => void
): Promise<GeneratedResume> {
  const provider = getOpenAIProvider();

  if (!(await provider.isConfiguredAsync())) {
    throw new Error('AI provider is not configured');
  }

  if (!provider.completeStream) {
    // Fallback to non-streaming
    return generateResume(request);
  }

  const voiceInstructions = buildVoiceInstructions(request.kbContext.voiceBlueprint);
  const defaultTemplate = buildSystemPromptTemplate(request.temperature);
  const overrideTemplate = await getPromptText('resume-generator');
  const systemPrompt = applyResumePromptTemplate(
    overrideTemplate || defaultTemplate,
    request.temperature,
    voiceInstructions
  );
  const kbContext = formatKBContext(request.kbContext);

  const userPrompt = `Generate a resume for the following position:

COMPANY: ${request.company}
POSITION: ${request.position}

JOB DESCRIPTION:
${request.jobDescription}

${request.userPrompt ? `ADDITIONAL INSTRUCTIONS:\n${request.userPrompt}\n\n` : ''}CANDIDATE'S KNOWLEDGE BASE:
${kbContext}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const result = await provider.completeStream(messages, {
    temperature: 0.7,
    maxTokens: 4096,
    onChunk,
  });

  const selectedItems = extractSelectedItems(result.content, request.kbContext);

  return {
    content: result.content,
    selectedItems,
  };
}
