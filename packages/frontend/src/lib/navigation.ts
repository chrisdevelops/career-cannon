import {
  IconUser,
  IconBriefcase,
  IconStar,
  IconCode,
  IconSchool,
  IconMicrophone,
  IconFileUpload,
  IconHistory,
  IconFileText,
  IconBook,
  IconSparkles,
  IconMessage,
  IconSettings,
  IconMail
} from '@tabler/icons-react';

export type NavSection = 'kb' | 'create' | 'prompts' | 'settings';

export interface NavConfig {
  id: NavSection;
  icon: any;
  label: string;
  path: string;
}

export const SECTIONS: NavConfig[] = [
  { id: 'kb', icon: IconBook, label: 'Knowledge Base', path: '/kb/profile' },
  { id: 'create', icon: IconSparkles, label: 'Create', path: '/generate/resume' },
  { id: 'prompts', icon: IconMessage, label: 'Prompts', path: '/prompts' },
  { id: 'settings', icon: IconSettings, label: 'Settings', path: '/settings' },
];

export const SUB_NAV: Record<NavSection, { to: string; label: string; icon: any }[]> = {
  kb: [
    { to: '/kb/profile', label: 'Profile', icon: IconUser },
    { to: '/kb/roles', label: 'Roles & Experience', icon: IconBriefcase },
    { to: '/kb/skills', label: 'Skills', icon: IconCode },
    { to: '/kb/projects', label: 'Projects', icon: IconStar },
    { to: '/kb/education', label: 'Education', icon: IconSchool },
    { to: '/kb/voice', label: 'Voice Blueprint', icon: IconMicrophone },
    { to: '/history', label: 'Change History', icon: IconHistory },
    { to: '/import', label: 'Import Resume', icon: IconFileUpload },
  ],
  create: [
    { to: '/generate/resume', label: 'Resume Generator', icon: IconFileText },
    { to: '/generate/cover-letter', label: 'Cover Letter', icon: IconMail },
    { to: '/generations', label: 'History', icon: IconHistory },
  ],
  prompts: [
    { to: '/prompts/resume-parser', label: 'Resume Parser', icon: IconCode },
    { to: '/prompts/resume-generation', label: 'Resume Generation', icon: IconFileText },
    { to: '/prompts/cover-letter', label: 'Cover Letter', icon: IconMail },
    { to: '/prompts/refinement', label: 'Refinement', icon: IconSparkles },
    { to: '/prompts/suggestions', label: 'Suggestions', icon: IconMessage },
    { to: '/prompts/voice-blueprint', label: 'Voice Blueprint', icon: IconMicrophone },
  ],
  settings: [
    { to: '/settings/api-keys', label: 'API Keys', icon: IconSettings },
  ],
};

export function getActiveSection(pathname: string): NavSection {
  if (pathname.startsWith('/kb') || pathname.startsWith('/history') || pathname.startsWith('/import')) return 'kb';
  if (pathname.startsWith('/generate') || pathname.startsWith('/generations')) return 'create';
  if (pathname.startsWith('/prompts')) return 'prompts';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'kb';
}
