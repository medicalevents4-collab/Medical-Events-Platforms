import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HeartPulse, Loader2, Mail, Lock, User as UserIcon, ArrowLeft, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { COUNTRIES, countryFlag, normalizeInternationalPhone } from "@/lib/countries";
import { DOCTOR_SPECIALTIES } from "@/lib/specialties";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryIso, setCountryIso] = useState("ZA");
  const [phone, setPhone] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
        } else {
          setResetSent(true);
          toast.success("Reset link sent — check your email.");
        }
      } else if (mode === "signup") {
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        const country = COUNTRIES.find((item) => item.iso === countryIso) ?? COUNTRIES[0];
        const normalizedPhone = normalizeInternationalPhone(country.dialCode, phone);
        if (!normalizedPhone) {
          toast.error("Enter a valid international contact number.");
          setLoading(false);
          return;
        }
        const { error } = await signUp({
          email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(),
          phone: normalizedPhone, country: country.name, countryCode: country.dialCode, whatsappEnabled, specialty,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success("Account created! Check your email to confirm, then sign in.");
          setMode("signin");
          setPassword("");
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Welcome back!");
          navigate(from, { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error);
      } else {
        toast.success("Welcome back!");
        navigate(from, { replace: true });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel with logo & welcome message */}
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, hsl(82 24% 46% / 0.35), transparent 55%), radial-gradient(ellipse at 80% 100%, hsl(100 24% 22% / 0.6), transparent 60%)",
          }}
        />

        {/* Large logo at top */}
        <div className="relative mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-sidebar-primary/20 ring-2 ring-sidebar-primary/40 shadow-2xl shadow-sidebar-primary/20">
            <HeartPulse className="h-12 w-12 text-sidebar-primary" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Medical Events Connect</h2>
            <span className="rounded border border-sidebar-primary/40 bg-sidebar-primary/15 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-sidebar-primary">
              AFRICA
            </span>
          </div>
          <p className="mt-2 text-sm text-sidebar-foreground/70">Africa's Complete Healthcare Engagement Ecosystem</p>
        </div>

        {/* Welcome message */}
        <div className="relative mx-auto max-w-md text-center">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Welcome to Africa's Healthcare Professional Hub
          </h1>
          <p className="mt-5 text-base leading-relaxed text-sidebar-foreground/80">
            Connect with fellow practitioners across the continent, share successful surgery
            stories, stay on top of the latest medical news, and manage your professional
            events — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              ["Verified Practitioners", "Secure trusted community"],
              ["Live Events", "Conferences & webinars"],
              ["File Portal", "Upload & organize documents"],
              ["AI Assistant", "Instant clinical guidance"],
            ].map(([t, s]) => (
              <div key={t} className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
                <p className="font-semibold text-white">{t}</p>
                <p className="text-sm text-sidebar-foreground/60">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 flex items-center justify-center">
          <p className="text-xs text-sidebar-foreground/50">
            © {new Date().getFullYear()} Medical Events Connect · Empowering African Healthcare
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex w-full flex-col items-center justify-center bg-background p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <HeartPulse className="h-8 w-8 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-base font-semibold">Medical Events Connect</p>
              <p className="text-xs text-muted-foreground">Africa's Complete Healthcare Engagement Ecosystem</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create an Account"
                  : "Reset Password"}
            </h2>
            <ThemeToggle />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back. Sign in to access your portal."
              : mode === "signup"
                ? "Join the community of African healthcare professionals."
                : "Enter your email and we'll send you a reset link."}
          </p>

          {mode === "forgot" && resetSent ? (
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-5 text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-primary" />
              <p className="text-sm font-medium">Check your email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>. Follow the
                link in the email to reset your password.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="firstName">Name</Label><div className="relative"><UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className="pl-9" /></div></div>
                  <div className="space-y-1.5"><Label htmlFor="lastName">Surname</Label><Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mwangi" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="country">Country of origin</Label><select id="country" value={countryIso} onChange={(e) => setCountryIso(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{COUNTRIES.map((item) => <option key={item.iso} value={item.iso}>{countryFlag(item.iso)} {item.name} ({item.dialCode})</option>)}</select></div>
                <div className="space-y-1.5"><Label htmlFor="signup-specialty">Doctor specialty</Label><select id="signup-specialty" required value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select specialty…</option>{DOCTOR_SPECIALTIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Contact number</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="083 230 7377" className="pl-9" /></div><p className="text-xs text-muted-foreground">Saved in international format using the selected country code.</p></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />This number has a WhatsApp profile</label>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.org"
                  className="pl-9"
                />
              </div>
            </div>

            {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  minLength={6}
                />
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">At least 6 characters.</p>
              )}
            </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
            </Button>
          </form>
          )}

          {mode === "signin" && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={googleLoading || loading}
                onClick={handleGoogleSignIn}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FcGoogle className="mr-2 h-5 w-5" />
                )}
                Continue with Google
              </Button>
            </>
          )}

          {/* Toggle */}
          {mode !== "forgot" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button
                  onClick={() => setMode("forgot")}
                  className={cn("font-medium text-primary hover:underline")}
                >
                  Forgot password?
                </button>
                <span className="mx-2">·</span>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className={cn("font-medium text-primary hover:underline")}
                >
                  Create an Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className={cn("font-medium text-primary hover:underline")}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
          )}
          {mode === "forgot" && !resetSent && (
            <button
              onClick={() => setMode("signin")}
              className={cn("mt-4 flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
