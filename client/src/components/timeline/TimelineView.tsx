import { useMemo } from "react";
import { useEvents } from "@/hooks/use-events";
import { useRoles } from "@/hooks/use-roles";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Star } from "lucide-react";

interface TimelineProps {
  userId: number;
}

export default function TimelineView({ userId }: TimelineProps) {
  const { events } = useEvents();
  const { userRoles } = useRoles(userId);
  
  const timelineItems = useMemo(() => {
    const items = [];
    
    // Add events
    events?.forEach(event => {
      if (event.participants?.some(p => p.userId === userId)) {
        items.push({
          type: 'event',
          date: new Date(event.date),
          data: event
        });
      }
    });

    // Add role changes
    userRoles?.forEach(role => {
      items.push({
        type: 'role',
        date: new Date(role.startDate),
        data: role
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events, userRoles, userId]);

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList>
        <TabsTrigger value="all">All Activities</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-6">
        <div className="space-y-4">
          {timelineItems.map((item, idx) => (
            <TimelineItem key={idx} item={item} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="events" className="mt-6">
        <div className="space-y-4">
          {timelineItems
            .filter(item => item.type === 'event')
            .map((item, idx) => (
              <TimelineItem key={idx} item={item} />
            ))}
        </div>
      </TabsContent>

      <TabsContent value="roles" className="mt-6">
        <div className="space-y-4">
          {timelineItems
            .filter(item => item.type === 'role')
            .map((item, idx) => (
              <TimelineItem key={idx} item={item} />
            ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function TimelineItem({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        {item.type === 'event' ? (
          <Calendar className="h-5 w-5 text-primary" />
        ) : item.type === 'role' ? (
          <Star className="h-5 w-5 text-primary" />
        ) : (
          <Users className="h-5 w-5 text-primary" />
        )}
        
        <div>
          <p className="font-medium">
            {item.type === 'event' ? item.data.title : item.data.role.name}
          </p>
          <time className="text-sm text-muted-foreground">
            {item.date.toLocaleDateString()}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}
