# CS2 Price Tracker API Documentation

## Overview

The CS2 Price Tracker API is a RESTful API that allows users to track CS2 (Counter-Strike 2) skin prices from the Steam Community Market and receive Discord webhook notifications when prices reach target thresholds.

## Base URL

```
http://localhost:3001
```

For production deployments, replace with your production server URL.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General Rate Limiting**: Applied to all endpoints
- **Strict Rate Limiting**: Applied to endpoints that modify data (POST, PUT, DELETE)

Rate limits are enforced per IP address. If you exceed the rate limit, you will receive a `429 Too Many Requests` response.

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or missing required parameters
- `403 Forbidden` - Access denied (e.g., tracker doesn't belong to user)
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Content Type

All requests with a body must include:
```
Content-Type: application/json
```

---

## User Management

### Create User

Creates a new user account with a Discord webhook URL for receiving price alerts.

**Endpoint:** `POST /user`

**Rate Limiting:** Strict

**Request Body:**
```json
{
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```

**Request Body Fields:**
- `discordWebhook` (required, string): Discord webhook URL for price alerts. Must match pattern: `https://discord.com/api/webhooks/{id}/{token}` or `https://discordapp.com/api/webhooks/{id}/{token}`

**Response:** `201 Created`
```json
{
  "userId": "unique-user-id",
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Response Fields:**
- `userId` (string): Unique user identifier - **save this!** You'll need it for all tracker operations
- `discordWebhook` (string): The Discord webhook URL
- `createdAt` (string): ISO 8601 timestamp of account creation

**Error Responses:**
- `400 Bad Request`: Missing or invalid webhook URL
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3001/user \
  -H "Content-Type: application/json" \
  -d '{
    "discordWebhook": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop"
  }'
```

---

### Get User

Retrieves user information by userId.

**Endpoint:** `GET /user/:userId`

**Rate Limiting:** General

**Path Parameters:**
- `userId` (required, string): Unique user identifier

**Response:** `200 OK`
```json
{
  "userId": "unique-user-id",
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3001/user/unique-user-id
```

---

### Update User

Updates a user's Discord webhook URL.

**Endpoint:** `PUT /user/:userId`

**Rate Limiting:** Strict

**Path Parameters:**
- `userId` (required, string): Unique user identifier

**Request Body:**
```json
{
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```

**Request Body Fields:**
- `discordWebhook` (required, string): New Discord webhook URL. Must match pattern: `https://discord.com/api/webhooks/{id}/{token}` or `https://discordapp.com/api/webhooks/{id}/{token}`

**Response:** `200 OK`
```json
{
  "userId": "unique-user-id",
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid webhook URL
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X PUT http://localhost:3001/user/unique-user-id \
  -H "Content-Type: application/json" \
  -d '{
    "discordWebhook": "https://discord.com/api/webhooks/987654321/zyxwvutsrqponmlk"
  }'
```

---

### Recover User Account

Recovers a user account by Discord webhook URL or userId. This allows users to retrieve their userId if they've lost it (e.g., localStorage was cleared).

**Endpoint:** `POST /user/recover`

**Rate Limiting:** Strict

**Request Body:**
```json
{
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "userId": "unique-user-id"
}
```

**Request Body Fields:**
- `discordWebhook` (optional, string): Discord webhook URL associated with the account. Must match pattern if provided.
- `userId` (optional, string): User ID to recover
- **Note:** At least one of `discordWebhook` or `userId` must be provided. If both are provided, `userId` takes priority.

**Response:** `200 OK`
```json
{
  "userId": "unique-user-id",
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing both identifiers or invalid webhook URL format
- `404 Not Found`: No user found with the provided identifier
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3001/user/recover \
  -H "Content-Type: application/json" \
  -d '{
    "discordWebhook": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop"
  }'
```

---

## Tracker Management

### Get Trackers

Retrieves all trackers for a specific user, sorted by creation date (newest first).

**Endpoint:** `GET /track?userId=:userId`

**Rate Limiting:** General

**Query Parameters:**
- `userId` (required, string): The user ID to filter trackers

**Response:** `200 OK`
```json
[
  {
    "_id": "tracker-id",
    "userId": "unique-user-id",
    "skinName": "AK-47 | Redline (Field-Tested)",
    "interest": "buy",
    "targetDown": 1800,
    "targetUp": 2500,
    "lastKnownPrice": 2000,
    "imageUrl": "https://steamcommunity.com/economy/image/...",
    "iconUrl": "icon-hash",
    "downAlertSent": false,
    "upAlertSent": false,
    "lastDownAlertPrice": null,
    "lastUpAlertPrice": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Response Fields:**
- `_id` (string): Tracker ID (MongoDB ObjectId)
- `userId` (string): User ID who owns this tracker
- `skinName` (string): Full name of the CS2 skin
- `interest` (string): User's interest - `"buy"`, `"sell"`, or `"both"`
- `targetDown` (number|null): Price threshold for buying alerts (price drops below this)
- `targetUp` (number|null): Price threshold for selling alerts (price rises above this)
- `lastKnownPrice` (number|null): Last known price from Steam
- `imageUrl` (string|null): URL to the skin image
- `iconUrl` (string|null): Steam icon hash
- `downAlertSent` (boolean): Whether a down alert has been sent
- `upAlertSent` (boolean): Whether an up alert has been sent
- `lastDownAlertPrice` (number|null): Last price when down alert was sent
- `lastUpAlertPrice` (number|null): Last price when up alert was sent
- `createdAt` (string): ISO 8601 timestamp of tracker creation
- `updatedAt` (string): ISO 8601 timestamp of last update

**Error Responses:**
- `400 Bad Request`: Missing userId parameter
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl "http://localhost:3001/track?userId=unique-user-id"
```

---

### Create Tracker

Creates a new price tracker for a user. The system will attempt to fetch the current price and image URL immediately upon creation.

**Endpoint:** `POST /track`

**Rate Limiting:** Strict

**Request Body:**
```json
{
  "userId": "unique-user-id",
  "skinName": "AK-47 | Redline (Field-Tested)",
  "interest": "buy",
  "targetDown": 1800,
  "targetUp": 2500
}
```

**Request Body Fields:**
- `userId` (required, string): User ID who owns this tracker
- `skinName` (required, string): Full name of the CS2 skin (must match Steam market listing name exactly)
- `interest` (optional, string): User's interest - `"buy"`, `"sell"`, or `"both"` (default: `"buy"`)
- `targetDown` (optional, number|null): Price threshold for buying alerts in cents (price drops below this). Set to `null` to disable.
- `targetUp` (optional, number|null): Price threshold for selling alerts in cents (price rises above this). Set to `null` to disable.

**Response:** `201 Created`
```json
{
  "_id": "tracker-id",
  "userId": "unique-user-id",
  "skinName": "AK-47 | Redline (Field-Tested)",
  "interest": "buy",
  "targetDown": 1800,
  "targetUp": 2500,
  "lastKnownPrice": 2000,
  "downAlertSent": false,
  "upAlertSent": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Response Fields:**
- `_id` (string): Tracker ID (MongoDB ObjectId)
- `userId` (string): User ID
- `skinName` (string): Full skin name
- `interest` (string): Interest type
- `targetDown` (number|null): Down target price
- `targetUp` (number|null): Up target price
- `lastKnownPrice` (number|null): Last known price (may be null if fetch failed)
- `downAlertSent` (boolean): Alert status flag
- `upAlertSent` (boolean): Alert status flag
- `createdAt` (string): ISO 8601 timestamp of creation

**Error Responses:**
- `400 Bad Request`: Invalid request data (missing required fields)
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3001/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "unique-user-id",
    "skinName": "AK-47 | Redline (Field-Tested)",
    "interest": "sell",
    "targetDown": 1800,
    "targetUp": 2500
  }'
```

**Notes:**
- The `skinName` must match the exact name as it appears on the Steam Community Market
- Prices are stored in cents (e.g., $18.00 = 1800)
- If price or image fetching fails during creation, the tracker will still be created with `null` values

---

### Update Tracker

Updates an existing tracker. You can update any combination of fields. If `skinName` is updated, the system will automatically fetch the new price and image URL.

**Endpoint:** `PUT /track/:trackerId?userId=:userId`

**Rate Limiting:** Strict

**Path Parameters:**
- `trackerId` (required, string): Tracker ID (MongoDB ObjectId) to update

**Query Parameters:**
- `userId` (required, string): The user ID to verify ownership

**Request Body:**
```json
{
  "interest": "both",
  "targetDown": 1800,
  "targetUp": 2500,
  "skinName": "AK-47 | Redline (Field-Tested)"
}
```

**Request Body Fields (all optional):**
- `interest` (optional, string): User's interest - `"buy"`, `"sell"`, or `"both"`
- `targetDown` (optional, number|null): Price threshold for buying alerts. Set to `null` to remove.
- `targetUp` (optional, number|null): Price threshold for selling alerts. Set to `null` to remove.
- `skinName` (optional, string): Full name of the CS2 skin. If updated, price and image will be refreshed automatically.

**Response:** `200 OK`
```json
{
  "_id": "tracker-id",
  "userId": "unique-user-id",
  "skinName": "AK-47 | Redline (Field-Tested)",
  "interest": "both",
  "targetDown": 1800,
  "targetUp": 2500,
  "lastKnownPrice": 2000,
  "downAlertSent": false,
  "upAlertSent": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

**Response Fields:**
- Same as Get Trackers response, plus:
- `updatedAt` (string): ISO 8601 timestamp of last update

**Error Responses:**
- `400 Bad Request`: Invalid request data, invalid interest value, empty skinName, or no fields provided to update
- `403 Forbidden`: Tracker does not belong to user
- `404 Not Found`: Tracker does not exist
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X PUT "http://localhost:3001/track/tracker-id?userId=unique-user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "interest": "both",
    "targetDown": 1800,
    "targetUp": 2500
  }'
```

**Notes:**
- You can update any combination of fields - only include the fields you want to change
- If `skinName` is updated, `lastKnownPrice` and `imageUrl` will be automatically refreshed
- Setting `targetDown` or `targetUp` to `null` removes the alert threshold

---

### Delete Tracker

Deletes a tracker. The backend verifies that the tracker belongs to the requesting user.

**Endpoint:** `DELETE /track/:trackerId?userId=:userId`

**Rate Limiting:** Strict

**Path Parameters:**
- `trackerId` (required, string): Tracker ID (MongoDB ObjectId) to delete

**Query Parameters:**
- `userId` (required, string): The user ID to verify ownership

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing userId parameter
- `403 Forbidden`: Tracker does not belong to user
- `404 Not Found`: Tracker does not exist
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X DELETE "http://localhost:3001/track/tracker-id?userId=unique-user-id"
```

---

## Utility Endpoints

### Get Steam Image

Fetches the image URL from a Steam market listing page. This is optional and can be used to get skin images.

**Endpoint:** `GET /steam-image?url=:encodedUrl`

**Rate Limiting:** General

**Query Parameters:**
- `url` (required, string): Encoded Steam market listing URL

**Response:** `200 OK`
```json
{
  "imageUrl": "https://steamcommunity.com/economy/image/..."
}
```

**Response Fields:**
- `imageUrl` (string): Full URL to the skin image

**Error Responses:**
- `400 Bad Request`: Missing url parameter or invalid Steam market URL format
- `500 Internal Server Error`: Server error or could not retrieve image URL

**Example:**
```bash
# Original URL:
# https://steamcommunity.com/market/listings/730/AK-47 | Redline (Field-Tested)

# Encoded URL:
curl "http://localhost:3001/steam-image?url=https%3A%2F%2Fsteamcommunity.com%2Fmarket%2Flistings%2F730%2FAK-47%20%7C%20Redline%20%28Field-Tested%29"
```

**Notes:**
- The URL must be URL-encoded before passing as a query parameter
- The URL must match the pattern: `https://steamcommunity.com/market/listings/{appid}/{skinName}`
- The skin name in the URL will be extracted and used to fetch the image

---

## Data Models

### User Model

```typescript
{
  userId: string;           // Unique user identifier (auto-generated)
  discordWebhook: string;  // Discord webhook URL
  createdAt: Date;          // Account creation timestamp
  updatedAt: Date;          // Last update timestamp
}
```

### Tracker Model

```typescript
{
  _id: string;              // MongoDB ObjectId
  userId: string;           // User ID who owns this tracker
  skinName: string;         // Full CS2 skin name
  interest: "buy" | "sell" | "both";  // User's interest type
  targetDown: number | null;  // Price threshold for buying alerts (cents)
  targetUp: number | null;    // Price threshold for selling alerts (cents)
  lastKnownPrice: number | null;  // Last known price from Steam (cents)
  imageUrl: string | null;  // URL to skin image
  iconUrl: string | null;   // Steam icon hash
  downAlertSent: boolean;   // Whether down alert was sent
  upAlertSent: boolean;     // Whether up alert was sent
  lastDownAlertPrice: number | null;  // Last price when down alert was sent
  lastUpAlertPrice: number | null;    // Last price when up alert was sent
  createdAt: Date;          // Tracker creation timestamp
  updatedAt: Date;          // Last update timestamp
}
```

---

## Price Alerts

The system automatically monitors tracked skins and sends Discord webhook notifications when:

1. **Buy Alert**: Price drops below `targetDown` threshold (if `interest` is `"buy"` or `"both"`)
2. **Sell Alert**: Price rises above `targetUp` threshold (if `interest` is `"sell"` or `"both"`)

Alerts are sent to the user's configured Discord webhook URL. The system runs periodic price checks (configured via cron job) and compares current prices with target thresholds.

**Alert Behavior:**
- Alerts are sent once per threshold crossing
- If price crosses threshold again after an alert, a new alert will be sent
- Alert status is tracked via `downAlertSent` and `upAlertSent` flags

---

## Best Practices

1. **Save your userId**: After creating a user, save the `userId` - you'll need it for all tracker operations
2. **Exact skin names**: Use the exact skin name as it appears on Steam Community Market
3. **Price format**: All prices are in cents (e.g., $18.00 = 1800)
4. **Rate limiting**: Be mindful of rate limits, especially when creating/updating multiple trackers
5. **Error handling**: Always check HTTP status codes and handle errors appropriately
6. **Webhook security**: Keep your Discord webhook URLs secure - they can be used to send messages to your Discord channel

---

## Example Workflow

1. **Create a user account:**
   ```bash
   POST /user
   # Response: { "userId": "abc123", ... }
   ```

2. **Create a tracker:**
   ```bash
   POST /track
   # Body: { "userId": "abc123", "skinName": "AK-47 | Redline (Field-Tested)", ... }
   # Response: { "_id": "tracker456", ... }
   ```

3. **Get all your trackers:**
   ```bash
   GET /track?userId=abc123
   ```

4. **Update a tracker:**
   ```bash
   PUT /track/tracker456?userId=abc123
   # Body: { "targetDown": 1700 }
   ```

5. **Delete a tracker:**
   ```bash
   DELETE /track/tracker456?userId=abc123
   ```

---

## Support

For issues, questions, or contributions, please refer to the project repository or documentation.

