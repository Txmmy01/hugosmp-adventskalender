import { NextResponse } from "next/server";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/admin-auth";

export async function POST() {
  if (await isAdminAuthenticated()) {
    await clearAdminSession();
  }

  return NextResponse.json({ success: true });
}