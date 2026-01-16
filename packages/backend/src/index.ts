import express from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/error-handler.js';
import profileRoutes from './routes/profile.js';
import rolesRoutes from './routes/roles.js';
import experienceItemsRoutes from './routes/experience-items.js';
import achievementsRoutes from './routes/achievements.js';
import skillsRoutes from './routes/skills.js';
import projectsRoutes from './routes/projects.js';
import educationRoutes from './routes/education.js';
import voiceBlueprintRoutes from './routes/voice-blueprint.js';
import changeLogRoutes from './routes/change-log.js';
import aiRoutes from './routes/ai.js';
import generationsRoutes from './routes/generations.js';
import promptsRoutes from './routes/prompts.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Larger limit for resume content

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/profile', profileRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/experience-items', experienceItemsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/voice-blueprint', voiceBlueprintRoutes);
app.use('/api/change-log', changeLogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/generations', generationsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/settings', settingsRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
