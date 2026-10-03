import {
  Banknote,
  BookUser,
  ChartColumn,
  ChefHat,
  ClipboardList,
  Clock,
  Gift,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
  MonitorSmartphone,
  Package,
  Settings,
  Tag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { AppModuleId } from "@/features/organizations/types";

export type AppModule = {
  id: AppModuleId;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

export type AppModuleGroup = {
  label: string;
  modules: readonly AppModule[];
};

export const APP_MODULE_GROUPS = [
  {
    label: "Operação",
    modules: [
      {
        id: "pos",
        label: "PDV",
        description: "Venda no balcão com carrinho e pagamento.",
        path: "pos",
        icon: MonitorSmartphone,
      },
      {
        id: "order_tabs",
        label: "Comandas",
        description: "Contas abertas por mesa ou cliente até o fechamento.",
        path: "order-tabs",
        icon: ClipboardList,
      },
      {
        id: "kitchen",
        label: "Cozinha",
        description: "Fila de preparo e impressão dos pedidos.",
        path: "kitchen",
        icon: ChefHat,
      },
      {
        id: "customer_accounts",
        label: "Contas",
        description: "Compras no fiado e pagamentos de cada cliente.",
        path: "customer-accounts",
        icon: BookUser,
      },
      {
        id: "tasks",
        label: "Tarefas",
        description: "Checklists de abertura e fechamento por período.",
        path: "tasks",
        icon: ListChecks,
      },
      {
        id: "time_clock",
        label: "Ponto",
        description: "Registro de entrada e saída da equipe com PIN.",
        path: "time-clock",
        icon: Clock,
      },
    ],
  },
  {
    label: "Cardápio",
    modules: [
      {
        id: "products",
        label: "Produtos",
        description: "Preços, ficha técnica e CMV de cada produto.",
        path: "products",
        icon: Tag,
      },
      {
        id: "categories",
        label: "Categorias",
        description: "Organização dos produtos no PDV.",
        path: "categories",
        icon: LayoutGrid,
      },
    ],
  },
  {
    label: "Estoque",
    modules: [
      {
        id: "ingredients",
        label: "Insumos",
        description: "Matérias-primas, estoque e custo por unidade.",
        path: "ingredients",
        icon: Package,
      },
    ],
  },
  {
    label: "Gestão",
    modules: [
      {
        id: "suppliers",
        label: "Fornecedores",
        description: "Cadastro de fornecedores e contatos.",
        path: "suppliers",
        icon: Truck,
      },
      {
        id: "finance",
        label: "Financeiro",
        description: "Contas a pagar e receber, saldo e extrato.",
        path: "finance",
        icon: Banknote,
      },
      {
        id: "loyalty",
        label: "Fidelidade",
        description: "Clientes, selos e prêmios do programa de fidelidade.",
        path: "loyalty",
        icon: Gift,
      },
      {
        id: "sales_report",
        label: "Relatório de vendas",
        description: "Faturamento, mais vendidos, CMV e margem.",
        path: "sales-report",
        icon: ChartColumn,
      },
      {
        id: "employees",
        label: "Funcionários",
        description: "Cadastro, jornadas e espelho de ponto.",
        path: "employees",
        icon: Users,
      },
      {
        id: "payroll",
        label: "Folha de pagamento",
        description: "Holerites com horas extras, faltas e impostos.",
        path: "payroll",
        icon: Wallet,
      },
    ],
  },
] as const satisfies readonly AppModuleGroup[];

export const SETTINGS_PAGE = {
  label: "Configurações",
  description: "Estabelecimento, módulos e seu perfil.",
  path: "settings",
  icon: Settings,
} as const;

export const DEFAULT_MODULE_PATH = "pos";

export const APP_MODULES = APP_MODULE_GROUPS.flatMap(
  (group): readonly AppModule[] => group.modules,
);

export function getAppModule(moduleId: AppModuleId): AppModule {
  const appModule = APP_MODULES.find(({ id }) => id === moduleId);
  if (!appModule) throw new Error(`Unknown module: ${moduleId}`);
  return appModule;
}

export function getVisibleModuleGroups(
  hiddenModules: readonly AppModuleId[],
): AppModuleGroup[] {
  return APP_MODULE_GROUPS.map((group) => ({
    label: group.label,
    modules: group.modules.filter(({ id }) => !hiddenModules.includes(id)),
  })).filter((group) => group.modules.length > 0);
}

export function buildOrganizationPath(
  organizationSlug: string,
  path: string,
): string {
  return `/${organizationSlug}/${path}`;
}

export function buildOrganizationHomePath(
  organizationSlug: string,
  hiddenModules: readonly AppModuleId[],
): string {
  const firstVisibleModule = APP_MODULES.find(
    ({ id }) => !hiddenModules.includes(id),
  );
  return buildOrganizationPath(
    organizationSlug,
    firstVisibleModule?.path ?? SETTINGS_PAGE.path,
  );
}
