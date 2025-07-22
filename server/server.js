const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

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

const app = express();
app.use(cors());
app.use(express.json());

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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port", process.env.PORT)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));
