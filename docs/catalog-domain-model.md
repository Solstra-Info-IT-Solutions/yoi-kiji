# YOI KIJI — Catalog research and product information model

Status: architecture baseline, 15 November 2026. This document defines the catalog model and starter merchandising taxonomy. It is not a substitute for client-approved product specifications, laboratory test reports, tax advice, or legal review.

## 1. Catalog architecture decisions

1. **Unlimited-depth category tree:** categories are records with a nullable `parentId`; no code-level limit for parent, child, or deeper descendants. Admin validation must prevent self-parenting and cycles.
2. **Classification is not filtering:** category membership answers “where does this product belong?” Attributes answer “what properties does it have?”. Colour, size, weave, GSM, and fabric composition must not become category nodes just to create filters.
3. **One product, multiple placements:** a product may appear in multiple categories/collections, while retaining one canonical product URL. The legacy single `categoryId` is retained temporarily for backwards compatibility; new catalog code should use `ProductCategory`.
4. **Product-type driven fields:** each product belongs to a product type/family. Product types attach reusable typed attribute definitions. Required fields and filters are configured per type, not hard-coded into every product form.
5. **Variants are sellable SKUs:** size, colour, dimensions, pack size, and other selectable options should resolve to a concrete SKU with its own price, stock, barcode and fulfillment dimensions. Product-level descriptive facts remain on the parent product.
6. **Canonical units:** store measurements in metric units (mm, g, m², GSM as g/m²) and convert for display. Store currency as integer paise. Keep marketing labels separate from canonical filter values.
7. **No invented claims:** thread count, GSM, fibre composition, certifications, shrinkage, colour-fastness, blackout percentage and performance claims must be supplied or substantiated by the seller. Do not infer them from product category or imagery.

## 2. Recommended starter category tree

This is a proposed starting taxonomy, not a fixed or seeded tree. The admin can rename, reorder, deactivate, nest, or add branches at any depth.

- Bedsheets
  - Flat Bedsheets
  - Fitted Bedsheets
  - Bedsheet Sets
  - Pillow Covers
  - Duvet Covers
  - Mattress Protectors
- Curtains
  - Sheer Curtains
  - Blackout Curtains
  - Room Darkening Curtains
  - Curtain Panels
  - Curtain Sets
  - Curtain Accessories
- Upholstery
  - Upholstery Fabric
  - Cushion Covers
  - Sofa Throws
  - Chair Covers
- Bath Linen
  - Bath Towels
  - Hand Towels
  - Face Towels
  - Bath Mats
  - Bathrobes
- Kitchen Linen
  - Kitchen Towels
  - Tea Towels
  - Aprons
  - Oven Mitts
  - Table Linen

Seasonal edits, curated stories, and sale groupings should be collections/campaigns, not permanent taxonomy branches.

## 3. Product-type attribute blueprints

The following are candidate fields. The seller must confirm which apply to each actual SKU.

### Shared core
- Identity: product title, handle/slug, product type, brand, vendor/manufacturer, model/style code, SKU, barcode/GTIN (if assigned).
- Merchandising: short description, long description, highlights, usage/room, style, collection, tags, related products.
- Media: gallery, detail images, lifestyle images, video, swatch, alt text, image order, variant-specific media, usage rights.
- Commercial: selling price, MRP/compare-at price, cost (admin only), tax category/rate, HSN, country of origin, availability and publication state.
- Fulfillment: packed weight, packed length/width/height, package count, shipping class, fragile/oversize flags.
- Customer care: care instructions, warranty/guarantee only where offered, return eligibility according to approved policy.

### Bedsheets and bedding
- Fibre composition (structured percentages summing to 100), fabric construction/weave (e.g. percale, sateen, plain), yarn details if provided, thread count with counting method if substantiated, fabric GSM if measured, finish/treatment, print/dye method, colour and colour family.
- Size/fit as variant axes: Single, Double, Queen, King, fitted, etc. Keep actual mattress/linen dimensions in cm; for fitted sheets capture mattress depth/pocket depth and elastic/skirt details.
- Set contents and quantity: number of bedsheets, pillow covers, pillow-cover dimensions, fitted/flat configuration.
- Care: wash temperature, machine/hand wash, bleach, tumble dry, iron, dry clean, shrinkage caveat.
- Packaging: packed weight and dimensions per sellable variant.

### Curtains
- Panel width and drop/length in cm; panel count and whether dimensions are per panel or total set.
- Heading style (eyelet, pinch pleat, rod pocket, tab top, etc.), lining, opacity/blackout claim with evidence, light-filtering level, thermal/acoustic claims only when tested.
- Fibre composition, weave, GSM where relevant, pattern, colour family, finish, care.
- Mounting hardware included/not included, hem allowance, custom sizing availability.

