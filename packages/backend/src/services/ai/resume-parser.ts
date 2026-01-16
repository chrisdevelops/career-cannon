import { getOpenAIProvider } from './openai-provider.js';
import { getPromptText } from './prompts.js';
import type { ParsedResume, ChatMessage } from './types.js';

/**
 * JSON Schema for structured resume parsing output.
 * This schema is used with OpenAI's structured output feature to ensure
 * consistent, parseable results.
 */
const PARSED_RESUME_SCHEMA = {
  type: 'object',
  properties: {
    profile: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
        linkedin: { type: ['string', 'null'] },
        github: { type: ['string', 'null'] },
        website: { type: ['string', 'null'] },
        summary: { type: ['string', 'null'] },
      },
      // OpenAI strict json_schema requires `required` to include every key in `properties`.
      required: ['name', 'email', 'phone', 'location', 'linkedin', 'github', 'website', 'summary'],
      additionalProperties: false,
    },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: ['string', 'null'] },
          current: { type: 'boolean' },
          description: { type: ['string', 'null'] },
        },
        // OpenAI strict json_schema requires `required` to include every key in `properties`.
        required: ['company', 'title', 'startDate', 'endDate', 'current', 'description'],
        additionalProperties: false,
      },
    },

    experienceItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          roleIndex: { type: 'number' },
          content: { type: 'string' },
          type: { type: 'string', enum: ['responsibility', 'initiative', 'contribution'] },
        },
        required: ['roleIndex', 'content', 'type'],
        additionalProperties: false,
      },
    },
    achievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          roleIndex: { type: ['number', 'null'] },
          problem: { type: 'string' },
          action: { type: 'string' },
          outcome: { type: 'string' },
          metrics: { type: ['string', 'null'] },
        },
        // OpenAI strict json_schema requires `required` to include every key in `properties`.
        required: ['roleIndex', 'problem', 'action', 'outcome', 'metrics'],
        additionalProperties: false,
      },
    },

    skills: {
       type: 'array',
       items: {
         type: 'object',
         properties: {
           name: { type: 'string' },
           category: {
             type: ['string', 'null'],
             enum: ['technical', 'soft', 'tool', 'language', null],
           },
           proficiency: {
             type: ['string', 'null'],
             enum: ['expert', 'advanced', 'intermediate', 'beginner', null],
           },
         },
         // OpenAI strict json_schema requires `required` to include every key in `properties`.
         required: ['name', 'category', 'proficiency'],
         additionalProperties: false,
       },
     },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          field: { type: ['string', 'null'] },
          startDate: { type: ['string', 'null'] },
          endDate: { type: ['string', 'null'] },
          gpa: { type: ['string', 'null'] },
          honors: { type: ['string', 'null'] },
        },
        // OpenAI strict json_schema requires `required` to include every key in `properties`.
        required: ['institution', 'degree', 'field', 'startDate', 'endDate', 'gpa', 'honors'],
        additionalProperties: false,
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          url: { type: ['string', 'null'] },
          technologies: {
            type: ['array', 'null'],
            items: { type: 'string' },
          },
        },
        // OpenAI strict json_schema requires `required` to include every key in `properties`.
        required: ['name', 'description', 'url', 'technologies'],
        additionalProperties: false,
      },
    },
  },
  // OpenAI strict json_schema requires `required` to include every key in `properties`.
  required: ['profile', 'roles', 'experienceItems', 'achievements', 'skills', 'education', 'projects'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an expert resume parser. Your task is to extract structured information from resume text.

EXTRACTION RULES:

1. PROFILE: Extract contact information and professional summary if present.
   - Parse name, email, phone, location, LinkedIn URL, GitHub URL, website
   - The summary should capture the candidate's professional overview

2. ROLES: Extract each job/position as a separate role.
   - Identify company name, job title, dates
   - startDate and endDate should be in YYYY-MM-DD format (estimate day as 01 if not provided)
   - Set current=true if the role is ongoing (e.g., "Present", "Current", no end date)
   - description is a brief overview of the role if provided

3. EXPERIENCE ITEMS: Extract bullet points and responsibilities.
   - roleIndex references the position (0-indexed) in the roles array
   - Classify as:
     - "responsibility": Day-to-day duties, ongoing tasks
     - "initiative": Projects or improvements the person drove
     - "contribution": Specific things they built, delivered, or accomplished

4. ACHIEVEMENTS: Extract quantifiable accomplishments in PAR format.
   - Problem: What challenge or situation existed
   - Action: What the person did
   - Outcome: What was the result
   - Metrics: Any numbers, percentages, or quantifiable results
   - roleIndex is optional - set if the achievement clearly belongs to a specific role

5. SKILLS: Extract all mentioned skills.
   - Categorize as: technical (programming, tools), soft (communication, leadership), tool (specific software), language (spoken/written languages)
   - Infer proficiency if context suggests it (e.g., "expert in Python" → expert)

6. EDUCATION: Extract degrees and certifications.
   - Parse institution, degree type, field of study, dates
   - Include GPA and honors if mentioned

7. PROJECTS: Extract personal/side projects if listed separately from work experience.

IMPORTANT:
- Be thorough - extract everything, even if uncertain
- Always return a profile object; use nulls for unknown fields
- Use null for missing optional fields, never empty strings
- Dates should be YYYY-MM-DD format
- roleIndex values must be valid indices into the roles array
- Each bullet point should become its own experience item OR achievement, not both`;

export interface ParseResumeResult {
  parsed: ParsedResume;
  rawExtraction: string;
}

/**
 * Parse resume text into structured knowledge base candidates.
 * Uses OpenAI's structured output feature for reliable JSON extraction.
 */
export async function parseResume(resumeText: string): Promise<ParseResumeResult> {
  const provider = getOpenAIProvider();

  if (!(await provider.isConfiguredAsync())) {
    throw new Error('AI provider is not configured');
  }

  const systemPrompt = await getPromptText('resume-parser');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Parse the following resume text and extract all structured information:\n\n---\n${resumeText}\n---`,
    },
  ];

  const result = await provider.complete(messages, {
    temperature: 0.1, // Low temperature for consistent extraction
    maxTokens: 8192,
    responseSchema: {
      name: 'parsed_resume',
      description: 'Structured resume data extracted from raw text',
      schema: PARSED_RESUME_SCHEMA,
    },
  });

  if (!result.parsed) {
    throw new Error('Failed to parse resume - no structured output returned');
  }

  return {
    parsed: result.parsed as ParsedResume,
    rawExtraction: result.content,
  };
}

