import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Users,
  ExternalLink,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  CheckCircle2,
  CalendarCheck,
  CalendarPlus,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { downloadICS } from "@/lib/ics";
import {
  DatabaseEvent,
  EVENT_CATEGORIES,
  EVENT_DEPARTMENTS,
} from "@/lib/types";
import { countryFlag } from "@/lib/flags";
import { CountryFlag } from "@/components/CountryFlag";
import { AttendeeProfileModal } from "@/components/AttendeeProfileModal";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateFilter = "all" | "upcoming" | "this-month" | "past";
const ALL = "all";

const DATE_LABELS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "this-month", label: "This Month" },
  { value: "past", label: "Past Events" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

export default function EventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(
    searchParams.get("category") ?? ALL,
  );
  const [department, setDepartment] = useState<string>(
    searchParams.get("department") ?? ALL,
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sort, setSort] = useState<"soonest" | "latest" | "recently-added">(
    "soonest",
  );
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(
    null,
  );
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<DatabaseEvent[]>({
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

  const userId = user?.id ?? "";
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

  // Batch fetch all registrations for visible events, then resolve attendee profiles.
  const { data: attendeeMap = {} } = useQuery<
    Record<string, { id: string; full_name: string | null; avatar_url: string | null; specialty: string | null }[]>
  >({
    queryKey: ["event-attendees", events.map((e) => e.id)],
    queryFn: async () => {
      const eventIds = events.map((e) => e.id);
      // 1. Fetch registrations for all events.
      const { data: regs, error: regErr } = await supabase
        .from("event_registrations")
        .select("event_id, user_id")
        .in("event_id", eventIds);
      if (regErr) throw regErr;
      if (!regs || regs.length === 0) return {};
      // 2. Fetch profiles for the registered user_ids.
      const userIds = Array.from(new Set(regs.map((r) => r.user_id)));
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, specialty")
        .in("id", userIds);
      if (profErr) throw profErr;
      const profileMap = new Map<
        string,
        { full_name: string | null; avatar_url: string | null; specialty: string | null }
      >();
      for (const p of profiles ?? []) {
        profileMap.set((p as { id: string }).id, {
          full_name: (p as { full_name: string | null }).full_name,
          avatar_url: (p as { avatar_url: string | null }).avatar_url,
          specialty: (p as { specialty: string | null }).specialty,
        });
      }
      // 3. Group by event_id.
      const map: Record<
        string,
        { id: string; full_name: string | null; avatar_url: string | null; specialty: string | null }[]
      > = {};
      for (const r of regs) {
        const eventId = (r as { event_id: string }).event_id;
        const uid = (r as { user_id: string }).user_id;
        const p = profileMap.get(uid);
        if (!map[eventId]) map[eventId] = [];
        map[eventId].push({
          id: uid,
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          specialty: p?.specialty ?? null,
        });
      }
      return map;
    },
    enabled: events.length > 0,
    staleTime: 30_000,
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({
      eventId,
      register,
    }: {
      eventId: string;
      register: boolean;
    }) => {
      if (register) {
        const { error } = await supabase
          .from("event_registrations")
          .insert({ event_id: eventId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { register }) => {
      toast.success(register ? "You're registered for this event." : "Registration cancelled.");
      queryClient.invalidateQueries({ queryKey: ["event-registrations", userId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Could not update registration."),
  });

  const countries = useMemo(
    () =>
      Array.from(new Set(events.map((e) => e.country))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [events],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set([...EVENT_CATEGORIES, ...events.map((e) => e.category)]),
      ).sort((a, b) => a.localeCompare(b)),
    [events],
  );
  const departments = useMemo(
    () =>
      Array.from(
        new Set([...EVENT_DEPARTMENTS, ...events.map((e) => e.department)]),
      ).sort((a, b) => a.localeCompare(b)),
    [events],
  );

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now).getTime(), [now]);
  const monthEnd = useMemo(() => endOfMonth(now).getTime(), [now]);

  const activeFilterCount =
    (category !== ALL ? 1 : 0) +
    (department !== ALL ? 1 : 0) +
    (country !== ALL ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = events.filter((e) => {
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q);
      const matchesCountry = country === ALL || e.country === country;
      const matchesCategory = category === ALL || e.category === category;
      const matchesDepartment =
        department === ALL || e.department === department;

      const startMs = new Date(e.start_date).getTime();
      const endMs = new Date(e.end_date).getTime();
      let matchesDate = true;
      if (dateFilter === "upcoming") {
        matchesDate = endMs >= now.getTime();
      } else if (dateFilter === "past") {
        matchesDate = endMs < now.getTime();
      } else if (dateFilter === "this-month") {
        matchesDate = startMs <= monthEnd && endMs >= monthStart;
      }

      return (
        matchesSearch &&
        matchesCountry &&
        matchesCategory &&
        matchesDepartment &&
        matchesDate
      );
    });

    const sorted = [...list];
    if (sort === "soonest") {
      sorted.sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
    } else if (sort === "latest") {
      sorted.sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
      );
    } else if (sort === "recently-added") {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [
    events,
    search,
    country,
    category,
    department,
    dateFilter,
    sort,
    now,
    monthStart,
    monthEnd,
  ]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => {
    setSearch("");
    setCountry(ALL);
    setCategory(ALL);
    setDepartment(ALL);
    setDateFilter("all");
    setSort("soonest");
    setSearchParams({}, { replace: true });
  };

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Medical Events</h1>
          <p className="text-sm text-muted-foreground">
            Conferences, webinars, and gatherings for healthcare professionals
            across Africa.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 pb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Search & Filter</h2>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 rounded-full px-2 py-0.5 text-xs"
                >
                  {activeFilterCount} active
                </Badge>
              )}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Search row */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, organiser or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter dropdowns */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="Category"
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  updateParam("category", v);
                }}
                options={categories}
                allLabel="All Categories"
              />
              <FilterSelect
                label="Department"
                value={department}
                onChange={(v) => {
                  setDepartment(v);
                  updateParam("department", v);
                }}
                options={departments}
                allLabel="All Departments"
              />
              <FilterSelect
                label="Country"
                value={country}
                onChange={setCountry}
                options={countries}
                allLabel="All Countries"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Date
                </label>
                <Select
                  value={dateFilter}
                  onValueChange={(v) => setDateFilter(v as DateFilter)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_LABELS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort + result count */}
            <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading events…"
                  : `${filtered.length} of ${events.length} event${events.length === 1 ? "" : "s"}`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <Select
                  value={sort}
                  onValueChange={(v) =>
                    setSort(v as "soonest" | "latest" | "recently-added")
                  }
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soonest">Soonest first</SelectItem>
                    <SelectItem value="latest">Latest date first</SelectItem>
                    <SelectItem value="recently-added">
                      Recently added
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No events found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="mt-4 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => {
              const isPast = new Date(event.end_date).getTime() < now.getTime();
              const isRegistered = registrations.includes(event.id);
              return (
                <Card
                  key={event.id}
                  className={isRegistered ? "flex flex-col overflow-hidden ring-2 ring-primary/40 transition-shadow hover:shadow-md" : "group flex flex-col overflow-hidden transition-shadow hover:shadow-md"}
                >
                  <div className="relative h-32 bg-gradient-to-br from-primary/15 via-accent/40 to-secondary">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <Badge className="bg-card/90 text-card-foreground backdrop-blur-sm">
                        {event.country}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-primary/90 text-primary-foreground backdrop-blur-sm"
                      >
                        {event.category}
                      </Badge>
                      {isPast && (
                        <Badge className="bg-muted/90 text-muted-foreground backdrop-blur-sm">
                          Past
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="flex flex-1 flex-col p-4">
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug">
                      {event.title}
                    </h3>
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                    <Badge
                      variant="outline"
                      className="mb-3 w-fit text-[10px] font-normal"
                    >
                      {event.department}
                    </Badge>
                    <div className="mt-auto space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>
                          {formatDate(event.start_date)}
                          {event.end_date !== event.start_date &&
                            ` – ${formatDate(event.end_date)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
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
                      {event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{event.capacity} seats</span>
                        </div>
                      )}
                    </div>
                    {/* Country flag */}
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5">
                      <CountryFlag country={event.country} size={18} />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {event.country}
                      </span>
                    </div>
                    {/* Attendees */}
                    <AttendeesRow
                      attendees={attendeeMap[event.id] ?? []}
                      capacity={event.capacity}
                      currentUserId={userId}
                      onAttendeeClick={(uid) => {
                        setSelectedAttendeeId(uid);
                        setProfileModalOpen(true);
                      }}
                    />
                    {/* RSVP + external registration + calendar */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className={isRegistered ? "flex-1" : "flex-1"}
                        disabled={isPast || rsvpMutation.isPending}
                        onClick={() =>
                          rsvpMutation.mutate({
                            eventId: event.id,
                            register: !isRegistered,
                          })
                        }
                        variant={isRegistered ? "secondary" : "default"}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Registered
                          </>
                        ) : (
                          <>
                            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                            RSVP
                          </>
                        )}
                      </Button>
                      {event.registration_url && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          disabled={isPast}
                          className="flex-1"
                        >
                          <a
                            href={event.registration_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {isPast ? "Ended" : "Register"}
                            {!isPast && (
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            )}
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 px-2.5"
                        title="Add to calendar"
                        onClick={() => {
                          downloadICS(event);
                          toast.success("Calendar event downloaded.");
                        }}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    {isRegistered && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        You're attending this event.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AttendeeProfileModal
        userId={selectedAttendeeId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </AppShell>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  allLabel: string;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface Attendee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
}

interface AttendeesRowProps {
  attendees: Attendee[];
  capacity: number | null;
  currentUserId: string;
  onAttendeeClick: (userId: string) => void;
}

function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AttendeesRow({
  attendees,
  capacity,
  currentUserId,
  onAttendeeClick,
}: AttendeesRowProps) {
  const MAX_AVATARS = 5;
  const sorted = useMemo(() => {
    // Show current user first, then others.
    const me = attendees.filter((a) => a.id === currentUserId);
    const rest = attendees.filter((a) => a.id !== currentUserId);
    return [...me, ...rest];
  }, [attendees, currentUserId]);

  const count = sorted.length;
  const visible = sorted.slice(0, MAX_AVATARS);
  const overflow = count - visible.length;

  if (count === 0) {
    return (
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5">
        <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="text-[11px] text-muted-foreground/70">
          No attendees yet — be the first to RSVP.
        </span>
      </div>
    );
  }

  const capacityText = capacity ? `${count} / ${capacity}` : `${count}`;

  return (
    <div className="mt-2.5 border-t border-border pt-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
          Attendees
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          {capacityText}
          {currentUserId && attendees.some((a) => a.id === currentUserId) && (
            <span className="ml-1 text-primary">· you</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {visible.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAttendeeClick(a.id);
            }}
            className="cursor-pointer rounded-full outline-none transition-transform hover:z-50 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}
            title={
              a.full_name
                ? `${a.full_name}${a.specialty ? ` — ${a.specialty}` : ""}${a.id === currentUserId ? " (you)" : ""}`
                : "Attendee"
            }
          >
            <Avatar
              className="h-6 w-6 border-2 border-background ring-1 ring-border"
            >
              {a.avatar_url ? (
                <AvatarImage src={a.avatar_url} alt={a.full_name ?? "Attendee"} />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-[8px] font-semibold text-primary">
                {initials(a.full_name)}
              </AvatarFallback>
            </Avatar>
          </button>
        ))}
        {overflow > 0 && (
          <div className="ml-[-8px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-semibold text-muted-foreground">
            +{overflow}
          </div>
        )}
        {count > 0 && (
          <span className="ml-2 text-[11px] text-muted-foreground">
            {count} {count === 1 ? "attendee" : "attendees"}
          </span>
        )}
      </div>
    </div>
  );
}
