import { 
  users, accounts, trades, newsEvents, botSettings, priceData,
  type User, type InsertUser, type Account, type InsertAccount,
  type Trade, type InsertTrade, type NewsEvent, type InsertNewsEvent,
  type BotSettings, type InsertBotSettings, type PriceData, type InsertPriceData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Accounts
  getAccount(id: string): Promise<Account | undefined>;
  getAccountsByUserId(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<Account>): Promise<Account>;

  // Trades
  getTrade(id: string): Promise<Trade | undefined>;
  getTradesByAccountId(accountId: string): Promise<Trade[]>;
  getOpenTrades(accountId: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade>;
  closeTrade(id: string, exitPrice: number, profit: number, closeTime: Date): Promise<Trade>;

  // News Events
  getNewsEvent(id: string): Promise<NewsEvent | undefined>;
  getUpcomingNews(hours: number): Promise<NewsEvent[]>;
  createNewsEvent(event: InsertNewsEvent): Promise<NewsEvent>;
  getNewsByDateRange(startDate: Date, endDate: Date): Promise<NewsEvent[]>;

  // Bot Settings
  getBotSettings(accountId: string): Promise<BotSettings | undefined>;
  createBotSettings(settings: InsertBotSettings): Promise<BotSettings>;
  updateBotSettings(accountId: string, updates: Partial<BotSettings>): Promise<BotSettings>;

  // Price Data
  getPriceData(symbol: string, limit: number): Promise<PriceData[]>;
  createPriceData(data: InsertPriceData): Promise<PriceData>;
  getLatestPrice(symbol: string): Promise<PriceData | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Accounts
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...updates, lastUpdate: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  // Trades
  async getTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade || undefined;
  }

  async getTradesByAccountId(accountId: string): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(eq(trades.accountId, accountId))
      .orderBy(desc(trades.openTime));
  }

  async getOpenTrades(accountId: string): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(and(eq(trades.accountId, accountId), eq(trades.status, "open")))
      .orderBy(desc(trades.openTime));
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }

  async closeTrade(id: string, exitPrice: number, profit: number, closeTime: Date): Promise<Trade> {
    const [trade] = await db
      .update(trades)
      .set({
        exitPrice: exitPrice.toString(),
        profit: profit.toString(),
        status: "closed",
        closeTime,
      })
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }

  // News Events
  async getNewsEvent(id: string): Promise<NewsEvent | undefined> {
    const [event] = await db.select().from(newsEvents).where(eq(newsEvents.id, id));
    return event || undefined;
  }

  async getUpcomingNews(hours: number): Promise<NewsEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return db
      .select()
      .from(newsEvents)
      .where(and(gte(newsEvents.eventTime, now), lte(newsEvents.eventTime, future)))
      .orderBy(newsEvents.eventTime);
  }

  async createNewsEvent(event: InsertNewsEvent): Promise<NewsEvent> {
    const [newEvent] = await db.insert(newsEvents).values(event).returning();
    return newEvent;
  }

  async getNewsByDateRange(startDate: Date, endDate: Date): Promise<NewsEvent[]> {
    return db
      .select()
      .from(newsEvents)
      .where(and(gte(newsEvents.eventTime, startDate), lte(newsEvents.eventTime, endDate)))
      .orderBy(newsEvents.eventTime);
  }

  // Bot Settings
  async getBotSettings(accountId: string): Promise<BotSettings | undefined> {
    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.accountId, accountId));
    return settings || undefined;
  }

  async createBotSettings(settings: InsertBotSettings): Promise<BotSettings> {
    const [newSettings] = await db.insert(botSettings).values(settings).returning();
    return newSettings;
  }

  async updateBotSettings(accountId: string, updates: Partial<BotSettings>): Promise<BotSettings> {
    const [settings] = await db
      .update(botSettings)
      .set({ ...updates, lastUpdate: new Date() })
      .where(eq(botSettings.accountId, accountId))
      .returning();
    return settings;
  }

  // Price Data
  async getPriceData(symbol: string, limit: number): Promise<PriceData[]> {
    return db
      .select()
      .from(priceData)
      .where(eq(priceData.symbol, symbol))
      .orderBy(desc(priceData.timestamp))
      .limit(limit);
  }

  async createPriceData(data: InsertPriceData): Promise<PriceData> {
    const [newData] = await db.insert(priceData).values(data).returning();
    return newData;
  }

  async getLatestPrice(symbol: string): Promise<PriceData | undefined> {
    const [price] = await db
      .select()
      .from(priceData)
      .where(eq(priceData.symbol, symbol))
      .orderBy(desc(priceData.timestamp))
      .limit(1);
    return price || undefined;
  }
}

export const storage = new DatabaseStorage();
