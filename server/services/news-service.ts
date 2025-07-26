import { storage } from '../storage';
import { type InsertNewsEvent } from '@shared/schema';

export interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
  actual?: string;
}

export class NewsService {
  private apiKey: string;
  private baseUrl = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
  }

  async fetchEconomicCalendar(): Promise<ForexFactoryEvent[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseForexFactoryData(data);
    } catch (error) {
      console.error('Failed to fetch economic calendar:', error);
      
      // Fallback to alternative API
      return this.fetchFromAlternativeAPI();
    }
  }

  private async fetchFromAlternativeAPI(): Promise<ForexFactoryEvent[]> {
    try {
      // Alternative: Use a financial news API
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.FINANCIAL_API_KEY;
      if (!apiKey) {
        console.warn('No financial API key available, using mock data');
        return this.getMockEvents();
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Alternative API failed');
      }

      const data = await response.json();
      return this.parseAlternativeAPIData(data);
    } catch (error) {
      console.error('Alternative API also failed:', error);
      return this.getMockEvents();
    }
  }

  private parseForexFactoryData(data: any[]): ForexFactoryEvent[] {
    return data.map(event => ({
      title: event.title || '',
      country: event.country || '',
      date: event.date || '',
      time: event.time || '',
      impact: this.mapImpactLevel(event.impact),
      forecast: event.forecast || '',
      previous: event.previous || '',
      actual: event.actual || undefined
    }));
  }

  private parseAlternativeAPIData(data: any): ForexFactoryEvent[] {
    // Parse data from alternative API format
    if (!data.feed) return [];
    
    return data.feed.slice(0, 20).map((item: any) => ({
      title: item.title,
      country: 'USD', // Default for news sentiment
      date: new Date().toISOString().split('T')[0],
      time: new Date(item.time_published).toLocaleTimeString(),
      impact: this.inferImpactFromSentiment(item.overall_sentiment_score),
      forecast: '',
      previous: '',
      actual: undefined
    }));
  }

  private getMockEvents(): ForexFactoryEvent[] {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return [
      {
        title: 'Non-Farm Payrolls',
        country: 'USD',
        date: today,
        time: '14:30',
        impact: 'high',
        forecast: '190K',
        previous: '185K'
      },
      {
        title: 'Federal Funds Rate Decision',
        country: 'USD',
        date: today,
        time: '16:00',
        impact: 'high',
        forecast: '5.50%',
        previous: '5.25%'
      },
      {
        title: 'ECB Interest Rate Decision',
        country: 'EUR',
        date: today,
        time: '13:45',
        impact: 'medium',
        forecast: '4.00%',
        previous: '4.00%'
      },
      {
        title: 'GDP Growth Rate',
        country: 'GBP',
        date: today,
        time: '10:30',
        impact: 'medium',
        forecast: '0.2%',
        previous: '0.1%'
      },
      {
        title: 'CPI Inflation Rate',
        country: 'JPY',
        date: today,
        time: '23:30',
        impact: 'low',
        forecast: '3.2%',
        previous: '3.1%'
      }
    ];
  }

  private mapImpactLevel(impact: any): string {
    if (typeof impact === 'string') {
      const lower = impact.toLowerCase();
      if (lower.includes('high') || lower.includes('red')) return 'high';
      if (lower.includes('medium') || lower.includes('orange')) return 'medium';
      return 'low';
    }
    if (typeof impact === 'number') {
      if (impact >= 3) return 'high';
      if (impact >= 2) return 'medium';
      return 'low';
    }
    return 'low';
  }

  private inferImpactFromSentiment(score: number): string {
    const absScore = Math.abs(score);
    if (absScore >= 0.35) return 'high';
    if (absScore >= 0.15) return 'medium';
    return 'low';
  }

  private getCurrencyFromCountry(country: string): string {
    const currencyMap: { [key: string]: string } = {
      'United States': 'USD',
      'Eurozone': 'EUR',
      'Germany': 'EUR',
      'France': 'EUR',
      'Italy': 'EUR',
      'Spain': 'EUR',
      'United Kingdom': 'GBP',
      'Japan': 'JPY',
      'Canada': 'CAD',
      'Australia': 'AUD',
      'New Zealand': 'NZD',
      'Switzerland': 'CHF'
    };
    
    return currencyMap[country] || country.slice(0, 3).toUpperCase();
  }

  async updateNewsDatabase(): Promise<void> {
    try {
      const events = await this.fetchEconomicCalendar();
      
      for (const event of events) {
        const eventTime = this.parseEventDateTime(event.date, event.time);
        if (!eventTime) continue;

        const newsEvent: InsertNewsEvent = {
          title: event.title,
          currency: this.getCurrencyFromCountry(event.country),
          impact: event.impact,
          eventTime,
          actual: event.actual || null,
          forecast: event.forecast || null,
          previous: event.previous || null,
          description: `${event.title} - ${event.country}`,
          country: event.country
        };

        await storage.createNewsEvent(newsEvent);
      }
      
      console.log(`Updated ${events.length} news events in database`);
    } catch (error) {
      console.error('Failed to update news database:', error);
    }
  }

  private parseEventDateTime(date: string, time: string): Date | null {
    try {
      // Handle various date/time formats
      const dateStr = date.includes('-') ? date : new Date().toISOString().split('T')[0];
      const timeStr = time.includes(':') ? time : '12:00';
      
      return new Date(`${dateStr}T${timeStr}:00.000Z`);
    } catch (error) {
      console.error('Failed to parse event date/time:', date, time);
      return null;
    }
  }

  async getHighImpactEvents(hoursAhead: number = 24): Promise<any[]> {
    try {
      const events = await storage.getUpcomingNews(hoursAhead);
      return events.filter(event => event.impact === 'high');
    } catch (error) {
      console.error('Failed to get high impact events:', error);
      return [];
    }
  }

  async shouldPauseTradingForNews(symbol: string, minutesAhead: number = 30): Promise<boolean> {
    try {
      // Get currency from symbol (e.g., EURUSD -> EUR, USD)
      const currencies = this.extractCurrenciesFromSymbol(symbol);
      const events = await storage.getUpcomingNews(minutesAhead / 60);
      
      return events.some(event => 
        event.impact === 'high' && 
        currencies.includes(event.currency)
      );
    } catch (error) {
      console.error('Failed to check news pause condition:', error);
      return false;
    }
  }

  private extractCurrenciesFromSymbol(symbol: string): string[] {
    if (symbol.length >= 6) {
      return [symbol.slice(0, 3), symbol.slice(3, 6)];
    }
    return [];
  }

  // Start periodic news updates
  startPeriodicUpdates(intervalMinutes: number = 60): void {
    // Initial update
    this.updateNewsDatabase();
    
    // Set up periodic updates
    setInterval(() => {
      this.updateNewsDatabase();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`News service started with ${intervalMinutes} minute update interval`);
  }
}

export const newsService = new NewsService();
