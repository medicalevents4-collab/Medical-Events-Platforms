import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Download,
  Eye,
  Loader2,
  Files,
  HardDrive,
  Clock,
  TrendingUp,
  FileText,
  Image,
  FileType,
  BarChart3,
  CalendarDays,
  MapPin,
  Users,
  CheckCircle2,
  CalendarCheck,
  Plus,
  Sparkles,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Bell,
  Volume2,
  X,
  Stethoscope,
  Share2,
  Mic,
  Wrench,
  Monitor,
  Brain,
  Mountain,
  BookMarked,
  Award,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  fetchUserFiles,
  uploadFileWithProgress,
  deleteFile,
  deleteFiles,
  downloadFile,
  getFileUrl,
  formatBytes,
  type UploadProgressCallback,
} from "@/lib/files";
import { UploadProgress, type UploadItem, type UploadStatus } from "@/components/UploadProgress";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { SwipeableFileRow } from "@/components/SwipeableFileRow";
import type { DatabaseFile, DatabaseEvent } from "@/lib/types";
import { countryFlag } from "@/lib/flags";
import { CountryFlag } from "@/components/CountryFlag";
import CountdownTimer from "@/components/CountdownTimer";
import EventsMap from "@/components/EventsMap";
import { AppShell } from "@/components/AppShell";
import { NewsCarousel } from "@/components/NewsCarousel";
import { CountryMedicalHeadlines } from "@/components/CountryMedicalHeadlines";
import { DoctorsWelcomeSlider } from "@/components/DoctorsWelcomeSlider";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_CATEGORIES } from "@/lib/types";
import { CPD_RESOURCES, formatDownloadCount, type CpdResource } from "@/lib/resources";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFileCategory(mime: string): string {
  if (mime.startsWith("image/")) return "Images";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Documents";
  if (mime.includes("sheet") || mime.includes("excel")) return "Spreadsheets";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  return "Other";
}

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime === "application/pdf" || mime.includes("word") || mime.includes("document"))
    return FileText;
  return FileType;
}

const TYPE_COLORS: Record<string, string> = {
  Images: "hsl(82 24% 46%)",
  PDF: "hsl(0 72% 51%)",
  Documents: "hsl(79 33% 36%)",
  Spreadsheets: "hsl(140 40% 40%)",
  Video: "hsl(280 50% 55%)",
  Audio: "hsl(45 80% 50%)",
  Other: "hsl(90 10% 45%)",
};

const CHART_COLORS = [
  "hsl(82 24% 46%)",
  "hsl(79 33% 36%)",
  "hsl(0 72% 51%)",
  "hsl(140 40% 40%)",
  "hsl(280 50% 55%)",
  "hsl(45 80% 50%)",
  "hsl(90 10% 45%)",
];

const MOCK_REFERRALS = [
  {
    id: "r1",
    priority: "urgent",
    patient: "Thabo Molefe",
    scheme: "Discovery Health Comprehensive",
    summary: "Unstable angina, abnormal ECG with T-wave inversion in V2-V4…",
    from: "Dr. Sarah Botha",
    fromClinic: "GP - Nelspruit Medical Centre",
    status: "Delivered",
  },
  {
    id: "r2",
    priority: "priority",
    patient: "Grace Ndebele",
    scheme: "GEMS Ruby",
    summary: "Progressive renal impairment in patient with ischemic cardiomyopath…",
    from: "Dr. Kagiso Khumalo",
    fromClinic: "Cardiologist - Medical Events Connect",
    status: "Accepted",
  },
  {
    id: "r3",
    priority: "routine",
    patient: "Johan Pretorius",
    scheme: "Bonitas BonComprehensive",
    summary: "Palpitations during heavy exercise, 24-hr Holter monitor…",
    from: "Dr. Maria van Wyk",
    fromClinic: "GP - Pretoria East",
    status: "Appointment Scheduled",
  },
];

const REMINDERS = [
  {
    id: "rem1",
    title: "28th Annual Pan-African Cardiology & Vascular Congress",
    time: "08:30 - 17:00 CAT",
    location: "Main Auditorium & Hall B",
    clinical: "+18 Clinical",
    ethics: "+4 Ethics",
    starts: "Starts Tomorrow",
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "rem2",
    title: "National General Practice & Primary Care Masterclass 2026",
    time: "08:00 - 17:00 CAT",
    location: "Grand Ballroom",
    clinical: "+20 Clinical",
    ethics: "+5 Ethics",
    starts: "Starts Tomorrow",
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
  },
];

