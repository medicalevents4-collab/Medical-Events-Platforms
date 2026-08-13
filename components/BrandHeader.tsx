import { HeartPulse, Loader2 } from "lucide-react";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
        <HeartPulse className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Medical Events Platform
        </h1>
        <p className="text-sm text-muted-foreground">
          {subtitle ?? "Africa's Complete Healthcare Professional Engagement Platform"}
        </p>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
