import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPrice, formatPercentage, type PriceData } from "@/lib/trading-api";
import { useWebSocket } from "@/hooks/use-websocket";

interface PriceChartProps {
  symbol: string;
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const { lastMessage } = useWebSocket();

  const { data: symbolInfo, isLoading } = useQuery<PriceData>({
    queryKey: ['/api/mt5/symbol', symbol],
    refetchInterval: 2000,
  });

  const { data: priceHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/prices', symbol],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!canvasRef.current || !symbolInfo) return;

    // Import Chart.js dynamically
    import('chart.js/auto').then(({ default: Chart }) => {
      const ctx = canvasRef.current!.getContext('2d')!;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create simple live price display since we don't have historical data yet
      const now = new Date();
      const mockData = Array.from({ length: 24 }, (_, i) => {
        const time = new Date(now.getTime() - (24 - i) * 60000); // Last 24 minutes
        const basePrice = symbolInfo.bid;
        const variation = (Math.random() - 0.5) * 0.001; // Small random variation
        return {
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: basePrice + variation
        };
      });

      // Create chart data
      const chartData = {
        labels: mockData.map(d => d.time),
        datasets: [{
          label: symbol,
          data: mockData.map(d => d.price),
          borderColor: 'hsl(158, 100%, 42%)', // success color
          backgroundColor: 'hsla(158, 100%, 42%, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        }]
      };

      // Create new chart
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'hsl(240, 10%, 3.9%)',
              titleColor: 'hsl(0, 0%, 98%)',
              bodyColor: 'hsl(0, 0%, 98%)',
              borderColor: 'hsl(240, 3.7%, 15.9%)',
              borderWidth: 1,
            }
          },
          scales: {
            x: {
              grid: {
                color: 'hsl(240, 3.7%, 15.9%)',
                borderColor: 'hsl(240, 3.7%, 15.9%)'
              },
              ticks: {
                color: 'hsl(240, 5%, 64.9%)',
                maxTicksLimit: 8
              }
            },
            y: {
              grid: {
                color: 'hsl(240, 3.7%, 15.9%)',
                borderColor: 'hsl(240, 3.7%, 15.9%)'
              },
              ticks: {
                color: 'hsl(240, 5%, 64.9%)',
                callback: function(value) {
                  return typeof value === 'number' ? value.toFixed(5) : value;
                }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [priceHistory, symbol]);

  // Update chart with real-time data from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'priceUpdate' && 
        lastMessage.data.symbol === symbol && 
        chartRef.current) {
      
      const chart = chartRef.current;
      const newPrice = lastMessage.data.bid;
      const newTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Add new data point
      chart.data.labels.push(newTime);
      chart.data.datasets[0].data.push(newPrice);

      // Keep only last 24 points
      if (chart.data.labels.length > 24) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }

      chart.update('none'); // Update without animation for real-time feel
    }
  }, [lastMessage, symbol]);

  const currentPrice = symbolInfo?.bid || 0;
  const previousPrice = priceHistory?.[priceHistory.length - 2]?.close || currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice ? (change / previousPrice) * 100 : 0;

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{symbol} Live Chart</h3>
          {isLoading ? (
            <div className="flex items-center space-x-4">
              <div className="h-8 w-24 bg-gray-600 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-600 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-success">
                {formatPrice(currentPrice)}
              </span>
              <span className={`text-sm ${change >= 0 ? 'text-profit' : 'text-loss'}`}>
                {change >= 0 ? '+' : ''}{formatPrice(change)} ({formatPercentage(changePercent)})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}