/**
 * Validate parsed resume data and fix common issues.
 */
export function validateParsedResume(parsed: ParsedResume): {
  valid: boolean;
  errors: string[];
  fixed: ParsedResume;
} {
  const errors: string[] = [];
  const fixed = { ...parsed };

  // Validate experience items reference valid roles
  fixed.experienceItems = parsed.experienceItems.filter((item) => {
    if (item.roleIndex < 0 || item.roleIndex >= parsed.roles.length) {
      errors.push(`Experience item references invalid role index: ${item.roleIndex}`);
      return false;
    }
    return true;
  });

  // Validate achievements reference valid roles
  fixed.achievements = parsed.achievements.map((achievement) => {
    if (
      achievement.roleIndex !== null &&
      achievement.roleIndex !== undefined &&
      (achievement.roleIndex < 0 || achievement.roleIndex >= parsed.roles.length)
    ) {
      errors.push(`Achievement references invalid role index: ${achievement.roleIndex}`);
      return { ...achievement, roleIndex: null };
    }
    return achievement;
  });

  // Validate date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  fixed.roles = parsed.roles.map((role, i) => {
    const fixedRole = { ...role };
    if (!dateRegex.test(role.startDate)) {
      errors.push(`Role ${i} has invalid startDate format: ${role.startDate}`);
      // Try to fix common formats
      fixedRole.startDate = fixDateFormat(role.startDate) || role.startDate;
    }
    if (role.endDate && !dateRegex.test(role.endDate)) {
      errors.push(`Role ${i} has invalid endDate format: ${role.endDate}`);
      fixedRole.endDate = fixDateFormat(role.endDate);
    }
    return fixedRole;
  });

  return {
    valid: errors.length === 0,
    errors,
    fixed,
  };
}

/**
 * Try to fix common date format issues.
 */
function fixDateFormat(dateStr: string): string | null {
  // Handle "Month Year" format (e.g., "January 2023")
  const monthYearMatch = dateStr.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i
  );
  if (monthYearMatch) {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase());
    const month = String(monthIndex + 1).padStart(2, '0');
    return `${monthYearMatch[2]}-${month}-01`;
  }

  // Handle "MM/YYYY" format
  const mmYyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyyMatch) {
    const month = mmYyyyMatch[1].padStart(2, '0');
    return `${mmYyyyMatch[2]}-${month}-01`;
  }

  // Handle "YYYY" format
  const yearMatch = dateStr.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }

  return null;
}
