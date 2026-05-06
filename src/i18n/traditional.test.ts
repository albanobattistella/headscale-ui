import { describe, expect, test } from "bun:test";
import { LOCALE_META, SUPPORTED_LOCALES } from "./locales";
import { commonMessages, getGroupLabel, getOperationMessage } from "./messages";
import { toTraditionalChinese } from "./traditional";

describe("Traditional Chinese locale", () => {
  test("is registered as a left-to-right supported locale", () => {
    expect(SUPPORTED_LOCALES).toContain("zh-Hant");
    expect(LOCALE_META["zh-Hant"]).toEqual({
      code: "zh-Hant",
      label: "Traditional Chinese",
      nativeLabel: "繁體中文",
      dir: "ltr",
    });
  });

  test("derives common, group and operation labels in Traditional Chinese", () => {
    expect(commonMessages["zh-Hant"].connectTitle).toBe("連線到 Headscale");
    expect(commonMessages["zh-Hant"].apiKeyGuideStepPaste).toBe(
      "把 key 和 HTTPS Headscale URL 貼到這裡。",
    );
    expect(getGroupLabel("zh-Hant", "preauthkeys")).toBe("預授權金鑰");
    expect(getOperationMessage("zh-Hant", "node.rename").title).toBe("重命名節點");
  });

  test("converts nested Simplified Chinese copy without changing locale keys", () => {
    expect(toTraditionalChinese("选择用户组、认证密钥和设备标签，然后保存访问规则。")).toBe(
      "選擇使用者群組、認證金鑰和裝置標籤，然後儲存存取規則。",
    );
  });
});
