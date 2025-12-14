import rateLimit from "express-rate-limit";

// General API rate limiter - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use a custom key generator that works with Cloudflare's CF-Connecting-IP header
  keyGenerator: req => {
    // Cloudflare sets CF-Connecting-IP header with the real client IP
    // Fall back to X-Forwarded-For if CF-Connecting-IP is not available
    return (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress
    );
  }
});

// Strict rate limiter for write operations (POST, PUT, DELETE) - 20 requests per 15 minutes per IP
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: "Too many write requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator that works with Cloudflare's CF-Connecting-IP header
  keyGenerator: req => {
    // Cloudflare sets CF-Connecting-IP header with the real client IP
    // Fall back to X-Forwarded-For if CF-Connecting-IP is not available
    return (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress
    );
  }
});
