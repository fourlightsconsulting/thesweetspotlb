// An item's choice groups: templates (option_groups + options) that the item
// follows, field by field, until something is changed on the item. The item's
// differences are stored in product_option_groups and product_options, where
// NULL means "as the template". Used by the menu loader and the item editor.
import type { OptionGroup } from "@/data/menu";
import { slugify } from "@/lib/slug";

export type TemplateChoice = {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  price: number;
  available: boolean;
};

export type Template = {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  min: number;
  max: number;
  /** In the template's order. */
  choices: TemplateChoice[];
};

/** A product_option_groups row. */
export type LinkRow = {
  id: string;
  group_id: string | null;
  key: string;
  name_en: string | null;
  name_ar: string | null;
  min_select: number | null;
  max_select: number | null;
  default_options: string[];
};

/** A product_options row. */
export type ItemChoiceRow = {
  link_id: string;
  option_id: string | null;
  key: string;
  name_en: string | null;
  name_ar: string | null;
  price_cents: number | null;
  is_available: boolean;
  is_removed: boolean;
  sort_order: number | null;
};

/**
 * A template's choices with the item's rows, in the order the item shows them:
 * the template's, then those only on the item. Once the item has its own order,
 * that order wins and anything new from the template goes last.
 */
export function mergeChoices(choices: TemplateChoice[], rows: ItemChoiceRow[]) {
  const merged: { choice?: TemplateChoice; row?: ItemChoiceRow }[] = [
    ...choices.map((choice) => ({ choice, row: rows.find((r) => r.option_id === choice.id) })),
    ...rows
      .filter((r) => !r.option_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => ({ row })),
  ];
  if (!rows.some((r) => r.option_id && r.sort_order !== null)) return merged;
  const position = (entry: (typeof merged)[number]) => entry.row?.sort_order ?? Infinity;
  return merged.sort((a, b) =>
    position(a) === position(b) ? 0 : position(a) < position(b) ? -1 : 1,
  );
}

/** The group a customer sees. `template.choices` holds only what's available. */
export function resolveGroup(
  link: LinkRow,
  template: Template | undefined,
  rows: ItemChoiceRow[],
): OptionGroup {
  const max = link.max_select ?? template?.max ?? 1;
  return {
    id: link.key,
    name: {
      en: link.name_en ?? template?.nameEn ?? "",
      ar: link.name_ar ?? template?.nameAr ?? "",
    },
    min: Math.min(link.min_select ?? template?.min ?? 0, max),
    max,
    options: mergeChoices(template?.choices ?? [], rows).flatMap(({ choice, row }) =>
      row?.is_removed || row?.is_available === false
        ? []
        : [
            {
              id: row?.key ?? choice!.key,
              name: {
                en: row?.name_en ?? choice?.nameEn ?? "",
                ar: row?.name_ar ?? choice?.nameAr ?? "",
              },
              price: row?.price_cents ?? choice?.price ?? 0,
            },
          ],
    ),
  };
}

// ─── The item editor ──────────────────────────────────────────────────────

export type ChoiceDraft = {
  /** Null until saved, for a choice added on the item. */
  key: string | null;
  optionId: string | null;
  nameEn: string;
  nameAr: string;
  price: number;
  /** On this item; the template's own switch is separate. */
  available: boolean;
  removed: boolean;
};

export type GroupDraft = {
  /** Null until saved. */
  key: string | null;
  templateId: string | null;
  nameEn: string;
  nameAr: string;
  min: number;
  max: number;
  defaults: string[];
  choices: ChoiceDraft[];
};

const choiceFromTemplate = (choice: TemplateChoice): ChoiceDraft => ({
  key: choice.key,
  optionId: choice.id,
  nameEn: choice.nameEn,
  nameAr: choice.nameAr,
  price: choice.price,
  available: true,
  removed: false,
});

/** A template as it starts on an item, or an item's group put back to it. */
export const groupFromTemplate = (template: Template, key: string | null = null): GroupDraft => ({
  key,
  templateId: template.id,
  nameEn: template.nameEn,
  nameAr: template.nameAr,
  min: template.min,
  max: template.max,
  defaults: [],
  choices: template.choices.map(choiceFromTemplate),
});

