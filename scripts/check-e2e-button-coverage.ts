import type { ElementNode, RootNode, TemplateChildNode } from "@vue/compiler-dom";
import { baseParse, ElementTypes, NodeTypes } from "@vue/compiler-dom";
import { parse as parseSfc } from "@vue/compiler-sfc";

type SourceTarget = {
  file: string;
  line: number;
  tag: string;
  testIdPattern: string;
};

const SOURCE_FILES = ["src/views/DashboardView.vue", "src/components/CreateAuthKeyDialog.vue"];
const E2E_FILE = "e2e/headscale-ui.browser.test.ts";
const FLOW_TAGS = new Set([
  "AlertDialogCancel",
  "Button",
  "Checkbox",
  "DateTimePicker",
  "DropdownMenuItem",
  "DropdownMenuSubTrigger",
  "Input",
  "NativeSelect",
  "Switch",
  "TabsTrigger",
  "button",
]);
const CONDITIONALLY_UNRENDERED_TARGETS = new Map([
  [
    "route-user-link-*",
    "The default route fixture is tag-managed, so the user link is intentionally not rendered.",
  ],
]);

function normalizeTestId(value: string) {
  return value
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/\$\{[^}]+}/g, "*")
    .replace(/\s+/g, " ");
}

function patternToRegExp(pattern: string) {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".+");
  return new RegExp(`^${escaped}$`);
}

function patternMatches(pattern: string, value: string) {
  return pattern.includes("*") ? patternToRegExp(pattern).test(value) : pattern === value;
}

function patternsOverlap(sourcePattern: string, interactionPattern: string) {
  if (!sourcePattern.includes("*")) {
    return patternMatches(interactionPattern, sourcePattern);
  }
  if (!interactionPattern.includes("*")) {
    return patternMatches(sourcePattern, interactionPattern);
  }

  const sourcePrefix = sourcePattern.split("*")[0] ?? "";
  const interactionPrefix = interactionPattern.split("*")[0] ?? "";
  return sourcePrefix.startsWith(interactionPrefix) || interactionPrefix.startsWith(sourcePrefix);
}

type TemplateNode = RootNode | TemplateChildNode;

function readTestIdAttribute(prop: ElementNode["props"][number]) {
  if (prop.type === NodeTypes.ATTRIBUTE && prop.name === "data-testid") {
    return prop.value?.content;
  }

  if (
    prop.type === NodeTypes.DIRECTIVE &&
    prop.name === "bind" &&
    prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
    prop.arg.content === "data-testid"
  ) {
    return prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION ? prop.exp.content : undefined;
  }

  return undefined;
}

async function collectSourceTargets() {
  const targets: SourceTarget[] = [];
  const missingTestIds: SourceTarget[] = [];

  for (const file of SOURCE_FILES) {
    const source = await Bun.file(file).text();
    const parsed = parseSfc(source, { filename: file });
    const template = parsed.descriptor.template?.content;
    if (!template) {
      continue;
    }

    const ast = baseParse(template);
    const visit = (node: TemplateNode) => {
      if (node.type === NodeTypes.ELEMENT) {
        const tag = node.tag;
        if (
          FLOW_TAGS.has(tag) &&
          (node.tagType === ElementTypes.ELEMENT || node.tagType === ElementTypes.COMPONENT)
        ) {
          const testId = node.props
            .map(readTestIdAttribute)
            .find((value): value is string => Boolean(value));
          if (testId) {
            targets.push({
              file,
              line: node.loc.start.line,
              tag,
              testIdPattern: normalizeTestId(testId),
            });
          } else {
            missingTestIds.push({
              file,
              line: node.loc.start.line,
              tag,
              testIdPattern: "<missing>",
            });
          }
        }
      }

      const children = "children" in node ? node.children : [];
      for (const child of children) {
        visit(child);
      }
    };

    visit(ast);
  }

  return { targets, missingTestIds };
}

function collectInteractions(source: string) {
  const interactions = new Set<string>();
  const add = (value: string) => interactions.add(normalizeTestId(value));

  const directInteraction =
    /getByTestId\(\s*("[^"]+"|`[^`]+`)\s*\)\s*\.(?:click|fill|selectOptions|hover)/g;
  for (const match of source.matchAll(directInteraction)) {
    add(match[1] ?? "");
  }

  const helperInteraction =
    /(?:clickDomTestId|inputDomTestId|selectDomTestId|chooseProfileMenuOption)\(\s*("[^"]+"|`[^`]+`)/g;
  for (const match of source.matchAll(helperInteraction)) {
    add(match[1] ?? "");
  }

  const sectionTab = /selectSectionTab\(\s*"([^"]+)"/g;
  for (const match of source.matchAll(sectionTab)) {
    add(`section-${match[1] ?? ""}`);
  }

  const prefixClick = /clickLastByTestIdPrefix\(\s*"([^"]+)"/g;
  for (const match of source.matchAll(prefixClick)) {
    add(`${match[1] ?? ""}*`);
  }

  return interactions;
}

const { targets, missingTestIds } = await collectSourceTargets();
const interactions = collectInteractions(await Bun.file(E2E_FILE).text());
const checkedTargets = targets.filter(
  (target) => !CONDITIONALLY_UNRENDERED_TARGETS.has(target.testIdPattern),
);
const skippedTargets = targets.filter((target) =>
  CONDITIONALLY_UNRENDERED_TARGETS.has(target.testIdPattern),
);
const missingCoverage = checkedTargets.filter(
  (target) =>
    !Array.from(interactions).some((interaction) =>
      patternsOverlap(target.testIdPattern, interaction),
    ),
);

if (missingTestIds.length > 0 || missingCoverage.length > 0) {
  const lines = [
    "E2E button/flow coverage check failed.",
    "",
    ...missingTestIds.map(
      (target) => `Missing data-testid: ${target.file}:${target.line} <${target.tag}>`,
    ),
    ...missingCoverage.map(
      (target) =>
        `Missing interaction: ${target.file}:${target.line} <${target.tag}> ${target.testIdPattern}`,
    ),
  ].filter(Boolean);

  console.error(lines.join("\n"));
  process.exit(1);
}

console.log(
  `E2E button/flow coverage check passed: ${checkedTargets.length} controls covered by ${interactions.size} interactions, ${skippedTargets.length} conditional control documented.`,
);
