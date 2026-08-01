//C:\dev\highrise-pk\lib\auth\actor.ts
import type { Capability } from "./capabilities";
import type { Permission } from "./permissions";
import type { Role } from "./roles";

export interface Actor {
  id: string;
  role: Role;
  capabilities: readonly Capability[];
  directPermissions: readonly Permission[];
  tokenVersion: number;
  isActive: boolean;
}

export function isUsableActor(
  actor: Actor | null | undefined,
): actor is Actor {
  return Boolean(
    actor &&
      actor.isActive &&
      typeof actor.id === "string" &&
      actor.id.length > 0,
  );
}
