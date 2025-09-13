# Binance API Service Documentation

This documentation covers the frontend Binance API service that interacts with the backend endpoints you created.

## Files Created

- **`/src/services/binanceApiService.ts`** - Main service class for API interactions
- **`/src/hooks/useBinanceApi.ts`** - React hook for component integration
- **`/src/components/platform/Settings/Settings.tsx`** - Updated settings page with Binance API management
- **`/src/components/examples/binanceApiExamples.tsx`** - Usage examples

## Backend Endpoints

The service interacts with these backend endpoints:

```typescript
POST / binance / keys; // Save API keys
GET / binance / keys; // Check if keys exist (returns {hasKeys: boolean})
DELETE / binance / keys; // Delete API keys
```

## Service API

### BinanceApiService Class

```typescript
import { binanceApiService } from "@/services/binanceApiService";

// Save API keys
await binanceApiService.saveBinanceKeys({
  apiKey: "your-api-key",
  secretKey: "your-secret-key",
});

// Check if keys exist
const result = await binanceApiService.getBinanceKeys(); // {hasKeys: boolean}

// Delete keys
await binanceApiService.deleteBinanceKeys();

// Convenience method
const hasKeys = await binanceApiService.hasApiKeys(); // boolean
```

### React Hook

```typescript
import { useBinanceApi } from "@/hooks/useBinanceApi";

function MyComponent() {
  const {
    isLoading, // boolean - loading state
    hasApiKeys, // boolean | null - API keys status
    error, // string | null - error message
    saveBinanceKeys, // (keys) => Promise<void>
    deleteBinanceKeys, // () => Promise<void>
    checkApiKeysStatus, // () => Promise<void>
    clearError, // () => void
  } = useBinanceApi();

  // Use the hook...
}
```

## Usage Examples

### 1. Settings Page Integration

The Settings page now includes:

- ✅ Real-time API key status checking
- ✅ Secure API key form (password field for secret)
- ✅ Error handling with user-friendly messages
- ✅ Loading states
- ✅ Delete confirmation

### 2. Component Integration

```typescript
import { useBinanceApi } from "@/hooks/useBinanceApi";

function TradingWidget() {
  const { hasApiKeys, checkApiKeysStatus } = useBinanceApi();

  useEffect(() => {
    checkApiKeysStatus();
  }, []);

  if (!hasApiKeys) {
    return <div>Please configure Binance API keys in Settings</div>;
  }

  return <div>Trading controls here...</div>;
}
```

### 3. Utility Functions

```typescript
import { binanceApiService } from "@/services/binanceApiService";

// In middleware or utility functions
export async function requireBinanceApi() {
  const hasKeys = await binanceApiService.hasApiKeys();
  if (!hasKeys) {
    throw new Error("Binance API not configured");
  }
}
```

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
  await binanceApiService.saveBinanceKeys(keys);
} catch (error) {
  console.error("API Error:", error.message);
  // Error messages are user-friendly:
  // - "Both API key and Secret key are required"
  // - "Failed to save Binance API keys"
  // - Network/connection errors
}
```

## Security Features

- 🔒 **Secure Storage**: Keys are encrypted on the backend
- 🔒 **HTTP-Only Cookies**: Authentication via secure cookies
- 🔒 **Password Fields**: Secret keys never visible in plain text
- 🔒 **No Local Storage**: Keys never stored in browser
- 🔒 **Confirmation Dialogs**: Delete operations require confirmation

## Integration with Existing Auth

The service automatically:

- ✅ Uses existing axios instance with authentication
- ✅ Handles 401 responses appropriately
- ✅ Includes `withCredentials: true` for cookie-based auth
- ✅ Follows same error handling patterns as other services

## Settings Page Features

The updated Settings page includes:

### API Management Tab

- **Status Display**: Shows if API keys are configured
- **Add Keys Form**: Secure form to input API credentials
- **Delete Function**: Remove keys with confirmation
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

### Security Tab (unchanged)

- Two-Factor Authentication
- API Rate Limiting
- Session Management

## State Management

The hook manages these states:

- `isLoading`: For showing loading spinners
- `hasApiKeys`: null (checking), true (configured), false (not configured)
- `error`: Error messages for user display

## Backend Integration

Ensure your backend has:

```typescript
// Controller methods
async saveBinanceKeys(req, res) {
  const { apiKey, secretKey } = req.body;
  // Save encrypted keys
}

async getBinanceKeys(req, res) {
  const keys = await this.service.getBinanceKeys();
  res.json({ hasKeys: !!keys });
}

async deleteBinanceKeys(req, res) {
  await this.service.deleteBinanceKeys();
  res.json({ message: 'Deleted successfully' });
}
```

## Environment Setup

Make sure your axios configuration includes:

```typescript
// In /src/lib/axios.ts
withCredentials: true; // For cookie-based authentication
```

## Next Steps

1. Test the Settings page integration
2. Add the service to trading components
3. Implement proper error boundaries
4. Add loading states to dependent components
5. Consider adding API key validation on the frontend

The service is now ready to be used throughout your application for managing Binance API keys securely!
