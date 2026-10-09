"use client";

import {
  ChefHat,
  CookingPot,
  MoreHorizontal,
  PackageMinus,
  PackagePlus,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ingredient } from "@/features/ingredients/types";

type IngredientRowActionsProps = {
  ingredient: Ingredient;
  canManage: boolean;
  onStockEntry: (ingredient: Ingredient) => void;
  onLoss: (ingredient: Ingredient) => void;
  onPrintLabel: (ingredient: Ingredient) => void;
  onProduce: (ingredient: Ingredient) => void;
  onEditRecipe: (ingredient: Ingredient) => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (ingredient: Ingredient) => void;
};

export function IngredientRowActions({
  ingredient,
  canManage,
  onStockEntry,
  onLoss,
  onPrintLabel,
  onProduce,
  onEditRecipe,
  onEdit,
  onDelete,
}: IngredientRowActionsProps) {
  const { isPrepared } = ingredient;

  return (
    <div className="flex justify-end gap-2">
      {isPrepared && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Produzir ${ingredient.name}`}
          onClick={() => onProduce(ingredient)}
        >
          <CookingPot aria-hidden />
          Produzir
        </Button>
      )}
      {!isPrepared && canManage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Registrar entrada de ${ingredient.name}`}
          onClick={() => onStockEntry(ingredient)}
        >
          <PackagePlus aria-hidden />
          Entrada
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Mais ações de ${ingredient.name}`}
            />
          }
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {isPrepared && canManage && (
            <DropdownMenuItem onClick={() => onStockEntry(ingredient)}>
              <PackagePlus aria-hidden />
              Registrar entrada
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onLoss(ingredient)}>
            <PackageMinus aria-hidden />
            Registrar perda
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrintLabel(ingredient)}>
            <Tag aria-hidden />
            Imprimir etiqueta
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditRecipe(ingredient)}>
                <ChefHat aria-hidden />
                Receita de produção
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(ingredient)}>
                <Pencil aria-hidden />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(ingredient)}
              >
                <Trash2 aria-hidden />
                Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
