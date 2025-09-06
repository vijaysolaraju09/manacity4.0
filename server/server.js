const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
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
const specialShopRoutes = require("./routes/specialShopRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const AppError = require("./utils/AppError");

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://manacity4-0-1.onrender.com',
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(context);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/verified", verifiedUserRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/special-shop", specialShopRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", adminUserRoutes);

app.use("/api/*", (_req, _res, next) =>
  next(AppError.notFound("ROUTE_NOT_FOUND", "API route not found"))
);

if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port", process.env.PORT)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));
