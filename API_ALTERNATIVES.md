# CS2 Price Tracking API Alternatives

## Current Implementation

The application currently uses Steam's Community Market API (`steamcommunity.com/market/priceoverview/`), which is **not an official API** and has strict rate limiting. Even with proper delays, you may encounter 429 (rate limit) errors when checking multiple items.

## Improved Rate Limiting (Current Solution)

The codebase now includes:

1. **Built-in retry logic** with exponential backoff
2. **Request caching** (5-minute cache to reduce redundant calls)
3. **Minimum request intervals** (configurable, default 5 seconds)
4. **Automatic rate limit handling** with proper wait times

### Configuration

Add these to your `.env` file:

```env
# Minimum time between API requests (milliseconds)
STEAM_API_MIN_INTERVAL_MS=5000

# Enable debug logging for Steam API
DEBUG_STEAM=true
```

## Alternative API Options

Unfortunately, **truly free APIs without rate limits for CS2 prices don't exist**. However, here are some alternatives:

### 1. **Steam Web API (Official) - Requires API Key**

- **URL**: `https://api.steampowered.com/`
- **Rate Limit**: More lenient than community market, but still has limits
- **Cost**: Free (requires Steam API key)
- **Limitations**: Doesn't directly provide market prices - you'd need to scrape or use market endpoints

### 2. **Third-Party Market APIs**

#### CSFloat Market API
- **Website**: https://csfloat.com/
- **Rate Limit**: Has rate limits, but may be more generous
- **Cost**: Free tier available (with limits)
- **Note**: Requires registration, different pricing than Steam

#### Buff163 API
- **Website**: https://buff.163.com/
- **Rate Limit**: Has rate limits
- **Cost**: Free tier with limits
- **Note**: Chinese market, different pricing than Steam

#### SkinBaron API
- **Website**: https://skinbaron.de/
- **Rate Limit**: Has rate limits
- **Cost**: May require API access (check their docs)

### 3. **Self-Hosted Solutions**

#### Steam Market Scraping with Proxies
- Use rotating proxy services to distribute requests
- **Cost**: Proxy services cost money (e.g., Bright Data, Smartproxy)
- **Complexity**: Higher setup complexity

#### Batch Processing with Longer Intervals
- Process items in smaller batches
- Increase check intervals (e.g., check every 15-30 minutes instead of 5)
- **Trade-off**: Less frequent updates but more reliable

## Recommendations

### For Free Tier:
1. **Stick with current Steam API** but use the improved rate limiting
2. **Reduce check frequency** - Set `CHECK_INTERVAL_MINUTES=15` or higher
3. **Use caching** - The 5-minute cache reduces redundant calls
4. **Monitor your usage** - Track 429 errors and adjust intervals accordingly

### For Paid Solutions:
1. **Use proxy rotation** if you need frequent updates
2. **Consider aggregator APIs** that combine multiple sources
3. **Self-host a price cache** that other instances can query

## Configuration Tips

```env
# Check prices less frequently (reduces API load)
CHECK_INTERVAL_MINUTES=15

# Increase minimum interval between requests (if still getting 429s)
STEAM_API_MIN_INTERVAL_MS=10000

# Enable debug mode to monitor API calls
DEBUG_STEAM=true
```

## Why Free APIs Have Rate Limits

Rate limiting exists to:
- Prevent abuse and DDoS attacks
- Ensure fair usage among all users
- Protect server resources
- Comply with terms of service

Even "free" APIs implement rate limits for these reasons.

## Current Improvements

The updated code includes:
- ✅ Automatic retry with exponential backoff
- ✅ 5-minute price caching
- ✅ Configurable request intervals
- ✅ Better error handling and logging
- ✅ Respects Retry-After headers

These improvements should significantly reduce 429 errors while maintaining functionality.

