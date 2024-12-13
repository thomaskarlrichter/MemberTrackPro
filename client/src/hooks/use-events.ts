import { useQuery } from "@tanstack/react-query";
import type { Event } from "@db/schema";

interface ExtendedEvent extends Event {
  creator?: { name: string };
  approver?: { name: string };
  participants?: { userId: number; status: string }[];
}

export function useEvents() {
  const { data: events, isLoading, error } = useQuery<ExtendedEvent[]>({
    queryKey: ["/api/events"],
  });

  return {
    events,
    isLoading,
    error,
  };
}
