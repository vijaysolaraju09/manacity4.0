const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const context = require("./middleware/context");
const errorHandler = require("./middleware/error");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const homeRoutes = require("./routes/homeRoutes");
const shopRoutes = require("./routes/shopRoutes");
const cartRoutes = require("./routes/cartRoutes");
const verifiedRoutes = require("./routes/verifiedRoutes");
const adminVerifiedRoutes = require("./routes/adminVerifiedRoutes");
const eventRoutes = require("./routes/eventRoutes");
const formTemplateRoutes = require("./routes/formTemplates");
const registrationRoutes = require("./routes/registrations");
const specialRoutes = require("./routes/specialRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const historyRoutes = require("./routes/historyRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const addressRoutes = require("./routes/addressRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminEventRoutes = require("./routes/adminEventRoutes");
const proRoutes = require("./routes/proRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const serviceRequestRoutes = require("./routes/serviceRequestRoutes");
const adminServiceRoutes = require("./routes/adminServiceRoutes");
const adminServiceRequestRoutes = require("./routes/adminServiceRequestRoutes");
const AppError = require("./utils/AppError");
const logger = require("./utils/logger");
const adminAnnouncementRoutes = require("./routes/adminAnnouncementRoutes");
const announcementRoutes = require("./routes/announcementRoutes");

const env = process.env.NODE_ENV || "development";
const isDevelopment = env === "development";

const logProcessError = (event, error) => {
  const normalized =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : "Process error");

  const logPayload = {
    event,
    error: {
      message: normalized.message,
    },
  };

  if (isDevelopment && normalized.stack) {
    logPayload.error.stack = normalized.stack;
  }

  logger.error(logPayload, `Unhandled ${event}`);

  if (!isDevelopment) {
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logProcessError("unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  logProcessError("uncaughtException", error);
});

const app = express();

const normalizeOrigin = (origin = '') => {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch (err) {
    return origin.trim().replace(/\/+$/, '');
  }
};

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

const fallbackOrigins = [
  'http://localhost:5173',
  'https://manacity4-0-1.onrender.com',
];

const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
const helmetOptions = process.env.ENABLE_CSP === 'true' ? undefined : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));
// express-mongo-sanitize's built-in middleware attempts to reassign `req.query`,
// which is a read-only getter in Express 5 and causes an error. Instead of
// using the default middleware, manually sanitize request objects in-place.
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});
// Use a regular expression to register the CORS preflight handler for all
// routes. Express 5's path-to-regexp no longer supports the legacy "*" syntax
// and "/*" can cause deployment issues, but /.*/ safely matches every path.
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(context);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/cart", standardLimiter, cartRoutes);
app.use("/api/verified", verifiedRoutes);
app.use("/api/admin/verified", adminVerifiedRoutes);
app.use("/api/events", standardLimiter, eventRoutes);
app.use("/api/form-templates", formTemplateRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/special", specialRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/orders", standardLimiter, orderRoutes);
app.use("/api/history", standardLimiter, historyRoutes);
app.use("/api/feedback", standardLimiter, feedbackRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/admin/events", adminEventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/pros", proRoutes);
app.use("/api/services", standardLimiter, serviceRoutes);
app.use("/api/service-requests", standardLimiter, serviceRequestRoutes);
app.use("/api/requests", standardLimiter, serviceRequestRoutes);
app.use("/api/admin/services", adminServiceRoutes);
app.use("/api/admin/service-requests", adminServiceRequestRoutes);
app.use("/api/admin/announcements", adminAnnouncementRoutes);
app.use("/api/announcements", announcementRoutes);

if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

app.use((req, _res, next) => {
  next(AppError.notFound("NOT_FOUND", "Route not found"));
});

app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      logger.info(
        {
          port: process.env.PORT || 5000,
          env: process.env.NODE_ENV || "development",
        },
        "Server started"
      )
    );
  })
  .catch((err) =>
    logger.error({ err }, "MongoDB connection error")
  );
