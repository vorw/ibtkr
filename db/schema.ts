// Drizzle definitions for the main D1 tables. Also inspect the SQL migrations
// and runtime schema helpers for ribbon records, email outbox and migration history.

import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable(
  'profiles',
  {
    userId: text('user_id').primaryKey(),
    displayName: text('display_name').notNull(),
    nameKey: text('name_key').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('idx_profiles_name_key').on(t.nameKey)],
);

export const ideas = sqliteTable(
  'ideas',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    challengeId: text('challenge_id').notNull(),
    angleId: text('angle_id'),
    name: text('name').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_ideas_user').on(t.userId),
    index('idx_ideas_week_created').on(t.challengeId, t.createdAt, t.id),
    index('idx_ideas_week_angle').on(t.challengeId, t.angleId, t.createdAt),
  ],
);

export const ideaDrawings = sqliteTable('idea_drawings', {
  ideaId: text('idea_id')
    .primaryKey()
    .references(() => ideas.id),
  imageData: text('image_data').notNull(),
  revision: text('revision').notNull(),
});

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('idx_comments_idea').on(t.ideaId),
    index('idx_comments_user').on(t.userId),
  ],
);

export const reactions = sqliteTable(
  'reactions',
  {
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id),
    userId: text('user_id').notNull(),
    liked: integer('liked').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

export const weeklyResults = sqliteTable(
  'weekly_results',
  {
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    likes: integer('likes').notNull(),
    entries: integer('entries').notNull(),
    rank: integer('rank').notNull(),
    finalizedAt: text('finalized_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.challengeId, t.userId] })],
);
export const finalizedWeeks = sqliteTable('finalized_weeks', {
  challengeId: text('challenge_id').primaryKey(),
  finalizedAt: text('finalized_at').notNull(),
});
