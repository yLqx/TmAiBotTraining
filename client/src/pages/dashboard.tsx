import { useEffect } from "react";
import TradingHeader from "@/components/trading/TradingHeader";
import Sidebar from "@/components/trading/Sidebar";
import PriceChart from "@/components/trading/PriceChart";
import PerformanceMetrics from "@/components/trading/PerformanceMetrics";
import EconomicCalendar from "@/components/trading/EconomicCalendar";
import OpenPositions from "@/components/trading/OpenPositions";
import TradeHistory from "@/components/trading/TradeHistory";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Dashboard() {
  const { connectionStatus, lastMessage } = useWebSocket();

  useEffect(() => {
    // Set page title
    document.title = "AI Trading Bot - Professional Dashboard";
  }, []);

  return (
    <div className="min-h-screen bg-trading-dark text-white font-inter">
      <TradingHeader />
      
      <div className="flex h-screen">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Live Chart */}
              <div className="lg:col-span-2">
                <PriceChart symbol="EURUSD" />
              </div>

              {/* Performance Metrics */}
              <div>
                <PerformanceMetrics />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Economic Calendar */}
              <div>
                <EconomicCalendar />
              </div>

              {/* Open Positions */}
              <div>
                <OpenPositions />
              </div>
            </div>

            {/* Trade History */}
            <TradeHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
