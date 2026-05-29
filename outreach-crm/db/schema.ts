import { pgTable, text, timestamp, boolean, integer, serial, pgEnum } from 'drizzle-orm/pg-core'

export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'replied', 'interested', 'converted', 'unsubscribed', 'bounced'])
export const threadStatusEnum = pgEnum('thread_status', ['sent', 'delivered', 'opened', 'replied', 'bounced', 'unsubscribed'])

// ── Auth tables (NextAuth v5 Drizzle adapter) ─────────────────────────────────
export const users = pgTable('users', {
  id:            text('id').primaryKey(),
  name:          text('name'),
  email:         text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image:         text('image'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

export const accounts = pgTable('accounts', {
  userId:            text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId:       text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires:      timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires').notNull(),
})

// ── Leads imported from business-agent CSVs ───────────────────────────────────
export const leads = pgTable('leads', {
  id:         serial('id').primaryKey(),
  userId:     text('user_id').references(() => users.id).notNull(),
  name:       text('name').notNull(),
  email:      text('email').notNull(),
  company:    text('company'),
  city:       text('city'),
  category:   text('category'),   // salon, dentist, pub etc
  product:    text('product'),    // bookingcall, draftcal etc
  website:    text('website'),
  phone:      text('phone'),
  status:     leadStatusEnum('status').default('new').notNull(),
  notes:      text('notes'),
  source:     text('source'),     // csv filename
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

// ── Email threads — one per lead conversation ─────────────────────────────────
export const threads = pgTable('threads', {
  id:            serial('id').primaryKey(),
  leadId:        integer('lead_id').references(() => leads.id).notNull(),
  userId:        text('user_id').references(() => users.id).notNull(),
  subject:       text('subject').notNull(),
  status:        threadStatusEnum('status').default('sent').notNull(),
  resendId:      text('resend_id'),   // Resend message ID
  openedAt:      timestamp('opened_at'),
  repliedAt:     timestamp('replied_at'),
  followUpAt:    timestamp('follow_up_at'),
  followUpSent:  boolean('follow_up_sent').default(false),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

// ── Messages (outbound + inbound replies) ─────────────────────────────────────
export const messages = pgTable('messages', {
  id:        serial('id').primaryKey(),
  threadId:  integer('thread_id').references(() => threads.id).notNull(),
  direction: text('direction').notNull(),   // 'outbound' | 'inbound'
  from:      text('from').notNull(),
  to:        text('to').notNull(),
  subject:   text('subject').notNull(),
  body:      text('body').notNull(),
  html:      text('html'),
  resendId:  text('resend_id'),
  sentAt:    timestamp('sent_at').defaultNow().notNull(),
})

// ── Resend webhook events (opens, clicks, bounces) ────────────────────────────
export const emailEvents = pgTable('email_events', {
  id:        serial('id').primaryKey(),
  resendId:  text('resend_id').notNull(),
  type:      text('type').notNull(),
  data:      text('data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
