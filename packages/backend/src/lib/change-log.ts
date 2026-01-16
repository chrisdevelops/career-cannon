import prisma from './prisma.js';
import type { EntityType, ActionType } from '@career-cannon/shared';

interface LogChangeParams {
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
}

export async function logChange(params: LogChangeParams): Promise<void> {
  await prisma.changeLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeSnapshot: params.beforeSnapshot ? JSON.stringify(params.beforeSnapshot) : null,
      afterSnapshot: params.afterSnapshot ? JSON.stringify(params.afterSnapshot) : null,
    },
  });
}

export async function getChangeHistory(
  entityType?: EntityType,
  entityId?: string,
  limit = 50,
  undone?: boolean
) {
  const where: { entityType?: string; entityId?: string; undone?: boolean } = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (undone !== undefined) where.undone = undone;

  const logs = await prisma.changeLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    ...log,
    beforeSnapshot: log.beforeSnapshot ? JSON.parse(log.beforeSnapshot) : null,
    afterSnapshot: log.afterSnapshot ? JSON.parse(log.afterSnapshot) : null,
  }));
}

export async function undoChange(changeLogId: string): Promise<{
  success: boolean;
  message: string;
  restoredData?: unknown;
}> {
  const changeLog = await prisma.changeLog.findUnique({
    where: { id: changeLogId },
  });

  if (!changeLog) {
    return { success: false, message: 'Change log entry not found' };
  }

  if (changeLog.undone) {
    return { success: false, message: 'Change has already been undone' };
  }

  const { entityType, entityId, action, beforeSnapshot } = changeLog;
  const parsedBefore = beforeSnapshot ? JSON.parse(beforeSnapshot) : null;

  try {
    switch (action) {
      case 'create': {
        // Undo create = delete the entity
        await deleteEntity(entityType, entityId);
        break;
      }
      case 'update': {
        // Undo update = restore previous state
        if (!parsedBefore) {
          return { success: false, message: 'No previous state to restore' };
        }
        await updateEntity(entityType, entityId, parsedBefore);
        break;
      }
      case 'delete': {
        // Undo delete = recreate with previous data
        if (!parsedBefore) {
          return { success: false, message: 'No previous state to restore' };
        }
        await createEntity(entityType, parsedBefore);
        break;
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }

    await prisma.changeLog.update({
      where: { id: changeLogId },
      data: { undone: true, undoneAt: new Date() },
    });

    return { success: true, message: `Undid ${entityType} ${entityId}` };
  } catch (err) {
    console.error('Undo failed:', err);
    return { success: false, message: `Undo failed: ${String(err)}` };
  }
}

export async function redoChange(changeLogId: string): Promise<{
  success: boolean;
  message: string;
  restoredData?: unknown;
}> {
  const changeLog = await prisma.changeLog.findUnique({
    where: { id: changeLogId },
  });

  if (!changeLog) {
    return { success: false, message: 'Change log entry not found' };
  }

  if (!changeLog.undone) {
    return { success: false, message: 'Change has not been undone' };
  }

  const { entityType, entityId, action, afterSnapshot } = changeLog;
  const parsedAfter = afterSnapshot ? JSON.parse(afterSnapshot) : null;

  try {
    switch (action) {
      case 'create': {
        if (!parsedAfter) {
          return { success: false, message: 'No data to recreate' };
        }
        await createEntity(entityType, parsedAfter);
        break;
      }
      case 'update': {
        if (!parsedAfter) {
          return { success: false, message: 'No updated state to restore' };
        }
        await updateEntity(entityType, entityId, parsedAfter);
        break;
      }
      case 'delete': {
        await deleteEntity(entityType, entityId);
        break;
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }

    await prisma.changeLog.update({
      where: { id: changeLogId },
      data: { undone: false, undoneAt: null },
    });

    return { success: true, message: `Redid ${entityType} ${entityId}` };
  } catch (err) {
    console.error('Redo failed:', err);
    return { success: false, message: `Redo failed: ${String(err)}` };
  }
}

// Helper functions to interact with different entity types
async function deleteEntity(entityType: string, entityId: string): Promise<void> {
  const model = getModel(entityType);
  await (model as { delete: (args: { where: { id: string } }) => Promise<unknown> }).delete({ where: { id: entityId } });
}

async function updateEntity(entityType: string, entityId: string, data: Record<string, unknown>): Promise<unknown> {
  const model = getModel(entityType);
  // Remove id, createdAt, updatedAt from update data
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...updateData } = data;
  return (model as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }).update({
    where: { id: entityId },
    data: updateData,
  });
}

async function createEntity(entityType: string, data: Record<string, unknown>): Promise<unknown> {
  const model = getModel(entityType);
  // Keep the original ID if restoring a deleted entity
  return (model as { create: (args: { data: Record<string, unknown> }) => Promise<unknown> }).create({ data });
}

function getModel(entityType: string): unknown {
  const models: Record<string, unknown> = {
    profile: prisma.profile,
    role: prisma.role,
    experienceItem: prisma.experienceItem,
    achievement: prisma.achievement,
    skill: prisma.skill,
    project: prisma.project,
    education: prisma.education,
    voiceBlueprint: prisma.voiceBlueprint,
  };

  const model = models[entityType];
  if (!model) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return model;
}
