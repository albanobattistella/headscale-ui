import { describe, expect, test } from "bun:test";
import { OPERATION_IDS } from "@/domain/headscale-operations";
import { SUPPORTED_LOCALES } from "./locales";
import { commonMessages, getOperationMessage, groupLabels, operationMessages } from "./messages";

describe("i18n message coverage", () => {
  test("keeps every supported locale wired to the same common, group and operation keys", () => {
    const commonKeys = Object.keys(commonMessages.en).sort();
    const groupKeys = Object.keys(groupLabels.en).sort();
    const operationKeys = [...OPERATION_IDS].sort();

    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(commonMessages[locale]).sort()).toEqual(commonKeys);
      expect(Object.keys(groupLabels[locale]).sort()).toEqual(groupKeys);
      expect(Object.keys(operationMessages[locale]).sort()).toEqual(operationKeys);
    }
  });

  test("does not use prefixed English operation placeholders for UN locales", () => {
    for (const locale of ["fr", "ru", "es", "ar" "it"] as const) {
      for (const id of OPERATION_IDS) {
        const message = getOperationMessage(locale, id);
        expect(message.title).not.toMatch(/^[A-Z]{2}:/);
        expect(message.description).not.toMatch(/^[A-Z]{2}:/);
      }
    }

    expect(getOperationMessage("ar", "health.check").title).toBe("فحص الصحة");
    expect(getOperationMessage("fr", "node.rename").title).toBe("Renommer le nœud");
    expect(getOperationMessage("ru", "apikey.create").title).toBe("Создать API-ключ");
    expect(getOperationMessage("es", "policy.set").title).toBe("Guardar policy");
    expect(getOperationMessage("it", "node.rename").title).toBe("Rinomina nodo");
  });
});
