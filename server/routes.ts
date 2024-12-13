import { type Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { 
  events, roles, userRoles, interactions, 
  eventParticipants, insertEventSchema,
  insertRoleSchema, insertInteractionSchema
} from "@db/schema";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Routes
  app.get("/api/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const members = await db.query.users.findMany({
      with: {
        roles: {
          with: {
            role: true
          }
        }
      }
    });
    res.json(members);
  });

  // Roles
  app.get("/api/roles", async (req, res) => {
    const allRoles = await db.query.roles.findMany();
    res.json(allRoles);
  });

  app.post("/api/roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const result = insertRoleSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.message);
    }

    const newRole = await db.insert(roles).values(result.data).returning();
    res.json(newRole[0]);
  });

  // Events
  app.get("/api/events", async (req, res) => {
    const allEvents = await db.query.events.findMany({
      orderBy: desc(events.date),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
        approver: {
          columns: {
            id: true,
            name: true,
          },
        },
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.json(allEvents);
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const result = insertEventSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.message);
    }

    const newEvent = await db.insert(events)
      .values({ ...result.data, createdBy: req.user!.id })
      .returning();
    res.json(newEvent[0]);
  });

  app.post("/api/events/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const eventId = parseInt(req.params.id);
    const [event] = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) return res.status(404).send("Event not found");
    if (event.createdBy === req.user!.id) {
      return res.status(400).send("Cannot approve own event");
    }

    const [updatedEvent] = await db.update(events)
      .set({ 
        status: "approved",
        approvedBy: req.user!.id 
      })
      .where(eq(events.id, eventId))
      .returning();

    res.json(updatedEvent);
  });

  // Interactions
  app.get("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const userInteractions = await db.query.interactions.findMany({
      where: eq(interactions.userId, req.user!.id),
      orderBy: desc(interactions.date),
    });
    res.json(userInteractions);
  });

  app.post("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const result = insertInteractionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.message);
    }

    const newInteraction = await db.insert(interactions)
      .values({ ...result.data, userId: req.user!.id })
      .returning();
    res.json(newInteraction[0]);
  });

  // User Roles
  app.post("/api/users/:id/roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const { roleId, startDate, endDate } = req.body;
    const userId = parseInt(req.params.id);

    const newUserRole = await db.insert(userRoles)
      .values({ userId, roleId, startDate, endDate })
      .returning();
    res.json(newUserRole[0]);
  });

  // Event Participation
  app.post("/api/events/:id/participate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const eventId = parseInt(req.params.id);
    const [existing] = await db.select()
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, req.user!.id)
      ))
      .limit(1);

    if (existing) {
      return res.status(400).send("Already registered");
    }

    const newParticipant = await db.insert(eventParticipants)
      .values({
        eventId,
        userId: req.user!.id,
        status: "registered"
      })
      .returning();
    res.json(newParticipant[0]);
  });
  return app;
}