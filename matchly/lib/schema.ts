import { pgTable, text, integer, timestamp, varchar, real } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tournaments = pgTable('tournaments', {
  id: text('id').primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: text('name').notNull(),
  sport: varchar('sport', { length: 20 }).notNull().default('cricket'),
  organiserEmail: text('organiser_email'),
  editToken: text('edit_token').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  shortName: varchar('short_name', { length: 6 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  teamAId: text('team_a_id').notNull().references(() => teams.id),
  teamBId: text('team_b_id').notNull().references(() => teams.id),
  venue: text('venue'),
  scheduledAt: timestamp('scheduled_at'),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  // Cricket fields
  scoreA: integer('score_a'),
  wicketsA: integer('wickets_a'),
  oversA: real('overs_a'),
  scoreB: integer('score_b'),
  wicketsB: integer('wickets_b'),
  oversB: real('overs_b'),
  // Generic (football/badminton/kabaddi)
  goalsA: integer('goals_a'),
  goalsB: integer('goals_b'),
  // Result
  winnerId: text('winner_id'),
  resultNote: text('result_note'),
  commentary: text('commentary'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const tournamentRelations = relations(tournaments, ({ many }) => ({
  teams: many(teams),
  matches: many(matches),
}))

export const teamRelations = relations(teams, ({ one }) => ({
  tournament: one(tournaments, { fields: [teams.tournamentId], references: [tournaments.id] }),
}))

export const matchRelations = relations(matches, ({ one }) => ({
  tournament: one(tournaments, { fields: [matches.tournamentId], references: [tournaments.id] }),
  teamA: one(teams, { fields: [matches.teamAId], references: [teams.id] }),
  teamB: one(teams, { fields: [matches.teamBId], references: [teams.id] }),
}))

export type Tournament = typeof tournaments.$inferSelect
export type Team = typeof teams.$inferSelect
export type Match = typeof matches.$inferSelect
export type NewTournament = typeof tournaments.$inferInsert
export type NewTeam = typeof teams.$inferInsert
export type NewMatch = typeof matches.$inferInsert
