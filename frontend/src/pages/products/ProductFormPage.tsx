import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiItemResponse, Product } from "../../types";

interface FormState {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
}

const EMPTY: FormState = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<ApiItemResponse<Product>>(`/products/${id}`)
      .then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category ?? "",
          unitPrice: p.unitPrice,
          currentStock: String(p.currentStock),
          minStockAlert: String(p.minStockAlert),
          location: p.location ?? "",
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const res = await apiClient.put(`/products/${id}`, {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: Number(form.unitPrice),
          minStockAlert: Number(form.minStockAlert),
          location: form.location || undefined,
        });
        navigate(`/products/${res.data.data.id}`);
      } else {
        const res = await apiClient.post("/products", {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: Number(form.unitPrice),
          currentStock: Number(form.currentStock),
          minStockAlert: Number(form.minStockAlert),
          location: form.location || undefined,
        });
        navigate(`/products/${res.data.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Product">
        <div className="page-loading">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? "Edit product" : "Add product"}>
      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Product name *</label>
              <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label>SKU / code *</label>
              <input className="input mono" required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="field">
              <label>Category</label>
              <input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="field">
              <label>Unit price (₹) *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                required
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
              />
            </div>
            <div className="field">
              <label>{isEdit ? "Current stock" : "Opening stock"}</label>
              <input
                className="input"
                type="number"
                min={0}
                disabled={isEdit}
                value={form.currentStock}
                onChange={(e) => set("currentStock", e.target.value)}
              />
              {isEdit && <span className="hint">Use "Record stock movement" on the product page to adjust stock.</span>}
            </div>
            <div className="field">
              <label>Minimum stock alert</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.minStockAlert}
                onChange={(e) => set("minStockAlert", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Location / warehouse</label>
              <input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
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
