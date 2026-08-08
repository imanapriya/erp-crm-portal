import { Request, Response } from "express";
import * as authService from "./auth.service";

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
}

// Registration is exposed only to ADMIN users (see auth.routes.ts) so new
// staff accounts can be provisioned without direct database access.
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;
  const result = await authService.register(name, email, password, role);
  res.status(201).json({ success: true, data: result });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const result = await authService.me(req.user!.id);
  res.status(200).json({ success: true, data: result });
}
