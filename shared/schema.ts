import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const BLOCKS = ["allazs", "soda", "other"] as const;
export const ASSIGNEES = ["Стас", "Олег", "Рома", "Саша", "Давід", "Вова"] as const;
export const STATUSES = ["active", "done"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  block: text("block", { enum: BLOCKS }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assignee: text("assignee").notNull(),
  status: text("status", { enum: STATUSES }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  dueDate: text("due_date"),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTaskSchema = z.object({
  block: z.enum(BLOCKS),
  title: z.string().min(1),
  description: z.string().optional().transform((v) => v ?? ""),
  assignee: z.enum(ASSIGNEES),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee: z.enum(ASSIGNEES).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().nullable().optional(),
});

export const insertNoteSchema = z.object({
  author: z.enum(ASSIGNEES),
  text: z.string().min(1),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
