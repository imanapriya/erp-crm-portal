import { Router } from "express";
import {
  addFollowUpHandler,
  createCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from "./customer.controller";
import {
  addFollowUpSchema,
  createCustomerSchema,
  idParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer.validation";
import { validate } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

// All customer routes require an authenticated user. Sales & Admin manage
// customers day-to-day; Warehouse/Accounts get read-only visibility.
router.use(requireAuth);

router.get("/", validate({ query: listCustomersQuerySchema }), asyncHandler(listCustomersHandler));

router.get("/:id", validate({ params: idParamSchema }), asyncHandler(getCustomerHandler));

router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  validate({ body: createCustomerSchema }),
  asyncHandler(createCustomerHandler)
);

router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  asyncHandler(updateCustomerHandler)
);

router.post(
  "/:id/follow-ups",
  requireRole("ADMIN", "SALES"),
  validate({ params: idParamSchema, body: addFollowUpSchema }),
  asyncHandler(addFollowUpHandler)
);

export default router;
