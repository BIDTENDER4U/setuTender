"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { Upload } from "lucide-react";

const CATEGORIES = ["COMPANY", "IDENTITY", "CERTIFICATE", "FINANCIAL", "TECHNICAL", "OTHER"];

const STATUS_TONE: Record<string, string> = {
  VALID: "text-success", EXPIRING: "text-warning", EXPIRED: "text-danger",
  MISSING: "text-danger", PENDING_VERIFICATION: "text-info",
};
const DOT_TONE: Record<string, string> = {
  VALID: "bg-success", EXPIRING: "bg-warning", EXPIRED: "bg-danger",
  MISSING: "bg-danger", PENDING_VERIFICATION: "bg-info",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("COMPANY");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocuments(data.documents ?? []);
  }
  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    form.append("category", category);
    if (expiryDate) form.append("expiryDate", expiryDate);
    await fetch("/api/documents", { method: "POST", body: form });
    setUploading(false);
    setShowForm(false);
    setName(""); setFile(null); setExpiryDate("");
    load();
  }

  const grouped = CATEGORIES.map((c) => [c, documents.filter((d) => d.category === c)] as const).filter(([, ds]) => ds.length || showForm);

  return (
    <div>
      <TopBar title="My Documents" subtitle="Uploaded once, reused for every tender analysis" />
      <div className="p-9">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-medium mb-7"
        >
          <Upload size={14} /> Upload document
        </button>

        {showForm && (
          <form onSubmit={handleUpload} className="border border-rule bg-surface p-5 mb-8 max-w-xl">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-inkFaint mb-1">Document name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-rule px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-inkFaint mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-rule px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-inkFaint mb-1">Expiry date (optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full border border-rule px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-inkFaint mb-1">File</label>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="w-full text-sm" />
              </div>
            </div>
            <button disabled={uploading} className="bg-ink text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
              {uploading ? "Uploading…" : "Save document"}
            </button>
          </form>
        )}

        {grouped.map(([cat, docs]) => (
          <div key={cat} className="mb-7">
            <div className="font-mono text-[11px] text-inkFaint mb-2.5">{cat}</div>
            <div className="border border-rule bg-surface divide-y divide-ruleSoft">
              {docs.length === 0 && <div className="px-5 py-3 text-sm text-inkFaint">No documents in this category yet.</div>}
              {docs.map((d) => (
                <div key={d.id} className="flex items-center px-5 py-3">
                  <span className={`w-2 h-2 mr-3 shrink-0 ${DOT_TONE[d.status]}`} />
                  <div className="flex-1 text-[13.5px] text-ink">{d.name}</div>
                  <div className="text-xs text-inkFaint w-48">
                    {d.expiryDate ? `Expires ${new Date(d.expiryDate).toLocaleDateString()}` : "—"}
                  </div>
                  <span className={`text-[11.5px] font-medium ${STATUS_TONE[d.status]}`}>{d.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
