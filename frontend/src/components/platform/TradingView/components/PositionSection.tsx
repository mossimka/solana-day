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
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{color: 'var(--color-text-primary)'}}>Active Positions</h2>
        <Activity style={{color: 'var(--color-primary)'}} size={24} />
      </div>

      <div className="rounded-lg p-4 mb-4" style={{backgroundColor: 'var(--color-bg-secondary)'}}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="font-medium" style={{color: 'var(--color-text-primary)'}}>
              {activePosition.id}
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium" style={{backgroundColor: 'var(--color-primary)', color: 'var(--color-text-primary)', opacity: 0.2}}>
              {activePosition.type}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400 font-bold">
              +${activePosition.pnl.toLocaleString()}
            </span>
            <button className="p-1 rounded hover:opacity-80" style={{backgroundColor: 'var(--color-surface-hover)'}}>
              <MoreHorizontal size={16} style={{color: 'var(--color-text-secondary)'}} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div style={{color: 'var(--color-text-secondary)'}}>LP Position Size</div>
            <div className="font-medium" style={{color: 'var(--color-text-primary)'}}>
              ${activePosition.lpPositionSize}
            </div>
          </div>
          <div>
            <div style={{color: 'var(--color-text-secondary)'}}>Price Range</div>
            <div className="font-medium" style={{color: 'var(--color-text-primary)'}}>
              {activePosition.priceRange}
            </div>
          </div>
          <div>
            <div style={{color: 'var(--color-text-secondary)'}}>Entry Date</div>
            <div className="font-medium" style={{color: 'var(--color-text-primary)'}}>
              {activePosition.entryDate}
            </div>
          </div>
          <div>
            <div style={{color: 'var(--color-text-secondary)'}}>Status</div>
            <div className="text-green-400 font-medium">
              {activePosition.status}
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3" style={{color: 'var(--color-text-primary)'}}>Recent Trades</h3>
        <div className="space-y-2">
          {recentTrades.map((trade, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{backgroundColor: 'var(--color-bg-secondary)', opacity: 0.5}}
            >
              <div className="flex items-center space-x-3">
                <div className="font-medium" style={{color: 'var(--color-text-primary)'}}>{trade.pair}</div>
                <div style={{color: 'var(--color-text-secondary)'}}>{trade.type}</div>
                <div style={{color: 'var(--color-text-secondary)'}}>Entry: ${trade.entry}</div>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`font-medium ${
                    trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
                </div>
                <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>{trade.timeAgo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
