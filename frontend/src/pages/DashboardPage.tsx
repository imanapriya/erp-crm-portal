import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ApiListResponse, Customer, Product, SalesChallan } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export function DashboardPage() {
  const { user } = useAuth();
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [draftChallans, setDraftChallans] = useState<SalesChallan[]>([]);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get<ApiListResponse<Customer>>("/customers", { params: { page: 1, pageSize: 1 } })
      .then((res) => setCustomerCount(res.data.meta.total))
      .catch(() => setCustomerCount(null));

    apiClient
      .get<ApiListResponse<Product>>("/products", { params: { page: 1, pageSize: 1 } })
      .then((res) => setProductCount(res.data.meta.total))
      .catch(() => setProductCount(null));

    apiClient
      .get<ApiListResponse<Product>>("/products", { params: { page: 1, pageSize: 5, lowStockOnly: true } })
      .then((res) => setLowStock(res.data.data))
      .catch(() => setLowStock([]));

    apiClient
      .get<ApiListResponse<SalesChallan>>("/challans", { params: { page: 1, pageSize: 5, status: "DRAFT" } })
      .then((res) => setDraftChallans(res.data.data))
      .catch(() => setDraftChallans([]));
  }, []);

  return (
    <Layout title="Dashboard">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Customers</div>
          <div className="value">{customerCount ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="label">Products tracked</div>
          <div className="value">{productCount ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="label">Low stock alerts</div>
          <div className={`value ${lowStock.length > 0 ? "warn" : ""}`}>{lowStock.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Draft challans</div>
          <div className="value">{draftChallans.length}</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="section-heading">
            <h2>Products below minimum stock</h2>
            <Link to="/products?lowStockOnly=true">View all</Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <div className="headline">Nothing to flag</div>
              <div>All tracked products are above their minimum stock threshold.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name} <span className="chip">{p.sku}</span>
                    </td>
                    <td className="mono">{p.currentStock}</td>
                    <td className="mono">{p.minStockAlert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Open drafts</h2>
            <Link to="/challans?status=DRAFT">View all</Link>
          </div>
          {draftChallans.length === 0 ? (
            <div className="empty-state">
              <div className="headline">No drafts waiting</div>
              <div>Every challan has been confirmed or cancelled.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Challan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {draftChallans.map((c) => (
                  <tr key={c.id} className="clickable">
                    <td>
                      <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p style={{ color: "var(--ink-faint)", fontSize: 12.5, marginTop: 20 }}>
        Signed in as {user?.name} ({user?.role}). Navigation on the left only shows sections your role can act on.
      </p>
    </Layout>
  );
}
