import { useQuery } from "@tanstack/react-query";
import type { User } from "@db/schema";

interface ExtendedUser extends User {
  roles?: { name: string }[];
}

export function useMembers() {
  const { data: members, isLoading, error } = useQuery<ExtendedUser[]>({
    queryKey: ["/api/members"],
  });

  return {
    members,
    isLoading,
    error,
  };
}
