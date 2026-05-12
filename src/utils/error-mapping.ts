import { englishCopy, type ProductCopy } from "@/i18n/product-copy";

export function mapErrorToCopy(error: unknown, copy: ProductCopy): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === englishCopy.errorUserNotFound) return copy.errorUserNotFound;
  if (message === englishCopy.errorUserStillOwns) return copy.errorUserStillOwns;
  if (message === englishCopy.errorNodeNotFound) return copy.errorNodeNotFound;
  if (message === englishCopy.errorRequestFailed) return copy.errorRequestFailed;
  return message;
}
