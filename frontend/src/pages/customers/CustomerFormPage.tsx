import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { apiClient, apiErrorMessage } from "../../api/client";
import { ApiItemResponse, Customer } from "../../types";

interface FormState {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: string;
  address: string;
  status: string;
  followUpDate: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: "",
};

export function CustomerFormPage() {
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
      .get<ApiItemResponse<Customer>>(`/customers/${id}`)
      .then((res) => {
        const c = res.data.data;
        setForm({
          name: c.name,
          mobile: c.mobile,
          email: c.email ?? "",
          businessName: c.businessName ?? "",
          gstNumber: c.gstNumber ?? "",
          customerType: c.customerType,
          address: c.address ?? "",
          status: c.status,
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
          notes: c.notes ?? "",
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
    const payload = {
      ...form,
      followUpDate: form.followUpDate || undefined,
      email: form.email || "",
    };
    try {
      if (isEdit) {
        const res = await apiClient.put(`/customers/${id}`, payload);
        navigate(`/customers/${res.data.data.id}`);
      } else {
        const res = await apiClient.post("/customers", payload);
        navigate(`/customers/${res.data.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Customer">
        <div className="page-loading">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? "Edit customer" : "Add customer"}>
      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Customer name *</label>
              <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label>Mobile number *</label>
              <input className="input" required value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="field">
              <label>Business name</label>
              <input className="input" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
            </div>
            <div className="field">
              <label>GST number</label>
              <input className="input" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
            </div>
            <div className="field">
              <label>Customer type *</label>
              <select className="select" value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>Follow-up date</label>
              <input className="input" type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
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
