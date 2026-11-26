import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerSession } from "@/lib/player-auth";

export async function GET() {
  const session = await getPlayerSession();
  if (!session) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });

  const player = await prisma.player.findUnique({ where: { id: session.playerId }, select: { isApproved: true, isActive: true } });
  if (!player?.isApproved || !player.isActive) return NextResponse.json({ error: "Zugang nicht freigegeben." }, { status: 403 });

  const gifts = await prisma.gift.findMany({
    where: { isPublished: true },
    orderBy: { day: "asc" },
    select: { id: true, day: true, title: true, description: true, availableAt: true }
  });
  const openings = await prisma.doorOpening.findMany({
    where: { playerId: session.playerId },
    select: { giftId: true }
  });
  const opened = new Set(openings.map(entry => entry.giftId));
  const now = new Date();

  return NextResponse.json(gifts.map(gift => ({
    ...gift,
    isAvailable: gift.availableAt <= now,
    isOpened: opened.has(gift.id)
  })));
}

export async function POST(request: Request) {
  const session = await getPlayerSession();
  if (!session) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const day = Number(body?.day);
  if (!Number.isInteger(day) || day < 1 || day > 24) return NextResponse.json({ error: "Ungültiges Türchen." }, { status: 400 });

  const player = await prisma.player.findUnique({ where: { id: session.playerId }, select: { isApproved: true, isActive: true } });
  if (!player?.isApproved || !player.isActive) return NextResponse.json({ error: "Zugang nicht freigegeben." }, { status: 403 });

  const gift = await prisma.gift.findUnique({ where: { day } });
  if (!gift || !gift.isPublished || gift.availableAt > new Date()) {
    return NextResponse.json({ error: "Dieses Geschenk ist noch verschlossen." }, { status: 403 });
  }

  await prisma.doorOpening.upsert({
    where: { playerId_giftId: { playerId: session.playerId, giftId: gift.id } },
    create: { playerId: session.playerId, giftId: gift.id },
    update: {}
  });

  return NextResponse.json({
    day: gift.day,
    title: gift.title,
    description: gift.description,
    reward: gift.reward
  });
}