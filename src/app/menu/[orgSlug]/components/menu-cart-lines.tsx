"use client";

import { useState } from "react";
import { ItemNoteDialog } from "@/components/item-note-dialog";
import { useMenuCartStore } from "@/features/online-orders/menu-cart-store";
import { MenuCartItemCard, type MenuCartLine } from "./menu-cart-item-card";

type MenuCartLinesProps = {
  menuSlug: string;
  cartLines: readonly MenuCartLine[];
};

export function MenuCartLines({ menuSlug, cartLines }: MenuCartLinesProps) {
  const decrementItem = useMenuCartStore((state) => state.decrementItem);
  const setItemNote = useMenuCartStore((state) => state.setItemNote);
  const [noteCartLine, setNoteCartLine] = useState<MenuCartLine | null>(null);

  function decrementCartLine(cartLine: MenuCartLine) {
    decrementItem(
      menuSlug,
      cartLine.productId,
      cartLine.note,
      cartLine.addonIds,
    );
  }

  function saveItemNote(
    cartLine: MenuCartLine,
    note: string,
    quantityToMove: number,
  ) {
    setItemNote(
      menuSlug,
      cartLine.productId,
      cartLine.note,
      note,
      quantityToMove,
      cartLine.addonIds,
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 px-4">
        {cartLines.map((line) => (
          <MenuCartItemCard
            key={`${line.productId}:${line.note}`}
            cartLine={line}
            onDecrement={decrementCartLine}
            onEditNote={setNoteCartLine}
          />
        ))}
      </ul>
      <ItemNoteDialog
        line={noteCartLine}
        itemName={noteCartLine?.name ?? ""}
        description="Vai junto com o pedido para a cozinha."
        placeholder="Ex.: sem açúcar, leite vegetal"
        onClose={() => setNoteCartLine(null)}
        onSave={saveItemNote}
      />
    </>
  );
}
