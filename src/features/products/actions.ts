"use server";

import type { CategoryId } from "@/features/categories/types";
import { getPurchaseCost } from "@/features/ingredients/stock-cost";
import type { IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductAddonId } from "@/features/product-addons/types";
import type { SupplierId } from "@/features/suppliers/types";
import {
  hasModuleAccess,
  hasModuleAccessToRow,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/team/module-access";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import { fromSelectFieldValue } from "@/lib/optional-select-value";
import { createClient } from "@/lib/supabase/server";
import {
  type ProductFormInput,
  type ProductStockEntryInput,
  productFormSchema,
  productStockEntrySchema,
} from "./schemas";
import type { Product, ProductId } from "./types";

const PRODUCT_COLUMNS =
  "id, name, price, image_url, is_active, is_on_menu, menu_detail, stock_quantity, minimum_stock, category_id, categories(name), product_ingredients(ingredient_id, quantity), product_addon_links(product_addons(id, name, price, is_active, ingredient_id, ingredient_quantity))";

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
      stockQuantity: product.stock_quantity,
      minimumStock: product.minimum_stock,
      recipe: product.product_ingredients.map((recipeItem) => ({
        ingredientId: recipeItem.ingredient_id as IngredientId,
        quantity: recipeItem.quantity,
      })),
      addons: product.product_addon_links
        .flatMap(({ product_addons: addon }) => (addon ? [addon] : []))
        .map((addon) => ({
          id: addon.id as ProductAddonId,
          name: addon.name,
          price: addon.price,
          isActive: addon.is_active,
          ingredientId: addon.ingredient_id as IngredientId | null,
          ingredientQuantity: addon.ingredient_quantity,
        }))
        .sort((first, second) =>
          first.name.localeCompare(second.name, "pt-BR"),
        ),
    })),
  );
}

export async function saveProduct(
  organizationId: OrganizationId,
  productId: ProductId | undefined,
  input: ProductFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "products"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
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
    addonIds,
    isStockTracked,
    stockQuantity,
    minimumStock,
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
  if (error)
    return databaseFailure("Não foi possível salvar o produto.", error);

  const { error: addonsError } = await supabase.rpc("set_product_addons", {
    p_product_id: savedProductId,
    p_addon_ids: addonIds,
  });
  if (addonsError) {
    return databaseFailure(
      "O produto foi salvo, mas os adicionais não foram atualizados.",
      addonsError,
    );
  }

  const { error: menuError } = await supabase
    .from("products")
    .update({
      is_on_menu: isOnMenu,
      menu_detail: menuDetail || null,
      stock_quantity: isStockTracked ? (stockQuantity ?? 0) : null,
      minimum_stock: isStockTracked ? (minimumStock ?? 0) : 0,
    })
    .eq("id", savedProductId)
    .eq("organization_id", organizationId);
  if (menuError) {
    return databaseFailure(
      "O produto foi salvo, mas o cardápio não foi atualizado.",
      menuError,
    );
  }

  return actionSuccess();
}

export async function deleteProduct(
  productId: ProductId,
): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await hasModuleAccessToRow("products", productId, "products"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error)
    return databaseFailure("Não foi possível excluir o produto.", error);

  return actionSuccess();
}

export async function addProductStock(
  organizationId: OrganizationId,
  productId: ProductId,
  input: ProductStockEntryInput,
): Promise<ActionResult<number>> {
  if (!(await hasModuleAccess(organizationId, "pos"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = productStockEntrySchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const {
    quantity,
    totalCost,
    freightCost,
    paymentDate,
    minimumStock,
    supplierId,
  } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_product_stock", {
    p_product_id: productId,
    p_quantity: quantity,
    p_total_cost: getPurchaseCost(totalCost, freightCost),
    p_payment_date: paymentDate,
    p_minimum_stock: minimumStock,
    p_supplier_id: fromSelectFieldValue<SupplierId>(supplierId),
  });

  if (error)
    return databaseFailure("Não foi possível registrar a entrada.", error);
  return actionSuccess(data);
}
