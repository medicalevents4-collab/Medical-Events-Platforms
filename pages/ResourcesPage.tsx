import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  BookOpen,
  Video,
  Download,
  Search,
  Filter,
  ExternalLink,
  Award,
  Clock,
  Star,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CPD_RESOURCES,
  RESOURCE_CATEGORIES as CATEGORIES,
  formatDownloadCount,
} from "@/lib/resources";

export default function ResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? "All",
  );

  const filtered = CPD_RESOURCES.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            CPD-accredited guidelines, journals, videos, and tools for healthcare professionals.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">156</p>
                <p className="text-xs text-muted-foreground">Resources</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">42</p>
                <p className="text-xs text-muted-foreground">CPD Points</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">28</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">64</p>
                <p className="text-xs text-muted-foreground">Guidelines</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources, guidelines, courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    const next = new URLSearchParams(searchParams);
                    if (cat === "All") next.delete("category");
                    else next.set("category", cat);
                    setSearchParams(next, { replace: true });
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => (
            <Card key={resource.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{resource.type}</Badge>
                  <Badge className="bg-primary/10 text-[10px] text-primary">{resource.cpd}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {resource.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {resource.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {formatDownloadCount(resource.downloads)} downloads
                  </span>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button size="sm" className="flex-1 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
