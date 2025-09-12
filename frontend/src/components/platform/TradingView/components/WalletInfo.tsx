import React from "react";
import { Wallet, Settings } from "lucide-react";

export default function WalletInfo({ walletInfo }: { walletInfo: any }) {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Wallet</h2>
        <Wallet className="text-purple-400" size={24} />
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-gray-400 text-sm">Active Wallet</div>
          <div className="text-white font-mono text-sm">
            {walletInfo.address}
          </div>
        </div>

        <div className="flex space-x-2">
          <button className="flex-1 bg-purple-600/20 text-purple-400 py-2 rounded-lg font-medium hover:bg-purple-600/30 transition-colors">
            Switch Wallet
          </button>
          <button className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
