import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiItemResponse, SalesChallan } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);

  const canAct = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";
  const canConfirm = (user?.role === "ADMIN" || user?.role === "SALES") && challan?.status === "DRAFT";
  const canCancel = canAct && challan?.status !== "CANCELLED";

  function load() {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<ApiItemResponse<SalesChallan>>(`/challans/${id}`)
      .then((res) => setChallan(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading("confirm");
    setError(null);
    try {
      await apiClient.post(`/challans/${id}/confirm`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm("Cancel this challan? If it was confirmed, reserved stock will be returned.")) return;
    setActionLoading("cancel");
    setError(null);
    try {
      await apiClient.post(`/challans/${id}/cancel`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <Layout title="Sales challan">
        <div className="page-loading">Loading…</div>
      </Layout>
    );
  }

  if (!challan) {
    return (
      <Layout title="Sales challan">
        <div className="banner banner-error">{error ?? "Challan not found."}</div>
      </Layout>
    );
  }

  const customer = challan.customer as { id?: string; name: string; businessName?: string | null };

  return (
    <Layout title={challan.challanNumber}>
      <div className="toolbar">
        <StatusBadge status={challan.status} />
        <span className="chip">{challan.totalQuantity} units</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            Export PDF
          </button>
          {canConfirm && (
            <button className="btn btn-primary" onClick={handleConfirm} disabled={actionLoading !== null}>
              {actionLoading === "confirm" ? "Confirming…" : "Confirm challan"}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger" onClick={handleCancel} disabled={actionLoading !== null}>
              {actionLoading === "cancel" ? "Cancelling…" : "Cancel challan"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="detail-grid">
        <div className="card">
          <div className="section-heading">
            <h2>Line items</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit price</th>
                <th>Qty</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productNameSnapshot}</td>
                  <td className="mono">{item.productSkuSnapshot}</td>
                  <td className="mono">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                  <td className="mono">{item.quantity}</td>
                  <td className="mono">₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12 }}>
            Product name, SKU, and price shown here are snapshots captured when this challan was created — they won't
            change even if the product catalog is edited later.
          </p>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Customer</h2>
          </div>
          <dl className="kv-list">
            <dt>Name</dt>
            <dd>
              {customer?.id ? <Link to={`/customers/${customer.id}`}>{customer.name}</Link> : customer?.name ?? "—"}
            </dd>
            <dt>Business</dt>
            <dd>{customer?.businessName ?? "—"}</dd>
            <dt>Created</dt>
            <dd>{new Date(challan.createdAt).toLocaleString()}</dd>
            {challan.createdBy && (
              <>
                <dt>Created by</dt>
                <dd>{challan.createdBy.name}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </Layout>
  );
}
