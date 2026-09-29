"use client";

import { NotebookPen } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const NOTE_MAX_LENGTH = 500;

type OrderNoteInputProps = {
  note: string;
  onNoteChange: (note: string) => void;
};

export function OrderNoteInput({ note, onNoteChange }: OrderNoteInputProps) {
  return (
    <InputGroup className="h-11 rounded-lg bg-background">
      <InputGroupAddon>
        <NotebookPen aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Observação do pedido"
        placeholder="Adicionar observação..."
        maxLength={NOTE_MAX_LENGTH}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
      />
    </InputGroup>
  );
}
