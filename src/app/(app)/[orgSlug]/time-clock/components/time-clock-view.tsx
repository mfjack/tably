"use client";

import { ArrowLeft, Search, UserRoundX } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPLOYEE_PIN_LENGTH } from "@/features/employees/schemas";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useCreatePinAndRegisterPunchMutation } from "@/features/time-clock/hooks/use-create-pin-and-register-punch-mutation";
import { useRegisterTimePunchMutation } from "@/features/time-clock/hooks/use-register-time-punch-mutation";
import { useTimeClockEmployeesQuery } from "@/features/time-clock/hooks/use-time-clock-employees-query";
import {
  formatClockTime,
  getZonedParts,
} from "@/features/time-clock/time-utils";
import type {
  PunchReceipt,
  RegisterPunchResult,
  TimeClockEmployee,
} from "@/features/time-clock/types";
import { getInitials } from "@/lib/get-initials";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PinPad } from "../../components/pin-pad";
import { PinSetup } from "../../components/pin-setup";
import { LiveClock } from "./live-clock";
import { PunchReceiptCard } from "./punch-receipt-card";

const SEARCH_THRESHOLD = 8;

type TimeClockStep =
  | { kind: "select" }
  | { kind: "pin"; employee: TimeClockEmployee }
  | { kind: "done"; receipt: PunchReceipt };

type TimeClockViewProps = {
  organizationId: OrganizationId;
  title: string;
  business: OrderTicketBusiness;
  timeZone: string;
};

function getFailureMessage(
  result: Exclude<RegisterPunchResult, { status: "registered" }>,
  timeZone: string,
): string {
  switch (result.status) {
    case "invalid_pin":
      return "PIN incorreto. Tente de novo.";
    case "locked":
      return `Muitas tentativas erradas. Tente de novo às ${getZonedParts(result.lockedUntil, timeZone).time}.`;
    case "duplicate":
      return `Ponto já registrado às ${formatClockTime(getZonedParts(result.punchedAt, timeZone).time)}. Aguarde 10 minutos para marcar de novo.`;
    case "day_complete":
      return "Você já marcou os 4 pontos de hoje: entrada, intervalo, volta e saída. Para corrigir, fale com o gerente.";
    case "inactive":
      return "Esse cadastro não está ativo hoje. Fale com o gerente.";
    case "not_found":
      return "Funcionário não encontrado. Atualize a tela.";
  }
}

