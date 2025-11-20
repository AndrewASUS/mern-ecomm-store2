import express from "express"
import "dotenv/config"
import cookieParser from "cookie-parser"
import path from "path"

import paymentRoutes from "./routes/payment.route.js"
import couponRotes from "./routes/coupon.route.js"
import cartRoutes from "./routes/cart.route.js"
import productRoutes from "./routes/product.route.js"
import authRoutes from "./routes/auth.route.js"
import analiticsRoutes from "./routes/analytics.route.js"
import { connectDB } from "./lib/db.js"



const app = express()
const PORT = process.env.PORT || 5000

const __dirname = path.resolve


app.use(express.json({ limit: "10mb" })) // Allows parsing to the body of the request
app.use(cookieParser()) // Cookie parser middleware


app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/coupons", couponRotes)
app.use("/api/payments", paymentRoutes)
app.use("/api/analytics", analiticsRoutes)


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")))

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"))
  })
}



app.listen(PORT, () => {
  console.log("Server is running on port: " + PORT)
  connectDB()
})
