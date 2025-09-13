/**
 * Example usage of the Binance API Service
 * 
 * This file demonstrates how to use the binanceApiService and useBinanceApi hook
 * in different scenarios throughout your application.
 */

import React, { useEffect, useState } from 'react';
import { useBinanceApi } from '@/hooks/useBinanceApi';
import { binanceApiService } from '@/services/binanceApiService';

// Example 1: Using the React Hook (Recommended for components)
export function BinanceApiStatusComponent() {
  const { hasApiKeys, isLoading, error, checkApiKeysStatus } = useBinanceApi();

  useEffect(() => {
    checkApiKeysStatus();
  }, [checkApiKeysStatus]);

  if (isLoading) return <div>Checking API status...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Binance API Status</h3>
      <p>Status: {hasApiKeys ? '✅ Configured' : '❌ Not configured'}</p>
    </div>
  );
}

// Example 2: Using the Service Directly (For utility functions, middleware, etc.)
export async function checkBinanceApiStatus(): Promise<boolean> {
  try {
    const result = await binanceApiService.getBinanceKeys();
    return result.hasKeys;
  } catch (error) {
    console.error('Failed to check API status:', error);
    return false;
  }
}

// Example 3: Component with API Key Management
export function BinanceApiManagement() {
  const {
    hasApiKeys,
    isLoading,
    error,
    saveBinanceKeys,
    deleteBinanceKeys,
    checkApiKeysStatus,
    clearError
  } = useBinanceApi();

  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  useEffect(() => {
    checkApiKeysStatus();
  }, [checkApiKeysStatus]);

  const handleSave = async () => {
    try {
      await saveBinanceKeys({ apiKey, secretKey });
      setApiKey('');
      setSecretKey('');
      alert('API keys saved successfully!');
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete API keys?')) {
      try {
        await deleteBinanceKeys();
        alert('API keys deleted successfully!');
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  };

  return (
    <div>
      <h3>Binance API Management</h3>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}

      {hasApiKeys ? (
        <div>
          <p>✅ API keys are configured</p>
          <button onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete API Keys'}
          </button>
        </div>
      ) : (
        <div>
          <p>❌ No API keys configured</p>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
          />
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Secret Key"
          />
          <button 
            onClick={handleSave} 
            disabled={isLoading || !apiKey || !secretKey}
          >
            {isLoading ? 'Saving...' : 'Save API Keys'}
          </button>
        </div>
      )}
    </div>
  );
}

// Example 4: Advanced usage with custom error handling
export function AdvancedBinanceApiComponent() {
  const [status, setStatus] = useState<'loading' | 'configured' | 'not-configured' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setStatus('loading');
        const hasKeys = await binanceApiService.hasApiKeys();
        setStatus(hasKeys ? 'configured' : 'not-configured');
        setErrorMessage('');
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    checkStatus();
  }, []);

  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return <div>🔄 Checking API status...</div>;
      case 'configured':
        return <div>✅ Binance API is ready</div>;
      case 'not-configured':
        return <div>⚠️ Binance API not configured</div>;
      case 'error':
        return <div>❌ Error: {errorMessage}</div>;
      default:
        return null;
    }
  };

  return (
    <div>
      <h3>Advanced Binance API Status</h3>
      {renderStatus()}
    </div>
  );
}

// Example 5: Using in a utility function (for middleware, background tasks, etc.)
export const binanceApiUtils = {
  // Check if API is configured before making trading calls
  async ensureApiConfigured(): Promise<void> {
    const isConfigured = await binanceApiService.hasApiKeys();
    if (!isConfigured) {
      throw new Error('Binance API keys are not configured. Please configure them in settings.');
    }
  },

  // Get API status for dashboard widgets
  async getApiStatusForDashboard() {
    try {
      const result = await binanceApiService.getBinanceKeys();
      return {
        status: result.hasKeys ? 'active' : 'inactive',
        hasKeys: result.hasKeys,
        error: null
      };
    } catch (error) {
      return {
        status: 'error',
        hasKeys: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/*
Usage Examples:

1. In Settings page:
   import { useBinanceApi } from '@/hooks/useBinanceApi';
   const { hasApiKeys, saveBinanceKeys, deleteBinanceKeys } = useBinanceApi();

2. In trading components:
   import { binanceApiUtils } from '@/components/examples/binanceApiExamples';
   await binanceApiUtils.ensureApiConfigured();

3. In dashboard widgets:
   const apiStatus = await binanceApiUtils.getApiStatusForDashboard();

4. Direct service usage:
   import { binanceApiService } from '@/services/binanceApiService';
   const hasKeys = await binanceApiService.hasApiKeys();
*/
