"use client";

import { useState, useEffect } from "react";
import Net from "@/components/ui/Net/Net";
import { useBinanceApi } from "@/hooks/useBinanceApi";
import { 
  Key, 
  Trash2, 
  Plus, 
  Shield,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'apis' | 'security'>('apis');
  const [showAddApiForm, setShowAddApiForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  const { 
    isLoading, 
    hasApiKeys, 
    error, 
    saveBinanceKeys, 
    deleteBinanceKeys, 
    checkApiKeysStatus, 
    clearError 
  } = useBinanceApi();

  // Check API keys status on component mount
  useEffect(() => {
    checkApiKeysStatus();
  }, [checkApiKeysStatus]);

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !secretKey.trim()) {
      return;
    }

    try {
      await saveBinanceKeys({ apiKey: apiKey.trim(), secretKey: secretKey.trim() });
      setApiKey('');
      setSecretKey('');
      setShowAddApiForm(false);
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };

  const handleDeleteApiKeys = async () => {
    if (window.confirm('Are you sure you want to delete your Binance API keys?')) {
      try {
        await deleteBinanceKeys();
      } catch (error) {
        console.error('Failed to delete API keys:', error);
      }
    }
  };

  const tabs = [
    { id: 'apis', label: 'API Management', icon: Key },
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
                onClick={() => setActiveTab(tab.id as 'apis' | 'security')}
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
              {/* Error Display */}
              {error && (
                <div 
                  className="glass p-4 border border-red-500/20 rounded-lg flex items-center gap-3"
                  style={{backgroundColor: 'rgba(239, 68, 68, 0.1)'}}
                >
                  <AlertCircle size={20} className="text-red-500" />
                  <p className="text-red-400">{error}</p>
                  <button 
                    onClick={clearError}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Binance API Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold" style={{color: 'var(--color-text-primary)'}}>
                    Binance API Configuration
                  </h2>
                  {hasApiKeys ? (
                    <button 
                      onClick={handleDeleteApiKeys}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50"
                      style={{backgroundColor: 'var(--color-error)', color: 'white'}}
                    >
                      <Trash2 size={18} />
                      Delete API Keys
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowAddApiForm(!showAddApiForm)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                      style={{background: 'var(--gradient-primary)', color: 'white'}}
                    >
                      <Plus size={18} />
                      Add API Keys
                    </button>
                  )}
                </div>

                {hasApiKeys ? (
                  /* API Keys Configured */
                  <div className="glass p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 size={24} className="text-green-500" />
                      <div>
                        <h3 className="text-lg font-semibold" style={{color: 'var(--color-text-primary)'}}>
                          Binance API Keys Configured
                        </h3>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                          Your Binance API keys are securely stored and ready to use.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white"
                      >
                        Active
                      </span>
                      <span className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                        Service: <span style={{color: 'var(--color-primary)'}}>Binance</span>
                      </span>
                    </div>
                  </div>
                ) : showAddApiForm ? (
                  /* Add API Form */
                  <form onSubmit={handleSaveApiKeys} className="glass p-6 space-y-4">
                    <h3 className="text-lg font-semibold" style={{color: 'var(--color-text-primary)'}}>
                      Add Binance API Keys
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
                        API Key
                      </label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Binance API key"
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-2"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        placeholder="Enter your Binance secret key"
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-2"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isLoading || !apiKey.trim() || !secretKey.trim()}
                        className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50"
                        style={{background: 'var(--gradient-primary)', color: 'white'}}
                      >
                        {isLoading ? 'Saving...' : 'Save API Keys'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddApiForm(false);
                          setApiKey('');
                          setSecretKey('');
                        }}
                        className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* No API Keys State */
                  <div className="glass p-6 text-center">
                    <Key size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-secondary)'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--color-text-primary)'}}>
                      No API Keys Configured
                    </h3>
                    <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>
                      Add your Binance API keys to enable trading and hedging functionality.
                    </p>
                    <button 
                      onClick={() => setShowAddApiForm(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 mx-auto"
                      style={{background: 'var(--gradient-primary)', color: 'white'}}
                    >
                      <Plus size={18} />
                      Add API Keys
                    </button>
                  </div>
                )}
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
