import { EventEmitter } from 'events';
import { mockMT5Service as mt5Service } from './mock-mt5-service';
import { newsService } from './news-service';
import { storage } from '../storage';
import { type InsertTrade, type BotSettings } from '@shared/schema';

export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  confidence: number;
  reason: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrategyParams {
  fastMA: number;
  slowMA: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
}

export class TradingBot extends EventEmitter {
  private accountId: string;
  private isRunning = false;
  private settings: BotSettings | null = null;
  private priceHistory: Map<string, number[]> = new Map();
  private lastSignalTime: Map<string, number> = new Map();
  private minSignalInterval = 5 * 60 * 1000; // 5 minutes between signals
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(accountId: string) {
    super();
    this.accountId = accountId;
  }

  async start(): Promise<boolean> {
    try {
      // Load bot settings
      this.settings = await storage.getBotSettings(this.accountId) || null;
      if (!this.settings) {
        throw new Error('Bot settings not found');
      }

      // Check MT5 connection
      if (!mt5Service.getConnectionStatus()) {
        throw new Error('MT5 not connected');
      }

      this.isRunning = true;
      this.emit('statusChanged', 'running');

      // Start main loop
      this.updateInterval = setInterval(() => {
        this.runTradingLoop();
      }, 10000); // Run every 10 seconds

      console.log(`Trading bot started for account ${this.accountId}`);
      return true;
    } catch (error) {
      console.error('Failed to start trading bot:', error);
      this.emit('error', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.emit('statusChanged', 'stopped');
    console.log(`Trading bot stopped for account ${this.accountId}`);
  }

  private async runTradingLoop(): Promise<void> {
    if (!this.isRunning || !this.settings) return;

    try {
      // Check for high impact news
      for (const symbol of this.settings.tradingSymbols as string[]) {
        const shouldPause = await newsService.shouldPauseTradingForNews(
          symbol, 
          this.settings.newsAvoidanceMinutes
        );

        if (shouldPause) {
          this.emit('newsPause', { symbol, reason: 'High impact news event approaching' });
          continue;
        }

        // Get current price
        const priceData = await mt5Service.getSymbolInfo(symbol);
        this.updatePriceHistory(symbol, priceData.bid);

        // Generate trading signal
        const signal = await this.generateTradingSignal(symbol);
        
        if (signal && this.shouldExecuteSignal(symbol, signal)) {
          await this.executeSignal(signal);
        }
      }
    } catch (error) {
      console.error('Error in trading loop:', error);
      this.emit('error', error);
    }
  }

  private updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol)!;
    history.push(price);
    
    // Keep only last 200 prices for calculations
    if (history.length > 200) {
      history.shift();
    }
    
    this.priceHistory.set(symbol, history);
  }

  private async generateTradingSignal(symbol: string): Promise<TradingSignal | null> {
    const prices = this.priceHistory.get(symbol);
    if (!prices || prices.length < 50) {
      return null; // Not enough data
    }

    const strategy = this.settings?.strategy || 'ma_crossover';
    
    switch (strategy) {
      case 'ma_crossover':
        return this.maStrategy(symbol, prices);
      case 'rsi_strategy':
        return this.rsiStrategy(symbol, prices);
      default:
        return this.maStrategy(symbol, prices);
    }
  }

  private maStrategy(symbol: string, prices: number[]): TradingSignal | null {
    const params = this.settings?.strategyParams as StrategyParams || {
      fastMA: 10,
      slowMA: 20,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30
    };

    if (prices.length < params.slowMA) return null;

    const fastMA = this.calculateSMA(prices, params.fastMA);
    const slowMA = this.calculateSMA(prices, params.slowMA);
    const prevFastMA = this.calculateSMA(prices.slice(0, -1), params.fastMA);
    const prevSlowMA = this.calculateSMA(prices.slice(0, -1), params.slowMA);

    const currentPrice = prices[prices.length - 1];

    // Check for crossover
    if (prevFastMA <= prevSlowMA && fastMA > slowMA) {
      // Bullish crossover
      return {
        symbol,
        action: 'BUY',
        confidence: 0.7,
        reason: 'MA Bullish Crossover',
        stopLoss: currentPrice * 0.995, // 0.5% SL
        takeProfit: currentPrice * 1.01  // 1% TP
      };
    } else if (prevFastMA >= prevSlowMA && fastMA < slowMA) {
      // Bearish crossover
      return {
        symbol,
        action: 'SELL',
        confidence: 0.7,
        reason: 'MA Bearish Crossover',
        stopLoss: currentPrice * 1.005, // 0.5% SL
        takeProfit: currentPrice * 0.99  // 1% TP
      };
    }

    return null;
  }

