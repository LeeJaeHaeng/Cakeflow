import { jwtVerify, SignJWT } from "jose";
import { getJwtSecret } from "@/lib/auth/jwt-secret";

const SECRET = getJwtSecret();

export interface CustomerSession {
  phone: string;
  type: "customer";
}

export async function createCustomerSession(phone: string) {
  return new SignJWT({ phone, type: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyCustomerSession(token: string | undefined, expectedPhone: string) {
  if (!token) throw new Error("CUSTOMER_AUTH_REQUIRED");

  const { payload } = await jwtVerify(token, SECRET);
  const session = payload as unknown as CustomerSession;
  if (session.type !== "customer" || session.phone !== expectedPhone) {
    throw new Error("CUSTOMER_AUTH_INVALID");
  }

  return session;
}
