import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, insertNoteSchema } from "@shared/schema";

const BOARD_PIN = process.env.BOARD_PIN || "2026";

export function registerRoutes(httpServer: Server, app: Express) {
  app.post("/api/auth", (req, res) => {
    const pin = String(req.body?.pin ?? "");
    if (pin === BOARD_PIN) return res.json({ ok: true });
    res.status(401).json({ error: "Невірний PIN" });
  });

  // All other /api routes require the PIN header
  app.use("/api", (req, res, next) => {
    if (req.path === "/auth") return next();
    if (req.headers["x-board-pin"] === BOARD_PIN) return next();
    res.status(401).json({ error: "Потрібна авторизація" });
  });

  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const task = await storage.updateTask(id, parsed.data);
    if (!task) return res.status(404).json({ error: "Задачу не знайдено" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await storage.deleteTask(Number(req.params.id));
    res.status(204).end();
  });

  app.get("/api/tasks/:id/notes", async (req, res) => {
    const notes = await storage.getNotes(Number(req.params.id));
    res.json(notes);
  });

  app.post("/api/tasks/:id/notes", async (req, res) => {
    const parsed = insertNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const note = await storage.createNote(
      Number(req.params.id),
      parsed.data.author,
      parsed.data.text
    );
    res.status(201).json(note);
  });
}
