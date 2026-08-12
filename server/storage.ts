import { tasks, notes } from '@shared/schema';
import type { Task, InsertTask, UpdateTask, Note } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    assignee TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, patch: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  getNotes(taskId: number): Promise<Note[]>;
  createNote(taskId: number, author: string, text: string): Promise<Note>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
  }

  async getTask(id: number): Promise<Task | undefined> {
    return db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  async createTask(task: InsertTask): Promise<Task> {
    return db
      .insert(tasks)
      .values({ ...task, status: "active", createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  async updateTask(id: number, patch: UpdateTask): Promise<Task | undefined> {
    const existing = await this.getTask(id);
    if (!existing) return undefined;
    const values: Partial<Task> = { ...patch };
    if (patch.status && patch.status !== existing.status) {
      values.completedAt = patch.status === "done" ? new Date().toISOString() : null;
    }
    return db.update(tasks).set(values).where(eq(tasks.id, id)).returning().get();
  }

  async deleteTask(id: number): Promise<void> {
    db.delete(notes).where(eq(notes.taskId, id)).run();
    db.delete(tasks).where(eq(tasks.id, id)).run();
  }

  async getNotes(taskId: number): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.taskId, taskId)).orderBy(notes.createdAt).all();
  }

  async createNote(taskId: number, author: string, text: string): Promise<Note> {
    return db
      .insert(notes)
      .values({ taskId, author, text, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }
}

export const storage = new DatabaseStorage();