/** A saved group as the editor shows it: every field with its current value. */
export function groupDraft(
  link: LinkRow,
  template: Template | undefined,
  rows: ItemChoiceRow[],
): GroupDraft {
  return {
    key: link.key,
    templateId: link.group_id,
    nameEn: link.name_en ?? template?.nameEn ?? "",
    nameAr: link.name_ar ?? template?.nameAr ?? "",
    min: link.min_select ?? template?.min ?? 0,
    max: link.max_select ?? template?.max ?? 1,
    defaults: link.default_options,
    choices: mergeChoices(template?.choices ?? [], rows).map(({ choice, row }) => ({
      key: row?.key ?? choice!.key,
      optionId: choice?.id ?? null,
      nameEn: row?.name_en ?? choice?.nameEn ?? "",
      nameAr: row?.name_ar ?? choice?.nameAr ?? "",
      price: row?.price_cents ?? choice?.price ?? 0,
      available: row?.is_available ?? true,
      removed: row?.is_removed ?? false,
    })),
  };
}

const freeKey = (base: string, used: Set<string>) => {
  let key = base;
  for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
  used.add(key);
  return key;
};

/** Own keys start "own-", so a choice later added to the template can't clash. */
const ownKey = (name: string, fallback: string, used: Set<string>) =>
  freeKey(`own-${slugify(name, fallback)}`, used);

/** A product_options row as save_item_groups takes it. */
type ChoiceToSave = {
  key: string;
  optionId: string | null;
  nameEn: string | null;
  nameAr: string | null;
  price: number | null;
  available: boolean;
  removed: boolean;
  sort: number | null;
};

/**
 * What save_item_groups stores for the editor's groups: only the differences
 * from each template. A value equal to the template's follows the template.
 */
export function groupsToSave(drafts: GroupDraft[], templates: Map<string, Template>) {
  const groupKeys = new Set(drafts.flatMap((g) => (g.key ? [g.key] : [])));
  return drafts.map((draft) => {
    const template = draft.templateId ? templates.get(draft.templateId) : undefined;
    const differs = <T>(value: T, from: T | undefined) => (value === from ? null : value);
    const key = draft.key ?? (template ? freeKey(template.key, groupKeys) : null);

    const choiceKeys = new Set(draft.choices.flatMap((c) => (c.key ? [c.key] : [])));
    // A choice deleted from the template while this page was open is gone.
    const listed = draft.choices.filter(
      (c) => !template || !c.optionId || template.choices.some((t) => t.id === c.optionId),
    );
    const fromTemplate = listed.filter((c) => template && c.optionId);
    const usual = (template?.choices ?? []).filter((t) =>
      fromTemplate.some((c) => c.optionId === t.id),
    );
    // The usual order: the template's, then the item's own choices after them.
    const ownOrder = listed.some((c, i) => c.optionId !== (usual[i]?.id ?? null));

    let ownCount = 0;
    const choices = listed.flatMap((c, i): ChoiceToSave[] => {
      const source = template?.choices.find((t) => t.id === c.optionId);
      if (!source) {
        ownCount += 1;
        return [
          {
            key: c.key ?? ownKey(c.nameEn, "choice", choiceKeys),
            optionId: null,
            nameEn: c.nameEn,
            nameAr: c.nameAr,
            price: c.price,
            available: c.available,
            removed: false,
            sort: ownOrder ? (i + 1) * 10 : ownCount * 10,
          },
        ];
      }
      const row = {
        key: source.key,
        optionId: source.id,
        nameEn: differs(c.nameEn, source.nameEn),
        nameAr: differs(c.nameAr, source.nameAr),
        price: differs(c.price, source.price),
        available: c.available,
        removed: c.removed,
        sort: ownOrder ? (i + 1) * 10 : null,
      };
      const same =
        row.nameEn === null &&
        row.nameAr === null &&
        row.price === null &&
        row.available &&
        !row.removed &&
        row.sort === null;
      return same ? [] : [row];
    });

    const shown = new Set(listed.filter((c) => !c.removed && c.key).map((c) => c.key));
    return {
      key: key ?? ownKey(draft.nameEn, "group", groupKeys),
      groupId: template?.id ?? null,
      nameEn: differs(draft.nameEn, template?.nameEn),
      nameAr: differs(draft.nameAr, template?.nameAr),
      min: differs(draft.min, template?.min),
      max: differs(draft.max, template?.max),
      defaults: draft.defaults.filter((d) => shown.has(d)).slice(0, draft.max),
      choices,
    };
  });
}
