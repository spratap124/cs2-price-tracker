# Skinport API Integration

## Overview

Skinport offers an official REST API for accessing CS2/CS:GO marketplace data. This can be a good alternative or supplement to Steam's Community Market API.

## Key Information

### Pros ✅
- **Official API** with proper documentation
- **Structured rate limits** (8 requests per 5 minutes per endpoint)
- **No scraping required** - clean JSON responses
- **Better reliability** than Steam's unofficial endpoints

### Cons ⚠️
- **Still has rate limits** (though better documented)
- **Requires authentication** - need Client ID and Client Secret
- **Different pricing** - Skinport prices may differ from Steam Market
- **Currency differences** - May need currency conversion

## Getting Started

### 1. Get API Credentials

1. Go to [Skinport.com](https://skinport.com)
2. Register/Login to your account
3. Navigate to **Settings → API**
4. Generate your **Client ID** and **Client Secret**
5. **Keep them secure** - treat them like passwords!

### 2. Rate Limits

- `/v1/items` endpoint: **8 requests per 5 minutes**
- Responses are **cached for 5 minutes**
- Exceeding limits returns `429 Too Many Requests`

### 3. API Endpoints

**Base URL**: `https://api.skinport.com/v1/`

#### Get Item Prices
```
GET /v1/items
```

**Query Parameters:**
- `app_id` (required): `730` for CS2/CS:GO
- `currency` (optional): Currency code (EUR, USD, etc.)
- `tradable` (optional): Filter tradable items

**Example:**
```bash
curl "https://api.skinport.com/v1/items?app_id=730&currency=EUR" \
  -H "Authorization: Basic BASE64_ENCODED_CLIENT_ID:CLIENT_SECRET"
```

**Authentication:**
Skinport uses [Basic Authentication](https://docs.skinport.com/introduction/authentication):
- Combine Client ID and Client Secret: `clientId:clientSecret`
- Base64 encode the combination
- Use as: `Authorization: Basic <encoded_string>`

**Response:**
```json
[
  {
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "currency": "EUR",
    "suggested_price": 12.50,
    "item_page": "https://skinport.com/item/...",
    "market_page": "https://skinport.com/market/...",
    ...
  }
]
```

## Comparison: Steam vs Skinport

| Feature | Steam API | Skinport API |
|---------|-----------|--------------|
| **Type** | Unofficial/Scraped | Official REST API |
| **Rate Limit** | Very strict (429 errors common) | 8 req/5min (documented) |
| **Auth Required** | No | Yes (Client ID + Secret) |
| **Currency Support** | Good | Good |
| **Price Accuracy** | Steam Market prices | Skinport marketplace prices |
| **Reliability** | Often rate limited | More reliable |

## Implementation Options

### Option 1: Replace Steam with Skinport
- Use Skinport as primary source
- Simpler implementation
- Different prices than Steam

### Option 2: Use Both (Fallback)
- Try Skinport first
- Fall back to Steam if Skinport fails
- More complex but more reliable

### Option 3: Use Both (Price Comparison)
- Track prices from both sources
- Show price differences
- Most complex but most informative

## Currency Conversion

⚠️ **Important**: Skinport prices may be in different currencies than Steam.

- Steam: Uses currency codes (24 = INR, 1 = USD, etc.)
- Skinport: Uses currency symbols (EUR, USD, etc.)

### Supported Currencies

**Skinport ONLY supports these currencies:**
- AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HRK, NOK, PLN, RUB, SEK, TRY, USD

**INR (Indian Rupee) is NOT supported by Skinport API.**

### Automatic Fallback

If you use an unsupported currency (like INR):
- The system will **automatically fallback to USD** for Skinport API calls
- Steam API will still use your configured currency (e.g., INR)
- Prices from Skinport will be in USD, while Steam prices will be in your currency

**To use a different fallback currency**, set:
```env
SKINPORT_FALLBACK_CURRENCY=EUR  # or any supported currency
```

You may need to:
1. Convert currencies using an exchange rate API if comparing prices
2. Track prices in one base currency
3. Display prices in user's preferred currency

## Notes

- Skinport prices reflect **Skinport marketplace**, not Steam Market
- Prices may differ significantly between platforms
- Consider which prices users actually care about (Steam vs third-party markets)
- Credentials provide full account access - keep them secure!

## Documentation Links

- Official Docs: https://docs.skinport.com
- Authentication: https://docs.skinport.com/introduction/authentication
- API Key Setup: https://docs.skinport.com/introduction/api-key
- Items Endpoint: https://docs.skinport.com/items
- Error Handling: https://docs.skinport.com/introduction/errors

