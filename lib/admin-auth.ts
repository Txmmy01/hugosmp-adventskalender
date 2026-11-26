import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const cookieName = "hugosmp_admin";
const sessionDuration = 60 * 60 * 12;

function getSecret() {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }

  return new TextEncoder().encode(value);
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionDuration}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionDuration
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;

  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}