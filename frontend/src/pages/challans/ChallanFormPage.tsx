import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiListResponse, Customer, Product } from "../../types";

interface LineItem {
  productId: string;
  quantity: string;
}

export function ChallanFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);
  const [saving, setSaving] = useState<"DRAFT" | "CONFIRMED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<ApiListResponse<Customer>>("/customers", { params: { page: 1, pageSize: 100 } })
      .then((res) => setCustomers(res.data.data));
    apiClient
      .get<ApiListResponse<Product>>("/products", { params: { page: 1, pageSize: 100 } })
      .then((res) => setProducts(res.data.data));
  }, []);

  function productStock(productId: string): number | null {
    return products.find((p) => p.id === productId)?.currentStock ?? null;
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems((cur) => [...cur, { productId: "", quantity: "1" }]);
  }

  function removeRow(index: number) {
    setItems((cur) => cur.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent, status: "DRAFT" | "CONFIRMED") {
    e.preventDefault();
    setError(null);

    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0);
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    setSaving(status);
    try {
      const res = await apiClient.post("/challans", {
        customerId,
        status,
        items: validItems.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
      });
      navigate(`/challans/${res.data.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Layout title="New sales challan">
      <div className="card" style={{ maxWidth: 720 }}>
        {error && <div className="banner banner-error">{error}</div>}

        <form>
          <div className="field">
            <label>Customer *</label>
            <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `(${c.businessName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Products</label>
            {items.map((item, i) => {
              const stock = productStock(item.productId);
              const requested = Number(item.quantity) || 0;
              const insufficient = stock !== null && requested > stock;
              return (
                <div key={i}>
                  <div className="line-item-row">
                    <select className="select" value={item.productId} onChange={(e) => updateItem(i, { productId: e.target.value })}>
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — {p.currentStock} in stock
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeRow(i)}
                      disabled={items.length === 1}
                      title="Remove line"
                    >
                      ×
                    </button>
                  </div>
                  {insufficient && (
                    <div className="field" style={{ marginTop: -4, marginBottom: 10 }}>
                      <span className="error">Only {stock} in stock — this line will be rejected if you confirm.</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              + Add product line
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" type="button" disabled={saving !== null} onClick={(e) => handleSubmit(e, "DRAFT")}>
              {saving === "DRAFT" ? "Saving…" : "Save as draft"}
            </button>
            <button className="btn btn-primary" type="button" disabled={saving !== null} onClick={(e) => handleSubmit(e, "CONFIRMED")}>
              {saving === "CONFIRMED" ? "Confirming…" : "Save & confirm (reduces stock)"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
