import { useUser } from "@/hooks/use-user";
import { useRoles } from "@/hooks/use-roles";
import TimelineView from "@/components/timeline/TimelineView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const { userRoles } = useRoles(user!.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">
                {user?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Roles</h3>
            <div className="flex flex-wrap gap-2">
              {userRoles?.map((userRole) => (
                <Badge key={userRole.id} variant="secondary">
                  {userRole.role.name}
                </Badge>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineView userId={user!.id} />
        </CardContent>
      </Card>
    </div>
  );
}
