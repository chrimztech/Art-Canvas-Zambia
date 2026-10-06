import { CalendarPlus } from "lucide-react";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AddToCalendar({
  event,
  size = "sm",
}: {
  event: CalendarEvent;
  size?: "sm" | "default";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <CalendarPlus className="h-4 w-4" /> Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer noopener">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcs({ ...event, url: window.location.href })}>
          Apple / Outlook (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
