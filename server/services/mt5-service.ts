import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';

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

export interface MT5TradeRequest {
  action: 'TRADE_ACTION_DEAL';
  symbol: string;
  volume: number;
  type: 'ORDER_TYPE_BUY' | 'ORDER_TYPE_SELL';
  price?: number;
  deviation?: number;
  sl?: number;
  tp?: number;
  comment?: string;
  magic?: number;
}

export interface MT5PriceData {
  symbol: string;
  time: Date;
  bid: number;
  ask: number;
  last: number;
  volume: number;
}

export class MT5Service extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor() {
    super();
  }

  async initialize(): Promise<boolean> {
    try {
      // Create Python script for MT5 integration
      const scriptPath = await this.createMT5Script();
      
      // Start Python process
      this.pythonProcess = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Handle process events
      this.pythonProcess.stdout?.on('data', this.handleStdout.bind(this));
      this.pythonProcess.stderr?.on('data', this.handleStderr.bind(this));
      this.pythonProcess.on('close', this.handleClose.bind(this));
      this.pythonProcess.on('error', this.handleError.bind(this));

      // Send initialization command
      await this.sendCommand('INIT', {
        login: process.env.MT5_LOGIN || '',
        password: process.env.MT5_PASSWORD || '',
        server: process.env.MT5_SERVER || 'FXTM-Demo'
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize MT5 service:', error);
      return false;
    }
  }

  private async createMT5Script(): Promise<string> {
    const scriptContent = `
import MetaTrader5 as mt5
import json
import sys
import time
from datetime import datetime

class MT5Bridge:
    def __init__(self):
        self.connected = False
    
    def initialize(self, params):
        try:
            if not mt5.initialize():
                return {"error": "Failed to initialize MT5"}
            
            # Connect to account if credentials provided
            if params.get('login') and params.get('password'):
                if not mt5.login(int(params['login']), params['password'], params['server']):
                    return {"error": f"Failed to login: {mt5.last_error()}"}
            
            self.connected = True
            return {"success": True, "message": "MT5 initialized successfully"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_account_info(self):
        try:
            if not self.connected:
                return {"error": "Not connected to MT5"}
            
            account_info = mt5.account_info()
            if account_info is None:
                return {"error": "Failed to get account info"}
            
            return {
                "balance": account_info.balance,
                "equity": account_info.equity,
                "margin": account_info.margin,
                "free_margin": account_info.margin_free,
                "margin_level": account_info.margin_level,
                "profit": account_info.profit,
                "login": str(account_info.login),
                "server": account_info.server,
                "currency": account_info.currency,
                "company": account_info.company,
                "name": account_info.name
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_positions(self):
        try:
            if not self.connected:
                return {"error": "Not connected to MT5"}
            
            positions = mt5.positions_get()
            if positions is None:
                return {"positions": []}
            
            result = []
            for pos in positions:
                result.append({
                    "ticket": str(pos.ticket),
                    "symbol": pos.symbol,
                    "type": "BUY" if pos.type == 0 else "SELL",
                    "volume": pos.volume,
                    "priceOpen": pos.price_open,
                    "priceCurrent": pos.price_current,
                    "profit": pos.profit,
                    "swap": pos.swap,
                    "commission": pos.commission,
                    "comment": pos.comment,
                    "time": datetime.fromtimestamp(pos.time).isoformat()
                })
            
            return {"positions": result}
        except Exception as e:
            return {"error": str(e)}
    
    def send_order(self, request):
        try:
            if not self.connected:
                return {"error": "Not connected to MT5"}
            
            # Prepare request
            mt5_request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": request["symbol"],
                "volume": request["volume"],
                "type": mt5.ORDER_TYPE_BUY if request["type"] == "ORDER_TYPE_BUY" else mt5.ORDER_TYPE_SELL,
                "deviation": request.get("deviation", 20),
                "magic": request.get("magic", 234000),
                "comment": request.get("comment", "Python order"),
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            
            # Add price if specified
            if "price" in request:
                mt5_request["price"] = request["price"]
            
            # Add SL/TP if specified
            if "sl" in request:
                mt5_request["sl"] = request["sl"]
            if "tp" in request:
                mt5_request["tp"] = request["tp"]
            
            # Send order
            result = mt5.order_send(mt5_request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                return {"error": f"Order failed: {result.comment}"}
            
            return {
                "ticket": str(result.order),
                "volume": result.volume,
                "price": result.price,
                "comment": result.comment
            }
        except Exception as e:
            return {"error": str(e)}
    
    def close_position(self, ticket):
        try:
            if not self.connected:
                return {"error": "Not connected to MT5"}
            
            # Get position info
            positions = mt5.positions_get(ticket=int(ticket))
            if not positions:
                return {"error": "Position not found"}
            
            position = positions[0]
            
            # Prepare close request
            close_request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": position.symbol,
                "volume": position.volume,
                "type": mt5.ORDER_TYPE_SELL if position.type == 0 else mt5.ORDER_TYPE_BUY,
                "position": int(ticket),
                "deviation": 20,
                "magic": 234000,
                "comment": "Close position",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            
            result = mt5.order_send(close_request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                return {"error": f"Close failed: {result.comment}"}
            
            return {"success": True, "ticket": str(result.order)}
        except Exception as e:
            return {"error": str(e)}
    
    def get_symbol_info(self, symbol):
        try:
            if not self.connected:
                return {"error": "Not connected to MT5"}
            
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info is None:
                return {"error": f"Symbol {symbol} not found"}
            
            tick = mt5.symbol_info_tick(symbol)
            if tick is None:
                return {"error": f"No tick data for {symbol}"}
            
            return {
                "symbol": symbol,
                "bid": tick.bid,
                "ask": tick.ask,
                "last": tick.last,
                "volume": tick.volume,
                "time": datetime.fromtimestamp(tick.time).isoformat(),
                "spread": symbol_info.spread,
                "digits": symbol_info.digits
            }
        except Exception as e:
            return {"error": str(e)}

# Main loop
bridge = MT5Bridge()

while True:
    try:
        line = sys.stdin.readline().strip()
        if not line:
            continue
        
        data = json.loads(line)
        command = data.get("command")
        params = data.get("params", {})
        
        if command == "INIT":
            result = bridge.initialize(params)
        elif command == "ACCOUNT_INFO":
            result = bridge.get_account_info()
        elif command == "POSITIONS":
            result = bridge.get_positions()
        elif command == "SEND_ORDER":
            result = bridge.send_order(params)
        elif command == "CLOSE_POSITION":
            result = bridge.close_position(params["ticket"])
        elif command == "SYMBOL_INFO":
            result = bridge.get_symbol_info(params["symbol"])
        elif command == "SHUTDOWN":
            mt5.shutdown()
            break
        else:
            result = {"error": f"Unknown command: {command}"}
        
        result["command"] = command
        result["timestamp"] = datetime.now().isoformat()
        print(json.dumps(result))
        sys.stdout.flush()
        
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON"}))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.stdout.flush()
`;

    const fs = await import('fs');
    const scriptPath = path.join(process.cwd(), 'mt5_bridge.py');
    fs.writeFileSync(scriptPath, scriptContent);
    return scriptPath;
  }

  private handleStdout(data: Buffer) {
    const output = data.toString().trim();
    if (!output) return;

    try {
      const result = JSON.parse(output);
      this.emit('message', result);

      // Handle connection status
      if (result.command === 'INIT') {
        this.isConnected = !result.error;
        this.emit('connectionStatus', this.isConnected);
      }
    } catch (error) {
      console.error('Failed to parse MT5 output:', output);
    }
  }

  private handleStderr(data: Buffer) {
    console.error('MT5 Error:', data.toString());
  }

  private handleClose(code: number | null) {
    console.log(`MT5 process closed with code ${code}`);
    this.isConnected = false;
    this.emit('connectionStatus', false);
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.initialize(), this.reconnectDelay);
    }
  }

  private handleError(error: Error) {
    console.error('MT5 process error:', error);
    this.emit('error', error);
  }

  private async sendCommand(command: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.pythonProcess || !this.pythonProcess.stdin) {
        reject(new Error('MT5 process not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 30000);

      const handler = (result: any) => {
        if (result.command === command) {
          clearTimeout(timeout);
          this.off('message', handler);
          resolve(result);
        }
      };

      this.on('message', handler);

      const commandData = JSON.stringify({ command, params });
      this.pythonProcess.stdin.write(commandData + '\n');
    });
  }

  async getAccountInfo(): Promise<MT5AccountInfo> {
    const result = await this.sendCommand('ACCOUNT_INFO');
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  async getPositions(): Promise<MT5Position[]> {
    const result = await this.sendCommand('POSITIONS');
    if (result.error) {
      throw new Error(result.error);
    }
    return result.positions;
  }

  async sendOrder(request: MT5TradeRequest): Promise<any> {
    const result = await this.sendCommand('SEND_ORDER', request);
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  async closePosition(ticket: string): Promise<any> {
    const result = await this.sendCommand('CLOSE_POSITION', { ticket });
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  async getSymbolInfo(symbol: string): Promise<MT5PriceData> {
    const result = await this.sendCommand('SYMBOL_INFO', { symbol });
    if (result.error) {
      throw new Error(result.error);
    }
    return {
      symbol: result.symbol,
      time: new Date(result.time),
      bid: result.bid,
      ask: result.ask,
      last: result.last,
      volume: result.volume
    };
  }

  async shutdown(): Promise<void> {
    if (this.pythonProcess) {
      await this.sendCommand('SHUTDOWN');
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const mt5Service = new MT5Service();
