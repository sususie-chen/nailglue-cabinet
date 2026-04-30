import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload } from "./types";

const algorithm = "HS256";

function getKey() {
  // Use DATABASE_URL as the secret key so it's stable across deployments
  const url = process.env.DATABASE_URL || "local-dev-secret-key-fallback";
  return new TextEncoder().encode(url.slice(0, 32).padEnd(32, "0"));
}

export async function signSessionToken(userId: number): Promise<string> {
  return new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getKey());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      clockTolerance: 60,
    });
    return payload as unknown as { userId: number };
  } catch {
    return null;
  }
}
