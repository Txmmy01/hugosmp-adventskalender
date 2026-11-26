import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash || !password || password.length > 200) {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
  }

  const valid = await compare(password, passwordHash);

  if (!valid) {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ success: true });
}