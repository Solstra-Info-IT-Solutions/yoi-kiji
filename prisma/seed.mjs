import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categoryTree = [
  { name: "Bedsheets", slug: "bedsheets", children: ["Flat Bedsheets", "Fitted Bedsheets", "Bedsheet Sets", "Pillow Covers", "Duvet Covers", "Mattress Protectors"] },
  { name: "Curtains", slug: "curtains", children: ["Sheer Curtains", "Blackout Curtains", "Room Darkening Curtains", "Curtain Panels", "Curtain Sets", "Curtain Accessories"] },
  { name: "Upholstery", slug: "upholstery", children: ["Upholstery Fabric", "Cushion Covers", "Sofa Throws", "Chair Covers"] },
  { name: "Bath Linen", slug: "bath-linen", children: ["Bath Towels", "Hand Towels", "Face Towels", "Bath Mats", "Bathrobes"] },
  { name: "Kitchen Linen", slug: "kitchen-linen", children: ["Kitchen Towels", "Tea Towels", "Aprons", "Oven Mitts", "Table Linen"] },
];

const blueprints = [
  { name: "Bedsheet", slug: "bedsheet", attributes: [
    { name: "Fabric composition", key: "fabric_composition", type: "TEXT", required: false, filterable: true },
    { name: "Weave", key: "weave", type: "SELECT", options: ["Percale", "Sateen", "Plain", "Twill", "Other"], filterable: true },
    { name: "Thread count", key: "thread_count", type: "NUMBER", unit: "TC", filterable: true },
    { name: "Fabric GSM", key: "fabric_gsm", type: "NUMBER", unit: "GSM", filterable: true },
    { name: "Size / fit", key: "size_fit", type: "SELECT", options: ["Single", "Double", "King", "Fitted"], variantAxis: true, filterable: true },
    { name: "Sheet length", key: "sheet_length_cm", type: "NUMBER", unit: "cm" },
    { name: "Sheet width", key: "sheet_width_cm", type: "NUMBER", unit: "cm" },
    { name: "Mattress depth", key: "mattress_depth_cm", type: "NUMBER", unit: "cm" },
    { name: "Pillow cover quantity", key: "pillow_cover_count", type: "NUMBER", unit: "pcs" },
    { name: "Set contents", key: "set_contents", type: "TEXT" },
  ] },
  { name: "Curtain", slug: "curtain", attributes: [
    { name: "Fabric composition", key: "curtain_fabric_composition", type: "TEXT", filterable: true },
    { name: "Panel width", key: "panel_width_cm", type: "NUMBER", unit: "cm", variantAxis: true, filterable: true },
    { name: "Drop length", key: "drop_length_cm", type: "NUMBER", unit: "cm", variantAxis: true, filterable: true },
    { name: "Heading style", key: "heading_style", type: "SELECT", options: ["Eyelet", "Pinch pleat", "Rod pocket", "Tab top", "Other"], filterable: true },
    { name: "Opacity", key: "curtain_opacity", type: "SELECT", options: ["Sheer", "Light filtering", "Room darkening", "Blackout (evidence required)"], filterable: true },
    { name: "Lining", key: "curtain_lining", type: "SELECT", options: ["Unlined", "Lined", "Thermal lined"] },
    { name: "Panel count", key: "curtain_panel_count", type: "NUMBER", unit: "panels" },
    { name: "Hardware included", key: "curtain_hardware_included", type: "BOOLEAN" },
  ] },
  { name: "Upholstery", slug: "upholstery-product", attributes: [
    { name: "Sellable format", key: "upholstery_format", type: "SELECT", options: ["Fabric by metre", "Roll", "Swatch", "Cushion cover", "Throw", "Ready-made cover"], filterable: true },
    { name: "Fabric composition", key: "upholstery_composition", type: "TEXT", filterable: true },
    { name: "Usable width", key: "usable_width_cm", type: "NUMBER", unit: "cm" },
    { name: "Vertical pattern repeat", key: "vertical_repeat_cm", type: "NUMBER", unit: "cm" },
    { name: "Horizontal pattern repeat", key: "horizontal_repeat_cm", type: "NUMBER", unit: "cm" },
    { name: "Abrasion test result", key: "abrasion_cycles", type: "NUMBER", unit: "cycles" },
  ] },
  { name: "Bath linen", slug: "bath-linen-product", attributes: [
    { name: "Bath linen form", key: "bath_linen_form", type: "SELECT", options: ["Bath towel", "Hand towel", "Face towel", "Bath mat", "Bathrobe", "Set"], filterable: true },
    { name: "Fabric composition", key: "bath_fabric_composition", type: "TEXT", filterable: true },
    { name: "GSM", key: "bath_gsm", type: "NUMBER", unit: "GSM", filterable: true },
    { name: "Length", key: "bath_length_cm", type: "NUMBER", unit: "cm" },
    { name: "Width", key: "bath_width_cm", type: "NUMBER", unit: "cm" },
    { name: "Set contents", key: "bath_set_contents", type: "TEXT" },
  ] },
  { name: "Kitchen linen", slug: "kitchen-linen-product", attributes: [
    { name: "Kitchen linen form", key: "kitchen_linen_form", type: "SELECT", options: ["Kitchen towel", "Tea towel", "Apron", "Oven mitt", "Table linen", "Set"], filterable: true },
    { name: "Fabric composition", key: "kitchen_fabric_composition", type: "TEXT", filterable: true },
    { name: "GSM", key: "kitchen_gsm", type: "NUMBER", unit: "GSM", filterable: true },
    { name: "Length", key: "kitchen_length_cm", type: "NUMBER", unit: "cm" },
    { name: "Width", key: "kitchen_width_cm", type: "NUMBER", unit: "cm" },
    { name: "Hanging loop", key: "kitchen_hanging_loop", type: "BOOLEAN" },
    { name: "Set contents", key: "kitchen_set_contents", type: "TEXT" },
  ] },
];

