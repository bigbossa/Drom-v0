import { useEffect, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, addMonths, subMonths, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client"; // <-- ปรับ path ให้ตรงกับโปรเจกต์

type Announcement = {
  id: string;
  title: string;
  content: string;
  publish_date: string; // yyyy-MM-dd
  important: boolean;
};

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Omit<Announcement, "id">>({
    title: "",
    content: "",
    publish_date: new Date().toISOString().split("T")[0],
    important: false,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // โหลดประกาศจาก supabase
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("publish_date", { ascending: false });
      if (!error && data) setAnnouncements(data as Announcement[]);
    };
    fetchAnnouncements();
  }, []);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // เพิ่มประกาศลง supabase
  const handleAddAnnouncement = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .insert([
        {
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          publish_date: newAnnouncement.publish_date,
          important: newAnnouncement.important,
        },
      ])
      .select();
    if (!error && data) {
      setAnnouncements((prev) => [...prev, ...data]);
      setDialogOpen(false);
      toast({
        title: t("announcements.added"),
        description: t("announcements.addedDesc"),
      });
      setNewAnnouncement({
        title: "",
        content: "",
        publish_date: new Date().toISOString().split("T")[0],
        important: false,
      });
    } else {
      toast({
        title: t("announcements.error"),
        description: error?.message || "Error",
        variant: "destructive",
      });
    }
  };

  // ลบประกาศใน supabase
  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast({
        title: t("announcements.deleted"),
        description: t("announcements.deletedDesc"),
      });
    } else {
      toast({
        title: t("announcements.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const currentMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    // เติม null สำหรับวันก่อนวันที่ 1
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    // เติมวันที่จริง
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const hasAnnouncementOnDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return announcements.some((a) => a.publish_date === dateStr);
  };

  const getAnnouncementsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return announcements.filter((a) => a.publish_date === dateStr);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("nav.announcements")}</h1>
        {(user?.role === "admin" || user?.role === "staff") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t("announcements.add")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("announcements.add")}</DialogTitle>
                <DialogDescription>
                  {t("announcements.createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="title">{t("announcements.title")}</label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        title: e.target.value,
                      })
                    }
                    placeholder={t("announcements.titlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="content">{t("announcements.content")}</label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        content: e.target.value,
                      })
                    }
                    placeholder={t("announcements.contentPlaceholder")}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="publish_date">{t("announcements.date")}</label>
                  <Input
                    id="publish_date"
                    type="date"
                    value={newAnnouncement.publish_date}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        publish_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    id="important"
                    type="checkbox"
                    className="w-4 h-4"
                    checked={newAnnouncement.important}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        important: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="important" className="text-sm">
                    {t("announcements.markImportant")}
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddAnnouncement}>
                  {t("announcements.add")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("announcements.calendar")}</CardTitle>
              <div className="flex items-center">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="mx-2 w-28 text-center">
                  {format(currentDate, "MMMM yyyy")}
                </div>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-xs font-medium py-1">
                  {t(`days.${day}`)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {currentMonthDays().map((date, i) => {
                if (!date) {
                  // ช่องว่าง
                  return <div key={i} />;
                }
                const isSelected =
                  selectedDate && isSameDay(date, selectedDate);
                const hasAnnouncement = hasAnnouncementOnDate(date);
                return (
                  <Button
                    key={i}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-12 p-0 ${hasAnnouncement ? "border-primary" : ""}`}
                    onClick={() => {
                      setSelectedDate(date);
                      setNewAnnouncement((prev) => ({
                        ...prev,
                        publish_date: format(date, "yyyy-MM-dd"),
                      }));
                    }}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {date.getDate()}
                      {hasAnnouncement && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"></div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Announcements for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("announcements.forDate", {
                date: selectedDate ? format(selectedDate, "MMMM d, yyyy") : t("announcements.today")
              })}
              {selectedDate
                ? " " + selectedDate.getDate()
                : " " + t("announcements.today")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate &&
              getAnnouncementsForDate(selectedDate).length > 0 ? (
              <div className="space-y-4">
                {getAnnouncementsForDate(selectedDate).map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            {announcement.title}
                          </CardTitle>
                          {announcement.important && (
                            <Badge variant="destructive" className="mt-1">
                              {t("announcements.important")}
                            </Badge>
                          )}
                        </div>
                        {(user?.role === "admin" || user?.role === "staff") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  toast({
                                    title: t("announcements.edit"),
                                    description: t("announcements.edit"),
                                  });
                                }}
                              >
                                {t("announcements.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleDeleteAnnouncement(announcement.id)
                                }
                              >
                                {t("announcements.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-3 text-muted-foreground" />
                <p>{t("announcements.noForDate")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Announcements */}
      <h2 className="text-xl font-semibold mt-8 mb-4">
        {t("announcements.recent")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {announcements.length > 0 ? (
          announcements
            .sort(
              (a, b) =>
                new Date(b.publish_date).getTime() -
                new Date(a.publish_date).getTime()
            )
            .slice(0, 6)
            .map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">
                      {announcement.title}
                    </CardTitle>
                    {(user?.role === "admin" || user?.role === "staff") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDeleteAnnouncement(announcement.id)
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {format(parseISO(announcement.publish_date), "MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2">{announcement.content}</p>
                </CardContent>
                <CardFooter>
                  {announcement.important && (
                    <Badge variant="destructive">
                      {t("announcements.important")}
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            ))
        ) : (
          <div className="col-span-3 text-center py-10 text-muted-foreground">
            <p>{t("announcements.noAvailable")}</p>
          </div>
        )}
      </div>
    </div>
  );
}