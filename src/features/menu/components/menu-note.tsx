import { Info } from "lucide-react";

type MenuNoteProps = {
  note: string;
};

export function MenuNote({ note }: MenuNoteProps) {
  return (
    <p className="flex gap-3 rounded-2xl bg-muted px-4 py-3 text-muted-foreground text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {note}
    </p>
  );
}
