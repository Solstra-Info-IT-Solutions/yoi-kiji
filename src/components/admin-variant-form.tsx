"use client";

import { useMemo, useState } from "react";

type Axis = { id: string; key: string; name: string; type: string; unit: string | null; options: unknown };
type Variant = { id: string; sku: string; label: string; inventoryQty: number; pricePaise: number | null; isActive: boolean; attributes?: unknown };
type MatrixRow = { sku: string; label: string; attributes: Record<string, string> };

function slugPart(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminVariantForm({ productId, productSku, axes = [], initialVariants = [] }: { productId: string; productSku: string; axes?: Axis[]; initialVariants?: Variant[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [manualLabel, setManualLabel] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [variants, setVariants] = useState(initialVariants);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixPrice, setMatrixPrice] = useState("");
  const [matrixStock, setMatrixStock] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("0");
  const [editAttributes, setEditAttributes] = useState<Record<string, string>>({});

  const matrixRows = useMemo<MatrixRow[]>(() => {
    if (!axes.length || axes.some(axis => axis.type !== "SELECT" || !Array.isArray(axis.options) || axis.options.length === 0)) return [];
    let combinations: Record<string, string>[] = [{}];
    for (const axis of axes) {
      const options = (axis.options as unknown[]).filter((value): value is string => typeof value === "string");
      combinations = combinations.flatMap(current => options.map(option => ({ ...current, [axis.key]: option })));
      if (combinations.length > 250) return [];
    }
    return combinations.map(attributes => {
      const parts = axes.map(axis => attributes[axis.key]);
      return {
        attributes,
        label: axes.map(axis => `${axis.name}: ${attributes[axis.key]}`).join(" / "),
        sku: [productSku, ...parts.map(slugPart)].filter(Boolean).join("-").toUpperCase(),
      };
    });
  }, [axes, productSku]);

  function update(key: string, value: string) { setValues(old => ({ ...old, [key]: value })); }
  const generatedLabel = axes.length ? axes.map(axis => `${axis.name}: ${values[axis.key] ?? ""}`).join(" / ") : manualLabel;

  async function requestJson(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "The variant operation failed.");
    return data;
  }

  async function submitSingle(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (axes.some(axis => !values[axis.key])) throw new Error("Choose a value for every variant option.");
      const attributes = Object.fromEntries(axes.map(axis => [axis.key, values[axis.key]]));
      const data = await requestJson(`/api/admin/products/${productId}/variants`, "POST", {
        label: generatedLabel, sku, pricePaise: price ? Math.round(Number(price) * 100) : undefined,
        inventoryQty: Number(stock), isActive: true, attributes,
      });
      setVariants(old => [...old, data.variant]); setMessage("Variant SKU created.");
      setValues({}); setSku(""); setPrice(""); setStock("0"); setManualLabel("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add variant."); }
    finally { setBusy(false); }
  }

  async function createMatrix() {
    setBusy(true); setMessage("");
    try {
      if (!matrixRows.length) throw new Error("This product type does not have a supported selectable variant matrix.");
      if (matrixRows.length + variants.length > 250) throw new Error("The matrix would exceed the 250-SKU limit.");
      const data = await requestJson(`/api/admin/products/${productId}/variants/bulk`, "POST", {
        variants: matrixRows.map(row => ({
          ...row, inventoryQty: Number(matrixStock),
          ...(matrixPrice ? { pricePaise: Math.round(Number(matrixPrice) * 100) } : {}),
        })),
      });
      setVariants(old => [...old, ...data.variants]); setMessage(`${data.createdCount} SKU combinations created.`);
      setMatrixOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate SKU matrix."); }
    finally { setBusy(false); }
  }

  function beginEdit(variant: Variant) {
    const attrs = variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
      ? Object.fromEntries(Object.entries(variant.attributes as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
      : {};
    setEditingId(variant.id); setEditSku(variant.sku); setEditLabel(variant.label);
    setEditPrice(variant.pricePaise == null ? "" : (variant.pricePaise / 100).toFixed(2));
    setEditStock(String(variant.inventoryQty)); setEditAttributes(attrs);
  }

  async function saveEdit(variantId: string) {
    setBusy(true); setMessage("");
    try {
      const data = await requestJson(`/api/admin/products/${productId}/variants/${variantId}`, "PATCH", {
        sku: editSku, label: editLabel, pricePaise: editPrice ? Math.round(Number(editPrice) * 100) : null,
        inventoryQty: Number(editStock), attributes: editAttributes,
      });
      setVariants(old => old.map(variant => variant.id === variantId ? data.variant : variant));
      setEditingId(null); setMessage("Variant changes saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update variant."); }
    finally { setBusy(false); }
  }

  async function archiveVariant(variantId: string) {
    if (!window.confirm("Archive this SKU? It will no longer be available for new purchases.")) return;
    setBusy(true); setMessage("");
    try {
      const data = await requestJson(`/api/admin/products/${productId}/variants/${variantId}`, "DELETE");
      setVariants(old => old.map(variant => variant.id === variantId ? data.variant : variant));
      setMessage("SKU archived. Existing order history is preserved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to archive SKU."); }
    finally { setBusy(false); }
  }

  return <div className="admin-variant">
    <button type="button" onClick={() => setOpen(value => !value)}>{open ? "Close variant manager −" : "Manage variants / SKUs +"}</button>
    {variants.length > 0 && <div className="admin-variant-list">{variants.map(variant => <div key={variant.id} className="admin-variant-item">
      {editingId === variant.id ? <>
        <label>SKU<input value={editSku} onChange={event => setEditSku(event.target.value)} /></label>
        <label>Label<input value={editLabel} onChange={event => setEditLabel(event.target.value)} /></label>
        {axes.map(axis => <label key={axis.id}>{axis.name}<input value={editAttributes[axis.key] ?? ""} onChange={event => setEditAttributes(old => ({ ...old, [axis.key]: event.target.value }))} /></label>)}
        <label>Price override (INR)<input type="number" min=".01" step=".01" value={editPrice} onChange={event => setEditPrice(event.target.value)} /></label>
        <label>Stock<input type="number" min="0" value={editStock} onChange={event => setEditStock(event.target.value)} /></label>
        <button type="button" disabled={busy} onClick={() => void saveEdit(variant.id)}>Save SKU</button>
        <button type="button" disabled={busy} onClick={() => setEditingId(null)}>Cancel</button>
      </> : <>
        <strong>{variant.label}</strong><span>{variant.sku}</span><span>{variant.inventoryQty} in stock</span><span>{variant.isActive ? "Active" : "Archived"}</span>
        <button type="button" disabled={busy || !variant.isActive} onClick={() => beginEdit(variant)}>Edit</button>
        <button type="button" disabled={busy || !variant.isActive} onClick={() => void archiveVariant(variant.id)}>Archive</button>
      </>}
    </div>)}</div>}
    {open && <>
      <div className="admin-variant-actions">
        {axes.length > 0 && <button type="button" onClick={() => setMatrixOpen(value => !value)}>{matrixOpen ? "Close matrix generator" : "Generate variant matrix"}</button>}
      </div>
      {matrixOpen && <section className="admin-variant-matrix">
        <p className="eyebrow">COMBINATION MATRIX</p>
        {matrixRows.length ? <>
          <p>{matrixRows.length} combinations will be generated from the configured select options.</p>
          <div className="admin-variant-matrix-preview">{matrixRows.slice(0, 12).map(row => <div key={row.label}><span>{row.label}</span><code>{row.sku}</code></div>)}</div>
          {matrixRows.length > 12 && <small>Showing first 12 of {matrixRows.length} combinations.</small>}
          <label>Price override for all (INR, optional)<input type="number" min=".01" step=".01" value={matrixPrice} onChange={event => setMatrixPrice(event.target.value)} /></label>
          <label>Opening stock per SKU<input type="number" min="0" step="1" value={matrixStock} onChange={event => setMatrixStock(event.target.value)} /></label>
          <button type="button" disabled={busy} onClick={() => void createMatrix()}>{busy ? "Generating…" : `Create ${matrixRows.length} SKUs`}</button>
        </> : <p>Matrix generation supports configured SELECT axes with up to 250 combinations. Add options to the product type or use the single-SKU form for numeric/text axes.</p>}
      </section>}
      <form onSubmit={submitSingle}>
        {axes.length ? axes.map(axis => {
          const options = Array.isArray(axis.options) ? axis.options.filter((value): value is string => typeof value === "string") : [];
          return <label key={axis.id}>{axis.name}{axis.unit ? ` (${axis.unit})` : ""}{axis.type === "SELECT" ? <select required value={values[axis.key] ?? ""} onChange={event => update(axis.key, event.target.value)}><option value="">Choose…</option>{options.map(option => <option key={option}>{option}</option>)}</select> : <input required type={axis.type === "NUMBER" ? "number" : "text"} step={axis.type === "NUMBER" ? "any" : undefined} value={values[axis.key] ?? ""} onChange={event => update(axis.key, event.target.value)} />}</label>;
        }) : <label>Variant option label<input required value={manualLabel} onChange={event => setManualLabel(event.target.value)} placeholder="e.g. Single / Sage" /></label>}
        <input required placeholder="Variant SKU" value={sku} onChange={event => setSku(event.target.value)} />
        <input placeholder="Price override (INR)" type="number" min=".01" step=".01" value={price} onChange={event => setPrice(event.target.value)} />
        <input required aria-label="Variant stock" type="number" min="0" value={stock} onChange={event => setStock(event.target.value)} />
        <button disabled={busy}>{busy ? "Saving…" : "Create single SKU"}</button>
      </form>
    </>}
    {message && <small role="status">{message}</small>}
  </div>;
}
