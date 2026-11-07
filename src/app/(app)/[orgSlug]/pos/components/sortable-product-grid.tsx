"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProductId } from "@/features/products/types";
import { cn } from "@/lib/utils";
import type { PosProduct } from "../hooks/use-pos-catalog";
import { ProductCard } from "./product-card";
import { PRODUCT_GRID_CLASS_NAME } from "./product-grid";

const DRAG_ACTIVATION_DISTANCE_IN_PX = 6;
const TOUCH_DRAG_DELAY_IN_MS = 200;
const TOUCH_DRAG_TOLERANCE_IN_PX = 8;

type SortableProductGridProps = {
  products: readonly PosProduct[];
  onMove: (activeProductId: ProductId, overProductId: ProductId) => void;
};

function ignoreAdd() {}

function SortableProductCard({ product }: { product: PosProduct }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  return (
    // biome-ignore lint/a11y/useSemanticElements: dnd-kit attributes add tabIndex and keyboard handling; a button would nest the card button
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative cursor-grab touch-manipulation select-none rounded-xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background active:cursor-grabbing [&_*]:pointer-events-none",
        isDragging && "z-10 opacity-80 shadow-lg ring-primary",
      )}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Mover ${product.name}`}
    >
      <ProductCard
        product={{ ...product, cartQuantity: 0 }}
        onAdd={ignoreAdd}
      />
    </div>
  );
}

export function SortableProductGrid({
  products,
  onMove,
}: SortableProductGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_IN_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY_IN_MS,
        tolerance: TOUCH_DRAG_TOLERANCE_IN_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onMove(active.id as ProductId, over.id as ProductId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={products.map((product) => product.id)}
        strategy={rectSortingStrategy}
      >
        <div className={PRODUCT_GRID_CLASS_NAME}>
          {products.map((product) => (
            <SortableProductCard key={product.id} product={product} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
