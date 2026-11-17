"use client";
import { useState } from "react";

export function AdminProductCsvTools() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  async function importProducts() {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/admin/products/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Product import failed.");
      setResult(data);
      setFile(null);
      const input = document.getElementById("product-csv-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product import failed.");
    } finally { setBusy(false); }
  }
  return <section className="admin-panel" aria-labelledby="product-csv-heading">
    <div><p className="eyebrow">CATALOGUE TOOLS</p><h2 id="product-csv-heading">Bulk product import & export</h2>
      <p>Export your catalogue or import up to 500 new products from the matching CSV template. Existing SKUs and slugs are never overwritten.</p>
    </div>
    <div className="admin-row-controls">
      <a className="button" href="/api/admin/products/export">Export products CSV</a>
      <label htmlFor="product-csv-file">Choose product CSV</label>
      <input id="product-csv-file" type="file" accept=".csv,text/csv" onChange={event => { setFile(event.target.files?.[0] ?? null); setResult(null); setError(""); }}/>
      <button type="button" disabled={!file || busy} onClick={() => void importProducts()}>{busy ? "Importing…" : "Import new products"}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {result && <div role="status"><strong>{result.imported} imported · {result.failed} failed</strong>{result.errors.length > 0 && <ul>{result.errors.slice(0, 20).map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>}
  </section>;
}