### Upholstery
- Sellable format: fabric by metre, roll, swatch, cushion cover, throw, or ready-made cover.
- Composition, weave/construction, GSM, usable width, repeat (vertical/horizontal), abrasion/rub test (method and result), pilling, colour-fastness, stain/water resistance and fire-retardant claims only with test evidence.
- For made-ups: finished dimensions, fit/compatibility, closure, filling (if any), set contents and packed dimensions.

### Bath linen
- Product form, fibre composition, GSM, dimensions, pile/construction, yarn type, border/finish, absorbency/quick-dry claims only when substantiated.
- Bath towel, hand towel, face towel, bath mat and robe require distinct size/fit and care attributes.
- Set contents and quantity; packed weight and dimensions.

### Kitchen linen
- Product form and use, fibre composition, weave, GSM, dimensions, absorbency/heat-resistance claims only where tested.
- Hanging loop, pockets, lining, coating, set contents and quantity.
- Food-contact or heat-protection claims require evidence and applicable compliance review.

## 4. Variant and SKU policy

- One purchasable combination = one stable SKU and stock ledger identity.
- Variant axes are product-type configurable (for example size + colour; panel width + drop; fabric length).
- Variant-specific price, compare-at price, stock, barcode, weight and package dimensions override parent defaults.
- Avoid encoding all option values into category names or free-text labels.
- Retired variants must be archived, not hard-deleted, once referenced by orders.

## 5. India labeling and tax data

Keep structured fields for manufacturer/packer/importer/brand owner details, country of origin, net quantity with unit, month/year where applicable, MRP, consumer-care contact, HSN, seller GSTIN and place-of-supply inputs. The exact declarations depend on whether goods are pre-packaged, imported, sold loose/open, and on current rules. Legal Metrology (Packaged Commodities) Rules and amendments must be checked against the actual packaging and sales model before launch.

A Textiles Committee draft regulation surfaced in the research results in March 2026 and discusses made-up textile labeling including fibre composition, care instructions, country of origin, responsible business details and traceability. It is a **draft**, not assumed to be an operative rule. Confirm current notified requirements and applicable BIS/IS standards with the seller's compliance adviser before treating any draft as mandatory.

GST rate and HSN must be confirmed SKU-by-SKU with the seller's tax adviser. Never hard-code a presumed rate from a generic textile category.

## 6. Admin workflow requirements

1. Create/reorder/deactivate nested categories; preview storefront navigation and maintain redirects when slugs change.
2. Define product types and reusable attributes; choose input type, unit, allowed options, required status, filter status and display order.
3. Create a product using a type-specific form; show only applicable fields and indicate missing required data.
4. Add multiple category placements and choose one primary category.
5. Create variant matrix and generate/assign stable SKUs; bulk-edit price, stock, barcode, dimensions and media.
6. Save as draft, preview desktop/mobile, validate catalog completeness, then publish.
7. Bulk import/export with validation report and no silent partial writes.
8. Audit all sensitive changes: price, tax, SKU, stock, status, category hierarchy and variant deletion.

## 7. Storefront discovery requirements

- Navigation, breadcrumbs, category landing pages, product search, facets, sorting and related products must read the same catalog model.
- Facets are scoped by product type/category and only use explicitly filterable attributes.
- Keep one canonical product URL even when a product appears in multiple categories.
- Index curated landing pages selectively; avoid indexing every arbitrary filter combination.
- Product page should present decision-critical facts first: images, title, price, selectable options, stock/availability, dimensions, material, what is included, care, delivery estimate, returns policy and trust information.

## 8. Sources consulted

- Shopify, Product Taxonomy (2026): https://www.shopify.com/blog/product-taxonomy
- Shopify, Product Data Enrichment: https://www.shopify.com/enterprise/blog/product-data-enrichment-ecommerce
- Government of India, Legal Metrology (Packaged Commodities) Rules and amendments: https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/LM_PCR_All_Amendements.pdf
- Press Information Bureau, 2022 amendment explainer: https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1854289
- Textiles Committee, draft regulation surfaced March 2026 (verify current status before reliance): https://textilescommittee.gov.in/wp-content/uploads/2026/03/Draft-regualtions.pdf
- Industry construction reference for indicative home-textile parameters (not a standard or proof of any YOI KIJI product claim): https://akarta.in/textiles/home-textiles



## 9. Starter catalogue setup

After deploying the migrations and generating Prisma Client, run `npm run db:seed` to create the editable five-category starter tree and five product-type blueprints. The seed is idempotent and creates no sellable products, prices, stock, GST rates, or unverified textile claims.

Admin entry points:
- `/admin/categories` — create, edit, nest, reorder and activate/deactivate categories.
- `/admin/product-types` — configure product families and reusable typed attributes.
- `/admin/products` — create a product with the selected product type's dynamic fields.

The storefront reads active categories from the database. Parent category pages include products assigned directly to that category and to its descendants. Product detail pages render the saved product-type attributes. Variant-axis metadata is recorded in the attribute blueprint; the full variant matrix/SKU generator remains a separate implementation milestone before using those axes for purchasable combinations.
