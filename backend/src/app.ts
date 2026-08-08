import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import productRoutes from "./modules/products/product.routes";
import challanRoutes from "./modules/challans/challan.routes";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, origin || true);
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK", timestamp: new Date().toISOString() });
  });

  app.use("/auth", authRoutes);
  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/challans", challanRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
