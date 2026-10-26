const FORM_INPUT_TEXT_CLASS_NAME =
  "text-[0.9375rem] md:text-[0.9375rem] placeholder:text-muted-foreground";

const FORM_INPUT_FOCUS_CLASS_NAME =
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/15";

const FORM_INPUT_GROUP_FOCUS_CLASS_NAME =
  "has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/15";

export const FORM_INPUT_CLASS_NAME = `h-12 rounded-lg bg-muted px-4 ${FORM_INPUT_TEXT_CLASS_NAME} ${FORM_INPUT_FOCUS_CLASS_NAME}`;

export const FORM_INPUT_GROUP_CLASS_NAME = `h-12 rounded-lg bg-muted ${FORM_INPUT_GROUP_FOCUS_CLASS_NAME}`;

export const FORM_INPUT_GROUP_CONTROL_CLASS_NAME = `h-full px-4 ${FORM_INPUT_TEXT_CLASS_NAME}`;

export const FORM_INPUT_SIZE_CLASS_NAMES = {
  default: "",
  compact: "h-9 px-3 text-sm md:text-sm",
  dense: "h-9 px-3 text-sm placeholder:text-xs md:text-sm",
} as const;

export type FormInputSize = keyof typeof FORM_INPUT_SIZE_CLASS_NAMES;
