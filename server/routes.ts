import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mockMT5Service as mt5Service } from "./services/mock-mt5-service";
import { newsService } from "./services/news-service";
import { createTradingBot } from "./services/trading-bot";
import { wsService } from "./services/websocket-service";
import { insertAccountSchema, insertTradeSchema, insertBotSettingsSchema } from "@shared/schema";
import { z } from "zod";

// Store active trading bots
const activeBots = new Map<string, any>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize MT5 service
  console.log("Initializing MT5 service...");
  await mt5Service.initialize();

  // Start news service
  console.log("Starting news service...");
  newsService.startPeriodicUpdates(60); // Update every hour

  // Account management routes
  app.get("/api/accounts", async (req, res) => {
    try {
      // For demo, we'll assume a default user
      const accounts = await storage.getAccountsByUserId("default-user");
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount({
        ...accountData,
        userId: "default-user" // For demo
      });
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid account data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create account" });
      }
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.getAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  // MT5 integration routes
  app.get("/api/mt5/account-info", async (req, res) => {
    try {
      if (!mt5Service.getConnectionStatus()) {
        return res.status(503).json({ error: "MT5 not connected" });
      }
      
      const accountInfo = await mt5Service.getAccountInfo();
      res.json(accountInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get account info" });
    }
  });

  app.get("/api/mt5/positions", async (req, res) => {
    try {
      if (!mt5Service.getConnectionStatus()) {
        return res.status(503).json({ error: "MT5 not connected" });
      }
      
      const positions = await mt5Service.getPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  app.get("/api/mt5/symbol/:symbol", async (req, res) => {
    try {
      if (!mt5Service.getConnectionStatus()) {
        return res.status(503).json({ error: "MT5 not connected" });
      }
      
      const symbolInfo = await mt5Service.getSymbolInfo(req.params.symbol);
      res.json(symbolInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get symbol info" });
    }
  });

  // Manual trading routes
  app.post("/api/trades/manual", async (req, res) => {
    try {
      const { symbol, type, volume, accountId } = req.body;
      
      if (!mt5Service.getConnectionStatus()) {
        return res.status(503).json({ error: "MT5 not connected" });
      }

      const orderRequest = {
        action: 'TRADE_ACTION_DEAL' as const,
        symbol,
        volume: parseFloat(volume),
        type: type === 'BUY' ? 'ORDER_TYPE_BUY' as const : 'ORDER_TYPE_SELL' as const,
        deviation: 20,
        comment: 'Manual trade',
        magic: 234000
      };

      const result = await mt5Service.sendOrder(orderRequest);

      // Log to database
      const trade = await storage.createTrade({
        accountId,
        ticket: result.ticket,
        symbol,
        type,
        volume: volume.toString(),
        entryPrice: result.price.toString(),
        comment: 'Manual trade',
        isManual: true
      });

      // Broadcast update
      wsService.broadcastTradeUpdate(trade);

      res.json({ success: true, trade, result });
    } catch (error) {
      res.status(500).json({ error: "Failed to execute manual trade" });
    }
  });

  app.post("/api/trades/:id/close", async (req, res) => {
    try {
      const tradeId = req.params.id;
      const trade = await storage.getTrade(tradeId);
      
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      if (!mt5Service.getConnectionStatus()) {
        return res.status(503).json({ error: "MT5 not connected" });
      }

      const result = await mt5Service.closePosition(trade.ticket);
      
      // Update database
      const updatedTrade = await storage.closeTrade(
        tradeId,
        result.price || 0,
        result.profit || 0,
        new Date()
      );

      // Broadcast update
      wsService.broadcastTradeUpdate(updatedTrade);

      res.json({ success: true, trade: updatedTrade });
    } catch (error) {
      res.status(500).json({ error: "Failed to close trade" });
    }
  });

  // Trading history routes
  app.get("/api/trades/:accountId", async (req, res) => {
    try {
      const trades = await storage.getTradesByAccountId(req.params.accountId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:accountId/open", async (req, res) => {
    try {
      const openTrades = await storage.getOpenTrades(req.params.accountId);
      res.json(openTrades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch open trades" });
    }
  });

  // Bot management routes
  app.get("/api/bot/:accountId/settings", async (req, res) => {
    try {
      const settings = await storage.getBotSettings(req.params.accountId);
      if (!settings) {
        return res.status(404).json({ error: "Bot settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot settings" });
    }
  });

  app.post("/api/bot/:accountId/settings", async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const settingsData = insertBotSettingsSchema.parse(req.body);
      
      let settings = await storage.getBotSettings(accountId);
      if (settings) {
        settings = await storage.updateBotSettings(accountId, settingsData);
      } else {
        settings = await storage.createBotSettings({
          ...settingsData,
          accountId
        });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid settings data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update bot settings" });
      }
    }
  });

  app.post("/api/bot/:accountId/start", async (req, res) => {
    try {
      const accountId = req.params.accountId;
      
      if (activeBots.has(accountId)) {
        return res.status(400).json({ error: "Bot already running" });
      }

      const bot = createTradingBot(accountId);
      const started = await bot.start();
      
      if (started) {
        activeBots.set(accountId, bot);
        
        // Set up event listeners
        bot.on('tradeExecuted', (data) => {
          wsService.broadcastTradeUpdate(data);
        });
        
        bot.on('statusChanged', (status) => {
          wsService.broadcastBotStatus(accountId, status);
        });
        
        bot.on('error', (error) => {
          wsService.broadcastError(error.message);
        });

        res.json({ success: true, status: 'running' });
      } else {
        res.status(500).json({ error: "Failed to start bot" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start bot" });
    }
  });

  app.post("/api/bot/:accountId/stop", async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const bot = activeBots.get(accountId);
      
      if (!bot) {
        return res.status(400).json({ error: "Bot not running" });
      }

      await bot.stop();
      activeBots.delete(accountId);
      
      wsService.broadcastBotStatus(accountId, 'stopped');
      res.json({ success: true, status: 'stopped' });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop bot" });
    }
  });

  app.get("/api/bot/:accountId/status", async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const bot = activeBots.get(accountId);
      
      const status = bot ? bot.getStatus() : 'stopped';
      res.json({ status, isRunning: status === 'running' });
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  // News routes
  app.get("/api/news/upcoming", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const news = await storage.getUpcomingNews(hours);
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/high-impact", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const events = await newsService.getHighImpactEvents(hours);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch high impact events" });
    }
  });

  // Price data routes
  app.get("/api/prices/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const limit = parseInt(req.query.limit as string) || 100;
      const prices = await storage.getPriceData(symbol, limit);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

  // System status route
  app.get("/api/status", async (req, res) => {
    try {
      const status = {
        mt5Connected: mt5Service.getConnectionStatus(),
        activeBotsCount: activeBots.size,
        websocketClients: wsService.getClientCount(),
        timestamp: new Date().toISOString()
      };
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get system status" });
    }
  });

  // Create HTTP server and initialize WebSocket
  const httpServer = createServer(app);
  wsService.initialize(httpServer);

  return httpServer;
}
