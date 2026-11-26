import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const openings = await prisma.doorOpening.findMany({
    orderBy: { openedAt: "desc" },
    include: {
      player: { select: { minecraftName: true } },
      gift: { select: { day: true, title: true, reward: true } }
    }
  });

  return NextResponse.json(openings.map(opening => ({
    id: opening.id,
    minecraftName: opening.player.minecraftName,
    day: opening.gift.day,
    title: opening.gift.title,
    reward: opening.gift.reward,
    openedAt: opening.openedAt
  })));
}
