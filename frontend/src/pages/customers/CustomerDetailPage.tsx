import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiItemResponse, CustomerDetail } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  function load() {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<ApiItemResponse<CustomerDetail>>(`/customers/${id}`)
      .then((res) => setCustomer(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim() || !id) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/customers/${id}/follow-ups`, { note });
      setNote("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Customer">
        <div className="page-loading">Loading…</div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout title="Customer">
        <div className="banner banner-error">{error ?? "Customer not found."}</div>
      </Layout>
    );
  }

  return (
    <Layout title={customer.name}>
      <div className="toolbar">
        <StatusBadge status={customer.status} />
        <span className="chip">{customer.customerType}</span>
        {canEdit && (
          <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => navigate(`/customers/${customer.id}/edit`)}>
            Edit customer
          </button>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-heading">
              <h2>Details</h2>
            </div>
            <dl className="kv-list">
              <dt>Business name</dt>
              <dd>{customer.businessName ?? "—"}</dd>
              <dt>Mobile</dt>
              <dd className="mono">{customer.mobile}</dd>
              <dt>Email</dt>
              <dd>{customer.email ?? "—"}</dd>
              <dt>GST number</dt>
              <dd className="mono">{customer.gstNumber ?? "—"}</dd>
              <dt>Address</dt>
              <dd>{customer.address ?? "—"}</dd>
              <dt>Follow-up date</dt>
              <dd>{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "—"}</dd>
              <dt>Notes</dt>
              <dd>{customer.notes ?? "—"}</dd>
            </dl>
          </div>

          <div className="card">
            <div className="section-heading">
              <h2>Recent sales challans</h2>
              <Link to={`/challans?customerId=${customer.id}`}>View all</Link>
            </div>
            {customer.challans.length === 0 ? (
              <div className="empty-state">
                <div className="headline">No challans yet</div>
                <div>Sales challans created for this customer will appear here.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Challan</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.challans.map((c) => (
                    <tr key={c.id} className="clickable" onClick={() => navigate(`/challans/${c.id}`)}>
                      <td className="mono">{c.challanNumber}</td>
                      <td className="mono">{c.totalQuantity}</td>
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

        <div className="card">
          <div className="section-heading">
            <h2>Follow-up notes</h2>
          </div>

          {canEdit && (
            <form onSubmit={handleAddNote} style={{ marginBottom: 16 }}>
              <div className="field">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Log a call, visit, or update…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !note.trim()}>
                {submitting ? "Saving…" : "Add note"}
              </button>
            </form>
          )}

          {customer.followUps.length === 0 ? (
            <div className="empty-state">
              <div className="headline">No notes yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {customer.followUps.map((f) => (
                <div key={f.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <div style={{ fontSize: 13 }}>{f.note}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
                    {f.createdByName} &middot; {new Date(f.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
