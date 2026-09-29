const FORM_INPUT_TEXT_CLASS_NAME =
  "text-[15px] md:text-[15px] placeholder:text-[#76827d]";

const FORM_INPUT_FOCUS_CLASS_NAME =
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/15";

const FORM_INPUT_GROUP_FOCUS_CLASS_NAME =
  "has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/15";

export const FORM_INPUT_CLASS_NAME = `h-12 rounded-lg bg-muted px-4 ${FORM_INPUT_TEXT_CLASS_NAME} ${FORM_INPUT_FOCUS_CLASS_NAME}`;

export const FORM_INPUT_GROUP_CLASS_NAME = `h-12 rounded-lg bg-muted ${FORM_INPUT_GROUP_FOCUS_CLASS_NAME}`;

export const FORM_INPUT_GROUP_CONTROL_CLASS_NAME = `h-full px-4 ${FORM_INPUT_TEXT_CLASS_NAME}`;
