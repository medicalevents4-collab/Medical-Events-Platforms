import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { DatabaseEvent } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: events = [] } = useQuery<DatabaseEvent[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DatabaseEvent[];
    },
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number | null; events: DatabaseEvent[] }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, events: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(year, month, d, 0, 0, 0).getTime();
      const dayEnd = new Date(year, month, d, 23, 59, 59).getTime();
      const dayEvents = events.filter((e) => {
        const start = new Date(e.start_date).getTime();
        const end = new Date(e.end_date).getTime();
        return start <= dayEnd && end >= dayStart;
      });
      days.push({ day: d, events: dayEvents });
    }

    return days;
  }, [year, month, events]);

  const monthLabel = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const upcomingEvents = useMemo(() => {
    const now = new Date().getTime();
    return events
      .filter((e) => new Date(e.end_date).getTime() >= now)
      .slice(0, 5);
  }, [events]);

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Track conferences, CPD deadlines, and professional events across Africa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">{monthLabel}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarDays.map((item, idx) => {
                  const isToday =
                    item.day === new Date().getDate() &&
                    month === new Date().getMonth() &&
                    year === new Date().getFullYear();
                  return (
                    <div
                      key={idx}
                      className={`min-h-[100px] rounded-lg border p-2 transition-colors ${
                        item.day
                          ? "bg-card hover:bg-muted/50"
                          : "bg-muted/30"
                      }`}
                    >
                      {item.day && (
                        <>
                          <div
                            className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                              isToday ? "bg-primary text-white" : "text-foreground"
                            }`}
                          >
                            {item.day}
                          </div>
                          <div className="space-y-1">
                            {item.events.slice(0, 2).map((e) => (
                              <div
                                key={e.id}
                                className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                title={e.title}
                              >
                                {e.title}
                              </div>
                            ))}
                            {item.events.length > 2 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{item.events.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No upcoming events.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{event.category}</Badge>
                        <span className="text-[10px] text-muted-foreground">{event.country}</span>
                      </div>
                      <h4 className="mb-2 text-sm font-semibold leading-snug">{event.title}</h4>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(event.start_date)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h4 className="mb-1 text-sm font-semibold">AI Event Assistant</h4>
                <p className="mb-4 text-xs text-muted-foreground">
                  Get personalised recommendations for CPD events and conferences.
                </p>
                <Button size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Ask AI Assistant
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
