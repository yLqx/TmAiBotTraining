import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, ExternalLink } from "lucide-react";
import { formatPrice, formatCurrency, formatDateTime } from "@/lib/trading-api";

export default function TradeHistory() {
  const { data: trades, isLoading } = useQuery({
    queryKey: ['/api/trades/default-account'],
    refetchInterval: 10000,
  });

  const recentTrades = trades?.slice(0, 10) || [];

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <History className="w-5 h-5 mr-2" />
            Recent Trades
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-info hover:text-blue-400 hover:bg-blue-500/10"
          >
            View All Trades
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 bg-trading-dark rounded-lg animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="h-4 w-16 bg-gray-600 rounded" />
                    <div className="h-4 w-12 bg-gray-600 rounded" />
                    <div className="h-4 w-16 bg-gray-600 rounded" />
                    <div className="h-4 w-20 bg-gray-600 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-gray-600 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-trading-border hover:bg-transparent">
                  <TableHead className="text-gray-400">Time</TableHead>
                  <TableHead className="text-gray-400">Symbol</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Volume</TableHead>
                  <TableHead className="text-gray-400">Entry Price</TableHead>
                  <TableHead className="text-gray-400">Exit Price</TableHead>
                  <TableHead className="text-gray-400">P&L</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade: any) => (
                  <TableRow 
                    key={trade.id}
                    className="border-trading-border hover:bg-trading-dark transition-colors"
                  >
                    <TableCell className="text-sm">
                      {formatDateTime(trade.openTime)}
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={trade.type === 'BUY' ? 'default' : 'destructive'}
                        className={trade.type === 'BUY' ? 'bg-success hover:bg-green-600' : 'bg-danger hover:bg-red-600'}
                      >
                        {trade.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{trade.volume}</TableCell>
                    <TableCell>{formatPrice(parseFloat(trade.entryPrice))}</TableCell>
                    <TableCell>
                      {trade.exitPrice ? formatPrice(parseFloat(trade.exitPrice)) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        parseFloat(trade.profit || '0') >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {parseFloat(trade.profit || '0') >= 0 ? '+' : ''}{formatCurrency(parseFloat(trade.profit || '0'))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={trade.status === 'closed' ? 'default' : 'secondary'}
                        className={
                          trade.status === 'closed' 
                            ? parseFloat(trade.profit || '0') >= 0 
                              ? 'bg-success hover:bg-green-600' 
                              : 'bg-loss hover:bg-red-600'
                            : 'bg-warning hover:bg-yellow-600'
                        }
                      >
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No trade history</p>
            <p className="text-sm">Your completed trades will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
