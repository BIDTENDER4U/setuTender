"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { FileText, Clock, Plus, Trash2, UploadCloud, AlertCircle, ArrowRight } from "lucide-react";

export default function AnalyzeTenderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleAddFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const validList = Array.from(newFiles).filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".pdf") || ext.endsWith(".doc") || ext.endsWith(".docx") || ext.endsWith(".txt");
    });

    setFiles((prev) => {
      // Avoid duplicate files by name and size
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const nonDuplicates = validList.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...nonDuplicates];
    });
    setError(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("Please select at least one tender document.");
      return;
    }

    setStage("uploading");
    setError(null);

    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }

    try {
      const res = await fetch("/api/tenders/analyze", { method: "POST", body: form });
      const responseText = await res.text();
      let data: { error?: string; analysisId?: string } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: "The server returned an invalid response. Please try again." };
      }

      if (!res.ok) {
        setStage("error");
        setError(data.error ?? "Analysis failed");
        return;
      }
      router.push(`/dashboard/tenders/${data.analysisId}`);
    } catch (e: any) {
      setStage("error");
      setError(e.message || "Failed to analyze tender documents.");
    }
  }

  return (
    <div>
      <TopBar 
        title="Analyze Tender Documents" 
        subtitle="Upload one or multiple tender documents (NIT, Technical Specifications, GCC/SCC, Corrigendum, BOQ)" 
      />

      <div className="p-9 max-w-2xl">
        {stage !== "uploading" && (
          <div>
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleAddFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? "border-accent bg-accentSoft/30" 
                  : "border-rule hover:border-accent bg-surface"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <UploadCloud size={36} color="#B4690E" strokeWidth={1.4} className="mx-auto mb-3" />
              <div className="font-serif text-[18px] text-ink font-medium">
                {files.length === 0 ? "Select or Drop Tender Document(s)" : "Add more tender files"}
              </div>
              <div className="text-xs text-inkFaint mt-1.5">
                Multi-file supported: Select multiple PDFs, Word documents or Annexures simultaneously
              </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="font-mono text-[11px] text-inkFaint uppercase tracking-wider">
                    Selected Documents ({files.length})
                  </div>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-danger hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="border border-rule bg-surface divide-y divide-ruleSoft max-h-64 overflow-y-auto">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 px-4">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <FileText size={18} color="#B4690E" className="shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{file.name}</div>
                          <div className="font-mono text-[11px] text-inkFaint">{formatBytes(file.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 text-inkFaint hover:text-danger rounded hover:bg-dangerSoft transition-colors"
                        title="Remove file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-ink text-white px-5 py-3 text-sm font-medium hover:bg-inkSoft transition-colors shadow-sm"
                  >
                    <span>Start Analysis ({files.length} {files.length === 1 ? "document" : "documents"})</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 border border-rule bg-surface px-4 py-3 text-sm text-ink hover:bg-ruleSoft transition-colors"
                  >
                    <Plus size={15} />
                    <span>Add File</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uploading & Processing State */}
        {stage === "uploading" && (
          <div className="bg-surface border border-rule p-7 max-w-md">
            <div className="font-serif text-[18px] text-ink mb-1">
              Analyzing {files.length} Tender {files.length === 1 ? "Document" : "Documents"}
            </div>
            <div className="text-xs text-inkFaint mb-5">
              Reading through all uploaded files, extracting criteria, and cross-matching against your profile.
            </div>

            <div className="space-y-3">
              {[
                "Extracting text and clauses from all uploaded documents",
                "Synthesizing technical, financial & experience requirements",
                "Cross-referencing against Company Profile & Document Vault",
                "Evaluating mandatory checklist items and missing certificates",
                "Calculating explainable eligibility score & recommendation",
              ].map((step, i) => (
                <div key={step} className="flex items-start gap-3 py-1">
                  <Clock size={15} color="#B4690E" strokeWidth={1.8} className="mt-0.5 shrink-0 animate-spin" />
                  <div className="text-[13px] text-inkSoft leading-tight">{step}…</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-inkFaint mt-5 pt-4 border-t border-ruleSoft">
              This can take 20-60 seconds depending on document length. Please do not close the window.
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === "error" && (
          <div className="mt-6 bg-dangerSoft border border-danger/20 text-danger text-sm p-4 flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-0.5">Analysis Failed</div>
              <div className="text-xs leading-relaxed">{error}</div>
              <button
                type="button"
                onClick={() => setStage("idle")}
                className="mt-3 inline-block text-xs font-semibold underline text-ink"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
