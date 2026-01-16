/**
 * Knowledge Base Context Builder
 * 
 * Fetches all relevant data from the database and formats it
 * into the KBContext structure needed by AI services.
 */

import prisma from '../../lib/prisma.js';
import type { KBContext } from './types.js';

/**
 * Fetch the complete knowledge base context for AI operations.
 */
export async function getKBContext(): Promise<KBContext> {
  const [
    profile,
    roles,
    skills,
    projects,
    education,
    voiceBlueprint,
  ] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.role.findMany({
      include: {
        experienceItems: true,
        achievements: true,
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.project.findMany({
      orderBy: { startDate: 'desc' },
    }),
    prisma.education.findMany({
      orderBy: { endDate: 'desc' },
    }),
    prisma.voiceBlueprint.findFirst(),
  ]);

  return {
    profile: profile
      ? {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          linkedin: profile.linkedin,
          github: profile.github,
          website: profile.website,
          summary: profile.summary,
        }
      : null,

    roles: roles.map((role) => ({
      id: role.id,
      company: role.company,
      title: role.title,
      startDate: role.startDate,
      endDate: role.endDate,
      current: role.current,
      description: role.description,
      experienceItems: role.experienceItems.map((item) => ({
        id: item.id,
        content: item.content,
        type: item.type,
      })),
      achievements: role.achievements.map((achievement) => ({
        id: achievement.id,
        problem: achievement.problem,
        action: achievement.action,
        outcome: achievement.outcome,
        metrics: achievement.metrics,
      })),
    })),

    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
    })),

    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      url: project.url,
      learnings: project.learnings,
      technologies: project.technologies ? JSON.parse(project.technologies) : undefined,
    })),

    education: education.map((edu) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
      gpa: edu.gpa,
      honors: edu.honors,
    })),

    voiceBlueprint: voiceBlueprint
      ? {
          tone: voiceBlueprint.tone,
          formality: voiceBlueprint.formality,
          sentenceLength: voiceBlueprint.sentenceLength,
          audience: voiceBlueprint.audience,
          pointOfView: voiceBlueprint.pointOfView,
          energy: voiceBlueprint.energy,
          confidence: voiceBlueprint.confidence,
          pacing: voiceBlueprint.pacing,
          structureStyle: voiceBlueprint.structureStyle,
          emphasis: voiceBlueprint.emphasis,
          vocabularyNotes: voiceBlueprint.vocabularyNotes,
          grammarNotes: voiceBlueprint.grammarNotes,
          punctuationStyle: voiceBlueprint.punctuationStyle,
          preferredVerbs: voiceBlueprint.preferredVerbs ? JSON.parse(voiceBlueprint.preferredVerbs) : undefined,
          preferredPhrases: voiceBlueprint.preferredPhrases ? JSON.parse(voiceBlueprint.preferredPhrases) : undefined,
          bannedPhrases: voiceBlueprint.bannedPhrases ? JSON.parse(voiceBlueprint.bannedPhrases) : undefined,
          avoid: voiceBlueprint.avoid ? JSON.parse(voiceBlueprint.avoid) : undefined,
          samples: voiceBlueprint.samples ? JSON.parse(voiceBlueprint.samples) : undefined,
          samplePairs: voiceBlueprint.samplePairs ? JSON.parse(voiceBlueprint.samplePairs) : undefined,
          customPrompt: voiceBlueprint.customPrompt,
        }
      : null,
  };
}
