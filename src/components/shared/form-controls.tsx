"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Option = { value: string; label: string };

export function OptionSelect({
  label,
  items,
  value,
  onChange,
  disabled,
}: {
  label: string;
  items: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => next && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
