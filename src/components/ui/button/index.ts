import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "sm" | "default" | "icon";

export { default as Button } from "./Button.vue";

export function buttonVariants({
  variant = "default",
  size = "default",
  class: className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
} = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
      "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
      "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
      "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground":
        variant === "outline",
      "bg-destructive text-destructive-foreground hover:bg-destructive/90":
        variant === "destructive",
      "h-8 px-2.5": size === "sm",
      "h-9 px-3 py-2": size === "default",
      "h-9 w-9": size === "icon",
    },
    className,
  );
}
