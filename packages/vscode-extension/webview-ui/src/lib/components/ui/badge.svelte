<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const badgeVariants = tv({
    base: "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
    variants: {
      tone: {
        default: "bg-muted text-muted-foreground",
        todo: "bg-[var(--color-status-todo)]/15 text-[var(--color-status-todo)]",
        wip: "bg-[var(--color-status-wip)]/15 text-[var(--color-status-wip)]",
        verified: "bg-[var(--color-status-verified)]/15 text-[var(--color-status-verified)]",
        done: "bg-[var(--color-status-done)]/15 text-[var(--color-status-done)]",
        blocked: "bg-[var(--color-status-blocked)]/15 text-[var(--color-status-blocked)]",
        achieved: "bg-[var(--color-status-achieved)]/15 text-[var(--color-status-achieved)]",
      },
    },
    defaultVariants: { tone: "default" },
  });

  export type BadgeTone = VariantProps<typeof badgeVariants>["tone"];
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    tone?: BadgeTone;
    class?: string;
    children?: Snippet;
  }

  let { tone = "default", class: className, children }: Props = $props();
</script>

<span class={cn(badgeVariants({ tone }), className)}>
  {@render children?.()}
</span>
