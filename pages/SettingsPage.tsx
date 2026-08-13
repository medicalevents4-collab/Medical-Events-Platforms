import { useState } from "react";
import { toast } from "sonner";
import { Bell, Lock, Moon, Globe, Shield, Smartphone, Mail, Loader2, Workflow } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme, type MedicalPalette } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const { palette, setPalette } = useTheme();
  const { user } = useAuth();
  const [supportSubject,setSupportSubject]=useState(""); const [supportMessage,setSupportMessage]=useState(""); const [sendingSupport,setSendingSupport]=useState(false);
  const submitSupport=async()=>{if(!user||!supportSubject.trim()||!supportMessage.trim())return;setSendingSupport(true);const{error}=await supabase.from("support_requests").insert({user_id:user.id,subject:supportSubject.trim(),message:supportMessage.trim()});setSendingSupport(false);if(error)return toast.error(error.message);toast.success("Support request sent to the administrator.");setSupportSubject("");setSupportMessage("");};
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [referralAlerts, setReferralAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingAutomationTest, setSendingAutomationTest] = useState(false);

  const sendTestEmail = async () => {
    if (!user?.email) return toast.error("Sign in with an email address to send a test.");
    setSendingTestEmail(true);
    const { data, error } = await supabase.functions.invoke<{ id?: string; error?: string }>(
      "send-platform-email",
      { body: { type: "test", name: user.user_metadata?.full_name } },
    );
    setSendingTestEmail(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Could not send the test email.");
    toast.success(`Test email sent to ${user.email}.`);
  };

  const sendAutomationTest = async () => {
    setSendingAutomationTest(true);
    const { data, error } = await supabase.functions.invoke<{ accepted?: boolean; error?: string }>("trigger-n8n");
    setSendingAutomationTest(false);
    if (error || data?.error || !data?.accepted) return toast.error(data?.error ?? error?.message ?? "Could not trigger the automation test.");
    toast.success("Anonymous automation test sent to n8n.");
  };

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account preferences, notifications, and security settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader><CardTitle className="text-base">Contact System Administrator</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={supportSubject} onChange={(e)=>setSupportSubject(e.target.value)} placeholder="Request subject"/><Textarea value={supportMessage} onChange={(e)=>setSupportMessage(e.target.value)} placeholder="Describe the issue or data that needs attention…"/><Button onClick={submitSupport} disabled={sendingSupport||!supportSubject.trim()||!supportMessage.trim()}>Send support request</Button></CardContent></Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SettingRow
                  label="Email notifications"
                  description="Receive updates about events, referrals, and CPD reminders via email."
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
                <Separator />
                <SettingRow
                  label="Event reminders"
                  description="Get 24-hour reminders before conferences and webinars you registered for."
                  checked={eventReminders}
                  onCheckedChange={setEventReminders}
                />
                <Separator />
                <SettingRow
                  label="Referral alerts"
                  description="Notify me when a new patient referral requires my review."
                  checked={referralAlerts}
                  onCheckedChange={setReferralAlerts}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SettingRow
                  label="Two-factor authentication"
                  description="Add an extra layer of security to your account."
                  checked={twoFactor}
                  onCheckedChange={setTwoFactor}
                />
                <Separator />
                <SettingRow
                  label="Public profile"
                  description="Allow other verified practitioners to view your profile in the directory."
                  checked={publicProfile}
                  onCheckedChange={setPublicProfile}
                />
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Email delivery</p>
                      <p className="text-xs text-muted-foreground">Send a test email to your signed-in address.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={sendTestEmail} disabled={sendingTestEmail || !user?.email}>
                    {sendingTestEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send test
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">n8n automation</p>
                      <p className="text-xs text-muted-foreground">Send an anonymous connection test to your workflow.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={sendAutomationTest} disabled={sendingAutomationTest}>
                    {sendingAutomationTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Workflow className="mr-2 h-4 w-4" />}
                    Send test
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Change password</p>
                    <p className="text-xs text-muted-foreground">Update your password regularly for security.</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Lock className="mr-2 h-4 w-4" />
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Theme</Label>
                  </div>
                  <ThemeToggle />
                </div>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark mode to reduce eye strain during night shifts.
                </p>
                <Separator />
                <div><Label className="text-sm font-medium">Medical colour scheme</Label><p className="mb-3 text-xs text-muted-foreground">The existing moss palette remains the default.</p><div className="grid gap-2">{([['moss','Current Moss'],['clinical-blue','Clinical Blue'],['teal','Surgical Teal']] as [MedicalPalette,string][]).map(([value,label]) => <button key={value} onClick={() => setPalette(value)} className={palette===value ? "flex items-center gap-3 rounded-lg border-2 border-primary p-2 text-xs font-semibold" : "flex items-center gap-3 rounded-lg border p-2 text-xs"}><span className={`h-5 w-5 rounded-full ${value==='moss'?'bg-[#718843]':value==='clinical-blue'?'bg-[#1677b8]':'bg-[#0f766e]'}`} />{label}</button>)}</div></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">WhatsApp CRM</p>
                      <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Region</p>
                      <p className="text-xs text-muted-foreground">South Africa (CAT)</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
