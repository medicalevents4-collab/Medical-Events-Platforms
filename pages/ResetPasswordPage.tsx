import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You can now sign in.");
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-7 shadow-xl">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/15 p-3"><HeartPulse className="h-6 w-6 text-primary" /></span><div><h1 className="text-xl font-bold">Create new password</h1><p className="text-sm text-muted-foreground">Choose a secure password for your account.</p></div></div>
    <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="new-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" /></div></div>
    <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
    <Button className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button>
  </form></main>;
}
