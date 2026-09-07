import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, setBoardPin } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Check,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  Fuel,
  Sparkles,
  Layers,
  MessageSquare,
  Send,
  LogOut,
  Lock,
} from "lucide-react";
import { ASSIGNEES, BLOCKS, type Task, type Note } from "@shared/schema";

// ---------- constants ----------

const BLOCK_META: Record<
  string,
  { label: string; icon: typeof Fuel; dot: string }
> = {
  allazs: { label: "AllAzs", icon: Fuel, dot: "bg-[hsl(263,84%,68%)]" },
  soda: { label: "Soda Cleaning", icon: Sparkles, dot: "bg-[hsl(290,70%,65%)]" },
  other: { label: "Інше", icon: Layers, dot: "bg-[hsl(173,58%,55%)]" },
};

const ASSIGNEE_COLORS: Record<string, string> = {
  Стас: "hsl(263 84% 68%)",
  Олег: "hsl(199 89% 58%)",
  Рома: "hsl(160 70% 45%)",
  Саша: "hsl(38 92% 58%)",
  Давід: "hsl(340 75% 62%)",
  Вова: "hsl(20 85% 60%)",
};

type Filter = "all" | "active" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Всі" },
  { value: "active", label: "В роботі" },
  { value: "done", label: "Виконано" },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ---------- small pieces ----------

function AssigneeAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const color = ASSIGNEE_COLORS[name] ?? "hsl(258 22% 40%)";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: color,
      }}
      data-testid={`avatar-${name}`}
    >
      {name[0]}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-[hsl(160,70%,45%)]/40 text-[hsl(160,70%,60%)]"
        data-testid="badge-status-done"
      >
        <CheckCircle2 className="h-3 w-3" />
        Виконано
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-primary/40 text-primary"
      data-testid="badge-status-active"
    >
      <Clock className="h-3 w-3" />
      В роботі
    </Badge>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8 text-primary"
      fill="none"
      aria-label="Логотип дошки задач"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M10 16.5 L14.5 21 L22 11.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- create task dialog ----------

const createSchema = z.object({
  block: z.enum(BLOCKS),
  title: z.string().min(1, "Вкажіть заголовок задачі"),
  description: z.string(),
  assignee: z.enum(ASSIGNEES),
});

type CreateValues = z.infer<typeof createSchema>;

