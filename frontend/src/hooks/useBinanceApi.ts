import { useState, useCallback } from 'react';
import { binanceApiService } from '@/services/binanceApiService';

interface BinanceApiKeys {
  apiKey: string;
  secretKey: string;
}

interface UseBinanceApiReturn {
  isLoading: boolean;
  hasApiKeys: boolean | null;
  error: string | null;
  saveBinanceKeys: (apiKeys: BinanceApiKeys) => Promise<void>;
  deleteBinanceKeys: () => Promise<void>;
  checkApiKeysStatus: () => Promise<void>;
  clearError: () => void;
}

export function useBinanceApi(): UseBinanceApiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const saveBinanceKeys = useCallback(async (apiKeys: BinanceApiKeys) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await binanceApiService.saveBinanceKeys(apiKeys);
      
      // After successful save, update the status
      setHasApiKeys(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save Binance API keys';
      setError(errorMessage);
      throw err; // Re-throw so components can handle it if needed
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBinanceKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await binanceApiService.deleteBinanceKeys();
      
      // After successful deletion, update the status
      setHasApiKeys(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete Binance API keys';
      setError(errorMessage);
      throw err; // Re-throw so components can handle it if needed
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkApiKeysStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await binanceApiService.getBinanceKeys();
      setHasApiKeys(result.hasKeys);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check API keys status';
      setError(errorMessage);
      setHasApiKeys(false); // Assume no keys if we can't check
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    hasApiKeys,
    error,
    saveBinanceKeys,
    deleteBinanceKeys,
    checkApiKeysStatus,
    clearError,
  };
}
