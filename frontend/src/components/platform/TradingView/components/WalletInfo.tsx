import React from "react";
import { Wallet, Settings } from "lucide-react";

interface WalletInfo {
  address: string;
}

export default function WalletInfo({ walletInfo }: { walletInfo: WalletInfo }) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{color: 'var(--color-text-primary)'}}>Wallet</h2>
        <Wallet style={{color: 'var(--color-primary)'}} size={24} />
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Active Wallet</div>
          <div className="font-mono text-sm" style={{color: 'var(--color-text-primary)'}}>
            {walletInfo.address}
          </div>
        </div>

        <div className="flex space-x-2">
          <button className="flex-1 py-2 rounded-lg font-medium hover:opacity-80 transition-colors" style={{backgroundColor: 'var(--color-primary)', color: 'var(--color-text-primary)', opacity: 0.2}}>
            Switch Wallet
          </button>
          <button className="p-2 rounded-lg hover:opacity-80 transition-colors" style={{backgroundColor: 'var(--color-bg-secondary)'}}>
            <Settings size={16} style={{color: 'var(--color-text-secondary)'}} />
          </button>
        </div>
      </div>
    </div>
  );
}
