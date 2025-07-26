import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage, formatCurrency, type MT5AccountInfo } from "@/lib/trading-api";

export default function PerformanceMetrics() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const { data: accountInfo } = useQuery<MT5AccountInfo>({
    queryKey: ['/api/mt5/account-info'],
    refetchInterval: 2000,
  });

  const { data: trades = [] } = useQuery<any[]>({
    queryKey: ['/api/trades/default-account'],
    refetchInterval: 5000,
  });

  // Calculate performance metrics
  const performanceData = trades ? calculatePerformance(trades) : null;

  useEffect(() => {
    if (!canvasRef.current || !accountInfo) return;

    import('chart.js/auto').then(({ default: Chart }) => {
      const ctx = canvasRef.current!.getContext('2d')!;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Mock equity curve data - in real app, this would come from trade history
      const equityData = generateEquityCurve(accountInfo.balance, accountInfo.equity);

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: equityData.labels,
          datasets: [{
            label: 'Equity',
            data: equityData.values,
            borderColor: 'hsl(142, 76%, 36%)', // profit color
            backgroundColor: 'hsla(142, 76%, 36%, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'hsl(240, 10%, 3.9%)',
              titleColor: 'hsl(0, 0%, 98%)',
              bodyColor: 'hsl(0, 0%, 98%)',
              borderColor: 'hsl(240, 3.7%, 15.9%)',
              borderWidth: 1,
            }
          },
          scales: {
            x: { display: false },
            y: { 
              display: false,
              beginAtZero: false
            }
          }
        }
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [accountInfo]);

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Win Rate</span>
            <span className="text-success font-semibold">
              {performanceData ? formatPercentage(performanceData.winRate) : '0%'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Trades</span>
            <span className="font-semibold">
              {performanceData ? performanceData.totalTrades : 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Profit Factor</span>
            <span className="text-success font-semibold">
              {performanceData ? performanceData.profitFactor.toFixed(2) : '0.00'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Max Drawdown</span>
            <span className="text-loss font-semibold">
              {performanceData ? formatPercentage(performanceData.maxDrawdown) : '0%'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total P&L</span>
            <span className={`font-semibold ${
              accountInfo?.profit && accountInfo.profit >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {accountInfo ? formatCurrency(accountInfo.profit) : '$0.00'}
            </span>
          </div>
        </div>
        
        <div className="h-32 mt-4">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function calculatePerformance(trades: any[]) {
  const closedTrades = trades.filter(trade => trade.status === 'closed');
  const totalTrades = closedTrades.length;
  
  if (totalTrades === 0) {
    return {
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      maxDrawdown: 0
    };
  }

  const winningTrades = closedTrades.filter(trade => parseFloat(trade.profit || '0') > 0);
  const losingTrades = closedTrades.filter(trade => parseFloat(trade.profit || '0') < 0);
  
  const winRate = (winningTrades.length / totalTrades) * 100;
  
  const totalProfit = winningTrades.reduce((sum, trade) => 
    sum + parseFloat(trade.profit || '0'), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => 
    sum + parseFloat(trade.profit || '0'), 0));
  
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99.99 : 0;
  
  // Calculate max drawdown (simplified)
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  for (const trade of closedTrades) {
    runningPnL += parseFloat(trade.profit || '0');
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = ((peak - runningPnL) / Math.max(peak, 1)) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    winRate,
    totalTrades,
    profitFactor,
    maxDrawdown
  };
}

function generateEquityCurve(balance: number, equity: number) {
  // Generate mock equity curve - in real app, use historical data
  const points = 30;
  const labels = [];
  const values = [];
  
  const startBalance = balance * 0.95; // Assume 5% growth
  const endBalance = equity;
  
  for (let i = 0; i < points; i++) {
    labels.push(i === 0 ? 'Start' : i === points - 1 ? 'Now' : '');
    const progress = i / (points - 1);
    // Add some volatility to the curve
    const volatility = (Math.sin(i * 0.5) * 0.02 + Math.random() * 0.01 - 0.005);
    const value = startBalance + (endBalance - startBalance) * progress + (startBalance * volatility);
    values.push(Math.max(value, startBalance * 0.9)); // Prevent going too low
  }
  
  return { labels, values };
}
