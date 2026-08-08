import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Pagination } from "../../components/Pagination";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiListResponse, PaginationMeta, Product } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function ProductsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";

  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<ApiListResponse<Product>>("/products", {
        params: { page, pageSize: 15, search: search || undefined, lowStockOnly: lowStockOnly || undefined },
      })
      .then((res) => {
        setProducts(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, lowStockOnly]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <Layout title="Products & Stock">
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name or SKU..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => updateParam("search", e.target.value)}
          style={{ minWidth: 240 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => updateParam("lowStockOnly", e.target.checked ? "true" : "")}
          />
          Low stock only
        </label>
        {canManage && (
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => navigate("/products/new")}>
            + Add product
          </button>
        )}
      </div>

      <div className="card">
        {error && <div className="banner banner-error">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="headline">No products found</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit price</th>
                <th>Stock</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.currentStock <= p.minStockAlert;
                return (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/products/${p.id}`)}>
                    <td>{p.name}</td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category ?? "—"}</td>
                    <td className="mono">₹{Number(p.unitPrice).toFixed(2)}</td>
                    <td>
                      <span className={low ? "badge badge-amber" : "badge badge-teal"}>
                        <span className="dot" />
                        {p.currentStock}
                      </span>
                    </td>
                    <td>{p.location ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {meta && <Pagination meta={meta} onPageChange={(p) => updateParam("page", String(p))} />}
      </div>
    </Layout>
  );
}
