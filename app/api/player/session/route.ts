import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerSession } from "@/lib/player-auth";

export async function GET() {
  const session = await getPlayerSession();
  if (!session) return NextResponse.json({ authenticated: false });

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { id: true, minecraftName: true, isApproved: true, isActive: true }
  });

  if (!player || !player.isApproved || !player.isActive) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, player: { id: player.id, minecraftName: player.minecraftName } });
}