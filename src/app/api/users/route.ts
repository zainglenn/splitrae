import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getCallerUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  return error ? null : user;
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

export async function GET(req: NextRequest) {
  const caller = await getCallerUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(caller.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await adminClient.from("profiles").select("id, role");
  const roleMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.role]));

  const result = users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    role: roleMap[u.id] ?? "user",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));

  return NextResponse.json({ users: result });
}

export async function POST(req: NextRequest) {
  const caller = await getCallerUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(caller.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password, role = "user" } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminClient.from("profiles").upsert({
    id: data.user.id,
    email: data.user.email!,
    role,
  });

  return NextResponse.json({ id: data.user.id, email: data.user.email, role });
}

// Reset password or update role
export async function PATCH(req: NextRequest) {
  const caller = await getCallerUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(caller.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  // Role update
  if (body.role !== undefined) {
    const validRoles = ["read", "write", "admin"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const { error } = await adminClient
      .from("profiles")
      .upsert({ id: userId, role: body.role }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // Password reset
  const { password } = body;
  if (!password) return NextResponse.json({ error: "password or role is required" }, { status: 400 });

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

// Delete user
export async function DELETE(req: NextRequest) {
  const caller = await getCallerUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(caller.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  // Prevent self-deletion
  if (userId === caller.id) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminClient.from("profiles").delete().eq("id", userId);

  return NextResponse.json({ success: true });
}
