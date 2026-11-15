import { getCurrentUser } from "@/lib/auth";
export async function requireAdmin() {
 const user=await getCurrentUser();
 if(!user||!(user.role==="ADMIN"||user.role==="STAFF"))return null;
 return user;
}
