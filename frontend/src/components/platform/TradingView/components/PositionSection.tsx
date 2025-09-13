import React from "react";
import { Activity, MoreHorizontal } from "lucide-react";

interface ActivePosition {
  id: string;
  type: string;
  pnl: number;
  lpPositionSize: string;
  priceRange: string;
  entryDate: string;
  status: string;
}

interface RecentTrade {
  pair: string;
  type: string;
  entry: number;
  pnl: number;
  timeAgo: string;
}

export default function PositionsSection({
  activePosition,
  recentTrades,
}: {
  activePosition: ActivePosition;
  recentTrades: RecentTrade[];
}) {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Active Positions</h2>
        <Activity className="text-purple-400" size={24} />
      </div>

      <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="font-medium text-white">{activePosition.id}</span>
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-medium">
              {activePosition.type}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400 font-bold">
              +${activePosition.pnl.toLocaleString()}
            </span>
            <button className="p-1 hover:bg-gray-600 rounded">
              <MoreHorizontal size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">LP Position Size</div>
            <div className="text-white font-medium">
              ${activePosition.lpPositionSize}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Price Range</div>
            <div className="text-white font-medium">
              {activePosition.priceRange}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Entry Date</div>
            <div className="text-white font-medium">
              {activePosition.entryDate}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Status</div>
            <div className="text-green-400 font-medium">
              {activePosition.status}
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Recent Trades</h3>
        <div className="space-y-2">
          {recentTrades.map((trade, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="text-white font-medium">{trade.pair}</div>
                <div className="text-gray-400">{trade.type}</div>
                <div className="text-gray-400">Entry: ${trade.entry}</div>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`font-medium ${
                    trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
                </div>
                <div className="text-gray-500 text-sm">{trade.timeAgo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
