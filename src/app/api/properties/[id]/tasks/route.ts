import { NextResponse } from "next/server";
import { jsonError, parseId } from "@/lib/api-response";
import { createPropertyTask, loadPropertyTasks } from "@/lib/properties";

export const dynamic = "force-dynamic";

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  try {
    const tasks = await loadPropertyTasks(id);
    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonError(error, "Could not load tasks from ZapTask.");
  }
}

interface CreateTaskBody {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  category?: unknown;
  due_date?: unknown;
  assigned_to?: unknown;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  let body: CreateTaskBody;
  try {
    body = (await request.json()) as CreateTaskBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 2 || title.length > 255) {
    return NextResponse.json({ error: "Title must be between 2 and 255 characters." }, { status: 422 });
  }

  const priority = typeof body.priority === "string" && PRIORITIES.has(body.priority) ? body.priority : "normal";
  const dueDate = typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date) ? body.due_date : undefined;
  const optionalString = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

  try {
    const task = await createPropertyTask(id, {
      title,
      description: optionalString(body.description, 5000),
      priority,
      category: optionalString(body.category, 50),
      due_date: dueDate,
      assigned_to: optionalString(body.assigned_to, 255),
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Could not create the task in ZapTask.");
  }
}
