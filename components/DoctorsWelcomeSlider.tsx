import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { DatabaseProfile } from "@/lib/types";
import { CountryFlag } from "@/components/CountryFlag";
import { SignedAvatar } from "@/components/SignedAvatar";

function initials(name: string | null) {
  return (name ?? "Doctor").split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function DoctorsWelcomeSlider() {
  const { data: profiles = [] } = useQuery<DatabaseProfile[]>({
    queryKey: ["welcome-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as DatabaseProfile[];
    },
    staleTime: 60_000,
  });

  const shuffled = useMemo(() => {
    const copy = [...profiles];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [profiles]);

  if (!shuffled.length) return null;
  const repeated = [...shuffled, ...shuffled, ...shuffled];

  return (
    <div className="mt-6 overflow-hidden border-t border-white/10 pt-4" aria-label="Registered doctors">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        Doctors across Africa
      </p>
      <div className="group overflow-hidden">
        <div className="flex w-max animate-[doctor_marquee_75s_linear_infinite] gap-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {repeated.map((doctor, index) => (
            <div key={`${doctor.id}-${index}`} className="flex min-w-56 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm">
              <SignedAvatar path={doctor.avatar_url} fallback={initials(doctor.full_name)} className="h-10 w-10 ring-2 ring-white/15" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{doctor.full_name || "Registered Doctor"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-white/60">
                  {doctor.country ? <CountryFlag country={doctor.country} size={12} /> : <span>🌍</span>}
                  {doctor.country || "Africa"} · {doctor.specialty || "Healthcare Professional"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
