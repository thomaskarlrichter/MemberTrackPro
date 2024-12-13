import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, Users } from "lucide-react";
import type { Event } from "@db/schema";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EventCardProps {
  event: Event & {
    creator?: { name: string };
    participants?: { userId: number; status: string }[];
  };
  showActions?: boolean;
}

export default function EventCard({ event, showActions = true }: EventCardProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const participateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${event.id}/participate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "You have registered for this event",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${event.id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event has been approved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isParticipating = event.participants?.some(
    (p) => p.userId === user?.id
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{event.title}</span>
          {event.status === "pending" && (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Pending Approval
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{event.description}</p>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(event.date), "PPP")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          <span>Created by {event.creator?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          <span>{event.participants?.length || 0} participants</span>
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="flex justify-end gap-2">
          {event.status === "pending" &&
            user?.id !== event.createdBy && (
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                Approve Event
              </Button>
            )}
          {event.status === "approved" && !isParticipating && (
            <Button
              onClick={() => participateMutation.mutate()}
              disabled={participateMutation.isPending}
            >
              Register
            </Button>
          )}
          {isParticipating && (
            <Button variant="secondary" disabled>
              Registered
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
