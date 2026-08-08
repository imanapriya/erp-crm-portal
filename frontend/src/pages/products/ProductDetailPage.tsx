import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiItemResponse, ApiListResponse, PaginationMeta, Product, StockMovement } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  function load() {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiClient.get<ApiItemResponse<Product>>(`/products/${id}`),
      apiClient.get<ApiListResponse<StockMovement>>(`/products/${id}/stock-movements`, { params: { page: 1, pageSize: 20 } }),
    ])
      .then(([p, m]) => {
        setProduct(p.data.data);
        setMovements(m.data.data);
        setMeta(m.data.meta);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleAddMovement(e: FormEvent) {
    e.preventDefault();
    if (!id || !quantity || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/products/${id}/stock-movements`, {
        quantity: Number(quantity),
        movementType,
        reason,
      });
      setQuantity("");
      setReason("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Product">
        <div className="page-loading">Loading…</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout title="Product">
        <div className="banner banner-error">{error ?? "Product not found."}</div>
      </Layout>
    );
  }

  const low = product.currentStock <= product.minStockAlert;

  return (
    <Layout title={product.name}>
      <div className="toolbar">
        <span className="chip">{product.sku}</span>
        <span className={low ? "badge badge-amber" : "badge badge-teal"}>
          <span className="dot" />
          {product.currentStock} in stock
        </span>
        {canManage && (
          <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => navigate(`/products/${product.id}/edit`)}>
            Edit product
          </button>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-heading">
              <h2>Details</h2>
            </div>
            <dl className="kv-list">
              <dt>Category</dt>
              <dd>{product.category ?? "—"}</dd>
              <dt>Unit price</dt>
              <dd className="mono">₹{Number(product.unitPrice).toFixed(2)}</dd>
              <dt>Current stock</dt>
              <dd className="mono">{product.currentStock}</dd>
              <dt>Min stock alert</dt>
              <dd className="mono">{product.minStockAlert}</dd>
              <dt>Location</dt>
              <dd>{product.location ?? "—"}</dd>
            </dl>
          </div>

          <div className="card">
            <div className="section-heading">
              <h2>Stock movement log</h2>
            </div>
            {movements.length === 0 ? (
              <div className="empty-state">
                <div className="headline">No movements recorded</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={m.movementType === "IN" ? "badge badge-teal" : "badge badge-rust"}>
                          <span className="dot" />
                          {m.movementType}
                        </span>
                      </td>
                      <td className="mono">{m.quantity}</td>
                      <td>{m.reason}</td>
                      <td>{m.createdByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {meta && (
              <div className="pagination">
                <span>{meta.total} total movements</span>
              </div>
            )}
          </div>
        </div>

        {canManage && (
          <div className="card">
            <div className="section-heading">
              <h2>Record stock movement</h2>
            </div>
            <form onSubmit={handleAddMovement}>
              <div className="field">
                <label>Movement type</label>
                <select className="select" value={movementType} onChange={(e) => setMovementType(e.target.value as "IN" | "OUT")}>
                  <option value="IN">IN (stock received)</option>
                  <option value="OUT">OUT (stock removed)</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div className="field">
                <label>Reason</label>
                <input
                  className="input"
                  placeholder="e.g. Stock take correction, damage, return"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
                {submitting ? "Saving…" : "Record movement"}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
