import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SignedAvatar({ path, fallback, className = "h-9 w-9" }: { path?: string | null; fallback: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    if (path.startsWith("http") || path.startsWith("data:")) { setUrl(path); return; }
    supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [path]);
  return <Avatar className={className}>{url && <AvatarImage src={url} alt="Profile" />}<AvatarFallback>{fallback}</AvatarFallback></Avatar>;
}
