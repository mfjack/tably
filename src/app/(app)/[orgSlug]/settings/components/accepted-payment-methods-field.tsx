import { ToggleChip } from "@/components/toggle-chip";
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  getPaymentMethodLabel,
  RECEIVABLE_PAYMENT_METHOD_VALUES,
  type ReceivablePaymentMethod,
} from "@/features/orders/payment-methods";

type AcceptedPaymentMethodsFieldProps = {
  value: readonly ReceivablePaymentMethod[];
  errorMessage?: string;
  onChange: (methods: ReceivablePaymentMethod[]) => void;
};

export function AcceptedPaymentMethodsField({
  value,
  errorMessage,
  onChange,
}: AcceptedPaymentMethodsFieldProps) {
  function toggleMethod(method: ReceivablePaymentMethod) {
    const nextMethods = value.includes(method)
      ? value.filter((acceptedMethod) => acceptedMethod !== method)
      : [...value, method];
    onChange(
      RECEIVABLE_PAYMENT_METHOD_VALUES.filter((receivableMethod) =>
        nextMethods.includes(receivableMethod),
      ),
    );
  }

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Formas de pagamento aceitas</FieldLegend>
      <div className="flex flex-wrap gap-2">
        {RECEIVABLE_PAYMENT_METHOD_VALUES.map((method) => (
          <ToggleChip
            key={method}
            label={getPaymentMethodLabel(method)}
            isSelected={value.includes(method)}
            onToggle={() => toggleMethod(method)}
          />
        ))}
      </div>
      {errorMessage ? (
        <FieldError
          errors={[{ message: errorMessage }]}
          className="text-[0.8125rem]"
        />
      ) : (
        <FieldDescription className="text-[0.8125rem]">
          Só as marcadas aparecem na hora de cobrar.
        </FieldDescription>
      )}
    </FieldSet>
  );
}
