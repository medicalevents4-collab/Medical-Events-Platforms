import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Phone,
  Send,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import {
  fetchContacts,
  createContact,
  deleteContact,
  fetchContactMessages,
  sendWhatsAppMessage,
} from "@/lib/crm";
import type { DatabaseCrmContact, DatabaseCrmMessage } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { COUNTRIES, countryFlag, normalizeInternationalPhone } from "@/lib/countries";
import { DOCTOR_SPECIALTIES } from "@/lib/specialties";
import { CountryFlag } from "@/components/CountryFlag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WhatsAppPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  useRealtimeInvalidation("whatsapp-crm-live", [
    { table: "crm_contacts", queryKeys: [["crm-contacts", userId]] },
    { table: "crm_messages", queryKeys: [["crm-messages"]] },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState<DatabaseCrmContact | null>(null);

  // Add-contact form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCountryIso, setNewCountryIso] = useState("ZA");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newTags, setNewTags] = useState("");

  const { data: contacts = [], isLoading } = useQuery<DatabaseCrmContact[]>({
    queryKey: ["crm-contacts", userId],
    queryFn: () => fetchContacts(userId),
    enabled: !!userId,
  });

  const activeContact = contacts.find((c) => c.id === activeId) ?? null;
  const { data: activeMessages = [] } = useQuery<DatabaseCrmMessage[]>({
    queryKey: ["crm-messages", activeId], queryFn: () => fetchContactMessages(activeId!), enabled: !!activeId,
  });

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.specialty ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: () => {
      const country = COUNTRIES.find((item) => item.iso === newCountryIso) ?? COUNTRIES[0];
      const normalizedPhone = normalizeInternationalPhone(country.dialCode, newPhone);
      if (!normalizedPhone) throw new Error("Enter a valid phone number for the selected country.");
      return createContact(userId, {
        name: newName,
        phone: normalizedPhone,
        country: country.name,
        specialty: newSpecialty || undefined,
        tags: newTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
    },
    onSuccess: () => {
      toast.success("Contact added.");
      setNewName("");
      setNewPhone("");
      setNewCountryIso("ZA");
      setNewSpecialty("");
      setNewTags("");
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["crm-contacts", userId] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not add contact."),
  });

  const deleteMutation = useMutation({
    mutationFn: (contact: DatabaseCrmContact) =>
      deleteContact(contact.id, userId),
    onSuccess: () => {
      toast.success("Contact removed.");
      if (activeId === toDelete?.id) setActiveId(null);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["crm-contacts", userId] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not remove contact."),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeContact || !draft.trim()) throw new Error("Select a contact and enter a message.");
      return sendWhatsAppMessage(userId, activeContact, draft.trim());
    },
    onSuccess: (result) => {
      setDraft("");
      if (result.mode === "cloud") toast.success("Message sent and saved.");
      queryClient.invalidateQueries({ queryKey: ["crm-messages", activeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSend = () => sendMutation.mutate();

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${cleaned.replace(/^\+/, "")}`, "_blank");
  };

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp CRM</h1>
            <p className="text-sm text-muted-foreground">
              Manage your professional contacts and conversations in one place.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="shrink-0">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          {/* Contact list */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Contacts
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({contacts.length})
                </span>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contacts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">
                    {contacts.length === 0 ? "No contacts yet" : "No matches"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {contacts.length === 0
                      ? "Add your first contact to get started."
                      : "Try a different search."}
                  </p>
                </div>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted/50",
                      activeId === c.id && "bg-primary/5"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {c.name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.country ? `${countryFlag(COUNTRIES.find((item) => item.name === c.country)?.iso ?? "ZA")} ${c.country}` : c.specialty || c.phone}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat panel */}
          <Card className="flex flex-col overflow-hidden">
            {activeContact ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border bg-secondary/30 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {activeContact.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {activeContact.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activeContact.specialty || "Healthcare Professional"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      title="Open in WhatsApp"
                      onClick={() => openWhatsApp(activeContact.phone)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      title="Remove contact"
                      onClick={() => setToDelete(activeContact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Contact tags */}
                <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
                  {(activeContact.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[10px]">
                    {activeContact.phone}
                  </Badge>
                  {activeContact.country && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <CountryFlag country={activeContact.country} size={12} />
                      {activeContact.country}
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <div
                  className="flex-1 space-y-2 overflow-y-auto p-4"
                  style={{
                    backgroundColor: "hsl(204 33% 96%)",
                    backgroundImage:
                      "radial-gradient(hsl(204 25% 85% / 0.4) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {activeMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs text-muted-foreground">
                        Start the conversation below, or open WhatsApp directly.
                      </p>
                    </div>
                  ) : (
                    activeMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === "outbound" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            msg.direction === "outbound"
                              ? "rounded-br-sm bg-green-600 text-white"
                              : "rounded-bl-sm bg-card text-foreground"
                          )}
                        >
                          <p className="leading-relaxed">{msg.body}</p>
                          <div
                            className={cn(
                              "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                              msg.direction === "outbound"
                                ? "text-green-100"
                                : "text-muted-foreground"
                            )}
                          >
                            {new Date(msg.sent_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            {msg.direction === "outbound" && (
                              <CheckCircle2
                                className={cn(
                                  "h-3 w-3",
                                  msg.status === "read" && "text-blue-200"
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 border-t border-border bg-card p-3">
                  <Input
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!draft.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-10 w-10 bg-green-600 hover:bg-green-700"
                  >
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium">Select a contact</p>
                <p className="text-xs text-muted-foreground">
                  Choose a contact from the list to start chatting.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Info banner */}
        <Card className="mt-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">WhatsApp CRM</p>
              <p className="text-xs text-muted-foreground">
                Your contacts are saved per-account. Messages are delivered through
                your connected WhatsApp Business Cloud API. Use the phone button to
                open the contact directly in WhatsApp.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cName">Name</Label>
              <Input
                id="cName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Dr. Amara Okafor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cCountry">Country</Label>
              <Select value={newCountryIso} onValueChange={setNewCountryIso}>
                <SelectTrigger id="cCountry"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.iso} value={country.iso}>
                      {countryFlag(country.iso)} {country.name} ({country.dialCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cPhone">Phone number</Label>
              <Input
                id="cPhone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="083 230 7377"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cSpec">Doctor specialty</Label>
              <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                <SelectTrigger id="cSpec"><SelectValue placeholder="Select specialty…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {DOCTOR_SPECIALTIES.map((specialty) => <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cTags">Tags (comma-separated, optional)</Label>
              <Input
                id="cTags"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="Colleague, Lagos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={
                !newName.trim() || !newPhone.trim() || addMutation.isPending
              }
            >
              {addMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete);
        }}
        title="Remove contact?"
        description={`"${toDelete?.name}" will be removed from your contacts.`}
        confirmLabel="Remove"
        destructive
      />
    </AppShell>
  );
}
