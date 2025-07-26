import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertCircle, Power } from "lucide-react";
import { formatCurrency, type MT5AccountInfo, type SystemStatus } from "@/lib/trading-api";

export default function TradingHeader() {
  const { data: accountInfo, isLoading } = useQuery<MT5AccountInfo>({
    queryKey: ['/api/mt5/account-info'],
    refetchInterval: 2000,
  });

  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 5000,
  });

  const handleStopBot = async () => {
    try {
      await fetch('/api/bot/default-account/stop', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to stop bot:', error);
    }
  };

  return (
    <header className="bg-trading-card border-b border-trading-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-white">AI Trading Bot</h1>
          <div className="flex items-center space-x-4">
            <div 
              className={`w-3 h-3 rounded-full animate-pulse ${
                systemStatus?.mt5Connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-300">
              {systemStatus?.mt5Connected ? 'Connected to MT5' : 'MT5 Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {isLoading ? (
            <div className="flex space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-400">Account Balance</div>
                <div className="h-6 w-24 bg-gray-600 rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Equity</div>
                <div className="h-6 w-24 bg-gray-600 rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">P&L Today</div>
                <div className="h-6 w-24 bg-gray-600 rounded animate-pulse" />
              </div>
            </div>
          ) : accountInfo ? (
            <>
              <div className="text-right">
                <div className="text-sm text-gray-400">Account Balance</div>
                <div className="text-lg font-semibold text-success">
                  {formatCurrency(accountInfo.balance)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Equity</div>
                <div className="text-lg font-semibold text-white">
                  {formatCurrency(accountInfo.equity)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">P&L Today</div>
                <div className={`text-lg font-semibold ${
                  accountInfo.profit >= 0 ? 'text-profit' : 'text-loss'
                }`}>
                  {accountInfo.profit >= 0 ? '+' : ''}{formatCurrency(accountInfo.profit)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2 text-yellow-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">No account data</span>
            </div>
          )}
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleStopBot}
            className="bg-danger hover:bg-red-600"
          >
            <Power className="w-4 h-4 mr-2" />
            Stop Bot
          </Button>
        </div>
      </div>
    </header>
  );
}