function CreateTaskDialog({
  open,
  block,
  currentUser,
  onClose,
}: {
  open: boolean;
  block: string;
  currentUser: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const defaultAssignee = (ASSIGNEES as readonly string[]).includes(currentUser)
    ? (currentUser as CreateValues["assignee"])
    : "Стас";
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      block: block as CreateValues["block"],
      title: "",
      description: "",
      assignee: defaultAssignee,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) =>
      apiRequest("POST", "/api/tasks", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Задачу додано" });
      form.reset({
        block: block as CreateValues["block"],
        title: "",
        description: "",
        assignee: defaultAssignee,
      });
      onClose();
    },
    onError: () =>
      toast({ title: "Не вдалося додати задачу", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Нова задача</DialogTitle>
          <DialogDescription>
            Блок: {BLOCK_META[block]?.label ?? block}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              createMutation.mutate({ ...v, block: block as CreateValues["block"] })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заголовок</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Що потрібно зробити?"
                      autoFocus
                      data-testid="input-task-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Опис (необовʼязково)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Деталі, контекст, посилання…"
                      rows={3}
                      data-testid="input-task-description"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Відповідальний</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="Оберіть відповідального" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNEES.map((a) => (
                        <SelectItem key={a} value={a}>
                          <span className="flex items-center gap-2">
                            <AssigneeAvatar name={a} size={18} />
                            {a}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
              data-testid="button-create-task"
            >
              <Plus className="mr-1 h-4 w-4" />
              Додати задачу
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- task detail dialog ----------

function TaskDetailDialog({
  task,
  currentUser,
  onClose,
}: {
  task: Task | null;
  currentUser: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState<string>("");

  const taskId = task?.id;

  const { data: taskNotes, isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/tasks", String(taskId), "notes"],
    enabled: taskId != null,
  });

  const patchMutation = useMutation({
    mutationFn: async (patch: Record<string, string>) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () =>
      toast({ title: "Не вдалося оновити задачу", variant: "destructive" }),
  });

  const noteMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/tasks/${taskId}/notes`, {
        author: noteAuthor || currentUser,
        text: noteText.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", String(taskId), "notes"],
      });
      setNoteText("");
    },
    onError: () =>
      toast({ title: "Не вдалося додати нотатку", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Задачу видалено" });
      onClose();
    },
  });

  if (!task) return null;

  const meta = BLOCK_META[task.block];

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <span className={`h-2 w-2 rounded-full ${meta?.dot ?? ""}`} />
              {meta?.label ?? task.block}
            </Badge>
            <StatusBadge status={task.status} />
          </div>
          <DialogTitle
            className={`font-display text-xl leading-snug ${
              task.status === "done" ? "text-muted-foreground line-through" : ""
            }`}
            data-testid={`text-detail-title-${task.id}`}
          >
            {task.title}
          </DialogTitle>
          {task.description ? (
            <DialogDescription className="whitespace-pre-wrap text-left">
              {task.description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-card-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Додано</p>
            <p className="mt-1 font-mono text-xs" data-testid="text-created-at">
              {formatDate(task.createdAt)}
            </p>
          </div>
          <div className="rounded-md border border-card-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Виконано</p>
            <p className="mt-1 font-mono text-xs" data-testid="text-completed-at">
              {formatDate(task.completedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Відповідальний
            </p>
            <Select
              value={task.assignee}
              onValueChange={(v) => patchMutation.mutate({ assignee: v })}
            >
              <SelectTrigger data-testid="select-detail-assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNEES.map((a) => (
                  <SelectItem key={a} value={a}>
                    <span className="flex items-center gap-2">
                      <AssigneeAvatar name={a} size={18} />
                      {a}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {task.status === "active" ? (
            <Button
              onClick={() => patchMutation.mutate({ status: "done" })}
              disabled={patchMutation.isPending}
              data-testid="button-mark-done"
            >
              <Check className="mr-1 h-4 w-4" />
              Виконано
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => patchMutation.mutate({ status: "active" })}
              disabled={patchMutation.isPending}
              data-testid="button-reopen"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              В роботу
            </Button>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Прогрес і нотатки
            {taskNotes && taskNotes.length > 0 ? (
              <span className="text-xs font-normal text-muted-foreground">
                ({taskNotes.length})
              </span>
            ) : null}
          </h3>

          <div className="mt-3 space-y-3">
            {notesLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : taskNotes && taskNotes.length > 0 ? (
              taskNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border border-card-border bg-muted/30 p-3"
                  data-testid={`note-${n.id}`}
                >
                  <div className="flex items-center gap-2">
                    <AssigneeAvatar name={n.author} size={18} />
                    <span className="text-xs font-medium">{n.author}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{n.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Нотаток поки немає — зафіксуйте перший крок.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Select
                value={noteAuthor || currentUser}
                onValueChange={setNoteAuthor}
              >
                <SelectTrigger className="w-32" data-testid="select-note-author">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Нотатка про прогрес…"
                rows={1}
                className="min-h-9 flex-1 resize-none"
                data-testid="input-note-text"
              />
              <Button
                size="icon"
                onClick={() => noteMutation.mutate()}
                disabled={!noteText.trim() || noteMutation.isPending}
                data-testid="button-add-note"
                aria-label="Додати нотатку"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="self-start text-destructive hover:text-destructive"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid="button-delete-task"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Видалити задачу
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ---------- task card ----------

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const done = task.status === "done";
  return (
    <button
      onClick={onOpen}
      className="hover-elevate active-elevate-2 w-full rounded-lg border border-card-border bg-card p-4 text-left transition-colors"
      data-testid={`card-task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-medium leading-snug ${
            done ? "text-muted-foreground line-through" : ""
          }`}
          data-testid={`text-task-title-${task.id}`}
        >
          {task.title}
        </p>
        {done ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(160,70%,55%)]" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-primary/70" />
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <AssigneeAvatar name={task.assignee} size={22} />
        <span className="text-xs text-muted-foreground" data-testid={`text-task-assignee-${task.id}`}>
          {task.assignee}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
          {formatDate(done ? task.completedAt : task.createdAt)}
        </span>
      </div>
    </button>
  );
}

// ---------- login ----------

function LoginScreen({
  onSuccess,
}: {
  onSuccess: (user: string, pin: string) => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name || !pin) return;
    setPending(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth", { pin });
      onSuccess(name, pin);
    } catch {
      setError("Невірний PIN. Спробуйте ще раз.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="font-display mt-3 text-xl font-bold">Дошка задач</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            AllAzs · Soda Cleaning · Інше
          </p>
        </div>

        <p className="mt-6 mb-2 text-xs font-medium text-muted-foreground">
          Хто ви?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ASSIGNEES.map((a) => (
            <button
              key={a}
              onClick={() => setName(a)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors ${
                name === a
                  ? "border-primary bg-accent"
                  : "border-border bg-muted/30 hover:border-primary/40"
              }`}
              data-testid={`login-user-${a}`}
            >
              <AssigneeAvatar name={a} size={28} />
              <span className="text-xs">{a}</span>
            </button>
          ))}
        </div>

        <p className="mt-5 mb-2 text-xs font-medium text-muted-foreground">
          PIN-код команди
        </p>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••"
            className="pl-9 tracking-[0.3em]"
            data-testid="input-pin"
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-destructive" data-testid="text-pin-error">
            {error}
          </p>
        )}

        <Button
          className="mt-4 w-full"
          onClick={submit}
          disabled={!name || !pin || pending}
          data-testid="button-login"
        >
          Увійти
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Доступ лише для команди
        </p>
      </div>
    </div>
  );
}

