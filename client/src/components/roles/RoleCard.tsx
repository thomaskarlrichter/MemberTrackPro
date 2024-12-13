import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@db/schema";

interface RoleCardProps {
  role: Role & {
    users?: { name: string }[];
  };
}

export default function RoleCard({ role }: RoleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{role.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{role.description}</p>
        <div>
          <h4 className="text-sm font-semibold mb-2">Members with this role:</h4>
          <div className="flex flex-wrap gap-2">
            {role.users?.map((user, index) => (
              <Badge key={index} variant="outline">
                {user.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
