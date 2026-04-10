import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "../..", "..");

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("google auth provider wiring", () => {
  it("adds the GOOGLE provider to the Prisma schema", () => {
    const schema = readRepoFile("packages/database/prisma/schema.prisma");

    expect(schema).toContain("enum AuthProvider");
    expect(schema).toContain("GOOGLE");
    expect(schema).toMatch(/googleSub\s+String\?\s+@unique/);
  });

  it("allows GOOGLE in the shared user profile type", () => {
    const userProfileType = readRepoFile("packages/ui/src/types/user-profile.ts");

    expect(userProfileType).toContain('export type UserAuthProvider = "LOCAL" | "LDAP" | "GOOGLE";');
    expect(userProfileType).toContain("authProvider?: UserAuthProvider;");
  });

  it("removes the auth controller's hardcoded LOCAL/LDAP union", () => {
    const authController = readRepoFile("apps/server/apiServer/src/controllers/auth.controller.ts");

    expect(authController).not.toContain('authProvider: "LOCAL" | "LDAP";');
  });
});
