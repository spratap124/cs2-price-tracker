# Frontend Integration Guide

This guide shows how to integrate the CS2 Price Tracker API with your frontend at `suryapratap.in/projects/cs2-price-tracker.html`.

## API Base URL

After setting up Cloudflare Tunnel, your API will be available at:

```
https://cs2-api.suryapratap.in
```

(Replace with your actual subdomain if different)

## Example Frontend Code

### Basic Setup

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CS2 Price Tracker</title>
  </head>
  <body>
    <div id="app"></div>
    <script>
      // API Configuration
      const API_BASE_URL = "https://cs2-api.suryapratap.in";

      // Example: Create a user
      async function createUser(discordWebhook) {
        try {
          const response = await fetch(`${API_BASE_URL}/user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ discordWebhook }),
            credentials: "include"
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create user");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error creating user:", error);
          throw error;
        }
      }

      // Example: Get user's trackers
      async function getTrackers(userId) {
        try {
          const response = await fetch(`${API_BASE_URL}/track?userId=${userId}`, {
            method: "GET",
            credentials: "include"
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to fetch trackers");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error fetching trackers:", error);
          throw error;
        }
      }

      // Example: Create a tracker
      async function createTracker(userId, skinName, targetDown, targetUp) {
        try {
          const response = await fetch(`${API_BASE_URL}/track`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userId,
              skinName,
              interest: "buy",
              targetDown,
              targetUp
            }),
            credentials: "include"
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create tracker");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error creating tracker:", error);
          throw error;
        }
      }

      // Example: Delete a tracker
      async function deleteTracker(trackerId, userId) {
        try {
          const response = await fetch(`${API_BASE_URL}/track/${trackerId}?userId=${userId}`, {
            method: "DELETE",
            credentials: "include"
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete tracker");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error deleting tracker:", error);
          throw error;
        }
      }

      // Example: Recover user account
      async function recoverUser(discordWebhook) {
        try {
          const response = await fetch(`${API_BASE_URL}/user/recover`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ discordWebhook }),
            credentials: "include"
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to recover user");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error recovering user:", error);
          throw error;
        }
      }

      // Usage example
      (async () => {
        try {
          // Create a user (first time)
          const user = await createUser("https://discord.com/api/webhooks/...");
          console.log("User created:", user);

          // Get trackers
          const trackers = await getTrackers(user.userId);
          console.log("Trackers:", trackers);

          // Create a tracker
          const tracker = await createTracker(
            user.userId,
            "AK-47 | Redline (Field-Tested)",
            1800,
            2500
          );
          console.log("Tracker created:", tracker);
        } catch (error) {
          console.error("Error:", error);
        }
      })();
    </script>
  </body>
</html>
```

## API Endpoints Reference

### User Endpoints

#### Create User

```
POST /user
Body: { "discordWebhook": "https://discord.com/api/webhooks/..." }
Response: { "userId": "...", "discordWebhook": "...", "createdAt": "..." }
```

#### Get User

```
GET /user/:userId
Response: { "userId": "...", "discordWebhook": "...", "createdAt": "..." }
```

#### Update User

```
PUT /user/:userId
Body: { "discordWebhook": "https://discord.com/api/webhooks/..." }
Response: { "userId": "...", "discordWebhook": "...", "updatedAt": "..." }
```

#### Recover User

```
POST /user/recover
Body: { "discordWebhook": "https://discord.com/api/webhooks/..." }
Response: { "userId": "...", "discordWebhook": "...", "createdAt": "..." }
```

### Tracker Endpoints

#### Get Trackers

```
GET /track?userId=:userId
Response: [{ "_id": "...", "userId": "...", "skinName": "...", ... }]
```

#### Create Tracker

```
POST /track
Body: {
  "userId": "...",
  "skinName": "AK-47 | Redline (Field-Tested)",
  "interest": "buy",
  "targetDown": 1800,
  "targetUp": 2500
}
Response: { "_id": "...", "userId": "...", "skinName": "...", ... }
```

#### Delete Tracker

```
DELETE /track/:trackerId?userId=:userId
Response: { "success": true }
```

## Error Handling

The API returns errors in the following format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid parameters)
- `403` - Forbidden (unauthorized access)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

The API has rate limiting:

- General endpoints: 100 requests per 15 minutes per IP
- Write operations (POST, PUT, DELETE): 20 requests per 15 minutes per IP

Handle rate limit errors gracefully:

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  // Implement retry logic
}
```

## CORS Configuration

The API is configured to accept requests from:

- `https://suryapratap.in`
- Any additional origins specified in `ALLOWED_ORIGINS` environment variable

If you need to add more origins, update the `server.js` file or set the `ALLOWED_ORIGINS` environment variable on your Raspberry Pi.

## Testing

You can test the API using curl:

```bash
# Test health endpoint
curl https://cs2-api.suryapratap.in

# Create a user
curl -X POST https://cs2-api.suryapratap.in/user \
  -H "Content-Type: application/json" \
  -d '{"discordWebhook":"https://discord.com/api/webhooks/..."}'

# Get trackers
curl https://cs2-api.suryapratap.in/track?userId=YOUR_USER_ID
```
