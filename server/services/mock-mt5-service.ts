import { EventEmitter } from 'events';
import { type MT5AccountInfo, type MT5Position, type MT5TradeRequest, type MT5PriceData } from './mt5-service';

export class MockMT5Service extends EventEmitter {
  private isConnected = true;
  private accountInfo: MT5AccountInfo = {
    balance: 2000000, // $2M demo account
    equity: 2001250,
    margin: 5000,
    freeMargin: 1996250,
    marginLevel: 40025,
    profit: 1250,
    login: "12345678",
    server: "FXTM-Demo",
    currency: "USD",
    company: "FXTM",
    name: "Demo Account"
  };

  private positions: MT5Position[] = [
    {
      ticket: "123456789",
      symbol: "EURUSD",
      type: "BUY",
      volume: 0.1,
      priceOpen: 1.08550,
      priceCurrent: 1.08675,
      profit: 125.00,
      swap: 0,
      commission: -2.50,
      comment: "Bot trade",
      time: new Date()
    }
  ];

  private currentPrices: { [symbol: string]: { bid: number; ask: number; last: number } } = {
    'EURUSD': { bid: 1.08675, ask: 1.08685, last: 1.08680 },
    'GBPUSD': { bid: 1.25450, ask: 1.25465, last: 1.25458 },
    'USDJPY': { bid: 149.125, ask: 149.135, last: 149.130 },
    'USDCHF': { bid: 0.89250, ask: 0.89265, last: 0.89258 },
    'AUDUSD': { bid: 0.66520, ask: 0.66535, last: 0.66528 },
    'USDCAD': { bid: 1.35780, ask: 1.35795, last: 1.35788 }
  };

  constructor() {
    super();
    this.startPriceSimulation();
  }

  async initialize(): Promise<boolean> {
    console.log('Mock MT5 service initialized successfully');
    this.isConnected = true;
    this.emit('connectionStatus', true);
    return true;
  }

  async getAccountInfo(): Promise<MT5AccountInfo> {
    // Simulate small random changes in equity/profit
    const profitChange = (Math.random() - 0.5) * 10;
    this.accountInfo.profit += profitChange;
    this.accountInfo.equity = this.accountInfo.balance + this.accountInfo.profit;
    
    return { ...this.accountInfo };
  }

  async getPositions(): Promise<MT5Position[]> {
    // Update position P&L based on current prices
    this.positions.forEach(position => {
      const currentPrice = this.currentPrices[position.symbol];
      if (currentPrice) {
        position.priceCurrent = position.type === 'BUY' ? currentPrice.bid : currentPrice.ask;
        const priceDiff = position.type === 'BUY' 
          ? position.priceCurrent - position.priceOpen
          : position.priceOpen - position.priceCurrent;
        position.profit = priceDiff * position.volume * 100000; // Standard lot calculation
      }
    });
    
    return [...this.positions];
  }

  async sendOrder(request: MT5TradeRequest): Promise<any> {
    const currentPrice = this.currentPrices[request.symbol];
    if (!currentPrice) {
      throw new Error(`Symbol ${request.symbol} not available`);
    }

    const ticket = Date.now().toString();
    const executionPrice = request.type === 'ORDER_TYPE_BUY' ? currentPrice.ask : currentPrice.bid;

    // Add new position
    const newPosition: MT5Position = {
      ticket,
      symbol: request.symbol,
      type: request.type === 'ORDER_TYPE_BUY' ? 'BUY' : 'SELL',
      volume: request.volume,
      priceOpen: executionPrice,
      priceCurrent: executionPrice,
      profit: 0,
      swap: 0,
      commission: -request.volume * 2.5, // $2.5 per 0.1 lot
      comment: request.comment || 'Mock trade',
      time: new Date()
    };

    this.positions.push(newPosition);

    return {
      ticket,
      volume: request.volume,
      price: executionPrice,
      comment: 'Trade executed successfully'
    };
  }

  async closePosition(ticket: string): Promise<any> {
    const positionIndex = this.positions.findIndex(pos => pos.ticket === ticket);
    if (positionIndex === -1) {
      throw new Error('Position not found');
    }

    const position = this.positions[positionIndex];
    const currentPrice = this.currentPrices[position.symbol];
    if (!currentPrice) {
      throw new Error(`Symbol ${position.symbol} not available`);
    }

    const closePrice = position.type === 'BUY' ? currentPrice.bid : currentPrice.ask;
    
    // Remove from positions
    this.positions.splice(positionIndex, 1);

    return {
      success: true,
      ticket: Date.now().toString(),
      price: closePrice,
      profit: position.profit
    };
  }

  async getSymbolInfo(symbol: string): Promise<MT5PriceData> {
    const prices = this.currentPrices[symbol];
    if (!prices) {
      throw new Error(`Symbol ${symbol} not found`);
    }

    return {
      symbol,
      time: new Date(),
      bid: prices.bid,
      ask: prices.ask,
      last: prices.last,
      volume: Math.floor(Math.random() * 1000) + 100
    };
  }

  async shutdown(): Promise<void> {
    this.isConnected = false;
    console.log('Mock MT5 service shut down');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private startPriceSimulation(): void {
    // Update prices every 2 seconds with realistic forex movements
    setInterval(() => {
      Object.keys(this.currentPrices).forEach(symbol => {
        const prices = this.currentPrices[symbol];
        
        // Generate realistic price movement (very small changes for forex)
        const volatility = symbol.includes('JPY') ? 0.001 : 0.00001;
        const change = (Math.random() - 0.5) * volatility;
        
        prices.bid += change;
        prices.ask = prices.bid + (symbol.includes('JPY') ? 0.002 : 0.00001); // Spread
        prices.last = (prices.bid + prices.ask) / 2;
        
        // Keep prices within reasonable ranges
        if (symbol === 'EURUSD') {
          prices.bid = Math.max(1.07, Math.min(1.12, prices.bid));
        } else if (symbol === 'GBPUSD') {
          prices.bid = Math.max(1.24, Math.min(1.28, prices.bid));
        } else if (symbol === 'USDJPY') {
          prices.bid = Math.max(148, Math.min(151, prices.bid));
        }
        
        prices.ask = prices.bid + (symbol.includes('JPY') ? 0.002 : 0.00001);
        prices.last = (prices.bid + prices.ask) / 2;
      });
    }, 2000);
  }
}

export const mockMT5Service = new MockMT5Service();