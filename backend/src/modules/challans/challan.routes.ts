import { Router } from "express";
import {
  cancelChallanHandler,
  confirmChallanHandler,
  createChallanHandler,
  getChallanHandler,
  listChallansHandler,
  updateChallanHandler,
} from "./challan.controller";
import {
  createChallanSchema,
  idParamSchema,
  listChallansQuerySchema,
  updateChallanSchema,
} from "./challan.validation";
import { validate } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listChallansQuerySchema }), asyncHandler(listChallansHandler));

router.get("/:id", validate({ params: idParamSchema }), asyncHandler(getChallanHandler));

// Sales creates and edits challans; Admin can too for oversight/corrections.
router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  validate({ body: createChallanSchema }),
  asyncHandler(createChallanHandler)
);

router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  validate({ params: idParamSchema, body: updateChallanSchema }),
  asyncHandler(updateChallanHandler)
);

router.post(
  "/:id/confirm",
  requireRole("ADMIN", "SALES"),
  validate({ params: idParamSchema }),
  asyncHandler(confirmChallanHandler)
);

router.post(
  "/:id/cancel",
  requireRole("ADMIN", "SALES", "WAREHOUSE"),
  validate({ params: idParamSchema }),
  asyncHandler(cancelChallanHandler)
);

export default router;
