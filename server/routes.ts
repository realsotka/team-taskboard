import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, insertNoteSchema } from "@shared/schema";

export function registerRoutes(httpServer: Server, app: Express) {
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