export function TimeClockView({
  organizationId,
  title,
  business,
  timeZone,
}: TimeClockViewProps) {
  const employeesQuery = useTimeClockEmployeesQuery(organizationId);
  const registerMutation = useRegisterTimePunchMutation(organizationId);
  const createPinMutation =
    useCreatePinAndRegisterPunchMutation(organizationId);
  const [step, setStep] = useState<TimeClockStep>({ kind: "select" });
  const [pin, setPin] = useState("");
  const pinRef = useRef("");
  const [pinSetupAttempt, setPinSetupAttempt] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");

  const employees = employeesQuery.data;
  const visibleEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!employees || !normalizedSearch) return employees;
    return employees.filter((employee) =>
      employee.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
    );
  }, [employees, search]);

  const updatePin = useCallback((nextPin: string) => {
    pinRef.current = nextPin;
    setPin(nextPin);
  }, []);

  const reset = useCallback(() => {
    setStep({ kind: "select" });
    updatePin("");
    setHasError(false);
    setSearch("");
  }, [updatePin]);

  function selectEmployee(employee: TimeClockEmployee) {
    setStep({ kind: "pin", employee });
    updatePin("");
    setHasError(false);
  }

  function handleRegisterResult(result: RegisterPunchResult) {
    if (result.status === "registered") {
      setStep({ kind: "done", receipt: result.receipt });
      return;
    }
    updatePin("");
    setHasError(true);
    toast.error(getFailureMessage(result, timeZone));
  }

  function submitPin(pinToSubmit: string) {
    if (step.kind !== "pin" || registerMutation.isPending) return;

    registerMutation.mutate(
      { employeeId: step.employee.id, pin: pinToSubmit },
      {
        onSuccess: handleRegisterResult,
        onError: (error) => {
          updatePin("");
          toast.error(error.message);
        },
      },
    );
  }

  function createPin(newPin: string) {
    if (step.kind !== "pin") return;
    createPinMutation.mutate(
      { employeeId: step.employee.id, pin: newPin },
      {
        onSuccess: (result) => {
          toast.success("PIN criado.");
          if (result.status === "registered") {
            handleRegisterResult(result);
            return;
          }
          toast.error(getFailureMessage(result, timeZone));
          reset();
        },
        onError: (error) => {
          toast.error(error.message);
          setPinSetupAttempt((attempt) => attempt + 1);
        },
      },
    );
  }

  function appendDigit(digit: string) {
    if (step.kind !== "pin" || registerMutation.isPending) return;
    const currentPin = pinRef.current;
    if (currentPin.length >= EMPLOYEE_PIN_LENGTH) return;
    const nextPin = currentPin + digit;
    setHasError(false);
    updatePin(nextPin);
    if (nextPin.length === EMPLOYEE_PIN_LENGTH) submitPin(nextPin);
  }

  function deleteDigit() {
    updatePin(pinRef.current.slice(0, -1));
    setHasError(false);
  }

  return (
    <>
      <PageHeader
        title={title}
        description="Escolha seu nome e digite o PIN. O horário salvo é o do servidor."
      />
      <PageContent>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 py-4">
          <LiveClock />

          {step.kind === "done" ? (
            <PunchReceiptCard
              receipt={step.receipt}
              business={business}
              timeZone={timeZone}
              onDone={reset}
            />
          ) : step.kind === "pin" ? (
            <div className="flex w-full flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-primary font-semibold text-lg text-primary-foreground"
                >
                  {getInitials(step.employee.name)}
                </span>
                {step.employee.hasPin && (
                  <>
                    <p className="font-semibold">{step.employee.name}</p>
                    <p className="text-muted-foreground text-sm">
                      Digite seu PIN de {EMPLOYEE_PIN_LENGTH} números
                    </p>
                  </>
                )}
              </div>
              {step.employee.hasPin ? (
                <PinPad
                  pin={pin}
                  isSubmitting={registerMutation.isPending}
                  hasError={hasError}
                  minLength={EMPLOYEE_PIN_LENGTH}
                  maxLength={EMPLOYEE_PIN_LENGTH}
                  submitLabel="Marcar"
                  onAppendDigit={appendDigit}
                  onDeleteDigit={deleteDigit}
                  onSubmit={() => submitPin(pinRef.current)}
                />
              ) : (
                <PinSetup
                  key={`${step.employee.id}-${pinSetupAttempt}`}
                  personName={step.employee.name}
                  isSubmitting={createPinMutation.isPending}
                  onSubmit={createPin}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={
                  registerMutation.isPending || createPinMutation.isPending
                }
                onClick={reset}
              >
                <ArrowLeft aria-hidden />
                Não sou eu
              </Button>
            </div>
          ) : employeesQuery.error ? (
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>
                {employeesQuery.error.message}
              </AlertDescription>
            </Alert>
          ) : !visibleEmployees ? (
            <div className="flex flex-wrap justify-center gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={`employee-card-${index.toString()}`}
                  className="h-36 w-36 rounded-2xl"
                />
              ))}
            </div>
          ) : employees?.length === 0 ? (
            <div className="flex max-w-sm flex-col items-center gap-2 text-center">
              <UserRoundX
                aria-hidden
                className="size-8 text-muted-foreground"
              />
              <p className="font-medium">Nenhum funcionário ativo</p>
              <p className="text-muted-foreground text-sm">
                Cadastre a equipe em Funcionários para liberar o ponto.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 w-full max-w-3xl flex-col items-center gap-6">
              {(employees?.length ?? 0) > SEARCH_THRESHOLD && (
                <InputGroup className="h-11 w-full max-w-xs shrink-0 rounded-lg">
                  <InputGroupAddon>
                    <Search aria-hidden />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="search"
                    aria-label="Buscar seu nome"
                    placeholder="Buscar seu nome"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </InputGroup>
              )}
              <ul className="flex min-h-0 flex-wrap justify-center gap-4 overflow-y-auto p-1">
                {visibleEmployees.map((employee) => (
                  <li key={employee.id}>
                    <button
                      type="button"
                      className="flex w-36 flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-5 shadow-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                      onClick={() => selectEmployee(employee)}
                    >
                      <span
                        aria-hidden
                        className="flex size-14 items-center justify-center rounded-full bg-primary font-semibold text-lg text-primary-foreground"
                      >
                        {getInitials(employee.name)}
                      </span>
                      <span className="flex w-full flex-col items-center">
                        <span className="w-full truncate text-center font-semibold text-[0.9375rem]">
                          {employee.name}
                        </span>
                        <span className="w-full truncate text-center text-muted-foreground text-xs">
                          {employee.hasPin ? employee.jobTitle : "Criar PIN"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}
