"use client";

import { Field, OptionSelect } from "@/components/shared/form-controls";
import { Input } from "@/components/ui/input";
import { Category, Season } from "@/generated/prisma/browser";
import { CATEGORY_LABELS, SEASON_LABELS, STYLES, capitalize, type Style } from "@/lib/clothing";
import type { ClothingItem, ClothingTags } from "@/types";

// Editable item details. secondaryColor is a string here ("" = none) for the text input.
export type ClothingFormValues = Omit<ClothingTags, "secondaryColor"> & { secondaryColor: string };

export const EMPTY_CLOTHING_FORM: ClothingFormValues = {
  name: "",
  category: Category.TOPS,
  color: "",
  secondaryColor: "",
  season: Season.ALL_WEATHER,
  style: "casual",
};

export function toFormValues(
  item: Pick<ClothingItem, "name" | "category" | "color" | "secondaryColor" | "season" | "style">,
): ClothingFormValues {
  return {
    name: item.name,
    category: item.category,
    color: item.color ?? "",
    secondaryColor: item.secondaryColor ?? "",
    season: item.season,
    // Older items may have a free-text style; fall back to a valid option.
    style: (STYLES as readonly string[]).includes(item.style ?? "")
      ? (item.style as Style)
      : "casual",
  };
}

export function toTags(values: ClothingFormValues): ClothingTags {
  return { ...values, secondaryColor: values.secondaryColor.trim() || null };
}

const categoryItems = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const seasonItems = Object.entries(SEASON_LABELS).map(([value, label]) => ({ value, label }));
const styleItems = STYLES.map((style) => ({ value: style, label: capitalize(style) }));

export function ClothingFields({
  value,
  onChange,
  idPrefix = "item",
}: {
  value: ClothingFormValues;
  onChange: (value: ClothingFormValues) => void;
  // Keeps input ids unique when two forms could be on the page.
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" htmlFor={id("name")}>
        <Input
          id={id("name")}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Navy crewneck sweater"
          maxLength={80}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <OptionSelect
            label="Category"
            items={categoryItems}
            value={value.category}
            onChange={(category) => onChange({ ...value, category: category as Category })}
          />
        </Field>
        <Field label="Season">
          <OptionSelect
            label="Season"
            items={seasonItems}
            value={value.season}
            onChange={(season) => onChange({ ...value, season: season as Season })}
          />
        </Field>
      </div>

      <Field label="Style">
        <OptionSelect
          label="Style"
          items={styleItems}
          value={value.style}
          onChange={(style) => onChange({ ...value, style: style as Style })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary color" htmlFor={id("color")}>
          <Input
            id={id("color")}
            value={value.color}
            onChange={(e) => onChange({ ...value, color: e.target.value })}
            placeholder="navy"
            maxLength={40}
            required
          />
        </Field>
        <Field label="Secondary color" htmlFor={id("secondary-color")}>
          <Input
            id={id("secondary-color")}
            value={value.secondaryColor}
            onChange={(e) => onChange({ ...value, secondaryColor: e.target.value })}
            placeholder="Optional"
            maxLength={40}
          />
        </Field>
      </div>
    </div>
  );
}
