export type UserRole = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  note: string;
  createdAt: string;
  createdByName: string;
}

export interface CustomerDetail extends Customer {
  followUps: FollowUp[];
  challans: SalesChallan[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = "IN" | "OUT";

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdByName: string;
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string | null;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  product?: Product | null;
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items: ChallanItem[];
  customer?: { name: string; businessName: string | null } | Customer;
  createdBy?: { name: string; email: string };
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: Array<{ field: string; message: string }> | unknown;
}
