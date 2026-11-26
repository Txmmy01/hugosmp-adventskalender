import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const playerSchema = z.object({
  minecraftName: z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/),
  password: z.string().min(10).max(200)
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const players = await prisma.player.findMany({
    select: {
      id: true,
      minecraftName: true,
      isApproved: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { minecraftName: "asc" }
  });

  return NextResponse.json(players);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const parsed = playerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte Minecraft-Namen und ein Passwort mit mindestens 10 Zeichen eingeben." }, { status: 400 });
  }

  const minecraftName = parsed.data.minecraftName;
  const existing = await prisma.player.findUnique({ where: { minecraftName } });

  if (existing) {
    return NextResponse.json({ error: "Dieser Minecraft-Name ist bereits angelegt." }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const player = await prisma.player.create({
    data: {
      minecraftName,
      passwordHash,
      isApproved: false
    },
    select: {
      id: true,
      minecraftName: true,
      isApproved: true,
      isActive: true
    }
  });

  return NextResponse.json(player, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const isApproved = typeof body?.isApproved === "boolean" ? body.isApproved : null;
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!id || (isApproved === null && isActive === null && password === null)) {
    return NextResponse.json({ error: "Ungültige Spielerdaten." }, { status: 400 });
  }

  if (password !== null && (password.length < 10 || password.length > 200)) {
    return NextResponse.json({ error: "Das Passwort muss mindestens 10 Zeichen lang sein." }, { status: 400 });
  }

  const data: { isApproved?: boolean; isActive?: boolean; passwordHash?: string } = {};
  if (isApproved !== null) data.isApproved = isApproved;
  if (isActive !== null) data.isActive = isActive;
  if (password !== null) data.passwordHash = await hash(password, 12);

  const player = await prisma.player.update({
    where: { id },
    data,
    select: {
      id: true,
      minecraftName: true,
      isApproved: true,
      isActive: true
    }
  }).catch(() => null);

  if (!player) {
    return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(player);
}