async function main() {
  for (const root of categoryTree) {
    const parent = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { name: root.name, isActive: true, showInMenu: true },
      create: { name: root.name, slug: root.slug, isActive: true, showInMenu: true },
    });
    for (const [index, childName] of root.children.entries()) {
      const slug = childName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await prisma.category.upsert({
        where: { slug },
        update: { name: childName, parentId: parent.id, isActive: true, showInMenu: true, sortOrder: index },
        create: { name: childName, slug, parentId: parent.id, isActive: true, showInMenu: true, sortOrder: index },
      });
    }
  }

  for (const blueprint of blueprints) {
    const productType = await prisma.productType.upsert({
      where: { slug: blueprint.slug },
      update: { name: blueprint.name, description: "Starter attribute blueprint. Confirm actual SKU specifications before publishing products." },
      create: { name: blueprint.name, slug: blueprint.slug, description: "Starter attribute blueprint. Confirm actual SKU specifications before publishing products." },
    });
    for (const [index, field] of blueprint.attributes.entries()) {
      const attribute = await prisma.attributeDefinition.upsert({
        where: { key: field.key },
        update: {
          name: field.name,
          type: field.type,
          unit: "unit" in field ? field.unit : null,
          options: "options" in field ? field.options : undefined,
          isFilterable: "filterable" in field ? Boolean(field.filterable) : false,
          isVariantAxis: "variantAxis" in field ? Boolean(field.variantAxis) : false,
          isActive: true,
        },
        create: {
          name: field.name,
          key: field.key,
          type: field.type,
          unit: "unit" in field ? field.unit : null,
          options: "options" in field ? field.options : undefined,
          isFilterable: "filterable" in field ? Boolean(field.filterable) : false,
          isVariantAxis: "variantAxis" in field ? Boolean(field.variantAxis) : false,
        },
      });
      await prisma.productTypeAttribute.upsert({
        where: { productTypeId_attributeId: { productTypeId: productType.id, attributeId: attribute.id } },
        update: { isRequired: "required" in field ? Boolean(field.required) : false, isFilterable: "filterable" in field ? Boolean(field.filterable) : false, sortOrder: index },
        create: { productTypeId: productType.id, attributeId: attribute.id, isRequired: "required" in field ? Boolean(field.required) : false, isFilterable: "filterable" in field ? Boolean(field.filterable) : false, sortOrder: index },
      });
    }
  }
  console.log("YOI KIJI starter taxonomy and product-type blueprints seeded. No product claims or inventory were created.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
