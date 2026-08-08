import { Request, Response } from "express";
import * as productService from "./product.service";

export async function listProductsHandler(req: Request, res: Response): Promise<void> {
  const { page, pageSize, search, category, lowStockOnly } = req.query as unknown as {
    page: number;
    pageSize: number;
    search?: string;
    category?: string;
    lowStockOnly?: boolean;
  };
  const result = await productService.listProducts({ page, pageSize, search, category, lowStockOnly });
  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function getProductHandler(req: Request, res: Response): Promise<void> {
  const product = await productService.getProductById(req.params.id);
  res.status(200).json({ success: true, data: product });
}

export async function createProductHandler(req: Request, res: Response): Promise<void> {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
}

export async function updateProductHandler(req: Request, res: Response): Promise<void> {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.status(200).json({ success: true, data: product });
}

export async function getStockMovementsHandler(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await productService.getStockMovements(req.params.id, page, pageSize);
  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function recordStockMovementHandler(req: Request, res: Response): Promise<void> {
  const { quantity, movementType, reason } = req.body;
  const result = await productService.recordStockMovement(
    req.params.id,
    quantity,
    movementType,
    reason,
    req.user!.id
  );
  res.status(201).json({ success: true, data: result });
}
