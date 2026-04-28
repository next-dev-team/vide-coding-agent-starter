<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    children?: Snippet;
    class?: string;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  class={cn(
    "rounded-md border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-ring/50",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
