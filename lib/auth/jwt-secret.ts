export function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("ADMIN_JWT_SECRET is required in production.");
  }

  return new TextEncoder().encode(secret ?? "dev-secret-change-in-prod");
}
