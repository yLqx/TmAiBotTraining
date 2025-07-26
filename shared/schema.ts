import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  brokerName: text("broker_name").notNull(),
  accountNumber: text("account_number").notNull(),
  serverName: text("server_name").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  equity: decimal("equity", { precision: 15, scale: 2 }).notNull().default("0"),
  margin: decimal("margin", { precision: 15, scale: 2 }).notNull().default("0"),
  freeMargin: decimal("free_margin", { precision: 15, scale: 2 }).notNull().default("0"),
  marginLevel: decimal("margin_level", { precision: 8, scale: 2 }).notNull().default("0"),
  isDemo: boolean("is_demo").notNull().default(true),
  isConnected: boolean("is_connected").notNull().default(false),
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  ticket: text("ticket").notNull(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(), // BUY, SELL
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 5 }).notNull(),
  exitPrice: decimal("exit_price", { precision: 10, scale: 5 }),
  stopLoss: decimal("stop_loss", { precision: 10, scale: 5 }),
  takeProfit: decimal("take_profit", { precision: 10, scale: 5 }),
  profit: decimal("profit", { precision: 15, scale: 2 }).default("0"),
  commission: decimal("commission", { precision: 15, scale: 2 }).default("0"),
  swap: decimal("swap", { precision: 15, scale: 2 }).default("0"),
  status: text("status").notNull().default("open"), // open, closed, pending
  openTime: timestamp("open_time").notNull().defaultNow(),
  closeTime: timestamp("close_time"),
  comment: text("comment"),
  isManual: boolean("is_manual").notNull().default(false),
});

export const newsEvents = pgTable("news_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  currency: text("currency").notNull(),
  impact: text("impact").notNull(), // high, medium, low
  eventTime: timestamp("event_time").notNull(),
  actual: text("actual"),
  forecast: text("forecast"),
  previous: text("previous"),
  description: text("description"),
  country: text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const botSettings = pgTable("bot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  isActive: boolean("is_active").notNull().default(false),
  strategy: text("strategy").notNull().default("ma_crossover"),
  riskPerTrade: decimal("risk_per_trade", { precision: 5, scale: 2 }).notNull().default("1.0"),
  maxDailyLoss: decimal("max_daily_loss", { precision: 5, scale: 2 }).notNull().default("5.0"),
  tradingSymbols: jsonb("trading_symbols").notNull().default(["EURUSD"]),
  newsAvoidanceMinutes: integer("news_avoidance_minutes").notNull().default(30),
  strategyParams: jsonb("strategy_params").notNull().default({}),
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
});

export const priceData = pgTable("price_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 10, scale: 5 }).notNull(),
  high: decimal("high", { precision: 10, scale: 5 }).notNull(),
  low: decimal("low", { precision: 10, scale: 5 }).notNull(),
  close: decimal("close", { precision: 10, scale: 5 }).notNull(),
  volume: integer("volume").notNull().default(0),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  trades: many(trades),
  botSettings: many(botSettings),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  account: one(accounts, {
    fields: [trades.accountId],
    references: [accounts.id],
  }),
}));

export const botSettingsRelations = relations(botSettings, ({ one }) => ({
  account: one(accounts, {
    fields: [botSettings.accountId],
    references: [accounts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  lastUpdate: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  openTime: true,
  closeTime: true,
});

export const insertNewsEventSchema = createInsertSchema(newsEvents).omit({
  id: true,
  createdAt: true,
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  lastUpdate: true,
});

export const insertPriceDataSchema = createInsertSchema(priceData).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type NewsEvent = typeof newsEvents.$inferSelect;
export type InsertNewsEvent = z.infer<typeof insertNewsEventSchema>;

export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;

export type PriceData = typeof priceData.$inferSelect;
export type InsertPriceData = z.infer<typeof insertPriceDataSchema>;
