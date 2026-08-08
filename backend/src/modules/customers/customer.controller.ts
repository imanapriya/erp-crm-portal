import { Request, Response } from "express";
import * as customerService from "./customer.service";

export async function listCustomersHandler(req: Request, res: Response): Promise<void> {
  const { page, pageSize, search, status, customerType } = req.query as unknown as {
    page: number;
    pageSize: number;
    search?: string;
    status?: "LEAD" | "ACTIVE" | "INACTIVE";
    customerType?: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  };
  const result = await customerService.listCustomers({ page, pageSize, search, status, customerType });
  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function getCustomerHandler(req: Request, res: Response): Promise<void> {
  const customer = await customerService.getCustomerById(req.params.id);
  res.status(200).json({ success: true, data: customer });
}

export async function createCustomerHandler(req: Request, res: Response): Promise<void> {
  const { email, ...rest } = req.body;
  const customer = await customerService.createCustomer({
    ...rest,
    email: email === "" ? undefined : email,
  });
  res.status(201).json({ success: true, data: customer });
}

export async function updateCustomerHandler(req: Request, res: Response): Promise<void> {
  const { email, ...rest } = req.body;
  const customer = await customerService.updateCustomer(req.params.id, {
    ...rest,
    ...(email !== undefined ? { email: email === "" ? undefined : email } : {}),
  });
  res.status(200).json({ success: true, data: customer });
}

export async function addFollowUpHandler(req: Request, res: Response): Promise<void> {
  const followUp = await customerService.addFollowUp(req.params.id, req.body.note, req.user!.id);
  res.status(201).json({ success: true, data: followUp });
}
