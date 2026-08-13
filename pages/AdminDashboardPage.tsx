import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  CalendarDays,
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Database,
  HardDrive,
  ShieldCheck,
  UserCheck,
  CalendarCheck,
  Loader2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CircleCheck,
  CircleDot,
  Download,
  Mail,
  Globe,
  Clock,
  BarChart3,
  Stethoscope,
  HeartPulse,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Pencil,
  ImagePlus,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  DatabaseProfile,
  DatabaseEvent,
  DatabasePost,
  DatabaseFile,
  DatabaseEventRegistration,
} from "@/lib/types";
import { CountryFlag } from "@/components/CountryFlag";
import { NewsCarousel } from "@/components/NewsCarousel";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { AdminSupportPanel } from "@/components/AdminSupportPanel";
import { deleteFile } from "@/lib/files";

/* ---------- helpers ---------- */

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const CHART_COLORS = [
  "hsl(82 24% 46%)",
  "hsl(79 33% 36%)",
  "hsl(0 72% 51%)",
  "hsl(140 40% 40%)",
  "hsl(280 50% 55%)",
  "hsl(45 80% 50%)",
  "hsl(217 91% 60%)",
  "hsl(90 10% 45%)",
];

/* ---------- data queries ---------- */

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalPosts: number;
  totalFiles: number;
  totalRegistrations: number;
  totalStorage: number;
  upcomingEvents: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  newEventsThisMonth: number;
  postsThisMonth: number;
  registrationsThisMonth: number;
}

