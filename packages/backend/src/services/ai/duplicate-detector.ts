/**
 * Duplicate Detection Service
 * 
 * Uses string similarity and exact matching to detect potential duplicates
 * when importing resume data into the knowledge base.
 */

import prisma from '../../lib/prisma.js';
import type {
  ParsedResumeRole,
  ParsedResumeSkill,
  ParsedResumeEducation,
  ParsedResumeAchievement,
} from './types.js';

export interface DuplicateMatch {
  existingId: string;
  score: number; // 0-1, higher = more likely duplicate
  matchType: 'exact' | 'similar' | 'partial';
  matchDetails: string;
}

export interface DuplicateCheckResult<T> {
  item: T;
  duplicates: DuplicateMatch[];
  isLikelyDuplicate: boolean;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity score (0-1).
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1;

  const distance = levenshteinDistance(aLower, bLower);
  const maxLength = Math.max(aLower.length, bLower.length);

  return 1 - distance / maxLength;
}

/**
 * Normalize a string for comparison.
 */
function normalize(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two date ranges overlap.
 */
function datesOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null
): boolean {
  const effectiveEnd1 = end1 || new Date();
  const effectiveEnd2 = end2 || new Date();

  return start1 <= effectiveEnd2 && effectiveEnd1 >= start2;
}

/**
 * Check a role for duplicates against existing roles in the KB.
 */
export async function checkRoleDuplicates(
  role: ParsedResumeRole
): Promise<DuplicateCheckResult<ParsedResumeRole>> {
  const existingRoles = await prisma.role.findMany();
  const duplicates: DuplicateMatch[] = [];

  for (const existing of existingRoles) {
    const companySimilarity = stringSimilarity(role.company, existing.company);
    const titleSimilarity = stringSimilarity(role.title, existing.title);

    // Exact match on company + title
    if (companySimilarity === 1 && titleSimilarity === 1) {
      duplicates.push({
        existingId: existing.id,
        score: 1,
        matchType: 'exact',
        matchDetails: `Exact match: ${existing.company} - ${existing.title}`,
      });
      continue;
    }

    // High similarity on company + title with date overlap
    if (companySimilarity > 0.8 && titleSimilarity > 0.8) {
      const roleStartDate = new Date(role.startDate);
      const roleEndDate = role.endDate ? new Date(role.endDate) : null;

      if (datesOverlap(roleStartDate, roleEndDate, existing.startDate, existing.endDate)) {
        const score = (companySimilarity + titleSimilarity) / 2;
        duplicates.push({
          existingId: existing.id,
          score,
          matchType: 'similar',
          matchDetails: `Similar role with overlapping dates: ${existing.company} - ${existing.title}`,
        });
        continue;
      }
    }

    // Partial match - same company, different title or dates
    if (companySimilarity > 0.9) {
      duplicates.push({
        existingId: existing.id,
        score: companySimilarity * 0.5,
        matchType: 'partial',
        matchDetails: `Same company, different role: ${existing.company} - ${existing.title}`,
      });
    }
  }

  return {
    item: role,
    duplicates: duplicates.sort((a, b) => b.score - a.score),
    isLikelyDuplicate: duplicates.some((d) => d.score >= 0.8),
  };
}

/**
 * Check a skill for duplicates against existing skills in the KB.
 */
export async function checkSkillDuplicates(
  skill: ParsedResumeSkill
): Promise<DuplicateCheckResult<ParsedResumeSkill>> {
  const existingSkills = await prisma.skill.findMany();
  const duplicates: DuplicateMatch[] = [];

  const normalizedName = normalize(skill.name);

  for (const existing of existingSkills) {
    const existingNormalized = normalize(existing.name);

    // Exact match
    if (normalizedName === existingNormalized) {
      duplicates.push({
        existingId: existing.id,
        score: 1,
        matchType: 'exact',
        matchDetails: `Exact match: ${existing.name}`,
      });
      continue;
    }

    // Similar name
    const similarity = stringSimilarity(skill.name, existing.name);
    if (similarity > 0.8) {
      duplicates.push({
        existingId: existing.id,
        score: similarity,
        matchType: 'similar',
        matchDetails: `Similar skill: ${existing.name}`,
      });
    }
  }

  return {
    item: skill,
    duplicates: duplicates.sort((a, b) => b.score - a.score),
    isLikelyDuplicate: duplicates.some((d) => d.score >= 0.9),
  };
}

