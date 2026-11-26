import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPlayerSession } from "@/lib/player-auth";

const schema = z.object({
  minecraftName: z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/),
  password: z.string().min(1).max(200)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name oder Passwort ist falsch." }, { status: 401 });

  const player = await prisma.player.findUnique({
    where: { minecraftName: parsed.data.minecraftName },
    select: { id: true, passwordHash: true, isApproved: true, isActive: true }
  });

  if (!player || !player.isApproved || !player.isActive) {
    return NextResponse.json({ error: "Dein Zugang ist noch nicht freigegeben." }, { status: 403 });
  }

  const valid = await compare(parsed.data.password, player.passwordHash);
  if (!valid) return NextResponse.json({ error: "Name oder Passwort ist falsch." }, { status: 401 });

  await createPlayerSession(player.id);
  return NextResponse.json({ success: true });
}