export type CommunityKind =
  | "neighborhood"
  | "cultural"
  | "hobby"
  | "identity"
  | "geographic"
  | "interest"
  | "other";

export type Community = {
  id: string;
  name: string;
  city: string | null;
  kind?: CommunityKind | null;
  description?: string | null;
};

export const KIND_META: Record<
  CommunityKind,
  { label: string; badge: string }
> = {
  neighborhood: {
    label: "Neighborhood",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  cultural: {
    label: "Cultural",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  hobby: {
    label: "Hobby",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  identity: {
    label: "Identity",
    badge:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  geographic: {
    label: "Geographic",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  interest: {
    label: "Interest",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  },
  other: {
    label: "Community",
    badge: "bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function kindMeta(kind: string | null | undefined) {
  return KIND_META[(kind as CommunityKind) ?? "other"] ?? KIND_META.other;
}

export function communityLabel(c: {
  name: string;
  city?: string | null;
}): string {
  return c.city ? `${c.name} (${c.city})` : c.name;
}
