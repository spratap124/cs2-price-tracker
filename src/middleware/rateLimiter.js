import rateLimit, { ipKeyGenerator } from "express-rate-limit";

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
    // Prefer CF-Connecting-IP (Cloudflare's header) if available, otherwise use req.ip
    // req.ip is correctly set by Express when trust proxy is configured
    const clientIp = req.headers["cf-connecting-ip"] || req.ip || "unknown";

    // Use ipKeyGenerator helper to properly handle IPv6 addresses
    // This applies a /56 subnet mask to IPv6 addresses to prevent bypass
    return ipKeyGenerator(clientIp, 56);
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
    // Prefer CF-Connecting-IP (Cloudflare's header) if available, otherwise use req.ip
    // req.ip is correctly set by Express when trust proxy is configured
    const clientIp = req.headers["cf-connecting-ip"] || req.ip || "unknown";

    // Use ipKeyGenerator helper to properly handle IPv6 addresses
    // This applies a /56 subnet mask to IPv6 addresses to prevent bypass
    return ipKeyGenerator(clientIp, 56);
  }
});
