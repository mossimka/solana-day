import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function PairHeader({ pairData }: { pairData: any }) {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {pairData.symbol}
          </h1>
          <div className="flex items-center space-x-6">
            <div className="text-3xl font-bold text-white">
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
          <div className="text-gray-400">
            24h High:{" "}
            <span className="text-green-400">${pairData.high24h}</span>
          </div>
          <div className="text-gray-400">
            24h Low: <span className="text-red-400">${pairData.low24h}</span>
          </div>
          <div className="text-gray-400">
            Volume:{" "}
            <span className="text-purple-400">
              {pairData.volume.toLocaleString()} SOL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