/* ---------- component ---------- */

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useRealtimeInvalidation("admin-live", [
    { table: "profiles", queryKeys: [["admin-profiles"]] },
    { table: "events", queryKeys: [["admin-events"]] },
    { table: "posts", queryKeys: [["admin-posts"]] },
    { table: "post_comments", queryKeys: [["admin-posts"]] },
    { table: "analytics_events", queryKeys: [["admin-analytics"]] },
  ]);
  const { profile } = useAuth();
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [regSearch, setRegSearch] = useState("");

  const adminAction = useMutation({
    mutationFn: async (action: { kind: "profile" | "profile_update" | "event" | "post" | "file"; id: string; active?: boolean; updates?: Record<string, string | null> }) => {
      if (action.kind === "file") {
        const file = files.find((item) => item.id === action.id);
        if (!file) throw new Error("File not found");
        await deleteFile(file);
        return;
      }
      if (action.kind === "profile") {
        const { error } = await supabase.from("profiles").update({ is_active: action.active }).eq("id", action.id);
        if (error) throw error;
        return;
      }
      if (action.kind === "profile_update") {
        const { error } = await supabase.from("profiles").update({ ...action.updates, updated_at: new Date().toISOString() }).eq("id", action.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from(action.kind === "event" ? "events" : "posts").delete().eq("id", action.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      toast.success("Administrative change applied");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Administrative action failed"),
  });

  /* Fetch all tables in parallel */
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<DatabaseProfile[]>({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabaseProfile[];
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<DatabaseEvent[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabaseEvent[];
    },
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<DatabasePost[]>({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabasePost[];
    },
  });

  const { data: registrations = [], isLoading: regsLoading } = useQuery<DatabaseEventRegistration[]>({
    queryKey: ["admin-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabaseEventRegistration[];
    },
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<DatabaseFile[]>({
    queryKey: ["admin-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabaseFile[];
    },
  });

  /* ---------- derived stats ---------- */

  const stats = useMemo<AdminStats>(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const totalStorage = files.reduce((sum, f) => sum + f.size_bytes, 0);

    const newUsersThisMonth = profiles.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const newUsersLastMonth = profiles.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }).length;

    const newEventsThisMonth = events.filter((e) => {
      if (!e.created_at) return false;
      const d = new Date(e.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const postsThisMonth = posts.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const registrationsThisMonth = registrations.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const upcomingEvents = events.filter(
      (e) => new Date(e.end_date).getTime() >= Date.now(),
    ).length;

    return {
      totalUsers: profiles.length,
      totalEvents: events.length,
      totalPosts: posts.length,
      totalFiles: files.length,
      totalRegistrations: registrations.length,
      totalStorage,
      upcomingEvents,
      newUsersThisMonth,
      newUsersLastMonth,
      newEventsThisMonth,
      postsThisMonth,
      registrationsThisMonth,
    };
  }, [profiles, events, posts, registrations, files]);

  /* ---------- charts data ---------- */

  const userGrowthData = useMemo(() => {
    const months: { month: string; users: number; cumulative: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-GB", { month: "short" });
      const monthStart = d.getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const users = profiles.filter((p) => {
        if (!p.created_at) return false;
        const t = new Date(p.created_at).getTime();
        return t >= monthStart && t <= monthEnd;
      }).length;
      const cumulative = profiles.filter((p) => {
        if (!p.created_at) return false;
        return new Date(p.created_at).getTime() <= monthEnd;
      }).length;
      months.push({ month: label, users, cumulative });
    }
    return months;
  }, [profiles]);

  const userGrowthConfig: ChartConfig = {
    users: { label: "New Users", color: "hsl(82 24% 46%)" },
    cumulative: { label: "Total Users", color: "hsl(79 33% 36%)" },
  };

  const eventCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const cat = e.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [events]);

  const eventCategoryConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    eventCategoryData.forEach((item, i) => {
      cfg[item.name] = {
        label: item.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return cfg;
  }, [eventCategoryData]);

  const fileTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => {
      let cat = "Other";
      if (f.mime_type.startsWith("image/")) cat = "Images";
      else if (f.mime_type === "application/pdf") cat = "PDF";
      else if (f.mime_type.includes("word") || f.mime_type.includes("document")) cat = "Documents";
      else if (f.mime_type.startsWith("video/")) cat = "Video";
      else if (f.mime_type.startsWith("audio/")) cat = "Audio";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [files]);

  const fileTypeConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    fileTypeData.forEach((item, i) => {
      cfg[item.name] = {
        label: item.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return cfg;
  }, [fileTypeData]);

  const registrationActivity = useMemo(() => {
    const months: { month: string; registrations: number; events: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-GB", { month: "short" });
      const monthStart = d.getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const regs = registrations.filter((r) => {
        if (!r.created_at) return false;
        const t = new Date(r.created_at).getTime();
        return t >= monthStart && t <= monthEnd;
      }).length;
      const evts = events.filter((e) => {
        if (!e.created_at) return false;
        const t = new Date(e.created_at).getTime();
        return t >= monthStart && t <= monthEnd;
      }).length;
      months.push({ month: label, registrations: regs, events: evts });
    }
    return months;
  }, [registrations, events]);

  const regActivityConfig: ChartConfig = {
    registrations: { label: "Registrations", color: "hsl(82 24% 46%)" },
    events: { label: "New Events", color: "hsl(217 91% 60%)" },
  };

  /* ---------- top events by registration ---------- */
  const topEvents = useMemo(() => {
    const regCounts: Record<string, number> = {};
    registrations.forEach((r) => {
      regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
    });
    return events
      .map((e) => ({ event: e, count: regCounts[e.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events, registrations]);

  /* ---------- specialty distribution ---------- */
  const specialtyData = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p) => {
      const sp = p.specialty || "Unspecified";
      counts[sp] = (counts[sp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [profiles]);

  /* ---------- country distribution ---------- */
  const countryData = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p) => {
      const c = p.country || "Unknown";
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [profiles]);

  /* ---------- filtered table data ---------- */
  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.specialty ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q),
    );
  }, [profiles, userSearch]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q),
    );
  }, [events, eventSearch]);

  const filteredPosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author_name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [posts, postSearch]);

  /* registrations enriched with event + profile names */
  const enrichedRegistrations = useMemo(() => {
    return registrations.map((r) => {
      const event = events.find((e) => e.id === r.event_id);
      const user = profiles.find((p) => p.id === r.user_id);
      return {
        ...r,
        eventTitle: event?.title ?? "Unknown event",
        userName: user?.full_name ?? "Unknown user",
        userEmail: user?.email ?? "—",
      };
    });
  }, [registrations, events, profiles]);

  const filteredRegistrations = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    if (!q) return enrichedRegistrations;
    return enrichedRegistrations.filter(
      (r) =>
        r.eventTitle.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q),
    );
  }, [enrichedRegistrations, regSearch]);

  /* ---------- loading guard ---------- */
  const allLoading =
    profilesLoading && eventsLoading && postsLoading && regsLoading && filesLoading;

  if (allLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading admin dashboard…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const userGrowthPct =
    stats.newUsersLastMonth > 0
      ? Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)
      : stats.newUsersThisMonth > 0
        ? 100
        : 0;

  return (
    <AppShell>
      <div className="animate-fade-in-up space-y-6">
        {/* ---------- Header banner ---------- */}
        <div className="hero-radial relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-[#2a3528] via-[#1f281d] to-[#1a2218] p-6 text-white lg:p-8">
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a6d3f]">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <Badge className="bg-[#5a6d3f] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#5a6d3f]">
                  Admin Console
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                System Backend Monitor
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/80">
                Real-time overview of users, events, content, registrations, and storage across
                the Medical Events Connect platform.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <Button
                className="gap-2 bg-[#5a6d3f] text-white hover:bg-[#4a5d33]"
                onClick={() => navigate("/feed?compose=news")}
              >
                <ImagePlus className="h-4 w-4" />
                Create News Post
              </Button>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs font-medium text-white/90">All Systems Operational</span>
                </div>
                <span className="mt-1 text-[11px] text-white/60">
                  Supabase · {new Date().toLocaleTimeString("en-GB")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- News & Updates carousel ---------- */}
        <NewsCarousel />
        <AdminSupportPanel />

        {/* ---------- Overview stat cards ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            subtext={`${stats.newUsersThisMonth} new this month`}
            trend={userGrowthPct}
          />
          <AdminStatCard
            icon={CalendarDays}
            label="Total Events"
            value={stats.totalEvents.toLocaleString()}
            subtext={`${stats.upcomingEvents} upcoming · ${stats.newEventsThisMonth} new this month`}
          />
          <AdminStatCard
            icon={CalendarCheck}
            label="Event Registrations"
            value={stats.totalRegistrations.toLocaleString()}
            subtext={`${stats.registrationsThisMonth} this month`}
          />
          <AdminStatCard
            icon={HardDrive}
            label="Storage Used"
            value={formatBytes(stats.totalStorage)}
            subtext={`${stats.totalFiles} files across all users`}
          />
        </div>

        {/* ---------- Secondary stat row ---------- */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MiniStat
            icon={MessageSquare}
            label="Feed Posts"
            value={stats.totalPosts}
            subtext={`${stats.postsThisMonth} this month`}
            color="hsl(280 50% 55%)"
          />
          <MiniStat
            icon={UserCheck}
            label="Complete Profiles"
            value={profiles.filter((p) => p.full_name && p.specialty).length}
            subtext={`of ${profiles.length} users`}
            color="hsl(140 40% 40%)"
          />
          <MiniStat
            icon={Globe}
            label="Countries Reached"
            value={countryData.length}
            subtext={`${countryData.slice(0, 3).map((c) => c.name).join(", ")}…`}
            color="hsl(217 91% 60%)"
          />
          <MiniStat
            icon={Activity}
            label="Avg. Regs / Event"
            value={
              events.length > 0
                ? (stats.totalRegistrations / events.length).toFixed(1)
                : "0"
            }
            subtext="across all events"
            color="hsl(45 80% 50%)"
          />
        </div>

        {/* ---------- Charts row 1 ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                User Growth (6 months)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                New signups and cumulative total per month
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={userGrowthConfig} className="aspect-[4/3] w-full">
                <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="var(--color-cumulative)"
                    fill="url(#fillCumulative)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="var(--color-users)"
                    fill="url(#fillUsers)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Registration activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Platform Activity (6 months)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Event registrations and new events created per month
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={regActivityConfig} className="aspect-[4/3] w-full">
                <BarChart data={registrationActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="events" fill="var(--color-events)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* ---------- Charts row 2 ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Event category distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                Events by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventCategoryData.length === 0 ? (
                <EmptyChartState />
              ) : (
                <>
                  <ChartContainer config={eventCategoryConfig} className="mx-auto aspect-square max-h-[220px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                      <Pie
                        data={eventCategoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={2}
                      >
                        {eventCategoryData.map((entry, i) => (
                          <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {eventCategoryData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* File type distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Files by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fileTypeData.length === 0 ? (
                <EmptyChartState />
              ) : (
                <>
                  <ChartContainer config={fileTypeConfig} className="mx-auto aspect-square max-h-[220px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                      <Pie
                        data={fileTypeData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={2}
                      >
                        {fileTypeData.map((entry, i) => (
                          <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {fileTypeData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Top events by registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Events by Signups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No event registrations yet</p>
              ) : (
                topEvents.map((item, idx) => {
                  const maxCount = topEvents[0].count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.event.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-medium">
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: idx === 0 ? "hsl(45 80% 50%)" : idx === 1 ? "hsl(82 24% 46%)" : idx === 2 ? "hsl(217 91% 60%)" : "hsl(90 10% 80%)",
                              color: idx < 3 ? "white" : "hsl(100 18% 14%)",
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span className="line-clamp-1">{item.event.title}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-primary">{item.count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------- Specialty & Country distribution ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4 text-primary" />
                Top Specialties
              </CardTitle>
              <p className="text-xs text-muted-foreground">User distribution by medical specialty</p>
            </CardHeader>
            <CardContent>
              {specialtyData.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No specialty data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {specialtyData.map((item, i) => {
                    const maxVal = specialtyData[0].value;
                    const pct = Math.round((item.value / maxVal) * 100);
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{item.value} users</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-primary" />
                Users by Country
              </CardTitle>
              <p className="text-xs text-muted-foreground">Geographic distribution of registered users</p>
            </CardHeader>
            <CardContent>
              {countryData.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No country data yet</p>
              ) : (
                <div className="space-y-2">
                  {countryData.slice(0, 8).map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <CountryFlag country={item.name} size={22} />
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{item.value}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((item.value / profiles.length) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------- System health ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <CircleCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Database Connection</p>
                <p className="text-xs text-muted-foreground">Supabase Postgres · Connected</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">5 Tables Active</p>
                <p className="text-xs text-muted-foreground">profiles · events · posts · files · registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <Server className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Storage Utilization</p>
                <p className="text-xs text-muted-foreground">{formatBytes(stats.totalStorage)} across {stats.totalFiles} files</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------- Tabbed data tables ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Backend Data Explorer
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Browse and search all records across the platform's database tables
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList className="mb-4 grid w-full grid-cols-5">
                <TabsTrigger value="users" className="text-xs">
                  Users ({profiles.length})
                </TabsTrigger>
                <TabsTrigger value="events" className="text-xs">
                  Events ({events.length})
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-xs">
                  Posts ({posts.length})
                </TabsTrigger>
                <TabsTrigger value="registrations" className="text-xs">
                  Regs ({registrations.length})
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs">
                  Files ({files.length})
                </TabsTrigger>
              </TabsList>

              {/* Users tab */}
              <TabsContent value="users">
                <SearchBar
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="Search users by name, email, specialty, or country…"
                />
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.length === 0 ? (
                        <EmptyRow colSpan={7} message="No users found" />
                      ) : (
                        filteredProfiles.slice(0, 50).map((p) => {
                          const initials = (p.full_name ?? p.email ?? "U")
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell className="font-medium">{p.full_name ?? "Unnamed"}</TableCell>
                              <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                              <TableCell>
                                {p.specialty ? (
                                  <Badge variant="outline" className="text-[10px]">{p.specialty}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <CountryFlag country={p.country ?? ""} size={16} />
                                  <span className="text-xs">{p.country ?? "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(p.created_at)}
                                <span className="ml-1 text-[10px]">({timeAgo(p.created_at)})</span>
                              </TableCell>
                              <TableCell className="flex justify-end gap-1">
                                <Button size="icon" variant="outline" aria-label={`Edit ${p.full_name ?? "profile"}`} onClick={() => { const full_name=window.prompt("Correct full name",p.full_name??""); if(full_name===null)return; const specialty=window.prompt("Correct specialty",p.specialty??""); if(specialty===null)return; const practice_number=window.prompt("Correct practice number",p.practice_number??""); if(practice_number===null)return; adminAction.mutate({kind:"profile_update",id:p.id,updates:{full_name,specialty,practice_number}}); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="outline" disabled={adminAction.isPending} onClick={() => adminAction.mutate({ kind: "profile", id: p.id, active: p.is_active === false })}>
                                  {p.is_active === false ? <UserRoundCheck className="mr-1 h-3.5 w-3.5" /> : <UserRoundX className="mr-1 h-3.5 w-3.5" />}
                                  {p.is_active === false ? "Enable" : "Disable"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredProfiles.length > 50 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing 50 of {filteredProfiles.length} results
                  </p>
                )}
              </TabsContent>

              {/* Events tab */}
              <TabsContent value="events">
                <SearchBar
                  value={eventSearch}
                  onChange={setEventSearch}
                  placeholder="Search events by title, organizer, location, or category…"
                />
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Regs</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.length === 0 ? (
                        <EmptyRow colSpan={8} message="No events found" />
                      ) : (
                        filteredEvents.slice(0, 50).map((e) => {
                          const regCount = registrations.filter((r) => r.event_id === e.id).length;
                          const isUpcoming = new Date(e.end_date).getTime() >= Date.now();
                          return (
                            <TableRow key={e.id}>
                              <TableCell>
                                <p className="line-clamp-1 max-w-[280px] font-medium">{e.title}</p>
                                <p className="line-clamp-1 max-w-[280px] text-[10px] text-muted-foreground">{e.organizer}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{e.location}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <CountryFlag country={e.country} size={16} />
                                  <span className="text-xs">{e.country}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDate(e.start_date)}</TableCell>
                              <TableCell>
                                {isUpcoming ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CircleDot className="h-3 w-3" />
                                    Upcoming
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Past
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="text-[10px]">{regCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right"><Button size="icon" variant="destructive" aria-label={`Delete ${e.title}`} disabled={adminAction.isPending} onClick={() => window.confirm(`Delete event “${e.title}”?`) && adminAction.mutate({ kind: "event", id: e.id })}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredEvents.length > 50 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing 50 of {filteredEvents.length} results
                  </p>
                )}
              </TabsContent>

              {/* Posts tab */}
              <TabsContent value="posts">
                <SearchBar
                  value={postSearch}
                  onChange={setPostSearch}
                  placeholder="Search posts by title, author, or category…"
                />
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Likes</TableHead>
                        <TableHead className="text-right">Comments</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPosts.length === 0 ? (
                        <EmptyRow colSpan={7} message="No posts found" />
                      ) : (
                        filteredPosts.slice(0, 50).map((p) => {
                          const commentCount = Array.isArray(p.comments) ? p.comments.length : 0;
                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                <p className="line-clamp-1 max-w-[300px] font-medium">{p.title}</p>
                                <p className="line-clamp-1 max-w-[300px] text-[10px] text-muted-foreground">{p.body}</p>
                              </TableCell>
                              <TableCell className="text-xs">{p.author_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize">{p.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium">{p.likes}</TableCell>
                              <TableCell className="text-right text-xs font-medium">{commentCount}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{timeAgo(p.created_at)}</TableCell>
                              <TableCell className="text-right"><Button size="icon" variant="destructive" aria-label={`Delete ${p.title}`} disabled={adminAction.isPending} onClick={() => window.confirm(`Delete post “${p.title}”?`) && adminAction.mutate({ kind: "post", id: p.id })}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredPosts.length > 50 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing 50 of {filteredPosts.length} results
                  </p>
                )}
              </TabsContent>

              {/* Registrations tab */}
              <TabsContent value="registrations">
                <SearchBar
                  value={regSearch}
                  onChange={setRegSearch}
                  placeholder="Search registrations by event, user name, or email…"
                />
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistrations.length === 0 ? (
                        <EmptyRow colSpan={4} message="No registrations found" />
                      ) : (
                        filteredRegistrations.slice(0, 50).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.userName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.userEmail}</TableCell>
                            <TableCell className="text-xs">{r.eventTitle}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredRegistrations.length > 50 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing 50 of {filteredRegistrations.length} results
                  </p>
                )}
              </TabsContent>

              {/* Files tab */}
              <TabsContent value="files">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.length === 0 ? (
                        <EmptyRow colSpan={5} message="No files uploaded yet" />
                      ) : (
                        files.slice(0, 50).map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>
                              <p className="line-clamp-1 max-w-[280px] font-medium">{f.name}</p>
                              <p className="text-[10px] text-muted-foreground">{f.mime_type}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{f.mime_type.split("/")[1]?.toUpperCase() ?? "FILE"}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">{formatBytes(f.size_bytes)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{timeAgo(f.created_at)}</TableCell>
                            <TableCell className="text-right"><Button size="icon" variant="destructive" aria-label={`Delete ${f.name}`} disabled={adminAction.isPending} onClick={() => window.confirm(`Permanently delete “${f.name}”?`) && adminAction.mutate({ kind: "file", id: f.id })}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {files.length > 50 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing 50 of {files.length} results
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ---------- Recent activity feed ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Recent Platform Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">Latest signups, events, posts, and registrations</p>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed
              profiles={profiles}
              events={events}
              posts={posts}
              registrations={enrichedRegistrations}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

/* ---------- sub-components ---------- */

interface AdminStatCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  subtext: string;
  trend?: number;
}

function AdminStatCard({ icon: Icon, label, value, subtext, trend }: AdminStatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={`flex items-center gap-0.5 text-xs font-semibold ${
                trend > 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  subtext: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
          <p className="truncate text-[10px] text-muted-foreground/70">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-3 relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 text-sm"
      />
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2">
      <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">No data available yet</p>
    </div>
  );
}

interface ActivityItem {
  type: "user" | "event" | "post" | "registration";
  timestamp: number;
  label: string;
  detail: string;
}

function RecentActivityFeed({
  profiles,
  events,
  posts,
  registrations,
}: {
  profiles: DatabaseProfile[];
  events: DatabaseEvent[];
  posts: DatabasePost[];
  registrations: (DatabaseEventRegistration & { eventTitle: string; userName: string; userEmail: string })[];
}) {
  const items = useMemo<ActivityItem[]>(() => {
    const all: ActivityItem[] = [];

    profiles.slice(0, 10).forEach((p) => {
      all.push({
        type: "user",
        timestamp: p.created_at ? new Date(p.created_at).getTime() : 0,
        label: p.full_name ?? p.email ?? "New user",
        detail: "joined the platform",
      });
    });

    events.slice(0, 10).forEach((e) => {
      all.push({
        type: "event",
        timestamp: e.created_at ? new Date(e.created_at).getTime() : 0,
        label: e.title,
        detail: `event created · ${e.category}`,
      });
    });

    posts.slice(0, 10).forEach((p) => {
      all.push({
        type: "post",
        timestamp: p.created_at ? new Date(p.created_at).getTime() : 0,
        label: p.title,
        detail: `posted by ${p.author_name}`,
      });
    });

    registrations.slice(0, 10).forEach((r) => {
      all.push({
        type: "registration",
        timestamp: r.created_at ? new Date(r.created_at).getTime() : 0,
        label: r.userName,
        detail: `registered for "${r.eventTitle}"`,
      });
    });

    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  }, [profiles, events, posts, registrations]);

  const iconMap: Record<ActivityItem["type"], { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
    user: { icon: Users, color: "hsl(82 24% 46%)" },
    event: { icon: CalendarDays, color: "hsl(217 91% 60%)" },
    post: { icon: MessageSquare, color: "hsl(280 50% 55%)" },
    registration: { icon: CalendarCheck, color: "hsl(140 40% 40%)" },
  };

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => {
        const { icon: Icon, color } = iconMap[item.type];
        return (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {timeAgo(new Date(item.timestamp).toISOString())}
            </span>
          </div>
        );
      })}
    </div>
  );
}