  private rsiStrategy(symbol: string, prices: number[]): TradingSignal | null {
    const params = this.settings?.strategyParams as StrategyParams || {
      fastMA: 10,
      slowMA: 20,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30
    };

    if (prices.length < params.rsiPeriod + 1) return null;

    const rsi = this.calculateRSI(prices, params.rsiPeriod);
    const currentPrice = prices[prices.length - 1];

    if (rsi < params.rsiOversold) {
      return {
        symbol,
        action: 'BUY',
        confidence: 0.6,
        reason: `RSI Oversold (${rsi.toFixed(2)})`,
        stopLoss: currentPrice * 0.995,
        takeProfit: currentPrice * 1.015
      };
    } else if (rsi > params.rsiOverbought) {
      return {
        symbol,
        action: 'SELL',
        confidence: 0.6,
        reason: `RSI Overbought (${rsi.toFixed(2)})`,
        stopLoss: currentPrice * 1.005,
        takeProfit: currentPrice * 0.985
      };
    }

    return null;
  }

  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / slice.length;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private shouldExecuteSignal(symbol: string, signal: TradingSignal): boolean {
    const lastSignal = this.lastSignalTime.get(symbol) || 0;
    const now = Date.now();

    // Check minimum interval between signals
    if (now - lastSignal < this.minSignalInterval) {
      return false;
    }

    // Check confidence threshold
    if (signal.confidence < 0.5) {
      return false;
    }

    return true;
  }

  private async executeSignal(signal: TradingSignal): Promise<void> {
    try {
      if (!this.settings) return;

      // Calculate position size based on risk
      const accountInfo = await mt5Service.getAccountInfo();
      const riskAmount = accountInfo.balance * (parseFloat(this.settings.riskPerTrade) / 100);
      
      const currentPrice = await mt5Service.getSymbolInfo(signal.symbol);
      const stopLossDistance = signal.stopLoss ? 
        Math.abs(currentPrice.bid - signal.stopLoss) : 
        currentPrice.bid * 0.005; // Default 0.5%

      const volume = Math.min(
        riskAmount / (stopLossDistance * 100000), // Convert to lots
        1.0 // Max 1 lot
      );

      // Execute trade
      const orderRequest = {
        action: 'TRADE_ACTION_DEAL' as const,
        symbol: signal.symbol,
        volume: Math.round(volume * 100) / 100, // Round to 2 decimals
        type: signal.action === 'BUY' ? 'ORDER_TYPE_BUY' as const : 'ORDER_TYPE_SELL' as const,
        deviation: 20,
        sl: signal.stopLoss,
        tp: signal.takeProfit,
        comment: `Bot: ${signal.reason}`,
        magic: 234000
      };

      const result = await mt5Service.sendOrder(orderRequest);

      // Log trade to database
      const trade: InsertTrade = {
        accountId: this.accountId,
        ticket: result.ticket,
        symbol: signal.symbol,
        type: signal.action,
        volume: result.volume.toString(),
        entryPrice: result.price.toString(),
        stopLoss: signal.stopLoss?.toString(),
        takeProfit: signal.takeProfit?.toString(),
        comment: signal.reason,
        isManual: false
      };

      await storage.createTrade(trade);

      // Update last signal time
      this.lastSignalTime.set(signal.symbol, Date.now());

      this.emit('tradeExecuted', { signal, result });
      console.log(`Trade executed: ${signal.action} ${signal.symbol} at ${result.price}`);

    } catch (error) {
      console.error('Failed to execute signal:', error);
      this.emit('error', error);
    }
  }

  async updateSettings(newSettings: Partial<BotSettings>): Promise<void> {
    if (!this.settings) return;

    this.settings = await storage.updateBotSettings(this.accountId, newSettings);
    this.emit('settingsUpdated', this.settings);
  }

  getStatus(): string {
    return this.isRunning ? 'running' : 'stopped';
  }

  getSettings(): BotSettings | null {
    return this.settings;
  }
}

export const createTradingBot = (accountId: string) => new TradingBot(accountId);
