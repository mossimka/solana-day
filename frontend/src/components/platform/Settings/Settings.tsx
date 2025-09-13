"use client";

import { useState } from "react";
import Net from "@/components/ui/Net/Net";
import { 
  Key, 
  Wallet, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Plus, 
  Edit, 
  Shield,
  Settings as SettingsIcon,
  ExternalLink
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}

interface WalletConnection {
  id: string;
  name: string;
  address: string;
  type: 'Phantom' | 'Solflare' | 'Ledger' | 'Custom';
  balance: number;
  isConnected: boolean;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'apis' | 'wallets' | 'security'>('apis');
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});

  // Dummy API Keys
  const apiKeys: ApiKey[] = [
    {
      id: '1',
      name: 'Raydium API',
      key: 'sk_live_51H3k2lKjHgF8kL2mN9oP7qR3s4T6u8V0wX2y5Z7a9B1c3D4e6F8g0H2i4',
      service: 'Raydium',
      createdAt: '2024-01-15',
      lastUsed: '2024-01-20',
      status: 'active'
    },
    {
      id: '2',
      name: 'Jupiter API',
      key: 'jp_test_4B7d9E2f8G5h1I6j3K8l1M4n7O0p3Q6r9S2t5U8v1W4x7Y0z3A6b9C2d5E8f',
      service: 'Jupiter',
      createdAt: '2024-01-10',
      lastUsed: '2024-01-18',
      status: 'active'
    },
    {
      id: '3',
      name: 'Orca API',
      key: 'orca_api_9Z8y7X6w5V4u3T2s1R0q9P8o7N6m5L4k3J2i1H0g9F8e7D6c5B4a3Z2y1X0w',
      service: 'Orca',
      createdAt: '2024-01-05',
      lastUsed: '2024-01-12',
      status: 'inactive'
    }
  ];

  // Dummy Wallets
  const wallets: WalletConnection[] = [
    {
      id: '1',
      name: 'Main Wallet',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      type: 'Phantom',
      balance: 125.43,
      isConnected: true
    },
    {
      id: '2',
      name: 'Trading Wallet',
      address: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
      type: 'Solflare',
      balance: 89.76,
      isConnected: true
    },
    {
      id: '3',
      name: 'Cold Storage',
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      type: 'Ledger',
      balance: 1250.00,
      isConnected: false
    }
  ];

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const tabs = [
    { id: 'apis', label: 'API Management', icon: Key },
    { id: 'wallets', label: 'Wallet Connections', icon: Wallet },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <main className="min-h-screen relative pt-20" style={{background: 'var(--color-bg-primary)'}}>
      <Net />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={32} style={{color: 'var(--color-primary)'}} />
            <h1 className="text-4xl font-bold" style={{color: 'var(--color-text-primary)'}}>Settings</h1>
          </div>
          <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
            Manage your API keys, wallet connections, and security preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'apis' | 'wallets' | 'security')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id ? 'text-white' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <IconComponent size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'apis' && (
            <div className="space-y-6">
              {/* Add API Key Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold" style={{color: 'var(--color-text-primary)'}}>API Keys</h2>
                <button 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{background: 'var(--gradient-primary)', color: 'white'}}
                >
                  <Plus size={18} />
                  Add API Key
                </button>
              </div>

              {/* API Keys List */}
              <div className="space-y-4">
                {apiKeys.map((api) => (
                  <div key={api.id} className="glass p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold" style={{color: 'var(--color-text-primary)'}}>{api.name}</h3>
                          <span 
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              api.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {api.status}
                          </span>
                        </div>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          Service: <span style={{color: 'var(--color-primary)'}}>{api.service}</span>
                        </p>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          Created: {api.createdAt} • Last used: {api.lastUsed}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{backgroundColor: 'var(--color-bg-secondary)'}}
                        >
                          <Edit size={16} style={{color: 'var(--color-text-secondary)'}} />
                        </button>
                        <button 
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{backgroundColor: 'var(--color-bg-secondary)'}}
                        >
                          <Trash2 size={16} style={{color: 'var(--color-error)'}} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div 
                        className="flex-1 px-3 py-2 rounded-lg font-mono text-sm"
                        style={{backgroundColor: 'var(--color-bg-secondary)'}}
                      >
                        <span style={{color: 'var(--color-text-primary)'}}>
                          {showApiKey[api.id] ? api.key : '•'.repeat(50)}
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleApiKeyVisibility(api.id)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{backgroundColor: 'var(--color-bg-secondary)'}}
                      >
                        {showApiKey[api.id] ? 
                          <EyeOff size={16} style={{color: 'var(--color-text-secondary)'}} /> : 
                          <Eye size={16} style={{color: 'var(--color-text-secondary)'}} />
                        }
                      </button>
                      <button 
                        onClick={() => copyToClipboard(api.key)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{backgroundColor: 'var(--color-bg-secondary)'}}
                      >
                        <Copy size={16} style={{color: 'var(--color-text-secondary)'}} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-6">
              {/* Add Wallet Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold" style={{color: 'var(--color-text-primary)'}}>Connected Wallets</h2>
                <button 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{background: 'var(--gradient-primary)', color: 'white'}}
                >
                  <Plus size={18} />
                  Connect Wallet
                </button>
              </div>

              {/* Wallets List */}
              <div className="space-y-4">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="glass p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold" style={{color: 'var(--color-text-primary)'}}>{wallet.name}</h3>
                          <span 
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              wallet.isConnected ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {wallet.isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          Type: <span style={{color: 'var(--color-primary)'}}>{wallet.type}</span>
                        </p>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          Balance: <span style={{color: 'var(--color-success)'}}>{wallet.balance} SOL</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{backgroundColor: 'var(--color-bg-secondary)'}}
                        >
                          <Edit size={16} style={{color: 'var(--color-text-secondary)'}} />
                        </button>
                        <button 
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{backgroundColor: 'var(--color-bg-secondary)'}}
                        >
                          <ExternalLink size={16} style={{color: 'var(--color-text-secondary)'}} />
                        </button>
                        <button 
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{backgroundColor: 'var(--color-bg-secondary)'}}
                        >
                          <Trash2 size={16} style={{color: 'var(--color-error)'}} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div 
                        className="flex-1 px-3 py-2 rounded-lg font-mono text-sm"
                        style={{backgroundColor: 'var(--color-bg-secondary)'}}
                      >
                        <span style={{color: 'var(--color-text-primary)'}}>
                          {wallet.address}
                        </span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(wallet.address)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{backgroundColor: 'var(--color-bg-secondary)'}}
                      >
                        <Copy size={16} style={{color: 'var(--color-text-secondary)'}} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold" style={{color: 'var(--color-text-primary)'}}>Security Settings</h2>
              
              {/* Security Options */}
              <div className="space-y-4">
                <div className="glass p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--color-text-primary)'}}>Two-Factor Authentication</h3>
                  <div className="flex justify-between items-center">
                    <p style={{color: 'var(--color-text-secondary)'}}>
                      Add an extra layer of security to your account
                    </p>
                    <button 
                      className="px-4 py-2 rounded-lg font-medium transition-all"
                      style={{background: 'var(--gradient-primary)', color: 'white'}}
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>

                <div className="glass p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--color-text-primary)'}}>API Rate Limiting</h3>
                  <div className="flex justify-between items-center">
                    <p style={{color: 'var(--color-text-secondary)'}}>
                      Current limit: 1000 requests per hour
                    </p>
                    <button 
                      className="px-4 py-2 rounded-lg font-medium transition-all"
                      style={{backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)'}}
                    >
                      Modify Limits
                    </button>
                  </div>
                </div>

                <div className="glass p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--color-text-primary)'}}>Session Management</h3>
                  <div className="flex justify-between items-center">
                    <p style={{color: 'var(--color-text-secondary)'}}>
                      Manage active sessions and login history
                    </p>
                    <button 
                      className="px-4 py-2 rounded-lg font-medium transition-all"
                      style={{backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)'}}
                    >
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