/**
 * Check education for duplicates against existing education in the KB.
 */
export async function checkEducationDuplicates(
  education: ParsedResumeEducation
): Promise<DuplicateCheckResult<ParsedResumeEducation>> {
  const existingEducation = await prisma.education.findMany();
  const duplicates: DuplicateMatch[] = [];

  for (const existing of existingEducation) {
    const institutionSimilarity = stringSimilarity(education.institution, existing.institution);
    const degreeSimilarity = stringSimilarity(education.degree, existing.degree);

    // Exact match
    if (institutionSimilarity === 1 && degreeSimilarity === 1) {
      duplicates.push({
        existingId: existing.id,
        score: 1,
        matchType: 'exact',
        matchDetails: `Exact match: ${existing.degree} from ${existing.institution}`,
      });
      continue;
    }

    // High similarity
    if (institutionSimilarity > 0.8 && degreeSimilarity > 0.7) {
      const score = (institutionSimilarity + degreeSimilarity) / 2;
      duplicates.push({
        existingId: existing.id,
        score,
        matchType: 'similar',
        matchDetails: `Similar: ${existing.degree} from ${existing.institution}`,
      });
    }
  }

  return {
    item: education,
    duplicates: duplicates.sort((a, b) => b.score - a.score),
    isLikelyDuplicate: duplicates.some((d) => d.score >= 0.85),
  };
}

/**
 * Check an achievement for duplicates.
 * Achievements are trickier - we compare the combined problem+action+outcome text.
 */
export async function checkAchievementDuplicates(
  achievement: ParsedResumeAchievement
): Promise<DuplicateCheckResult<ParsedResumeAchievement>> {
  const existingAchievements = await prisma.achievement.findMany();
  const duplicates: DuplicateMatch[] = [];

  const achievementText = normalize(
    `${achievement.problem} ${achievement.action} ${achievement.outcome}`
  );

  for (const existing of existingAchievements) {
    const existingText = normalize(`${existing.problem} ${existing.action} ${existing.outcome}`);

    const similarity = stringSimilarity(achievementText, existingText);

    if (similarity > 0.8) {
      duplicates.push({
        existingId: existing.id,
        score: similarity,
        matchType: similarity === 1 ? 'exact' : 'similar',
        matchDetails: `${similarity === 1 ? 'Exact' : 'Similar'} achievement`,
      });
    }
  }

  return {
    item: achievement,
    duplicates: duplicates.sort((a, b) => b.score - a.score),
    isLikelyDuplicate: duplicates.some((d) => d.score >= 0.85),
  };
}

/**
 * Run duplicate detection on all parsed resume items.
 */
export interface FullDuplicateCheckResult {
  roles: DuplicateCheckResult<ParsedResumeRole>[];
  skills: DuplicateCheckResult<ParsedResumeSkill>[];
  education: DuplicateCheckResult<ParsedResumeEducation>[];
  achievements: DuplicateCheckResult<ParsedResumeAchievement>[];
  summary: {
    totalItems: number;
    likelyDuplicates: number;
  };
}

export async function checkAllDuplicates(parsed: {
  roles: ParsedResumeRole[];
  skills: ParsedResumeSkill[];
  education: ParsedResumeEducation[];
  achievements: ParsedResumeAchievement[];
}): Promise<FullDuplicateCheckResult> {
  const [roles, skills, education, achievements] = await Promise.all([
    Promise.all(parsed.roles.map(checkRoleDuplicates)),
    Promise.all(parsed.skills.map(checkSkillDuplicates)),
    Promise.all(parsed.education.map(checkEducationDuplicates)),
    Promise.all(parsed.achievements.map(checkAchievementDuplicates)),
  ]);

  const allResults = [...roles, ...skills, ...education, ...achievements];

  return {
    roles,
    skills,
    education,
    achievements,
    summary: {
      totalItems: allResults.length,
      likelyDuplicates: allResults.filter((r) => r.isLikelyDuplicate).length,
    },
  };
}
