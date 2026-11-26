import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerSession } from "@/lib/player-auth";

async function getActivePlayer(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
    select: { isApproved: true, isActive: true }
  });
}

export async function GET() {
  const session = await getPlayerSession();
  if (!session) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });

  const player = await getActivePlayer(session.playerId);
  if (!player?.isApproved || !player.isActive) {
    return NextResponse.json({ error: "Zugang nicht freigegeben." }, { status: 403 });
  }

  const [gifts, openings] = await Promise.all([
    prisma.gift.findMany({
      where: { isPublished: true },
      orderBy: { day: "asc" },
      select: { id: true, day: true, title: true, description: true, availableAt: true }
    }),
    prisma.doorOpening.findMany({
      where: { playerId: session.playerId },
      select: { giftId: true }
    })
  ]);

  const opened = new Set(openings.map(entry => entry.giftId));
  const now = new Date();

  return NextResponse.json(gifts.map(gift => {
    const isOpened = opened.has(gift.id);
    const isAvailable = gift.availableAt <= now;

    return {
      id: gift.id,
      day: gift.day,
      title: isAvailable || isOpened ? gift.title : null,
      description: isAvailable || isOpened ? gift.description : null,
      availableAt: gift.availableAt,
      isAvailable,
      isOpened
    };
  }));
}

export async function POST(request: Request) {
  const session = await getPlayerSession();
  if (!session) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const day = Number(body?.day);
  if (!Number.isInteger(day) || day < 1 || day > 24) {
    return NextResponse.json({ error: "Ungültiges Türchen." }, { status: 400 });
  }

  const player = await getActivePlayer(session.playerId);
  if (!player?.isApproved || !player.isActive) {
    return NextResponse.json({ error: "Zugang nicht freigegeben." }, { status: 403 });
  }

  const gift = await prisma.gift.findUnique({ where: { day } });
  if (!gift || !gift.isPublished || gift.availableAt > new Date()) {
    return NextResponse.json({ error: "Dieses Geschenk ist noch verschlossen." }, { status: 403 });
  }

  const opening = await prisma.doorOpening.upsert({
    where: { playerId_giftId: { playerId: session.playerId, giftId: gift.id } },
    create: { playerId: session.playerId, giftId: gift.id, openedTitle: gift.title, openedReward: gift.reward },
    update: {}
  });

  return NextResponse.json({
    day: gift.day,
    title: opening.openedTitle ?? gift.title,
    description: gift.description,
    reward: opening.openedReward ?? gift.reward
  });
}
