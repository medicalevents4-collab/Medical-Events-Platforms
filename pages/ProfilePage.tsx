import { useState, useEffect, useCallback } from "react";
import { User, Mail, Stethoscope, Globe, Loader2, Save, MapPin, BadgeCheck, AlertCircle, Send, Clock, Camera } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SignedAvatar } from "@/components/SignedAvatar";
import { COUNTRIES, countryFlag } from "@/lib/countries";
import { DOCTOR_SPECIALTIES } from "@/lib/specialties";

export default function ProfilePage() {
  const { profile, updateProfile, user, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [specialty, setSpecialty] = useState(profile?.specialty ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [professionalTitle, setProfessionalTitle] = useState(profile?.professional_title ?? "");
  const [qualification, setQualification] = useState(profile?.qualification ?? "");
  const [qualificationInstitution, setQualificationInstitution] = useState(profile?.qualification_institution ?? "");
  const [qualificationCountry, setQualificationCountry] = useState(profile?.qualification_country ?? "");
  const [practiceNumber, setPracticeNumber] = useState(profile?.practice_number ?? "");
  const COOLDOWN_SECONDS = 60;
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setSpecialty(profile?.specialty ?? "");
    setCountry(profile?.country ?? "");
    setBio(profile?.bio ?? "");
    setProfessionalTitle(profile?.professional_title ?? "");
    setQualification(profile?.qualification ?? "");
    setQualificationInstitution(profile?.qualification_institution ?? "");
    setQualificationCountry(profile?.qualification_country ?? "");
    setPracticeNumber(profile?.practice_number ?? "");
  }, [profile]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResendVerification = useCallback(async () => {
    if (!user?.email) {
      toast.error("No email address on file.");
      return;
    }
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      toast.success("Verification email sent", {
        description: `A verification link has been sent to ${user.email}. Check your inbox and spam folder.`,
        duration: 6000,
      });
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  }, [user?.email, cooldown, resending]);

  const initials = (fullName || profile?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim() || null,
      specialty: specialty || null,
      country: country || null,
      bio: bio || null,
      professional_title: professionalTitle || null,
      qualification: qualification || null,
      qualification_institution: qualificationInstitution || null,
      qualification_country: qualificationCountry || null,
      practice_number: practiceNumber || null,
    });
    setSaving(false);
    if (error) toast.error(error);
    else toast.success("Profile updated.");
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Choose a JPG, PNG or WebP image under 5 MB.");
      return;
    }
    setAvatarUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/profile.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) toast.error(uploadError.message);
    else {
      const { error } = await updateProfile({ avatar_url: path });
      if (error) toast.error(error); else toast.success("Profile picture updated.");
    }
    setAvatarUploading(false);
  };

  const isEmailVerified = Boolean(
    (user?.email_confirmed_at) || (user?.confirmed_at)
  );

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <AppShell>
      <div className="animate-fade-in-up mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Keep your professional details up to date for the community.
          </p>
        </div>

        {/* Profile header card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/50 to-secondary" />
          <CardContent className="p-5">
            <div className="-mt-12 flex items-end gap-4">
              <div className="relative">
                <SignedAvatar path={profile?.avatar_url} fallback={initials} className="h-20 w-20 border-4 border-card" />
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow" title="Change profile picture">
                  {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={avatarUploading} onChange={(event) => void handleAvatarUpload(event.target.files?.[0])} />
                </label>
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-lg font-semibold">{fullName || "Your Name"}</h2>
                <p className="text-sm text-muted-foreground">{specialty || "Add your specialty"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="gap-1">
                <Mail className="h-3 w-3" />
                {profile?.email ?? user?.email}
              </Badge>
              {country && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {country}
                </Badge>
              )}
              {isEmailVerified ? (
                <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
                  <BadgeCheck className="h-3 w-3" />
                  Email Verified
                </Badge>
              ) : (
                <>
                  <Badge className="gap-1 border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20">
                    <AlertCircle className="h-3 w-3" />
                    Not Verified
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 px-2 text-xs"
                    onClick={handleResendVerification}
                    disabled={resending || cooldown > 0}
                  >
                    {resending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : cooldown > 0 ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend verification"}
                  </Button>
                </>
              )}
              <Badge variant="outline">Member since {memberSince}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Jane Mwangi"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="professionalTitle">Professional title</Label>
              <Input id="professionalTitle" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} placeholder="Dr, Prof, Specialist Physician" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="qualification">Primary qualification</Label><Input id="qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="MBChB, MD, PhD" /></div>
              <div className="space-y-1.5"><Label htmlFor="practiceNumber">Practice number</Label><Input id="practiceNumber" value={practiceNumber} onChange={(e) => setPracticeNumber(e.target.value)} placeholder="HPCSA / national practice number" /></div>
              <div className="space-y-1.5"><Label htmlFor="qualificationInstitution">Qualification institution</Label><Input id="qualificationInstitution" value={qualificationInstitution} onChange={(e) => setQualificationInstitution(e.target.value)} placeholder="University or medical college" /></div>
              <div className="space-y-1.5"><Label htmlFor="qualificationCountry">Country obtained</Label><select id="qualificationCountry" value={qualificationCountry} onChange={(e) => setQualificationCountry(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select country…</option>{COUNTRIES.map((item) => <option key={item.iso} value={item.name}>{countryFlag(item.iso)} {item.name}</option>)}</select></div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialty">Specialty</Label>
              <div className="relative">
                <Stethoscope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                >
                  <option value="">Select specialty…</option>
                  {DOCTOR_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm">
                  <option value="">Select country…</option>
                  {COUNTRIES.map((item) => <option key={item.iso} value={item.name}>{countryFlag(item.iso)} {item.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief professional background, interests, and achievements…"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
