import { useUser } from "@/hooks/use-user";
import { useEvents } from "@/hooks/use-events";
import TimelineView from "@/components/timeline/TimelineView";
import EventCard from "@/components/events/EventCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const { user } = useUser();
  const { events, isLoading } = useEvents();

  const upcomingEvents = events?.filter(e => new Date(e.date) > new Date()) || [];

  return (
    <div className="space-y-8">
      <section className="grid gap-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{user?.roles?.length || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{upcomingEvents.length}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h3 className="text-2xl font-semibold mb-4">Your Timeline</h3>
        <TimelineView userId={user!.id} />
      </section>

      <section>
        <h3 className="text-2xl font-semibold mb-4">Upcoming Events</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.slice(0, 3).map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
