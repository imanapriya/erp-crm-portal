import { Request, Response } from "express";
import * as challanService from "./challan.service";

export async function listChallansHandler(req: Request, res: Response): Promise<void> {
  const { page, pageSize, status, customerId, search } = req.query as unknown as {
    page: number;
    pageSize: number;
    status?: "DRAFT" | "CONFIRMED" | "CANCELLED";
    customerId?: string;
    search?: string;
  };
  const result = await challanService.listChallans({ page, pageSize, status, customerId, search });
  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function getChallanHandler(req: Request, res: Response): Promise<void> {
  const challan = await challanService.getChallanById(req.params.id);
  res.status(200).json({ success: true, data: challan });
}

export async function createChallanHandler(req: Request, res: Response): Promise<void> {
  const { customerId, items, status } = req.body;
  const challan = await challanService.createChallan({
    customerId,
    items,
    status,
    createdById: req.user!.id,
  });
  res.status(201).json({ success: true, data: challan });
}

export async function updateChallanHandler(req: Request, res: Response): Promise<void> {
  const challan = await challanService.updateChallan(req.params.id, req.body);
  res.status(200).json({ success: true, data: challan });
}

export async function confirmChallanHandler(req: Request, res: Response): Promise<void> {
  const challan = await challanService.confirmChallan(req.params.id, req.user!.id);
  res.status(200).json({ success: true, data: challan });
}

export async function cancelChallanHandler(req: Request, res: Response): Promise<void> {
  const challan = await challanService.cancelChallan(req.params.id, req.user!.id);
  res.status(200).json({ success: true, data: challan });
}
