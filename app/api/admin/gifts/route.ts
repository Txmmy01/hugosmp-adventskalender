import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const giftSchema = z.object({
  day: z.number().int().min(1).max(24),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(2000),
  reward: z.string().trim().min(1).max(500),
  availableAt: z.string().datetime(),
  isPublished: z.boolean()
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const gifts = await prisma.gift.findMany({
    orderBy: { day: "asc" }
  });

  return NextResponse.json(gifts);
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const parsed = giftSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte prüfe die Angaben für dieses Türchen." }, { status: 400 });
  }

  const gift = await prisma.gift.upsert({
    where: { day: parsed.data.day },
    create: {
      ...parsed.data,
      availableAt: new Date(parsed.data.availableAt)
    },
    update: {
      title: parsed.data.title,
      description: parsed.data.description,
      reward: parsed.data.reward,
      availableAt: new Date(parsed.data.availableAt),
      isPublished: parsed.data.isPublished
    }
  });

  return NextResponse.json(gift);
}