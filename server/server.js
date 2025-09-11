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
const verifiedUserRoutes = require("./routes/verifiedUserRoutes");
const eventRoutes = require("./routes/eventRoutes");
const specialRoutes = require("./routes/specialRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const proRoutes = require("./routes/proRoutes");
const AppError = require("./utils/AppError");

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:5173,https://manacity4-0-1.onrender.com'
)
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/verified", verifiedUserRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/special", specialRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/pros", proRoutes);

if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientPath));
}

app.use((req, _res, next) => {
  next(AppError.notFound("NOT_FOUND", "Route not found"));
});

app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port", process.env.PORT)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));
