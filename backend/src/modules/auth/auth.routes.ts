import { Router } from "express";
import { loginHandler, meHandler, registerHandler } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.validation";
import { validate } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", validate({ body: loginSchema }), asyncHandler(loginHandler));

// Only an Admin can create new user accounts.
router.post(
  "/register",
  requireAuth,
  requireRole("ADMIN"),
  validate({ body: registerSchema }),
  asyncHandler(registerHandler)
);

router.get("/me", requireAuth, asyncHandler(meHandler));

export default router;
