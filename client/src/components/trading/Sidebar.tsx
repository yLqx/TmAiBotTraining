import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Sidebar() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [volume, setVolume] = useState("0.1");
  const [riskPerTrade, setRiskPerTrade] = useState("1");
  const [maxDailyLoss, setMaxDailyLoss] = useState("5");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: botStatus } = useQuery({
    queryKey: ['/api/bot/default-account/status'],
    refetchInterval: 3000,
  });

  const startBotMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bot/default-account/start', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to start bot');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Bot Started", description: "Trading bot is now running" });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/default-account/status'] });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to start trading bot",
        variant: "destructive"
      });
    }
  });

  const executeTradeMutation = useMutation({
    mutationFn: async ({ type }: { type: 'BUY' | 'SELL' }) => {
      const response = await fetch('/api/trades/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol,
          type,
          volume: parseFloat(volume),
          accountId: 'default-account'
        })
      });
      if (!response.ok) throw new Error('Trade execution failed');
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({ 
        title: "Trade Executed", 
        description: `${variables.type} ${symbol} executed successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mt5/positions'] });
    },
    onError: () => {
      toast({ 
        title: "Trade Failed", 
        description: "Failed to execute trade",
        variant: "destructive"
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bot/default-account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          riskPerTrade: parseFloat(riskPerTrade),
          maxDailyLoss: parseFloat(maxDailyLoss),
          tradingSymbols: [symbol]
        })
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Updated", description: "Risk management settings saved" });
    }
  });

  return (
    <div className="w-64 bg-trading-card border-r border-trading-border p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Bot Status */}
        <Card className="bg-trading-dark border-trading-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Bot Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <span className={`text-sm font-medium ${
                botStatus?.status === 'running' ? 'text-success' : 'text-gray-400'
              }`}>
                {botStatus?.status === 'running' ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Strategy</span>
              <span className="text-sm text-gray-300">MA Crossover</span>
            </div>
            <div className="pt-2">
              <Button 
                className="w-full bg-success hover:bg-green-600 text-white"
                onClick={() => startBotMutation.mutate()}
                disabled={startBotMutation.isPending || botStatus?.status === 'running'}
              >
                <Play className="w-4 h-4 mr-2" />
                {startBotMutation.isPending ? 'Starting...' : 'Start Bot'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Trading */}
        <Card className="bg-trading-dark border-trading-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Manual Trading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-400">Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-full bg-trading-card border-trading-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                  <SelectItem value="USDCHF">USDCHF</SelectItem>
                  <SelectItem value="AUDUSD">AUDUSD</SelectItem>
                  <SelectItem value="USDCAD">USDCAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">Volume</Label>
              <Input 
                type="number" 
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                step="0.01"
                className="w-full bg-trading-card border-trading-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="bg-success hover:bg-green-600 text-white"
                onClick={() => executeTradeMutation.mutate({ type: 'BUY' })}
                disabled={executeTradeMutation.isPending}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                BUY
              </Button>
              <Button 
                className="bg-danger hover:bg-red-600 text-white"
                onClick={() => executeTradeMutation.mutate({ type: 'SELL' })}
                disabled={executeTradeMutation.isPending}
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                SELL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Risk Settings */}
        <Card className="bg-trading-dark border-trading-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Risk Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-400">Risk per Trade (%)</Label>
              <Input 
                type="number" 
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(e.target.value)}
                step="0.1"
                className="w-full bg-trading-card border-trading-border"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Max Daily Loss (%)</Label>
              <Input 
                type="number" 
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
                step="0.1"
                className="w-full bg-trading-card border-trading-border"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Updating...' : 'Update Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
