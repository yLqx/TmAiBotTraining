import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { mockMT5Service as mt5Service } from './mock-mt5-service';
import { storage } from '../storage';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Send initial data
      this.sendToClient(ws, 'connection', { status: 'connected' });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Start real-time updates
    this.startRealTimeUpdates();
    console.log('WebSocket service initialized');
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message.data);
        break;
      case 'ping':
        this.sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleSubscription(ws: WebSocket, data: any): void {
    // Store subscription preferences on the WebSocket object
    (ws as any).subscriptions = data.channels || [];
    this.sendToClient(ws, 'subscribed', { channels: data.channels });
  }

  private startRealTimeUpdates(): void {
    // Update every 2 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.broadcastUpdates();
      } catch (error) {
        console.error('Error broadcasting updates:', error);
      }
    }, 2000);
  }

  private async broadcastUpdates(): Promise<void> {
    if (this.clients.size === 0) return;

    // Get real-time data
    const updates = await this.gatherRealTimeData();

    // Broadcast to all connected clients
    for (const client of Array.from(this.clients)) {
      if (client.readyState === WebSocket.OPEN) {
        for (const update of updates) {
          this.sendToClient(client, update.type, update.data);
        }
      } else {
        this.clients.delete(client);
      }
    }
  }

  private async gatherRealTimeData(): Promise<WebSocketMessage[]> {
    const updates: WebSocketMessage[] = [];

    try {
      // Account info update
      if (mt5Service.getConnectionStatus()) {
        const accountInfo = await mt5Service.getAccountInfo();
        updates.push({
          type: 'accountUpdate',
          data: accountInfo,
          timestamp: new Date().toISOString()
        });

        // Positions update
        const positions = await mt5Service.getPositions();
        updates.push({
          type: 'positionsUpdate',
          data: positions,
          timestamp: new Date().toISOString()
        });

        // Price updates for major pairs
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
        for (const symbol of symbols) {
          try {
            const priceData = await mt5Service.getSymbolInfo(symbol);
            updates.push({
              type: 'priceUpdate',
              data: { ...priceData },
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            // Skip if symbol not available
          }
        }
      }

      // Connection status
      updates.push({
        type: 'connectionStatus',
        data: { connected: mt5Service.getConnectionStatus() },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error gathering real-time data:', error);
      updates.push({
        type: 'error',
        data: { message: 'Failed to fetch real-time data' },
        timestamp: new Date().toISOString()
      });
    }

    return updates;
  }

  private sendToClient(ws: WebSocket, type: string, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(type: string, data: any): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    for (const client of Array.from(this.clients)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      } else {
        this.clients.delete(client);
      }
    }
  }

  // Specific broadcast methods
  broadcastTradeUpdate(trade: any): void {
    this.broadcast('tradeUpdate', trade);
  }

  broadcastBotStatus(accountId: string, status: string): void {
    this.broadcast('botStatus', { accountId, status });
  }

  broadcastNewsAlert(event: any): void {
    this.broadcast('newsAlert', event);
  }

  broadcastError(error: string): void {
    this.broadcast('error', { message: error });
  }

  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('WebSocket service shut down');
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
