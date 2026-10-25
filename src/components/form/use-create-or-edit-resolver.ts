import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import type * as z from "zod";

type FormSchema<TValues extends FieldValues> = z.ZodType<TValues, TValues>;

export function useCreateOrEditResolver<TValues extends FieldValues>(
  isEditing: boolean,
  schemas: { create: FormSchema<TValues>; edit: FormSchema<TValues> },
): Resolver<TValues> {
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;
  return (values, context, options) =>
    zodResolver(isEditingRef.current ? schemas.edit : schemas.create)(
      values,
      context,
      options,
    );
}
