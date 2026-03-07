import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  agent_id: string;
  instance_name: string | null;
  channel: string;
  client_name: string;
  client_phone: string | null;
  service: string;
  service_duration_min: number;
  booking_date: string;
  time_start: string;
  time_end: string;
  status: string;
  offer_status: string | null;
  offer_for_booking_id: string | null;
  created_at: string;
}

interface UpcomingDay {
  date: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  no_show: "bg-red-500/10 text-red-400 border-red-500/20",
};

const OFFER_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

function formatDate(d: string) {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function formatDateShort(d: string) {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function Bookings() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [markingLibre, setMarkingLibre] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [upcomingDays, setUpcomingDays] = useState<UpcomingDay[]>([]);
  const [didAutoNav, setDidAutoNav] = useState(false);

  // Stats
  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const noShows = bookings.filter(b => b.status === "no_show").length;
  const total = bookings.length;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", selectedDate)
      .order("time_start", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      setBookings((data as Booking[]) || []);
    }
    setLoading(false);
  }, [selectedDate]);

  // Fetch upcoming days with bookings (next 30 days)
  const fetchUpcoming = useCallback(async () => {
    const today = todayStr();
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("bookings")
      .select("booking_date")
      .gte("booking_date", today)
      .lte("booking_date", futureStr)
      .eq("status", "confirmed");

    if (error || !data) return;

    // Group by date and count
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.booking_date] = (counts[row.booking_date] || 0) + 1;
    }

    const days = Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setUpcomingDays(days);

    // Auto-navigate to next day with bookings if today is empty
    if (!didAutoNav && days.length > 0) {
      const todayHasBookings = days.some(d => d.date === today);
      if (!todayHasBookings) {
        setSelectedDate(days[0].date);
      }
      setDidAutoNav(true);
    }
  }, [didAutoNav]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `booking_date=eq.${selectedDate}`,
        },
        () => {
          fetchBookings();
          fetchUpcoming();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, fetchBookings, fetchUpcoming]);

  // Navigate dates
  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goToday = () => setSelectedDate(todayStr());

  // Mark as libre (no_show) and notify next client
  const handleMarkLibre = async (booking: Booking) => {
    setMarkingLibre(booking.id);
    setNotification(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-next-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ bookingId: booking.id, action: "mark_libre" }),
        }
      );

      const result = await res.json();

      if (result.success) {
        const msg = result.nextClient?.messageSent
          ? t("bookings.notifiedClient").replace("{name}", result.nextClient.client)
          : result.nextClient
            ? t("bookings.freedNoWhatsApp")
            : t("bookings.freedNoNext");
        setNotification({ type: "success", message: msg });
      } else {
        setNotification({ type: "error", message: result.error || t("common.error") });
      }

      fetchBookings();
      fetchUpcoming();
    } catch (e) {
      console.error("Error marking libre:", e);
      setNotification({ type: "error", message: t("common.error") });
    } finally {
      setMarkingLibre(null);
    }
  };

  const isToday = selectedDate === todayStr();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Week dots: 7 days starting from selected date's Monday
  const selectedD = new Date(selectedDate + "T12:00:00");
  const weekStart = new Date(selectedD);
  weekStart.setDate(selectedD.getDate() - ((selectedD.getDay() + 6) % 7)); // Monday
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(weekStart);
    wd.setDate(weekStart.getDate() + i);
    weekDays.push(wd.toISOString().slice(0, 10));
  }

  const upcomingMap = new Map(upcomingDays.map(d => [d.date, d.count]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("bookings.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("bookings.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {!isToday && (
            <Button variant="outline" size="sm" onClick={goToday} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("bookings.today")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchBookings(); fetchUpcoming(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Week strip + Date navigator */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Date nav row */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDate(selectedDate)}</span>
              {isToday && (
                <Badge variant="outline" className="bg-jade-500/10 text-jade-500 border-jade-500/20 text-xs">
                  {t("bookings.today")}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Week strip */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dayDate = new Date(day + "T12:00:00");
              const dayNum = dayDate.getDate();
              const dayName = dayDate.toLocaleDateString(undefined, { weekday: "narrow" });
              const count = upcomingMap.get(day) || 0;
              const isSelected = day === selectedDate;
              const isDayToday = day === todayStr();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center py-1.5 px-1 rounded-lg text-xs transition-all relative",
                    isSelected
                      ? "bg-[#00e5b8] text-black font-bold"
                      : "hover:bg-muted/50",
                    isDayToday && !isSelected && "ring-1 ring-[#00e5b8]/50"
                  )}
                >
                  <span className={cn("text-[10px]", !isSelected && "text-muted-foreground")}>{dayName}</span>
                  <span className="text-sm font-medium">{dayNum}</span>
                  {count > 0 && (
                    <span className={cn(
                      "mt-0.5 text-[9px] font-bold rounded-full min-w-[16px] px-1 text-center",
                      isSelected ? "bg-black/20 text-black" : "bg-[#00e5b8]/15 text-[#00e5b8]"
                    )}>
                      {count}
                    </span>
                  )}
                  {count === 0 && <span className="mt-0.5 h-[14px]" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{total}</p>
              <p className="text-[10px] text-muted-foreground">{t("bookings.total")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{confirmed}</p>
              <p className="text-[10px] text-muted-foreground">{t("bookings.confirmed")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{noShows}</p>
              <p className="text-[10px] text-muted-foreground">{t("bookings.noShows")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming days with bookings */}
      {upcomingDays.length > 0 && bookings.length === 0 && !loading && (
        <Card className="border-[#00e5b8]/20 bg-[#00e5b8]/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">{t("bookings.upcomingDays")}</p>
            <div className="flex flex-wrap gap-2">
              {upcomingDays.slice(0, 5).map((day) => (
                <Button
                  key={day.date}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#00e5b8]/30 hover:bg-[#00e5b8]/10"
                  onClick={() => setSelectedDate(day.date)}
                >
                  <span>{formatDateShort(day.date)}</span>
                  <Badge variant="secondary" className="bg-[#00e5b8]/20 text-[#00e5b8] text-[10px] px-1.5">
                    {day.count}
                  </Badge>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            "rounded-lg border p-3 flex items-center gap-2 text-sm",
            notification.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {notification.message}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => setNotification(null)}
          >
            {t("common.close")}
          </Button>
        </div>
      )}

      {/* Bookings list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t("bookings.noBookings")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const [sh, sm] = booking.time_start.split(":").map(Number);
            const startMin = sh * 60 + sm;
            const isPast = isToday && currentMinutes > startMin;
            const canMarkLibre = booking.status === "confirmed" && isPast;

            return (
              <Card
                key={booking.id}
                className={cn(
                  "transition-all",
                  booking.status === "no_show" && "opacity-60",
                  booking.status === "cancelled" && "opacity-40"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Time block */}
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold">{formatTime(booking.time_start)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(booking.time_end)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{booking.service_duration_min}min</p>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-14 bg-border self-center" />

                      {/* Client info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{booking.client_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{booking.service}</span>
                        </div>
                        {booking.client_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{booking.client_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status + Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", STATUS_COLORS[booking.status] || "")}
                        >
                          {t(`bookings.status.${booking.status}`)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {booking.channel === "whatsapp" ? "WA" : "Web"}
                        </Badge>
                      </div>

                      {/* Offer status */}
                      {booking.offer_status && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", OFFER_COLORS[booking.offer_status] || "")}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          {t(`bookings.offer.${booking.offer_status}`)}
                        </Badge>
                      )}

                      {/* Libre button */}
                      {canMarkLibre && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1.5"
                          disabled={markingLibre === booking.id}
                          onClick={() => handleMarkLibre(booking)}
                        >
                          {markingLibre === booking.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {t("bookings.markLibre")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
