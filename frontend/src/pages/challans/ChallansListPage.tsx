import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiListResponse, PaginationMeta, SalesChallan } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function ChallansListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const search = searchParams.get("search") ?? "";

  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<ApiListResponse<SalesChallan>>("/challans", {
        params: {
          page,
          pageSize: 15,
          status: status || undefined,
          customerId: customerId || undefined,
          search: search || undefined,
        },
      })
      .then((res) => {
        setChallans(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, status, customerId, search]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <Layout title="Sales Challans">
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search challan number..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => updateParam("search", e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select className="select" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {canCreate && (
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => navigate("/challans/new")}>
            + New challan
          </button>
        )}
      </div>

      <div className="card">
        {error && <div className="banner banner-error">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading challans…</div>
        ) : challans.length === 0 ? (
          <div className="empty-state">
            <div className="headline">No challans found</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Total qty</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {challans.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/challans/${c.id}`)}>
                  <td className="mono">{c.challanNumber}</td>
                  <td>{(c.customer as { name: string })?.name ?? "—"}</td>
                  <td className="mono">{c.totalQuantity}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {meta && <Pagination meta={meta} onPageChange={(p) => updateParam("page", String(p))} />}
      </div>
    </Layout>
  );
}
