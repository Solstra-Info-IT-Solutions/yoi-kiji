"use client";

import { FormEvent, useEffect, useState } from "react";

type CategoryOption = { id: string; name: string; slug: string; parentId: string | null; isActive: boolean };
type DynamicAttribute = { id: string; isRequired: boolean; isFilterable: boolean; attribute: { id: string; name: string; key: string; type: string; unit: string | null; options: unknown; isVariantAxis: boolean } };
type ProductTypeOption = { id: string; name: string; slug: string; attributes: DynamicAttribute[] };
const emptyForm = { name:"", slug:"", description:"", sku:"", hsnCode:"", material:"", color:"", careInstructions:"", weightGrams:"", lengthMm:"", widthMm:"", heightMm:"", gstRate:"0", price:"", stock:"", categoryId:"", productTypeId:"", imageUrl:"", imageAlt:"" };

export function AdminProductForm() {
  const [categories,setCategories]=useState<CategoryOption[]>([]);
  const [productTypes,setProductTypes]=useState<ProductTypeOption[]>([]);
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState(emptyForm);
  const [attributeValues,setAttributeValues]=useState<Record<string,string|boolean|string[]>>({});
  useEffect(()=>{
    Promise.all([
      fetch("/api/admin/categories",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/admin/product-types",{cache:"no-store"}).then(r=>r.ok?r.json():null),
    ]).then(([categoryData,typeData])=>{
      if(categoryData?.categories)setCategories(categoryData.categories.filter((c:CategoryOption)=>c.isActive));
      if(typeData?.productTypes)setProductTypes(typeData.productTypes);
    }).catch(()=>setMessage("Some catalogue configuration could not be loaded."));
  },[]);
  const selectedType=productTypes.find(type=>type.id===form.productTypeId);
  function set<K extends keyof typeof emptyForm>(key:K,value:(typeof emptyForm)[K]){setForm(old=>({...old,[key]:value}));}
  function setAttribute(id:string,value:string|boolean|string[]){setAttributeValues(old=>({...old,[id]:value}));}
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const attributes:Record<string,unknown>={};
      for(const link of selectedType?.attributes.filter(link=>!link.attribute.isVariantAxis)??[]){
        const raw=attributeValues[link.attribute.id];
        if(raw===undefined||raw===""||(Array.isArray(raw)&&raw.length===0)){if(link.isRequired)throw new Error(`${link.attribute.name} is required for this product type.`);continue;}
        attributes[link.attribute.id]=link.attribute.type==="NUMBER"?Number(raw):raw;
      }
      const payload={name:form.name,slug:form.slug,description:form.description,sku:form.sku,hsnCode:form.hsnCode||undefined,material:form.material||undefined,color:form.color||undefined,careInstructions:form.careInstructions||undefined,weightGrams:form.weightGrams?Number(form.weightGrams):undefined,lengthMm:form.lengthMm?Number(form.lengthMm):undefined,widthMm:form.widthMm?Number(form.widthMm):undefined,heightMm:form.heightMm?Number(form.heightMm):undefined,gstRateBps:Math.round(Number(form.gstRate)*100),pricePaise:Math.round(Number(form.price)*100),inventoryQty:Number(form.stock),categoryId:form.categoryId,productTypeId:form.productTypeId||undefined,attributes,isActive:false,hasVariants:false,...(form.imageUrl?{imageUrl:form.imageUrl,imageAlt:form.imageAlt||form.name}:{})};
      const response=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not create product.");
      setMessage("Draft product created with its type-specific specifications. Refresh to see it.");setForm(emptyForm);setAttributeValues({});
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to create product.");}
    finally{setBusy(false);}
  }
  function renderAttribute(link:DynamicAttribute){
    const attr=link.attribute;const current=attributeValues[attr.id];
    const label=`${attr.name}${attr.unit? ` (${attr.unit})`:""}${link.isRequired?" *":""}`;
    const options=Array.isArray(attr.options)?attr.options.filter((x):x is string=>typeof x==="string"):[];
    if(attr.type==="BOOLEAN")return <label key={attr.id} className="admin-dynamic-attribute"><span><input type="checkbox" checked={current===true} onChange={e=>setAttribute(attr.id,e.target.checked)}/> {label}</span></label>;
    if(attr.type==="SELECT")return <label key={attr.id}>{label}<select required={link.isRequired} value={typeof current==="string"?current:""} onChange={e=>setAttribute(attr.id,e.target.value)}><option value="">Choose…</option>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
    if(attr.type==="MULTI_SELECT")return <label key={attr.id}>{label}<select required={link.isRequired} multiple value={Array.isArray(current)?current:[]} onChange={e=>setAttribute(attr.id,Array.from(e.target.selectedOptions).map(o=>o.value))}>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
    return <label key={attr.id}>{label}<input required={link.isRequired} type={attr.type==="NUMBER"?"number":attr.type==="DATE"?"date":"text"} value={typeof current==="string"||typeof current==="number"?String(current):""} onChange={e=>setAttribute(attr.id,e.target.value)} /></label>;
  }
  return <section className="admin-create">
    <button className="primary-link" onClick={()=>setOpen(v=>!v)} type="button">{open?"Close product form":"Add a product"} <span>{open?"−":"+"}</span></button>
    {open&&<form className="admin-product-form" onSubmit={submit}>
      <label>Product name<input required value={form.name} onChange={e=>set("name",e.target.value)}/></label>
      <label>URL slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={e=>set("slug",e.target.value)}/></label>
      <label>SKU<input required value={form.sku} onChange={e=>set("sku",e.target.value)}/></label>
      <label>Product type<select value={form.productTypeId} onChange={e=>{const id=e.target.value;set("productTypeId",id);const type=productTypes.find(item=>item.id===id);setAttributeValues(Object.fromEntries((type?.attributes??[]).filter(link=>link.attribute.type==="BOOLEAN").map(link=>[link.attribute.id,false])));}}><option value="">Choose product type…</option>{productTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
      <label>Category<select required value={form.categoryId} onChange={e=>set("categoryId",e.target.value)}><option value="">Choose category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name} · /{c.slug}</option>)}</select></label>
      <label>HSN code<input value={form.hsnCode} onChange={e=>set("hsnCode",e.target.value)}/></label>
      <label>Material<input value={form.material} onChange={e=>set("material",e.target.value)}/></label>
      <label>Colour<input value={form.color} onChange={e=>set("color",e.target.value)}/></label>
      <label>Weight (grams)<input type="number" min="1" value={form.weightGrams} onChange={e=>set("weightGrams",e.target.value)}/></label>
      <label>Length (mm)<input type="number" min="1" value={form.lengthMm} onChange={e=>set("lengthMm",e.target.value)}/></label>
      <label>Width (mm)<input type="number" min="1" value={form.widthMm} onChange={e=>set("widthMm",e.target.value)}/></label>
      <label>Height (mm)<input type="number" min="1" value={form.heightMm} onChange={e=>set("heightMm",e.target.value)}/></label>
      <label>GST rate (%)<input required type="number" min="0" max="100" step=".01" value={form.gstRate} onChange={e=>set("gstRate",e.target.value)}/></label>
      <label>Price (INR)<input required type="number" min="1" step=".01" value={form.price} onChange={e=>set("price",e.target.value)}/></label>
      <label>Opening stock<input required type="number" min="0" step="1" value={form.stock} onChange={e=>set("stock",e.target.value)}/></label>
      {selectedType&&selectedType.attributes.length>0&&<div className="admin-form-wide admin-dynamic-fields"><p className="eyebrow">{selectedType.name.toUpperCase()} SPECIFICATIONS</p><div className="admin-product-form">{selectedType.attributes.filter(link=>!link.attribute.isVariantAxis).map(renderAttribute)}</div></div>}
      <label className="admin-form-wide">Care instructions<textarea value={form.careInstructions} onChange={e=>set("careInstructions",e.target.value)}/></label>
      <label className="admin-form-wide">Description<textarea required minLength={10} value={form.description} onChange={e=>set("description",e.target.value)}/></label>
      <label className="admin-form-wide">Image URL (optional)<input type="url" value={form.imageUrl} onChange={e=>set("imageUrl",e.target.value)}/></label>
      {message&&<p className="admin-form-wide" role="status">{message}</p>}
      <button className="primary-link" disabled={busy}>{busy?"Saving…":"Save as draft"} <span>↗</span></button>
    </form>}
  </section>;
}
