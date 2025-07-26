import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertTriangle, Info, Minus } from "lucide-react";

export default function EconomicCalendar() {
  const { data: upcomingNews, isLoading } = useQuery({
    queryKey: ['/api/news/upcoming'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getImpactIcon = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return <div className="w-3 h-3 bg-danger rounded-full" />;
      case 'medium':
        return <div className="w-3 h-3 bg-warning rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return <span className="text-xs text-warning">Trading Paused</span>;
      case 'medium':
        return <span className="text-xs text-gray-400">Monitoring</span>;
      default:
        return <span className="text-xs text-gray-400">Normal Trading</span>;
    }
  };

  const formatEventTime = (eventTime: string) => {
    const date = new Date(eventTime);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24 && diffHours > 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffHours >= 24) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return 'Past';
    }
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Economic Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-trading-dark rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-600 rounded-full animate-pulse" />
                  <div>
                    <div className="h-4 w-32 bg-gray-600 rounded animate-pulse mb-1" />
                    <div className="h-3 w-24 bg-gray-600 rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-12 bg-gray-600 rounded animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-gray-600 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingNews && upcomingNews.length > 0 ? (
          <div className="space-y-3">
            {upcomingNews.slice(0, 5).map((event: any) => (
              <div 
                key={event.id} 
                className="flex items-center justify-between p-3 bg-trading-dark rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getImpactIcon(event.impact)}
                  <div>
                    <div className="font-medium text-white">{event.title}</div>
                    <div className="text-sm text-gray-400">
                      {event.currency} - {event.impact.charAt(0).toUpperCase() + event.impact.slice(1)} Impact
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatEventTime(event.eventTime)}
                  </div>
                  {getImpactLabel(event.impact)}
                </div>
              </div>
            ))}
            
            {upcomingNews.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>No upcoming high-impact events</p>
                <p className="text-sm">Normal trading conditions</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Unable to load economic calendar</p>
            <p className="text-sm">Check your internet connection</p>
          </div>
        )}
        
        {upcomingNews && upcomingNews.length > 5 && (
          <div className="mt-4 text-center">
            <button className="text-info hover:text-blue-400 text-sm transition-colors">
              View All Events ({upcomingNews.length - 5} more)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
