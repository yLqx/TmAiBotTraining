export interface MT5AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profit: number;
  login: string;
  server: string;
  currency: string;
  company: string;
  name: string;
}

export interface SystemStatus {
  mt5Connected: boolean;
  activeBotsCount: number;
  websocketConnected: boolean;
  lastUpdate: string;
}

export interface BotStatus {
  status: 'running' | 'stopped' | 'error';
  isRunning: boolean;
  lastActivity?: string;
  errorMessage?: string;
}

export interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  time: string;
  volume?: number;
}

export interface MT5Position {
  ticket: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
  time: Date;
}

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  eventTime: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  description?: string;
  country?: string;
}

export interface Trade {
  id: string;
  accountId: string;
  ticket: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: string;
  entryPrice: string;
  exitPrice?: string;
  stopLoss?: string;
  takeProfit?: string;
  profit?: string;
  commission?: string;
  swap?: string;
  status: 'open' | 'closed' | 'pending';
  openTime: string;
  closeTime?: string;
  comment?: string;  
  isManual: boolean;
}

// Formatting utilities
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPrice(price: number, digits: number = 5): string {
  return price.toFixed(digits);
}

export function formatPercentage(percentage: number, decimals: number = 2): string {
  return `${percentage.toFixed(decimals)}%`;
}

export function formatVolume(volume: number): string {
  return volume.toFixed(2);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Calculate profit/loss percentage
export function calculatePnLPercent(entryPrice: number, currentPrice: number, type: 'BUY' | 'SELL'): number {
  if (type === 'BUY') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

// Calculate position size based on risk
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string = 'EURUSD'
): number {
  const riskAmount = accountBalance * (riskPercent / 100);
  const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
  const stopLossDistance = Math.abs(entryPrice - stopLoss);
  const stopLossPips = stopLossDistance / pipValue;
  
  // Standard lot size calculation for forex
  const pipValuePerLot = symbol.includes('JPY') ? 1000 : 10;
  const maxLots = riskAmount / (stopLossPips * pipValuePerLot);
  
  // Round to 2 decimal places and ensure minimum/maximum limits
  const lots = Math.min(Math.max(Math.round(maxLots * 100) / 100, 0.01), 100);
  
  return lots;
}

// Get symbol display name
export function getSymbolDisplayName(symbol: string): string {
  const symbolNames: { [key: string]: string } = {
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD', 
    'USDJPY': 'USD/JPY',
    'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'NZDUSD': 'NZD/USD',
    'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY',
    'GBPJPY': 'GBP/JPY'
  };
  
  return symbolNames[symbol] || symbol;
}

// Calculate spread in pips
export function calculateSpread(bid: number, ask: number, symbol: string): number {
  const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
  return (ask - bid) / pipValue;
}

// Validate symbol format
export function isValidSymbol(symbol: string): boolean {
  const validSymbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
    'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDCAD', 'AUDCHF',
    'AUDJPY', 'CADCHF', 'CADJPY', 'CHFJPY', 'EURCHF', 'EURAUD',
    'EURCAD', 'EURNZD', 'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
    'NZDCAD', 'NZDCHF', 'NZDJPY'
  ];
  
  return validSymbols.includes(symbol.toUpperCase());
}

// Get market session status
export function getMarketSession(): string {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utcHour = new Date(utcTime).getUTCHours();
  
  // Trading sessions in UTC
  if (utcHour >= 21 || utcHour < 6) {
    return 'Sydney/Tokyo';
  } else if (utcHour >= 6 && utcHour < 15) {
    return 'London';
  } else if (utcHour >= 12 && utcHour < 21) {
    return 'New York';
  } else {
    return 'Off Hours';
  }
}

// Check if market is open
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utcHour = new Date(utcTime).getUTCHours();
  
  // Market is closed on weekends (Saturday 22:00 UTC to Sunday 22:00 UTC)
  if (day === 6 && utcHour >= 22) return false;
  if (day === 0 && utcHour < 22) return false;
  
  return true;
}

// Trading API error handling
export class TradingAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TradingAPIError';
  }
}

// API request wrapper with error handling
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TradingAPIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        errorData.code,
        errorData.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TradingAPIError) {
      throw error;
    }
    throw new TradingAPIError(
      'Network error or invalid response',
      'NETWORK_ERROR',
      error
    );
  }
}
