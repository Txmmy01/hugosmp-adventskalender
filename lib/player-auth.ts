import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const cookieName = "hugosmp_player";
const sessionDuration = 60 * 60 * 24 * 14;

function getSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function createPlayerSession(playerId: string) {
  const token = await new SignJWT({ role: "player", playerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionDuration}s`)
    .sign(getSecret());
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDuration
  });
}

export async function clearPlayerSession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getPlayerSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "player" || typeof payload.playerId !== "string") return null;
    return { playerId: payload.playerId };
  } catch {
    return null;
  }
}