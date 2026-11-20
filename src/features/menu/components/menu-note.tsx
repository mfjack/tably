import { Info } from "lucide-react";

type MenuNoteProps = {
  note: string;
};

export function MenuNote({ note }: MenuNoteProps) {
  return (
    <p className="flex gap-3 rounded-2xl bg-destructive/10 px-4 py-3 font-medium text-destructive text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {note}
    </p>
  );
}
