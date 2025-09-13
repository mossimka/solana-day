import axios from '@/lib/axios';

interface BinanceApiKeys {
  apiKey: string;
  secretKey: string;
}

interface BinanceApiResponse {
  message: string;
}

interface BinanceKeysStatusResponse {
  hasKeys: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

export class BinanceApiService {
  private static instance: BinanceApiService;

  private constructor() {}

  public static getInstance(): BinanceApiService {
    if (!BinanceApiService.instance) {
      BinanceApiService.instance = new BinanceApiService();
    }
    return BinanceApiService.instance;
  }

  /**
   * Save Binance API keys
   */
  async saveBinanceKeys(apiKeys: BinanceApiKeys): Promise<BinanceApiResponse> {
    try {
      const response = await axios.post('/liquidity/binance/keys', apiKeys, {
        withCredentials: true
      });
      return response.data;
    } catch (error: unknown) {
      console.error("Save Binance keys error:", error);
      const apiError = error as ApiError;
      const message = apiError.response?.data?.message || apiError.message || "Failed to save Binance API keys";
      throw new Error(message);
    }
  }

  /**
   * Check if Binance API keys are configured
   */
  async getBinanceKeys(): Promise<BinanceKeysStatusResponse> {
    try {
      const response = await axios.get('/liquidity/binance/keys', {
        withCredentials: true
      });
      return response.data;
    } catch (error: unknown) {
      console.error("Get Binance keys error:", error);
      const apiError = error as ApiError;
      
      // If 404, it means no keys found
      if (apiError.response?.status === 404) {
        return { hasKeys: false };
      }
      
      const message = apiError.response?.data?.message || apiError.message || "Failed to get Binance API keys status";
      throw new Error(message);
    }
  }

  /**
   * Delete Binance API keys
   */
  async deleteBinanceKeys(): Promise<BinanceApiResponse> {
    try {
      const response = await axios.delete('/liquidity/binance/keys', {
        withCredentials: true
      });
      return response.data;
    } catch (error: unknown) {
      console.error("Delete Binance keys error:", error);
      const apiError = error as ApiError;
      const message = apiError.response?.data?.message || apiError.message || "Failed to delete Binance API keys";
      throw new Error(message);
    }
  }

  /**
   * Check if keys are configured (convenience method)
   */
  async hasApiKeys(): Promise<boolean> {
    try {
      const result = await this.getBinanceKeys();
      return result.hasKeys;
    } catch (error) {
      console.error("Error checking API keys:", error);
      return false;
    }
  }
}

// Export singleton instance
export const binanceApiService = BinanceApiService.getInstance();
