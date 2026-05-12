import { type ComputedRef, computed } from "vue";
import { useHeadscaleI18n } from "@/i18n";
import { type ProductCopy, productCopy } from "@/i18n/product-copy";

export interface UseProductCopyReturn {
  copy: ComputedRef<ProductCopy>;
}

export function useProductCopy(): UseProductCopyReturn {
  const { locale } = useHeadscaleI18n();
  return {
    copy: computed(() => productCopy[locale.value]),
  };
}
