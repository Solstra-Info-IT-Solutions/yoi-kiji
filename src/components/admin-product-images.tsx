"use client";

import { useState } from "react";

type ImageItem = { id: string; url: string; alt: string; variantId: string | null; position: number; isPrimary: boolean };
type VariantOption = { id: string; label: string; sku: string };

export function AdminProductImages({
  productId, initialImages, variants = [],
}: {
  productId: string;
  initialImages: ImageItem[];
  variants?: VariantOption[];
}) {
  const [images, setImages] = useState(initialImages);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [variantId, setVariantId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [hostedUrl, setHostedUrl] = useState("");
  const [hostedAlt, setHostedAlt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function jsonRequest(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "The media operation failed.");
    return data;
  }

  async function saveImage(url: string, imageAlt: string) {
    const data = await jsonRequest(`/api/admin/products/${productId}/images`, "POST", {
      url, alt: imageAlt, variantId: variantId || null, isPrimary,
    });
    setImages(old => [...old, data.image]);
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) { setMessage("Choose an image file first."); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setMessage("Use a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setMessage("Image size must be 10 MB or less."); return; }
    if (alt.trim().length < 3) { setMessage("Add descriptive alt text."); return; }

    setBusy(true); setMessage("");
    try {
      const signature = await jsonRequest("/api/admin/media/sign", "POST", { productId });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signature.apiKey);
      form.append("timestamp", signature.timestamp);
      form.append("folder", signature.folder);
      form.append("public_id", signature.publicId);
      form.append("allowed_formats", signature.allowedFormats);
      form.append("overwrite", "false");
      form.append("signature", signature.signature);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: "POST", body: form,
      });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || !uploaded.secure_url) {
        throw new Error(uploaded.error?.message ?? "Image upload to storage failed.");
      }
      await saveImage(uploaded.secure_url, alt.trim());
      setFile(null); setAlt(""); setIsPrimary(false);
      const input = document.getElementById(`media-file-${productId}`) as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Image uploaded and attached to the product.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally { setBusy(false); }
  }

  async function addHosted(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await saveImage(hostedUrl, hostedAlt);
      setHostedUrl(""); setHostedAlt(""); setMessage("Hosted image attached.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add image."); }
    finally { setBusy(false); }
  }

  async function updateImage(imageId: string, patch: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const data = await jsonRequest(`/api/admin/products/${productId}/images`, "PATCH", { imageId, ...patch });
      setImages(old => old.map(image => image.id === imageId ? data.image : image).map(image =>
        patch.isPrimary === true && image.variantId === data.image.variantId && image.id !== imageId
          ? { ...image, isPrimary: false } : image
      ));
      if (patch.isPrimary === true) setMessage("Primary image updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update image."); }
    finally { setBusy(false); }
  }

  async function remove(imageId: string) {
    setBusy(true); setMessage("");
    try {
      await jsonRequest(`/api/admin/products/${productId}/images`, "DELETE", { imageId });
      setImages(old => {
        const removed = old.find(image => image.id === imageId);
        const remaining = old.filter(image => image.id !== imageId);
        if (removed?.isPrimary) {
          const next = remaining.filter(image => image.variantId === removed.variantId).sort((a, b) => a.position - b.position)[0];
          if (next) return remaining.map(image => image.id === next.id ? { ...image, isPrimary: true } : image);
        }
        return remaining;
      });
      setMessage("Image removed from the product.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove image."); }
    finally { setBusy(false); }
  }

  return <section className="admin-media-manager">
    <p className="eyebrow">PRODUCT MEDIA · {images.length} IMAGE(S)</p>
    <div className="admin-media-grid">
      {images.sort((a, b) => a.position - b.position).map(image => <article key={image.id}>
        <img src={image.url} alt={image.alt}/>
        <p>{image.alt}</p>
        <small>{image.variantId ? variants.find(variant => variant.id === image.variantId)?.label ?? "SKU image" : "All variants"}</small>
        {image.isPrimary && <strong>Primary</strong>}
        {!image.isPrimary && <button type="button" disabled={busy} onClick={() => void updateImage(image.id, { isPrimary: true })}>Make primary</button>}
        <button type="button" disabled={busy} onClick={() => void remove(image.id)}>Remove</button>
      </article>)}
    </div>
    <form className="admin-media-upload" onSubmit={upload}>
      <label>Upload product image<input id={`media-file-${productId}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => setFile(event.target.files?.[0] ?? null)}/></label>
      <label>Alt text<input required minLength={3} maxLength={200} value={alt} onChange={event => setAlt(event.target.value)} placeholder="e.g. Ivory cotton bedsheet, full view"/></label>
      <label>Attach to SKU<select value={variantId} onChange={event => setVariantId(event.target.value)}><option value="">Product gallery · all variants</option>{variants.map(variant => <option key={variant.id} value={variant.id}>{variant.label} · {variant.sku}</option>)}</select></label>
      <label className="admin-media-primary"><input type="checkbox" checked={isPrimary} onChange={event => setIsPrimary(event.target.checked)}/> Set as primary image for this gallery</label>
      <button type="submit" disabled={busy || !file}>{busy ? "Uploading…" : "Upload image"}</button>
      <small>JPG, PNG, WebP or AVIF · up to 10 MB. Images upload directly to Cloudinary using a short-lived server signature.</small>
    </form>
    <details className="admin-media-hosted">
      <summary>Attach an existing HTTPS image URL</summary>
      <form onSubmit={addHosted}>
        <label>Image URL<input required type="url" value={hostedUrl} onChange={event => setHostedUrl(event.target.value)} placeholder="https://…"/></label>
        <label>Alt text<input required minLength={3} maxLength={200} value={hostedAlt} onChange={event => setHostedAlt(event.target.value)}/></label>
        <button disabled={busy}>Attach URL</button>
      </form>
    </details>
    {message && <small role="status">{message}</small>}
  </section>;
}
