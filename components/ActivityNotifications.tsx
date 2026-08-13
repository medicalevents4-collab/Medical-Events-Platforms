import { useQuery } from "@tanstack/react-query";
import { Bell, Heart, MessageSquare, Newspaper, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ActivityItem { id: string; activity_type: "new_user"|"post"|"comment"|"like"; message: string; created_at: string; }
const icons = { new_user: UserPlus, post: Newspaper, comment: MessageSquare, like: Heart };

export function ActivityNotifications() {
  useRealtimeInvalidation("activity-notifications-live", [{ table: "activity_notifications", queryKeys: [["activity-notifications"]] }]);
  const { data = [] } = useQuery<ActivityItem[]>({ queryKey: ["activity-notifications"], queryFn: async () => {
    const { data, error } = await supabase.from("activity_notifications").select("id,activity_type,message,created_at").order("created_at", { ascending: false }).limit(12);
    if (error) throw error; return (data ?? []) as ActivityItem[];
  }});
  return <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Social activity notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted"><Bell className="h-4.5 w-4.5" />{data.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{Math.min(data.length, 9)}</span>}</button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Community activity</DropdownMenuLabel><DropdownMenuSeparator />{data.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No activity yet.</p> : data.map((item) => { const Icon=icons[item.activity_type]; return <div key={item.id} className="flex gap-3 border-b p-3 last:border-0"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs leading-relaxed">{item.message}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div></div>; })}</DropdownMenuContent></DropdownMenu>;
}
