import { relations, sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(), // always stored lower-case
    name: text('name'),
    passwordHash: text('password_hash').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

export const sets = pgTable(
  'sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sets_user_updated_idx').on(t.userId, t.updatedAt)],
);

export const setMembers = pgTable(
  'set_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    setId: uuid('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    // Denormalised so "which of my sets contain 2:58?" is one indexed lookup.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    verseKey: text('verse_key').notNull(),
    surah: smallint('surah').notNull(),
    ayah: smallint('ayah').notNull(),
    phraseStart: smallint('phrase_start').notNull(),
    phraseEnd: smallint('phrase_end').notNull(),
    phraseText: text('phrase_text').notNull(),
    textSnapshot: text('text_snapshot').notNull(),
    position: smallint('position').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('set_members_set_verse_uq').on(t.setId, t.verseKey),
    index('set_members_user_verse_idx').on(t.userId, t.verseKey),
    check('set_members_phrase_range', sql`${t.phraseStart} >= 0 AND ${t.phraseEnd} >= ${t.phraseStart}`),
    check('set_members_surah_range', sql`${t.surah} BETWEEN 1 AND 114`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({ sets: many(sets) }));
export const setsRelations = relations(sets, ({ one, many }) => ({
  user: one(users, { fields: [sets.userId], references: [users.id] }),
  members: many(setMembers),
}));
export const setMembersRelations = relations(setMembers, ({ one }) => ({
  set: one(sets, { fields: [setMembers.setId], references: [sets.id] }),
}));
