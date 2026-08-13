import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Users,
  FileText,
  Settings,
  ShieldCheck,
  Bot,
  MessageCircle,
  Bell,
  LogOut,
  Menu,
  X,
  HeartPulse,
  Search,
  Sparkles,
  ChevronDown,
  Newspaper,
  PenSquare,
  ListFilter,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedAvatar } from "@/components/SignedAvatar";
import { MedicalNewsTicker } from "@/components/MedicalNewsTicker";
import { AfricanMedicineAnalytics } from "@/components/AfricanMedicineAnalytics";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { ActivityNotifications } from "@/components/ActivityNotifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: CalendarDays, badge: "2" },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/directory", label: "Directory", icon: Users, badge: "1" },
  { to: "/feed", label: "Feed & News", icon: Newspaper },
  { to: "/assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
  { to: "/resources", label: "Resources", icon: FileText, badge: "CPD" },
  { to: "/whatsapp", label: "WhatsApp CRM", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck, badge: "ADMIN" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const isAdmin = (user?.app_metadata?.role ?? user?.app_metadata?.user_role) === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/directory?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const currentLabel =
    NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label ?? "Medical Events Connect";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — dark moss green */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-start gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/20 ring-1 ring-sidebar-primary/40">
            <HeartPulse className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold leading-tight text-white">
                Medical Events Connect
              </h1>
              <span className="shrink-0 rounded border border-sidebar-primary/40 bg-sidebar-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-sidebar-primary">
                AFRICA
              </span>
            </div>
            <p className="truncate text-xs text-sidebar-foreground/60">
              Africa's Complete Healthcare Engagement Ecosystem
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Main Platform Navigation
        </p>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="shrink-0 rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Community posts</p>
          <NavLink to="/feed?sort=recent" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"><ListFilter className="h-4 w-4" />Upcoming Posts</NavLink>
          <NavLink to="/feed?compose=1" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"><PenSquare className="h-4 w-4" />Create Post</NavLink>

          {isAdmin && <>
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Administration</p>
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="shrink-0 rounded-md border border-destructive/30 bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}</>}
        </nav>

        {/* CPD Progress widget */}
        <div className="digital-gloss mx-4 mb-4 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">CPD Point Progress</p>
              <p className="text-[10px] text-sidebar-foreground/60">23/38 Pts</p>
            </div>
          </div>
          <div className="cpd-progress-track mb-2 h-2 overflow-hidden rounded-full">
            <div className="cpd-progress-fill h-full rounded-full" style={{ width: "76%" }} />
          </div>
          <p className="text-[10px] leading-relaxed text-sidebar-foreground/60">
            76% of annual HPCSA requirement completed
          </p>
        </div>

        {/* Theme toggle + user + sign out */}
        <div className="flex items-center justify-end px-3 pb-2">
          <ThemeToggle variant="sidebar" />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(false)}
          >
            <SignedAvatar path={profile?.avatar_url} fallback={initials} className="h-9 w-9 border border-sidebar-border" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {profile?.full_name ?? "Practitioner"}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {profile?.specialty ?? profile?.email}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="mt-2 w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="digital-gloss sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h2 className="hidden text-sm font-semibold text-foreground lg:block">{currentLabel}</h2>

          {/* Global search */}
          <form onSubmit={handleSearch} className="mx-4 hidden max-w-md flex-1 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search events, specialists, CPD courses, clinical guidelines…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-full border-border bg-muted/50 pl-10 pr-4 text-sm focus-visible:bg-card"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="digital-gloss hidden gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary sm:flex"
              onClick={() => navigate("/assistant")}
            >
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 border-border bg-card hover:bg-muted sm:flex"
              onClick={() => navigate("/whatsapp")}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              WhatsApp
            </Button>

            <ActivityNotifications />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 pr-2.5 text-left transition-colors hover:bg-muted">
                  <SignedAvatar path={profile?.avatar_url} fallback={initials} className="h-8 w-8" />
                  <div className="hidden min-w-0 md:block">
                    <p className="truncate text-xs font-medium text-foreground">
                      {profile?.full_name ?? "Practitioner"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {profile?.specialty ?? "Healthcare Professional"}
                    </p>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/assistant")}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Assistant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/whatsapp")}>
                  <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                  WhatsApp CRM
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <MedicalNewsTicker />
        <AfricanMedicineAnalytics />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Floating Chatbot & WhatsApp buttons */}
      <AnnouncementPopup />
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {/* AI Assistant FAB */}
        <button
          onClick={() => navigate("/assistant")}
          className="digital-gloss group flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-110 hover:bg-primary/90 active:scale-95"
          aria-label="AI Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-card-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            AI Assistant
          </span>
        </button>

        {/* WhatsApp FAB */}
        <button
          onClick={() => navigate("/whatsapp")}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all hover:scale-110 hover:bg-[#1ebd5a] active:scale-95"
          aria-label="WhatsApp CRM"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="pointer-events-none absolute right-14 whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-card-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            WhatsApp CRM
          </span>
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
          </span>
        </button>
      </div>
    </div>
  );
}
