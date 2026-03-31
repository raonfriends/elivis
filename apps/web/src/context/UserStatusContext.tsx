"use client";

import { createContext, useContext, useState } from "react";

import type { UserStatus } from "@/lib/user-types";

// ─────────────────────────────────────────────────────────────────────────────

interface UserStatusContextValue {
  status:    UserStatus;
  setStatus: (status: UserStatus) => void;
}

const UserStatusContext = createContext<UserStatusContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────

export function UserStatusProvider({
  children,
  initialStatus,
}: {
  children:      React.ReactNode;
  initialStatus: UserStatus;
}) {
  const [status, setStatus] = useState<UserStatus>(initialStatus);

  return (
    <UserStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </UserStatusContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function useUserStatus(): UserStatusContextValue {
  const ctx = useContext(UserStatusContext);
  if (!ctx) throw new Error("useUserStatus must be used within <UserStatusProvider>");
  return ctx;
}
