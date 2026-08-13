import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  MapPin,
  Stethoscope,
  CalendarDays,
  FileText,
  UserCircle2,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { DatabaseProfile } from "@/lib/types";
import { CountryFlag } from "@/components/CountryFlag";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AttendeeProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function AttendeeProfileModal({
  userId,
  open,
  onOpenChange,
}: AttendeeProfileModalProps) {
  const { data: profile, isLoading } = useQuery<DatabaseProfile | null>({
    queryKey: ["attendee-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as DatabaseProfile) ?? null;
    },
    enabled: !!userId && open,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Banner */}
        <div className="relative h-24 bg-gradient-to-br from-primary/30 via-accent/50 to-secondary" />

        <div className="px-6 pb-6">
          {/* Avatar overlapping banner */}
          <div className="-mt-12 mb-4 flex justify-center">
            <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-border shadow-md">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Attendee"}
                />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-2xl font-bold text-primary">
                {profile ? initials(profile.full_name) : <UserCircle2 className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
          </div>

          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl">
              {profile?.full_name ?? "Attendee"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Healthcare professional
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !profile ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Profile details are not available.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {/* Specialty badge */}
              {profile.specialty && (
                <div className="flex justify-center">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 bg-primary/10 text-primary"
                  >
                    <Stethoscope className="h-3 w-3" />
                    {profile.specialty}
                  </Badge>
                </div>
              )}

              {/* Detail rows */}
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                {profile.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={`mailto:${profile.email}`}
                      className="truncate text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                    >
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.country && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <CountryFlag country={profile.country} size={16} />
                    <span className="text-foreground">{profile.country}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    Member since {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {profile.bio ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Professional Bio
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {profile.bio}
                  </p>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground/70">
                  No professional bio provided.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
