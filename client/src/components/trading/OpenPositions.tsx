import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp } from "lucide-react";
import { formatPrice, formatCurrency } from "@/lib/trading-api";
import { useToast } from "@/hooks/use-toast";

export default function OpenPositions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions, isLoading } = useQuery({
    queryKey: ['/api/mt5/positions'],
    refetchInterval: 3000,
  });

  const closePositionMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const response = await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to close position');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Position Closed", description: "Position closed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/mt5/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to close position",
        variant: "destructive"
      });
    }
  });

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Open Positions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 bg-trading-dark rounded-lg animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="h-4 w-16 bg-gray-600 rounded" />
                    <div className="h-4 w-12 bg-gray-600 rounded" />
                    <div className="h-4 w-16 bg-gray-600 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-gray-600 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-trading-border hover:bg-transparent">
                  <TableHead className="text-gray-400">Symbol</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Volume</TableHead>
                  <TableHead className="text-gray-400">Entry</TableHead>
                  <TableHead className="text-gray-400">Current</TableHead>
                  <TableHead className="text-gray-400">P&L</TableHead>
                  <TableHead className="text-gray-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position: any) => (
                  <TableRow 
                    key={position.ticket}
                    className="border-trading-border hover:bg-trading-dark transition-colors"
                  >
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={position.type === 'BUY' ? 'default' : 'destructive'}
                        className={position.type === 'BUY' ? 'bg-success hover:bg-green-600' : 'bg-danger hover:bg-red-600'}
                      >
                        {position.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{position.volume}</TableCell>
                    <TableCell>{formatPrice(position.priceOpen)}</TableCell>
                    <TableCell>{formatPrice(position.priceCurrent)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        position.profit >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {position.profit >= 0 ? '+' : ''}{formatCurrency(position.profit)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => closePositionMutation.mutate(position.ticket)}
                        disabled={closePositionMutation.isPending}
                        className="text-danger hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No open positions</p>
            <p className="text-sm">Execute a trade to see positions here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
