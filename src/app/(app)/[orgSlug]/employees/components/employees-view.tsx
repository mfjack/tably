"use client";

import { CalendarClock, Flag, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteEmployeeMutation } from "@/features/employees/hooks/use-delete-employee-mutation";
import { useEmployeesQuery } from "@/features/employees/hooks/use-employees-query";
import { useResetEmployeePinMutation } from "@/features/employees/hooks/use-reset-employee-pin-mutation";
import { useWorkSchedulesQuery } from "@/features/employees/hooks/use-work-schedules-query";
import type {
  EmployeeWithAccess,
  WorkSchedule,
} from "@/features/employees/types";
import { buildOrganizationPath } from "@/features/modules/app-modules";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeesTable } from "./employees-table";
import { HolidaysDialog } from "./holidays-dialog";
import { WorkSchedulesDialog } from "./work-schedules-dialog";

const EMPTY_WORK_SCHEDULES: WorkSchedule[] = [];

type EmployeeFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; employee: EmployeeWithAccess };

type OpenDialog = "none" | "schedules" | "holidays";

type EmployeesViewProps = {
  organizationId: OrganizationId;
  organizationSlug: string;
  title: string;
  description: string;
  today: string;
  visibleModuleIds: AppModuleId[];
};

export function EmployeesView({
  organizationId,
  organizationSlug,
  title,
  description,
  today,
  visibleModuleIds,
}: EmployeesViewProps) {
  const router = useRouter();
  const employeesQuery = useEmployeesQuery(organizationId);
  const workSchedulesQuery = useWorkSchedulesQuery(organizationId);
  const deleteEmployeeMutation = useDeleteEmployeeMutation(organizationId);
  const [formState, setFormState] = useState<EmployeeFormState>({
    mode: "closed",
  });
  const [openDialog, setOpenDialog] = useState<OpenDialog>("none");
  const resetPinMutation = useResetEmployeePinMutation(organizationId);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<EmployeeWithAccess | null>(null);
  const [employeeToResetPin, setEmployeeToResetPin] =
    useState<EmployeeWithAccess | null>(null);

  const getTimesheetHref = useCallback(
    (employee: EmployeeWithAccess) =>
      buildOrganizationPath(organizationSlug, `employees/${employee.id}`),
    [organizationSlug],
  );

  const openTimesheet = useCallback(
    (employee: EmployeeWithAccess) => router.push(getTimesheetHref(employee)),
    [router, getTimesheetHref],
  );

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((employee: EmployeeWithAccess) => {
    setFormState({ mode: "edit", employee });
  }, []);

  function confirmResetPin() {
    if (!employeeToResetPin) return;
    resetPinMutation.mutate(employeeToResetPin.id, {
      onSuccess: () => {
        toast.success(`PIN de ${employeeToResetPin.name} redefinido.`, {
          description: "No próximo acesso, a pessoa cria um PIN novo.",
        });
        setEmployeeToResetPin(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function confirmDelete() {
    if (!employeeToDelete) return;
    deleteEmployeeMutation.mutate(employeeToDelete.id, {
      onSuccess: () => {
        toast.success(`${employeeToDelete.name} excluído.`);
        setEmployeeToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setOpenDialog("schedules")}
            >
              <CalendarClock aria-hidden />
              <span className="max-sm:sr-only">Jornadas</span>
            </Button>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setOpenDialog("holidays")}
            >
              <Flag aria-hidden />
              <span className="max-sm:sr-only">Feriados</span>
            </Button>
            <Button className="h-10" onClick={openCreateForm}>
              <Plus aria-hidden />
              <span className="max-sm:sr-only">Novo funcionário</span>
            </Button>
          </>
        }
      />
      <PageContent>
        <EmployeesTable
          employees={employeesQuery.data}
          workSchedules={workSchedulesQuery.data ?? EMPTY_WORK_SCHEDULES}
          today={today}
          getTimesheetHref={getTimesheetHref}
          isLoading={employeesQuery.isPending}
          errorMessage={employeesQuery.error?.message}
          emptyState={
            <ListEmptyState
              icon={Users}
              title="Nenhum funcionário ainda"
              description="Cadastre a equipe com CPF, salário e jornada. Cada pessoa recebe um PIN para bater o ponto."
              createLabel="Cadastrar primeiro funcionário"
              canCreate
              onCreate={openCreateForm}
            />
          }
          onOpenTimesheet={openTimesheet}
          onEdit={openEditForm}
          onResetPin={setEmployeeToResetPin}
          onDelete={setEmployeeToDelete}
        />
      </PageContent>

      <EmployeeFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        employee={formState.mode === "edit" ? formState.employee : undefined}
        workSchedules={workSchedulesQuery.data ?? EMPTY_WORK_SCHEDULES}
        visibleModuleIds={visibleModuleIds}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <WorkSchedulesDialog
        organizationId={organizationId}
        isOpen={openDialog === "schedules"}
        workSchedules={workSchedulesQuery.data}
        onClose={() => setOpenDialog("none")}
      />
      <HolidaysDialog
        organizationId={organizationId}
        isOpen={openDialog === "holidays"}
        initialYear={Number(today.slice(0, 4))}
        onClose={() => setOpenDialog("none")}
      />
      <ConfirmDialog
        isOpen={employeeToResetPin !== null}
        onOpenChange={(isOpen) => !isOpen && setEmployeeToResetPin(null)}
        title="Redefinir PIN?"
        description={`O PIN atual de ${employeeToResetPin?.name ?? ""} deixa de funcionar no ponto e no sistema. No próximo acesso, a pessoa cria um novo.`}
        confirmLabel="Redefinir"
        isConfirming={resetPinMutation.isPending}
        onConfirm={confirmResetPin}
      />
      <ConfirmDialog
        isOpen={employeeToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setEmployeeToDelete(null)}
        title="Excluir funcionário?"
        description={`${employeeToDelete?.name ?? ""} só pode ser excluído se ainda não tiver marcações de ponto nem holerites. Para quem saiu da empresa, informe a data de desligamento.`}
        confirmLabel="Excluir"
        isConfirming={deleteEmployeeMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
