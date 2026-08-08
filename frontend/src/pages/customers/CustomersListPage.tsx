import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiListResponse, Customer, PaginationMeta } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function CustomersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<ApiListResponse<Customer>>("/customers", {
        params: { page, pageSize: 15, search: search || undefined, status: status || undefined },
      })
      .then((res) => {
        setCustomers(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <Layout title="Customers">
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name, mobile, email, GST..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => updateParam("search", e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select className="select" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {canCreate && (
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => navigate("/customers/new")}>
            + Add customer
          </button>
        )}
      </div>

      <div className="card">
        {error && <div className="banner banner-error">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="headline">No customers found</div>
            <div>Try adjusting your search or filters.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                  <td>{c.name}</td>
                  <td>{c.businessName ?? "—"}</td>
                  <td className="mono">{c.mobile}</td>
                  <td>{c.customerType}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—"}</td>
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
