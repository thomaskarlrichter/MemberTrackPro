import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
import { db } from "../db";
import { eq, or } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "member-portal-secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to true in production
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Custom LNURL authentication function
  async function authenticateLightningUser(linkingKey: string): Promise<SelectUser | null> {
    try {
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.lnurlKey, linkingKey))
        .limit(1);

      if (!user) {
        // Create new user if none exists
        [user] = await db
          .insert(users)
          .values({
            username: `lightning_${linkingKey.slice(0, 8)}`,
            lnurlKey: linkingKey,
            name: `Lightning User ${linkingKey.slice(0, 8)}`,
            email: `${linkingKey.slice(0, 8)}@lightning.user`,
            password: await crypto.hash(randomBytes(32).toString('hex')),
          })
          .returning();
      }

      return user;
    } catch (err) {
      console.error('Lightning authentication error:', err);
      return null;
    }
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password, name, email } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          name,
          email,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username, name: newUser.name },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username, name: user.name },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  // LNURL Auth Routes
  const lnurlSessions = new Map();

  app.get("/api/auth/lnurl", (req, res) => {
    const k1 = randomBytes(32).toString('hex');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/auth/lnurl/callback`;
    
    // Store session for verification
    lnurlSessions.set(k1, {
      timestamp: Date.now(),
      authenticated: false
    });

    const lnurlAuthUrl = `lightning:${callbackUrl}?tag=login&k1=${k1}&action=login`;
    
    res.json({ k1, lnurlAuthUrl });
  });

  app.get("/api/auth/lnurl/status/:k1", (req, res) => {
    const session = lnurlSessions.get(req.params.k1);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Clean up old session if authenticated
    if (session.authenticated) {
      lnurlSessions.delete(req.params.k1);
    }
    
    res.json({ authenticated: session.authenticated });
  });

  app.get("/api/auth/lnurl/callback", async (req, res) => {
    const { k1, sig, key } = req.query;
    
    if (!k1 || !sig || !key) {
      return res.status(400).json({ status: "ERROR", reason: "Missing parameters" });
    }

    const session = lnurlSessions.get(k1);
    if (!session) {
      return res.status(404).json({ status: "ERROR", reason: "Session not found" });
    }

    try {
      const user = await authenticateLightningUser(key as string);
      if (!user) {
        return res.status(400).json({ status: "ERROR", reason: "Authentication failed" });
      }

      // Log the user in
      await new Promise((resolve, reject) => {
        req.login(user, (err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      session.authenticated = true;
      res.json({ status: "OK" });
    } catch (error) {
      console.error('LNURL callback error:', error);
      res.status(500).json({ status: "ERROR", reason: "Internal server error" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}
