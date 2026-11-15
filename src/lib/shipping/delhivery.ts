export type DelhiveryServiceability={serviceable:boolean;prepaid:boolean;cod:boolean;raw:unknown};
export async function checkDelhiveryServiceability(pin:string):Promise<DelhiveryServiceability>{
 const token=process.env.DELHIVERY_API_TOKEN;
 const base=(process.env.DELHIVERY_API_BASE_URL??"").replace(/\/$/,"");
 if(!token||!base)throw new Error("Delhivery API account credentials are not configured.");
 const url=new URL("/c/api/pin-codes/json/",base);url.searchParams.set("filter_codes",pin);
 const response=await fetch(url,{headers:{Authorization:"Token "+token,Accept:"application/json"},cache:"no-store"});
 if(!response.ok)throw new Error("Delhivery serviceability check failed.");
 const raw=await response.json();
 const records=Array.isArray(raw?.delivery_codes)?raw.delivery_codes:Array.isArray(raw)?raw:[];
 const entry=records.find((item:any)=>String(item?.postal_code?.pin??item?.pin??item?.pincode??"")===pin)??records[0];
 if(!entry)return {serviceable:false,prepaid:false,cod:false,raw};
 const postal=entry.postal_code??entry;
 const prepaid=Boolean(postal.pre_paid??postal.prepaid??postal.is_prepaid);
 const cod=Boolean(postal.cod??postal.is_cod);
 return {serviceable:prepaid||cod,prepaid,cod,raw};
}
