require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const myLogger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL;
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL;
const POST_SERVICE_URL = process.env.POST_SERVICE_URL;
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL;
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL;

const redisClient = new Redis(REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//rate limiting
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    myLogger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests." });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimitOptions);

app.use((req, res, next) => {
  myLogger.info(`Received ${req.method} request to ${req.url}`);
  myLogger.info(`Request body, ${req.body}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    myLogger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: "Internal server error occurred",
      error: err.message,
    });
  },
};

//setting up proxy for identity service
app.use(
  "/v1/auth",
  proxy(IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      myLogger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up proxy for post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      myLogger.info(
        `Response received from Post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up proxy for media service
app.use(
  "/v1/media",
  validateToken,
  proxy(MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["content-type"] = "application/json";
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      myLogger.info(
        `Response received from media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);

//setting up proxy for search service
app.use(
  "/v1/search",
  validateToken,
  proxy(SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      myLogger.info(
        `Response received from Search service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  myLogger.info(`API Gateway is running on port ${PORT}`);
  myLogger.info(`Identity service is running on port ${IDENTITY_SERVICE_URL}`);
  myLogger.info(`Post service is running on port ${POST_SERVICE_URL}`);
  myLogger.info(`Media service is running on port ${MEDIA_SERVICE_URL}`);
  myLogger.info(`Search service is running on port ${SEARCH_SERVICE_URL}`);
  myLogger.info(`Redis URL ${REDIS_URL}`);
});
