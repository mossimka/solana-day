import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PairData {
  symbol: string;
  currentPrice: number;
  change24h: number;
  changeAmount: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export default function PairHeader({ pairData }: { pairData: PairData }) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{color: 'var(--color-text-primary)'}}>
            {pairData.symbol}
          </h1>
          <div className="flex items-center space-x-6">
            <div className="text-3xl font-bold" style={{color: 'var(--color-text-primary)'}}>
              ${pairData.currentPrice.toFixed(2)}
            </div>
            <div
              className={`flex items-center space-x-1 ${
                pairData.change24h >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {pairData.change24h >= 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
              <span className="font-semibold">
                +{pairData.change24h}% (+${pairData.changeAmount})
              </span>
            </div>
          </div>
        </div>
        <div className="text-right space-y-1 text-sm">
          <div style={{color: 'var(--color-text-secondary)'}}>
            24h High:{" "}
            <span className="text-green-400">${pairData.high24h}</span>
          </div>
          <div style={{color: 'var(--color-text-secondary)'}}>
            24h Low: <span className="text-red-400">${pairData.low24h}</span>
          </div>
          <div style={{color: 'var(--color-text-secondary)'}}>
            Volume:{" "}
            <span style={{color: 'var(--color-primary)'}}>
              {pairData.volume.toLocaleString()} SOL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
