import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import paymentRoutes from "./routes/payment.route.js";
import couponRotes from "./routes/coupon.route.js";
import cartRoutes from "./routes/cart.route.js";
import productRoutes from "./routes/product.route.js";
import authRoutes from "./routes/auth.route.js";
import analiticsRoutes from "./routes/analytics.route.js";
import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Proper __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" })); // Allows parsing to the body of the request
app.use(cookieParser()); // Cookie parser middleware

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRotes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analiticsRoutes);

// Production build
if (process.env.NODE_ENV === "production") {
  // Serve frontend dist folder
  app.use(express.static(path.join(__dirname, "frontend", "dist")));

  // Handle SPA routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
  connectDB();
});
