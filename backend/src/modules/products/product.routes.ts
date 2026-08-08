import { Router } from "express";
import {
  createProductHandler,
  getProductHandler,
  getStockMovementsHandler,
  listProductsHandler,
  recordStockMovementHandler,
  updateProductHandler,
} from "./product.controller";
import {
  createProductSchema,
  idParamSchema,
  listProductsQuerySchema,
  stockMovementSchema,
  updateProductSchema,
} from "./product.validation";
import { paginationSchema } from "../../utils/pagination";
import { validate } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listProductsQuerySchema }), asyncHandler(listProductsHandler));

router.get("/:id", validate({ params: idParamSchema }), asyncHandler(getProductHandler));

// Only Admin and Warehouse staff manage the product catalog itself.
router.post(
  "/",
  requireRole("ADMIN", "WAREHOUSE"),
  validate({ body: createProductSchema }),
  asyncHandler(createProductHandler)
);

router.put(
  "/:id",
  requireRole("ADMIN", "WAREHOUSE"),
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(updateProductHandler)
);

router.get(
  "/:id/stock-movements",
  validate({ params: idParamSchema, query: paginationSchema }),
  asyncHandler(getStockMovementsHandler)
);

// Manual stock adjustments (e.g. stock take, damage, return) are restricted
// to Warehouse/Admin. Automatic OUT movements from confirming a challan are
// created internally by the challan service, not through this endpoint.
router.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "WAREHOUSE"),
  validate({ params: idParamSchema, body: stockMovementSchema }),
  asyncHandler(recordStockMovementHandler)
);

export default router;
