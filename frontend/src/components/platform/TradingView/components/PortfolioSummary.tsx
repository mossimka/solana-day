import React from "react";

export default function PortfolioSummary({ walletInfo }: { walletInfo: any }) {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <h2 className="text-xl font-bold text-white mb-6">Portfolio Summary</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Value</span>
          <span className="text-2xl font-bold text-white">
            ${walletInfo.totalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">24h Change</span>
          <span className="text-green-400 font-medium">
            +{walletInfo.dailyChange}%
          </span>
        </div>

        <div className="border-t border-gray-700 pt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">SOL Balance</span>
            <span className="text-white">{walletInfo.solBalance} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">USDC Balance</span>
            <span className="text-white">
              {walletInfo.usdcBalance.toLocaleString()} USDC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
