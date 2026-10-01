"use server";

import type { CategoryId } from "@/features/categories/types";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import { type ProductFormInput, productFormSchema } from "./schemas";
import type { Product, ProductId } from "./types";

const PRODUCT_COLUMNS =
  "id, name, price, image_url, is_active, is_on_menu, menu_detail, category_id, categories(name), product_ingredients(ingredient_id, quantity)";

export async function listProducts(
  organizationId: OrganizationId,
): Promise<ActionResult<Product[]>> {
  const supabase = await createClient();
  const [productsResult, costsResult] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("product_costs")
      .select("product_id, unit_cost")
      .eq("organization_id", organizationId),
  ]);

  if (productsResult.error || costsResult.error) {
    return actionFailure("Não foi possível carregar os produtos.");
  }

  const costsByProductId = new Map(
    costsResult.data.map((productCost) => [
      productCost.product_id,
      productCost.unit_cost ?? 0,
    ]),
  );

  return actionSuccess(
    productsResult.data.map((product) => ({
      id: product.id as ProductId,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
      isActive: product.is_active,
      categoryId: product.category_id as CategoryId | null,
      categoryName: product.categories?.name ?? null,
      unitCost: costsByProductId.get(product.id) ?? 0,
      isOnMenu: product.is_on_menu,
      menuDetail: product.menu_detail,
      recipe: product.product_ingredients.map((recipeItem) => ({
        ingredientId: recipeItem.ingredient_id as IngredientId,
        quantity: recipeItem.quantity,
      })),
    })),
  );
}

export async function saveProduct(
  organizationId: OrganizationId,
  productId: ProductId | undefined,
  input: ProductFormInput,
): Promise<ActionResult> {
  const parsedInput = productFormSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const {
    name,
    categoryId,
    price,
    isActive,
    isOnMenu,
    menuDetail,
    imageUrl,
    recipe,
  } = parsedInput.data;
  const supabase = await createClient();
  const { data: savedProductId, error } = await supabase.rpc("save_product", {
    p_organization_id: organizationId,
    p_product_id: productId,
    p_name: name,
    p_category_id: fromSelectFieldValue<CategoryId>(categoryId),
    p_price: price,
    p_is_active: isActive,
    p_image_url: imageUrl || undefined,
    p_recipe: recipe.map((recipeItem) => ({
      ingredient_id: recipeItem.ingredientId,
      quantity: recipeItem.quantity,
    })),
  });

  if (isUniqueViolation(error)) {
    return actionFailure("Já existe um produto com esse nome.");
  }
  if (error) return actionFailure("Não foi possível salvar o produto.");

  const { error: menuError } = await supabase
    .from("products")
    .update({ is_on_menu: isOnMenu, menu_detail: menuDetail || null })
    .eq("id", savedProductId);
  if (menuError) {
    return actionFailure(
      "O produto foi salvo, mas o cardápio não foi atualizado.",
    );
  }

  return actionSuccess();
}

export async function deleteProduct(
  productId: ProductId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) return actionFailure("Não foi possível excluir o produto.");

  return actionSuccess();
}