/** Hub category cards — each links to the Events page filtered by that category. */
const CPD_HUB_CATEGORIES = [
  {
    name: "Conference",
    blurb: "Large-scale medical congresses & keynotes",
    icon: Mic,
    accent: "hsl(142 71% 45%)",
  },
  {
    name: "Workshop",
    blurb: "Hands-on clinical skills training",
    icon: Wrench,
    accent: "hsl(38 92% 50%)",
  },
  {
    name: "Webinar",
    blurb: "Online CPD-accredited sessions",
    icon: Monitor,
    accent: "hsl(217 91% 60%)",
  },
  {
    name: "Symposium",
    blurb: "Expert panels & specialist discussions",
    icon: Brain,
    accent: "hsl(280 65% 55%)",
  },
  {
    name: "Summit",
    blurb: "High-level strategic healthcare forums",
    icon: Mountain,
    accent: "hsl(0 84% 55%)",
  },
  {
    name: "Course",
    blurb: "Structured multi-week CPD courses",
    icon: BookMarked,
    accent: "hsl(199 89% 48%)",
  },
];

export default function DashboardPage() {
  useRealtimeInvalidation("dashboard-live", [
    { table: "events", queryKeys: [["events"], ["carousel-events"]] },
    { table: "posts", queryKeys: [["posts"], ["carousel-posts"]] },
    { table: "analytics_events", queryKeys: [["analytics"]] },
  ]);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toDelete, setToDelete] = useState<DatabaseFile | null>(null);
  const [bulkToDelete, setBulkToDelete] = useState<DatabaseFile[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<DatabaseFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [resourceSort, setResourceSort] = useState<"popular" | "newest">("popular");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceFileType, setResourceFileType] = useState<string>("all");

  const sortedResources = useMemo<CpdResource[]>(() => {
    const query = resourceSearch.trim().toLowerCase();
    let filtered = query
      ? CPD_RESOURCES.filter(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.category.toLowerCase().includes(query) ||
            r.type.toLowerCase().includes(query) ||
            r.cpd.toLowerCase().includes(query)
        )
      : [...CPD_RESOURCES];
    if (resourceFileType !== "all") {
      filtered = filtered.filter((r) => r.type.toLowerCase() === resourceFileType.toLowerCase());
    }
    if (resourceSort === "popular") {
      filtered.sort((a, b) => b.downloads - a.downloads);
    } else {
      filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }
    return filtered.slice(0, 6);
  }, [resourceSort, resourceSearch, resourceFileType]);

  const userId = user?.id ?? "";
  const { data: files = [], isLoading } = useQuery<DatabaseFile[]>({
    queryKey: ["files", userId],
    queryFn: () => fetchUserFiles(userId),
    enabled: !!userId,
  });

  const { data: registrations = [] } = useQuery<string[]>({
    queryKey: ["event-registrations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.event_id);
    },
    enabled: !!userId,
  });

  const { data: events = [] } = useQuery<DatabaseEvent[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DatabaseEvent[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, fileId }: { file: File; fileId: string }) => {
      const onProgress: UploadProgressCallback = (percent) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === fileId ? { ...u, progress: percent } : u,
          ),
        );
      };
      return uploadFileWithProgress(userId, file, onProgress).then(
        (result) => ({ fileId, fileName: file.name, result }),
      );
    },
    onMutate: ({ file, fileId }) => {
      setUploads((prev) => [
        {
          id: fileId,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: "uploading" as UploadStatus,
        },
        ...prev,
      ]);
      return { fileId };
    },
    onSuccess: async ({ fileId, fileName, result }) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fileId
            ? {
                ...u,
                progress: 100,
                status: result.error ? "error" : ("completed" as UploadStatus),
                error: result.error ?? undefined,
              }
            : u,
        ),
      );
      if (result.error) {
        toast.error(`"${fileName}": ${result.error}`);
      } else {
        toast.success(`"${fileName}" uploaded.`);
        await queryClient.invalidateQueries({ queryKey: ["files", userId] });
        const { data: uploaded } = await supabase
          .from("files")
          .select("*")
          .eq("user_id", userId)
          .eq("name", fileName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (uploaded) {
          setPreviewFile(uploaded as DatabaseFile);
          setPreviewOpen(true);
        }
      }
    },
    onError: (err: Error, _file, context) => {
      if (context?.fileId) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === context.fileId
              ? { ...u, status: "error" as UploadStatus, error: err.message }
              : u,
          ),
        );
      }
      toast.error(err.message ?? "Upload failed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (file: DatabaseFile) => deleteFile(file),
    onSuccess: () => {
      toast.success("File deleted.");
      queryClient.invalidateQueries({ queryKey: ["files", userId] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Delete failed."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (fileList: DatabaseFile[]) => deleteFiles(fileList),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${result.deleted} file${result.deleted === 1 ? "" : "s"} deleted.`);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["files", userId] });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Bulk delete failed."),
  });

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === files.length ? new Set() : new Set(files.map((f) => f.id)),
    );
  }, [files]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = useCallback(() => {
    const selected = files.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) return;
    setBulkToDelete(selected);
  }, [files, selectedIds]);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      Array.from(fileList).forEach((f) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        uploadMutation.mutate({ file: f, fileId });
      });
    },
    [uploadMutation],
  );

  const handleDownload = async (file: DatabaseFile) => {
    try {
      await downloadFile(file.storage_path, file.name);
      toast.success(`Downloading "${file.name}"…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size_bytes, 0);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, { count: number; size: number }> = {};
    files.forEach((f) => {
      const cat = getFileCategory(f.mime_type);
      if (!counts[cat]) counts[cat] = { count: 0, size: 0 };
      counts[cat].count += 1;
      counts[cat].size += f.size_bytes;
    });
    return Object.entries(counts).map(([name, { count, size }]) => ({
      name,
      value: count,
      size,
    }));
  }, [files]);

  const typeChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    typeDistribution.forEach((item, i) => {
      cfg[item.name] = {
        label: item.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return cfg;
  }, [typeDistribution]);

  const uploadActivity = useMemo(() => {
    const months: { month: string; uploads: number; size: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-GB", { month: "short" });
      months.push({ month: label, uploads: 0, size: 0 });
    }
    files.forEach((f) => {
      const fd = new Date(f.created_at);
      const monthIdx = (now.getFullYear() - fd.getFullYear()) * 12 + (now.getMonth() - fd.getMonth());
      const slotIdx = 5 - monthIdx;
      if (slotIdx >= 0 && slotIdx < 6) {
        months[slotIdx].uploads += 1;
        months[slotIdx].size += f.size_bytes;
      }
    });
    return months;
  }, [files]);

  const activityChartConfig: ChartConfig = {
    uploads: { label: "Uploads", color: "hsl(82 24% 46%)" },
  };

  const registeredCount = registrations.length;
  const cpdEarned = 23;
  const cpdRequired = 30;
  const cpdPercent = Math.round((cpdEarned / cpdRequired) * 100);
  const referralsCount = 3;
  const broadcastsCount = 12;

  const firstName = profile?.full_name?.split(" ")[0] ?? "Doctor";
  const specialty = profile?.specialty ?? "Cardiology Specialist";
  const hpcsaNumber = "HPCSA: MP 0489123";

  const activeReminders = REMINDERS.filter((r) => !dismissedReminders.includes(r.id));

  const eventsByCountry = useMemo(() => {
    const upcoming = events
      .filter((e) => new Date(e.end_date).getTime() >= Date.now())
      .filter((e) => categoryFilter === "all" || e.category === categoryFilter)
      .slice(0, 12);
    const grouped: Record<string, DatabaseEvent[]> = {};
    upcoming.forEach((e) => {
      if (!grouped[e.country]) grouped[e.country] = [];
      grouped[e.country].push(e);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events, categoryFilter]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return EVENT_CATEGORIES.filter((c) => cats.has(c));
  }, [events]);

  const filteredEventsCount = useMemo(
    () => eventsByCountry.reduce((sum, [, evts]) => sum + evts.length, 0),
    [eventsByCountry],
  );

  const hasUpcomingEvents = useMemo(
    () => events.some((e) => new Date(e.end_date).getTime() >= Date.now()),
    [events],
  );

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        {/* Welcome hero */}
        <div className="digital-gloss hero-radial relative mb-6 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-[#2a3528] via-[#1f281d] to-[#1a2218] p-6 text-white lg:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 w-fit bg-[#5a6d3f] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#5a6d3f]">
                {specialty.toUpperCase()}
              </Badge>
              <p className="mb-1 text-xs font-medium text-white/70">{hpcsaNumber}</p>
              <h1 className="mb-3 text-2xl font-bold tracking-tight lg:text-3xl">
                Welcome back, Dr. {firstName}
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-white/80">
                Coordinate clinical conferences, manage doctor-to-doctor patient referrals, track
                CPD points, and stay connected with verified peers.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 lg:items-end">
              <Button
                className="gap-2 bg-[#5a6d3f] text-white hover:bg-[#4a5d33]"
                onClick={() => navigate("/directory")}
              >
                <Plus className="h-4 w-4" />
                New Patient Referral
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => navigate("/assistant")}
              >
                <Sparkles className="h-4 w-4" />
                AI Event Assistant
              </Button>
            </div>
          </div>
          <DoctorsWelcomeSlider />
        </div>

        {/* News & Updates carousel */}
        <NewsCarousel />
        <CountryMedicalHeadlines />

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CalendarCheck}
            label="Registered Events"
            value={registeredCount.toString()}
            subtext="Upcoming: Pan-African Cardiology Congress"
            action={{ label: "Browse", onClick: () => navigate("/events") }}
          />
          <StatCard
            icon={Stethoscope}
            label="2026 CPD Balance"
            value={`${cpdEarned}`}
            suffix={`/ ${cpdRequired} Pts`}
            subtext="Ethics: 7 Pts | Clinical: 16 Pts"
            badge={{ label: `${cpdPercent}% Complete`, variant: "outline" }}
          />
          <StatCard
            icon={Users}
            label="Patient Referrals"
            value={referralsCount.toString()}
            subtext="Doctor-to-doctor clinical queue"
            action={{ label: "View Directory", onClick: () => navigate("/directory") }}
          />
          <StatCard
            icon={MessageCircle}
            label="WhatsApp Broadcasts"
            value={broadcastsCount.toString()}
            subtext="Active outreach campaigns"
            action={{ label: "Manage", onClick: () => navigate("/whatsapp") }}
          />
        </div>

        {/* Medical CPD & Events hub */}
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Medical CPD & Events</h2>
                <p className="text-sm text-muted-foreground">
                  Browse accredited CPD events and download supporting documents for your professional development portfolio.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {CPD_HUB_CATEGORIES.map((cat) => {
              const eventCount = events.filter(
                (e) =>
                  e.category === cat.name &&
                  new Date(e.end_date).getTime() >= Date.now(),
              ).length;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => navigate(`/events?category=${encodeURIComponent(cat.name)}`)}
                  className="digital-gloss group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_35px_rgba(80,110,54,0.16)]"
                  style={{ borderTopColor: cat.accent, borderTopWidth: 3 }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: `${cat.accent}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: cat.accent }} />
                  </div>
                  <div className="w-full">
                    <p className="text-sm font-semibold leading-tight group-hover:text-primary">{cat.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{cat.blurb}</p>
                  </div>
                  <div className="mt-auto flex w-full items-center justify-between pt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {eventCount} event{eventCount === 1 ? "" : "s"}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Supporting documents strip */}
          <div className="mt-4 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Additional Supporting Documents</p>
                  <p className="text-xs text-muted-foreground">
                    CPD-accredited guidelines, clinical protocols, and certificates — download and attach to your events.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select value={resourceFileType} onValueChange={setResourceFileType}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="PPT">PPT</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resourceSort} onValueChange={(v) => setResourceSort(v as "popular" | "newest")}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/resources")}
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Browse Resources
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/events")}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  View All Events
                </Button>
              </div>
            </div>

            {/* Search input */}
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Search resources by title, category, or keyword…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {resourceSearch && (
                <button
                  onClick={() => setResourceSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Resource cards with download counts */}
            {sortedResources.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                <Search className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">No resources found</p>
                <p className="text-xs text-muted-foreground/70">
                  No resources match your current filters. Try adjusting your search, file type, or sort.
                </p>
                <button
                  onClick={() => {
                    setResourceSearch("");
                    setResourceFileType("all");
                  }}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedResources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <div
                    key={resource.id}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-card/80 p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-snug group-hover:text-primary">
                          {resource.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{resource.type}</Badge>
                          <Badge className="bg-primary/10 text-[9px] text-primary px-1.5 py-0">{resource.cpd}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                        title={`${resource.downloads.toLocaleString()} total downloads`}
                      >
                        <Download className="h-3 w-3" />
                        {formatDownloadCount(resource.downloads)} downloads
                      </span>
                      <button
                        onClick={() => navigate("/resources")}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Events by Country */}
        {/* Event Locations Map */}
        {(() => {
          const mapEvents = events
            .filter((e) => new Date(e.end_date).getTime() >= Date.now())
            .filter((e) => categoryFilter === "all" || e.category === categoryFilter);
          return (
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Event Locations Across Africa
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {mapEvents.length > 0
                    ? `${mapEvents.length} event${mapEvents.length === 1 ? "" : "s"} plotted by geographic location — click a pin for details`
                    : "Interactive Africa map — upcoming Supabase events will appear here automatically"}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <EventsMap events={mapEvents} onEventClick={() => navigate("/events")} />
              </CardContent>
            </Card>
          );
        })()}

        {hasUpcomingEvents && (
          <div className="mb-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Upcoming Events by Country
                </h2>
                <p className="text-sm text-muted-foreground">Browse medical events happening across Africa</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="category-filter" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Filter by Type
                  </label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter" className="h-9 w-[180px] text-sm">
                      <SelectValue placeholder="All event types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All event types</SelectItem>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 self-end" onClick={() => navigate("/events")}>
                  View All Events
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Showing {filteredEventsCount} event{filteredEventsCount === 1 ? "" : "s"}
              {categoryFilter !== "all" && <> · {categoryFilter}s only</>}
            </p>
            {eventsByCountry.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No {categoryFilter !== "all" ? categoryFilter : ""} events found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try selecting a different event type or{" "}
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className="font-medium text-primary hover:underline"
                    >
                      view all event types
                    </button>
                    .
                  </p>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              {eventsByCountry.map(([countryName, countryEvents]) => (
                <Card key={countryName} className="overflow-hidden">
                  {/* Country flag header */}
                  <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 to-accent/30 px-4 py-3">
                    <CountryFlag country={countryName} size={28} />
                    <div className="flex-1">
                      <h3 className="text-sm font-bold tracking-tight">{countryName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {countryEvents.length} upcoming event{countryEvents.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {countryEvents.length}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {countryEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => navigate("/events")}
                          className="group/event relative flex cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const shareUrl = `${window.location.origin}/events#event-${event.id}`;
                              navigator.clipboard
                                .writeText(shareUrl)
                                .then(() => toast.success("Event link copied to clipboard!"))
                                .catch(() => toast.error("Could not copy link."));
                            }}
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover/event:opacity-100"
                            aria-label="Share event"
                            title="Share event"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-start gap-2 pr-7">
                            <CountryFlag country={countryName} size={18} />
                            <h4 className="line-clamp-2 text-xs font-semibold leading-snug group-hover/event:text-primary">
                              {event.title}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateShort(event.start_date)}
                            </span>
                            <CountdownTimer targetIso={event.start_date} compact className="text-[10px]" />
                            {event.category && (
                              <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-normal">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ', ' + event.country)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-primary/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {event.location}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Urgent Patient Referrals */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Urgent Patient Referrals
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Doctor-to-doctor clinical referral queue requiring your review
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/directory")}>
                View Directory
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_REFERRALS.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={referral.priority} />
                        <span className="text-sm font-semibold">{referral.patient}</span>
                        <span className="text-xs text-muted-foreground">({referral.scheme})</span>
                      </div>
                      <p className="mb-1 text-sm text-foreground">{referral.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        From: {referral.from} ({referral.fromClinic})
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <span className="text-xs font-medium text-muted-foreground">{referral.status}</span>
                      <Button size="sm" variant="outline" className="text-xs">
                        Review Form
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conference reminders + mini events */}
          <div className="space-y-4">
            {activeReminders.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4 text-primary" />
                    24-Hour Conference Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="relative rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <button
                        onClick={() => setDismissedReminders((prev) => [...prev, reminder.id])}
                        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          <Bell className="mr-1 h-3 w-3" />
                          24-HOUR CONFERENCE REMINDER
                        </Badge>
                        <CountdownTimer targetIso={reminder.startDate} className="text-[10px]" />
                      </div>
                      <h4 className="mb-2 text-sm font-semibold leading-snug">{reminder.title}</h4>
                      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          {reminder.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {reminder.location}
                        </div>
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">CPD Accreditation:</span>
                        <Badge variant="outline" className="text-[10px]">
                          {reminder.clinical} | {reminder.ethics}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Snooze 2h
                        </Button>
                        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate("/events")}>
                          Event Details
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/events")}>
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Browse Upcoming Events
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/resources")}>
                  <FileText className="h-4 w-4 text-primary" />
                  Access CPD Resources
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/assistant")}>
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Matchmaking & Insights
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* File management section */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <UploadCloud className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, images, documents — up to 50 MB each</p>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
                <UploadProgress
                  uploads={uploads}
                  onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Files</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No files yet</p>
                    <p className="text-xs text-muted-foreground">Upload your first document to get started.</p>
                  </div>
                ) : (
                  <>
                    {/* Bulk action toolbar */}
                    {selectedIds.size > 0 && (
                      <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                        <span className="text-sm font-medium text-primary">
                          {selectedIds.size} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={clearSelection}
                          >
                            <X className="h-3.5 w-3.5" />
                            Clear
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                          >
                            {bulkDeleteMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete ({selectedIds.size})
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Select-all header */}
                    <div className="flex items-center gap-3 border-b border-border pb-2">
                      <Checkbox
                        checked={files.length > 0 && selectedIds.size === files.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all files"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedIds.size > 0
                          ? `${selectedIds.size} of ${files.length} selected`
                          : `Select all (${files.length})`}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {files.map((file) => {
                        const Icon = getFileIcon(file.mime_type);
                        const isSelected = selectedIds.has(file.id);
                        return (
                          <SwipeableFileRow
                            key={file.id}
                            onDelete={() => setToDelete(file)}
                            disabled={selectedIds.size > 0}
                          >
                            <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(file.id)}
                                aria-label={`Select ${file.name}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatBytes(file.size_bytes)} · {getFileCategory(file.mime_type)} ·{" "}
                                  {formatDate(file.created_at)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setPreviewFile(file);
                                    setPreviewOpen(true);
                                  }}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} title="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setToDelete(file)}
                                  title="Delete"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </SwipeableFileRow>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Files className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{files.length}</p>
                  <p className="text-xs text-muted-foreground">Files stored</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/60">
                  <HardDrive className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatBytes(totalSize)}</p>
                  <p className="text-xs text-muted-foreground">Total storage used</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                  <Clock className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {files.length > 0 ? formatDate(files[0].created_at).split(",")[0] : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Latest upload</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts row */}
        {files.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  File Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={typeChartConfig} className="mx-auto aspect-square max-h-[240px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                      data={typeDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={2}
                    >
                      {typeDistribution.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {typeDistribution.map((item, i) => (
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Upload Activity (6 months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={activityChartConfig} className="aspect-[4/3] w-full">
                  <BarChart data={uploadActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                    <Bar dataKey="uploads" fill="var(--color-uploads)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete);
          setToDelete(null);
        }}
        title="Delete file?"
        description={`"${toDelete?.name}" will be permanently removed from your storage.`}
        confirmLabel="Delete"
        destructive
      />

      <ConfirmDialog
        open={!!bulkToDelete}
        onClose={() => setBulkToDelete(null)}
        onConfirm={() => {
          if (bulkToDelete) bulkDeleteMutation.mutate(bulkToDelete);
          setBulkToDelete(null);
        }}
        title={`Delete ${bulkToDelete?.length ?? 0} file${(bulkToDelete?.length ?? 0) === 1 ? "" : "s"}?`}
        description={`${bulkToDelete?.length ?? 0} file${(bulkToDelete?.length ?? 0) === 1 ? "" : "s"} will be permanently removed from your storage. This action cannot be undone.`}
        confirmLabel={`Delete ${bulkToDelete?.length ?? 0}`}
        destructive
      />

      <FilePreviewModal
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </AppShell>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  subtext: string;
  action?: { label: string; onClick: () => void };
  badge?: { label: string; variant: "outline" | "default" | "secondary" };
}

function StatCard({ icon: Icon, label, value, suffix, subtext, action, badge }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-3xl font-bold">{value}</span>
          {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
          {badge && (
            <Badge variant={badge.variant} className="ml-2 text-[10px]">
              {badge.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    priority: "bg-amber-100 text-amber-700 border-amber-200",
    routine: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const labels: Record<string, string> = {
    urgent: "URGENT",
    priority: "PRIORITY",
    routine: "ROUTINE",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${variants[priority] ?? variants.routine}`}
    >
      {labels[priority] ?? priority.toUpperCase()}
    </span>
  );
}
