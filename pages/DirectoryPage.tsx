import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  MapPin,
  Stethoscope,
  Mail,
  Loader2,
  MessageCircle,
  Globe,
  X,
  RotateCcw,
  Briefcase,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DatabaseProfile } from "@/lib/types";
import { SignedAvatar } from "@/components/SignedAvatar";
import { COUNTRIES, countryFlag } from "@/lib/countries";

type SortMode = "newest" | "name-az" | "name-za" | "specialty";
type SearchMode = "name" | "country" | "qualification";

const SORT_LABELS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest Members" },
  { value: "name-az", label: "Name (A–Z)" },
  { value: "name-za", label: "Name (Z–A)" },
  { value: "specialty", label: "By Specialty" },
];

const ALL = "all";

export default function DirectoryPage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [sort, setSort] = useState<SortMode>("newest");

  const { data: profiles = [], isLoading } = useQuery<DatabaseProfile[]>({
    queryKey: ["directory-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatabaseProfile[];
    },
  });

  const specialties = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((p) => p.specialty)
            .filter((s): s is string => !!s)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [profiles],
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((p) => p.country)
            .filter((c): c is string => !!c)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [profiles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = profiles.filter((p) => {
      const haystack = searchMode === "country"
        ? `${p.country ?? ""}`
        : searchMode === "qualification"
          ? `${p.qualification ?? ""} ${p.qualification_institution ?? ""} ${p.qualification_country ?? ""} ${p.specialty ?? ""} ${p.practice_number ?? ""}`
          : `${p.full_name ?? ""} ${p.professional_title ?? ""}`;
      const matchesSearch = !q || haystack.toLowerCase().includes(q);
      const matchesSpecialty =
        !specialtyFilter || p.specialty === specialtyFilter;
      const matchesCountry =
        !countryFilter || p.country === countryFilter;
      return matchesSearch && matchesSpecialty && matchesCountry;
    });

    const sorted = [...list];
    if (sort === "name-az") {
      sorted.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    } else if (sort === "name-za") {
      sorted.sort((a, b) => (b.full_name ?? "").localeCompare(a.full_name ?? ""));
    } else if (sort === "specialty") {
      sorted.sort((a, b) => {
        const s = (a.specialty ?? "zzz").localeCompare(b.specialty ?? "zzz");
        if (s !== 0) return s;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      });
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [profiles, search, searchMode, specialtyFilter, countryFilter, sort]);

  const countryGroups = useMemo(() => COUNTRIES.map((country) => ({
    ...country,
    doctors: profiles.filter((profile) => profile.country === country.name).length,
  })).filter((country) => country.doctors > 0), [profiles]);

  const activeFilterCount =
    (specialtyFilter ? 1 : 0) +
    (countryFilter ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    setSpecialtyFilter("");
    setCountryFilter("");
    setSort("newest");
  };

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Practitioner Directory</h1>
          <p className="text-sm text-muted-foreground">
            Connect with fellow healthcare professionals across Africa.
          </p>
        </div>

        {/* Search + filters */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Doctor search type">
              {(["name", "country", "qualification"] as SearchMode[]).map((mode) => <button key={mode} type="button" role="tab" aria-selected={searchMode === mode} onClick={() => setSearchMode(mode)} className={searchMode === mode ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground" : "rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"}>Search by {mode}</button>)}
            </div>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchMode === "name" ? "Search doctor name or professional title…" : searchMode === "country" ? "Search by African country…" : "Search qualification, institution, specialty or practice number…"}
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

            {/* Specialty chips */}
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSpecialtyFilter("")}
                className={
                  !specialtyFilter
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/70"
                }
              >
                All Specialties
              </button>
              {specialties.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setSpecialtyFilter(specialtyFilter === s ? "" : s)
                  }
                  className={
                    specialtyFilter === s
                      ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/70"
                  }
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Country filter + sort */}
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Country:</span>
                <Select
                  value={countryFilter || ALL}
                  onValueChange={(v) => setCountryFilter(v === ALL ? "" : v)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Countries</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortMode)}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_LABELS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter bar */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="mb-6" aria-labelledby="countries-heading">
          <div className="mb-3 flex items-end justify-between"><div><h2 id="countries-heading" className="text-lg font-bold">African countries with registered doctors</h2><p className="text-xs text-muted-foreground">Choose a country to view its practitioners.</p></div><Badge variant="secondary">{countryGroups.length} countries</Badge></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {countryGroups.map((country) => <button key={country.iso} onClick={() => { setCountryFilter(country.name); setSearchMode("country"); }} className="min-w-36 rounded-xl border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm"><span className="text-2xl" aria-hidden>{countryFlag(country.iso)}</span><p className="mt-1 text-xs font-semibold">{country.name}</p><p className="text-[10px] text-muted-foreground">{country.doctors} doctor{country.doctors === 1 ? "" : "s"}</p></button>)}
          </div>
        </section>

        <p className="mb-4 text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${filtered.length} practitioner${filtered.length === 1 ? "" : "s"}`}
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No practitioners found</p>
              <p className="text-xs text-muted-foreground">
                {activeFilterCount > 0
                  ? "Try adjusting your search or filters."
                  : "Be the first to complete your profile."}
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
            {filtered.map((p) => {
              const initials = (p.full_name ?? p.email ?? "U")
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const isSelf = p.id === profile?.id;
              return (
                <Card
                  key={p.id}
                  className="flex flex-col transition-shadow hover:shadow-md"
                >
                  <div className="h-20 bg-gradient-to-r from-primary/15 via-accent/40 to-secondary" />
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="-mt-10 mb-3 flex items-end justify-between">
                      <SignedAvatar path={p.avatar_url} fallback={initials} className="h-16 w-16 border-4 border-card" />
                      {isSelf && (
                        <Badge variant="secondary" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">
                      {p.full_name ?? "Unknown"}
                    </h3>
                    {p.specialty && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Stethoscope className="h-3 w-3" />
                        {p.specialty}
                      </p>
                    )}
                    <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
                      {p.qualification && <p><span className="font-semibold text-foreground">Qualification:</span> {p.qualification}</p>}
                      {p.qualification_institution && <p><span className="font-semibold text-foreground">Institution:</span> {p.qualification_institution}{p.qualification_country ? `, ${p.qualification_country}` : ""}</p>}
                      {p.practice_number && <p><span className="font-semibold text-foreground">Practice No:</span> {p.practice_number}</p>}
                    </div>
                    {p.bio && (
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                        {p.bio}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.country && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <span aria-hidden>{countryFlag(COUNTRIES.find((country) => country.name === p.country)?.iso ?? "ZA")}</span>{p.country}
                        </Badge>
                      )}
                      {p.specialty && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Briefcase className="h-2.5 w-2.5" />
                          {p.specialty}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Globe className="h-2.5 w-2.5" />
                      Member since{" "}
                      {new Date(p.created_at).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {!isSelf && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                      >
                        <a
                          href={`https://wa.me/?text=Hello%20${encodeURIComponent(
                            p.full_name ?? ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          Connect
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
