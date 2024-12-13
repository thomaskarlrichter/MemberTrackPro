import { useQuery } from "@tanstack/react-query";
import type { Role } from "@db/schema";

interface UserRole {
  id: number;
  roleId: number;
  userId: number;
  startDate: string;
  endDate: string | null;
  role: Role;
}

export function useRoles(userId?: number) {
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: userRoles } = useQuery<UserRole[]>({
    queryKey: [`/api/users/${userId}/roles`],
    enabled: !!userId,
  });

  return {
    roles,
    userRoles,
  };
}
