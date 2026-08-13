import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Ticket { id:string; subject:string; message:string; status:string; admin_response:string|null; created_at:string; }
export function AdminSupportPanel() {
  const queryClient=useQueryClient(); const [responses,setResponses]=useState<Record<string,string>>({});
  const { data=[] }=useQuery<Ticket[]>({queryKey:["admin-support"],queryFn:async()=>{const{data,error}=await supabase.from("support_requests").select("*").order("created_at",{ascending:false}).limit(20);if(error)throw error;return data??[];}});
  const respond=useMutation({mutationFn:async({id,response}:{id:string;response:string})=>{const{data:{user}}=await supabase.auth.getUser();const{error}=await supabase.from("support_requests").update({admin_response:response,status:"resolved",responded_by:user?.id,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;},onSuccess:()=>{toast.success("Response saved and request resolved.");queryClient.invalidateQueries({queryKey:["admin-support"]});}});
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LifeBuoy className="h-4 w-4 text-primary" />User Support & Responses <Badge variant="secondary">{data.filter((item)=>item.status!=="resolved").length} open</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{data.length===0?<p className="text-xs text-muted-foreground">No support requests.</p>:data.map((ticket)=><article key={ticket.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{ticket.subject}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.message}</p></div><Badge variant={ticket.status==="resolved"?"secondary":"default"}>{ticket.status}</Badge></div>{ticket.admin_response?<p className="mt-3 rounded-lg bg-primary/10 p-3 text-xs"><strong>Admin response:</strong> {ticket.admin_response}</p>:<div className="mt-3 flex gap-2"><Textarea value={responses[ticket.id]??""} onChange={(e)=>setResponses((all)=>({...all,[ticket.id]:e.target.value}))} placeholder="Respond to this user…" rows={2}/><Button size="sm" disabled={!responses[ticket.id]?.trim()||respond.isPending} onClick={()=>respond.mutate({id:ticket.id,response:responses[ticket.id]})}>{respond.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}</Button></div>}</article>)}</CardContent></Card>;
}