// ---------- board ----------

export default function Board() {
  const [user, setUser] = useState<string | null>(null);

  if (!user) {
    return (
      <LoginScreen
        onSuccess={(name, pin) => {
          setBoardPin(pin);
          setUser(name);
        }}
      />
    );
  }

  return (
    <BoardContent
      user={user}
      onLogout={() => {
        setBoardPin("");
        queryClient.clear();
        setUser(null);
      }}
    />
  );
}

function BoardContent({
  user,
  onLogout,
}: {
  user: string;
  onLogout: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [createBlock, setCreateBlock] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<number | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 15000,
  });

  const openedTask = tasks?.find((t) => t.id === openedId) ?? null;

  const visible = (block: string) =>
    (tasks ?? []).filter(
      (t) => t.block === block && (filter === "all" || t.status === filter)
    );

  const counts = {
    all: tasks?.length ?? 0,
    active: tasks?.filter((t) => t.status === "active").length ?? 0,
    done: tasks?.filter((t) => t.status === "done").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">
                Дошка задач
              </h1>
              <p className="text-xs text-muted-foreground">
                AllAzs · Soda Cleaning · Інше
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
                <span className="ml-1.5 opacity-70">{counts[f.value]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1 pr-2.5">
              <AssigneeAvatar name={user} size={20} />
              <span className="text-xs" data-testid="text-current-user">
                {user}
              </span>
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              aria-label="Вийти"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(BLOCK_META).map(([key, meta]) => {
            const list = visible(key);
            const Icon = meta.icon;
            return (
              <section
                key={key}
                className="rounded-xl border border-border bg-sidebar p-4"
                data-testid={`column-${key}`}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-display text-base font-bold">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {list.length}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => setCreateBlock(key)}
                    data-testid={`button-add-${key}`}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Задача
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </>
                  ) : list.length > 0 ? (
                    list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onOpen={() => setOpenedId(t.id)}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        {filter === "done"
                          ? "Виконаних задач немає"
                          : "Задач поки немає"}
                      </p>
                      {filter !== "done" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-primary"
                          onClick={() => setCreateBlock(key)}
                          data-testid={`button-add-empty-${key}`}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Додати першу задачу
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {createBlock && (
        <CreateTaskDialog
          open={!!createBlock}
          block={createBlock}
          currentUser={user}
          onClose={() => setCreateBlock(null)}
        />
      )}
      <TaskDetailDialog
        task={openedTask}
        currentUser={user}
        onClose={() => setOpenedId(null)}
      />
    </div>
  );
}
