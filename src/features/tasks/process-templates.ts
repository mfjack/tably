import type { TaskFrequency, TaskKind, TaskPeriod } from "./types";

export const PROCESS_SEGMENTS = ["all", "cafe", "restaurant", "acai"] as const;

export type ProcessSegment = (typeof PROCESS_SEGMENTS)[number];

export const PROCESS_SEGMENT_LABELS = {
  all: "Para todos",
  cafe: "Cafeteria",
  restaurant: "Restaurante e lanchonete",
  acai: "Açaiteria e sorveteria",
} as const satisfies Record<ProcessSegment, string>;

export type ProcessTemplateTask = {
  title: string;
  frequency?: TaskFrequency;
  dueWeekday?: number;
  dueDay?: number;
  kind?: TaskKind;
  minTemperature?: number;
  maxTemperature?: number;
  instructions?: string;
};

export type ProcessTemplate = {
  id: string;
  segment: ProcessSegment;
  name: string;
  period: TaskPeriod;
  description: string;
  tasks: readonly ProcessTemplateTask[];
};

const FRIDGE_RANGE = {
  kind: "temperature",
  minTemperature: 0,
  maxTemperature: 5,
} as const;
const FREEZER_RANGE = { kind: "temperature", maxTemperature: -18 } as const;
const HOT_HOLDING_RANGE = { kind: "temperature", minTemperature: 60 } as const;

const FRIDGE_INSTRUCTIONS =
  "Leia o termômetro sem deixar a porta aberta por muito tempo e anote. Fora de 0 a 5 °C, avise o responsável, confira a vedação da porta e não sirva laticínios, carnes e preparos sensíveis até verificar.";
const FREEZER_INSTRUCTIONS =
  "O freezer deve estar em -18 °C ou menos. Se estiver acima, confira se a porta fechou direito e avise o responsável. Alimento que descongelou não pode voltar a congelar.";

export const PROCESS_TEMPLATES: readonly ProcessTemplate[] = [
  {
    id: "opening",
    segment: "all",
    name: "Abertura da loja",
    period: "opening",
    description:
      "Higiene, conferência de validade, caixa e reposição antes de abrir.",
    tasks: [
      {
        title: "Lavar as mãos e vestir uniforme, touca e avental",
        instructions:
          "Lave as mãos e os antebraços com sabonete por pelo menos 20 segundos, enxágue e seque com papel toalha. Sem anéis, pulseiras e relógio. Cabelo totalmente preso dentro da touca.",
      },
      {
        title: "Higienizar bancadas e superfícies de preparo",
        instructions:
          "Retire os resíduos, lave com água e detergente, enxágue e aplique álcool 70% ou solução clorada. Deixe secar naturalmente, sem pano.",
      },
      {
        title: "Conferir validade dos itens abertos e etiquetados",
        instructions:
          "Use o PVPS: primeiro que vence, primeiro que sai. Item vencido ou sem etiqueta vai para o descarte, sem exceção.",
      },
      {
        title: "Ligar os equipamentos e conferir se estão funcionando",
      },
      {
        title: "Abrir o caixa e conferir o troco",
        instructions:
          "Conte o fundo de troco e registre no sistema ao abrir o caixa. Diferença em relação ao fechamento de ontem deve ser avisada ao responsável.",
      },
      {
        title: "Repor descartáveis: copos, tampas, guardanapos e sacolas",
      },
      {
        title: "Conferir limpeza do salão, banheiro e fachada",
      },
    ],
  },
  {
    id: "closing",
    segment: "all",
    name: "Fechamento da loja",
    period: "closing",
    description:
      "Caixa, alimentos guardados e etiquetados, limpeza e segurança.",
    tasks: [
      {
        title: "Fechar o caixa e conferir os valores",
        instructions:
          "Conte o dinheiro da gaveta e informe no fechamento do sistema. Anote o motivo de qualquer sobra ou falta.",
      },
      {
        title: "Etiquetar e guardar os alimentos abertos ou preparados",
        instructions:
          "Toda embalagem aberta ou preparo leva etiqueta com nome, data de abertura ou preparo e validade. Guarde tampado, na geladeira certa, sem encostar no fundo.",
      },
      {
        title:
          "Descartar alimentos vencidos, sem etiqueta ou que sobraram expostos",
      },
      {
        title: "Lavar e higienizar utensílios, pias e bancadas",
      },
      {
        title: "Varrer e lavar o piso da área de preparo",
        instructions:
          "Use rodo e pano exclusivos da cozinha. Nunca varra a seco perto de alimentos expostos.",
      },
      {
        title: "Retirar o lixo e higienizar as lixeiras",
      },
      {
        title: "Desligar equipamentos, menos geladeiras e freezers",
      },
      {
        title: "Conferir gás, torneiras, portas, janelas e alarme",
      },
    ],
  },
  {
    id: "temperature-control",
    segment: "all",
    name: "Controle de temperatura",
    period: "food_safety",
    description:
      "Registro diário da refrigeração, como pede a vigilância sanitária.",
    tasks: [
      {
        title: "Geladeira: temperatura da manhã",
        ...FRIDGE_RANGE,
        instructions: FRIDGE_INSTRUCTIONS,
      },
      {
        title: "Geladeira: temperatura da tarde",
        ...FRIDGE_RANGE,
        instructions: FRIDGE_INSTRUCTIONS,
      },
      {
        title: "Freezer: temperatura da manhã",
        ...FREEZER_RANGE,
        instructions: FREEZER_INSTRUCTIONS,
      },
      {
        title: "Freezer: temperatura da tarde",
        ...FREEZER_RANGE,
        instructions: FREEZER_INSTRUCTIONS,
      },
    ],
  },
  {
    id: "receiving",
    segment: "all",
    name: "Recebimento de mercadorias",
    period: "food_safety",
    description: "O que conferir antes de aceitar uma entrega.",
    tasks: [
      {
        title: "Temperatura dos refrigerados na entrega",
        kind: "temperature",
        minTemperature: 0,
        maxTemperature: 7,
        instructions:
          "Meça com o termômetro na embalagem do produto. Acima de 7 °C (ou acima do indicado pelo fabricante), recuse a mercadoria e avise o fornecedor.",
      },
      {
        title: "Conferir validade, lote e integridade das embalagens",
        instructions:
          "Recuse embalagens amassadas, estufadas, furadas ou com validade curta demais para o seu consumo.",
      },
      {
        title: "Guardar primeiro os congelados e refrigerados",
        instructions:
          "Congelados e refrigerados não podem ficar fora da refrigeração por mais de 30 minutos. Os secos vão por último, longe do chão e da parede.",
      },
      {
        title: "Dar entrada da compra no sistema",
      },
    ],
  },
  {
    id: "weekly-cleaning",
    segment: "all",
    name: "Limpeza pesada da semana",
    period: "cleaning",
    description: "Limpezas profundas que não cabem na rotina do dia.",
    tasks: [
      {
        title: "Higienizar geladeiras e freezers por dentro",
        frequency: "weekly",
        instructions:
          "Transfira os alimentos para outra refrigeração, lave prateleiras e borrachas com detergente, enxágue e passe álcool 70%.",
      },
      {
        title: "Organizar e limpar as prateleiras do estoque",
        frequency: "weekly",
        instructions:
          "Itens a pelo menos 25 cm do chão e afastados da parede. Produtos de limpeza sempre separados dos alimentos.",
      },
      {
        title: "Lavar paredes, azulejos e portas da área de preparo",
        frequency: "weekly",
      },
      {
        title: "Limpar ralos e grelhas do piso",
        frequency: "weekly",
      },
    ],
  },
  {
    id: "monthly-routine",
    segment: "all",
    name: "Rotina do mês",
    period: "cleaning",
    description: "Manutenções e conferências que costumam ser esquecidas.",
    tasks: [
      {
        title: "Conferir validade e carga dos extintores",
        frequency: "monthly",
      },
      {
        title: "Conferir o comprovante de dedetização e a próxima data",
        frequency: "monthly",
        instructions:
          "A dedetização deve ser feita por empresa licenciada. Guarde o comprovante em Documentos para mostrar na fiscalização.",
      },
      {
        title: "Limpar os filtros do ar-condicionado",
        frequency: "monthly",
      },
      {
        title: "Conferir a data da próxima limpeza da caixa d'água",
        frequency: "monthly",
        instructions:
          "A caixa d'água deve ser lavada a cada 6 meses, com comprovante.",
      },
      {
        title: "Fazer a contagem do estoque",
        frequency: "monthly",
      },
    ],
  },
  {
    id: "cafe-opening",
    segment: "cafe",
    name: "Bar de café: abertura",
    period: "opening",
    description:
      "Máquina de espresso, moagem e leite prontos para o primeiro café.",
    tasks: [
      {
        title: "Purgar os grupos e passar um shot de descarte",
        instructions:
          "Ligue a máquina pelo menos 20 minutos antes. Purgue cada grupo por 3 segundos e descarte o primeiro shot para aquecer o portafiltro.",
      },
      {
        title: "Regular a moagem e conferir a extração",
        instructions:
          "Pese a dose e cronometre: o espresso deve extrair entre 25 e 30 segundos. Mais rápido, afine a moagem; mais lento, engrosse.",
      },
      {
        title: "Abastecer o moedor só com os grãos do dia",
        instructions:
          "Grão parado na campânula perde sabor. Coloque a quantidade que será usada e feche bem o pacote.",
      },
      {
        title: "Purgar e limpar o bico vaporizador",
      },
      {
        title: "Temperatura da geladeira do leite",
        ...FRIDGE_RANGE,
        instructions: FRIDGE_INSTRUCTIONS,
      },
    ],
  },
  {
    id: "cafe-closing",
    segment: "cafe",
    name: "Bar de café: fechamento",
    period: "closing",
    description: "Limpeza da máquina, do moedor e dos utensílios do bar.",
    tasks: [
      {
        title: "Fazer o backflush com detergente nos grupos",
        instructions:
          "Use o cesto cego com detergente próprio para máquina de café. Faça ciclos de 10 segundos ligado e 10 desligado, depois repita só com água.",
      },
      {
        title: "Deixar portafiltros e cestos de molho",
      },
      {
        title: "Limpar o bico vaporizador e as grelhas",
      },
      {
        title: "Retirar os grãos e limpar o moedor",
      },
      {
        title: "Lavar as jarras de leite e os utensílios do bar",
      },
      {
        title: "Descartar o leite aberto fora da validade",
        instructions:
          "Leite aberto dura o que o fabricante indica na embalagem, normalmente até 3 dias na geladeira.",
      },
    ],
  },
  {
    id: "cafe-maintenance",
    segment: "cafe",
    name: "Bar de café: manutenção",
    period: "cleaning",
    description: "Cuidados semanais e mensais com o equipamento.",
    tasks: [
      {
        title: "Limpar o moedor por dentro com pastilhas de limpeza",
        frequency: "weekly",
      },
      {
        title: "Trocar a água do reservatório e conferir o filtro",
        frequency: "weekly",
      },
      {
        title: "Descalcificar a máquina e conferir as borrachas do grupo",
        frequency: "monthly",
        instructions:
          "Borracha ressecada faz o portafiltro vazar. Troque se estiver dura ou rachada.",
      },
    ],
  },
  {
    id: "kitchen-opening",
    segment: "restaurant",
    name: "Cozinha: abertura",
    period: "opening",
    description: "Refrigeração, óleo e mise en place antes do serviço.",
    tasks: [
      {
        title: "Temperatura da câmara ou geladeira de carnes",
        ...FRIDGE_RANGE,
        instructions: FRIDGE_INSTRUCTIONS,
      },
      {
        title: "Conferir o óleo da fritadeira",
        instructions:
          "Troque o óleo se estiver escuro, com cheiro forte, fazendo muita espuma ou soltando fumaça antes de 180 °C.",
      },
      {
        title: "Ligar a coifa antes de acender o fogo",
      },
      {
        title: "Conferir o mise en place e o que precisa ser produzido",
      },
      {
        title: "Descongelar na geladeira o que será usado amanhã",
        instructions:
          "Nunca descongele em temperatura ambiente nem na pia. Na geladeira, o alimento descongelado dura até 72 horas.",
      },
    ],
  },
  {
    id: "kitchen-service",
    segment: "restaurant",
    name: "Cozinha: durante o serviço",
    period: "service",
    description:
      "Temperatura dos alimentos expostos e cuidados com contaminação.",
    tasks: [
      {
        title: "Temperatura dos alimentos quentes no buffet ou passa-prato",
        ...HOT_HOLDING_RANGE,
        instructions:
          "Alimento quente deve ficar a 60 °C ou mais. Abaixo disso, pode ficar exposto por no máximo 1 hora e depois deve ser descartado.",
      },
      {
        title: "Temperatura dos alimentos frios expostos",
        kind: "temperature",
        maxTemperature: 5,
        instructions:
          "Saladas, sobremesas e frios expostos devem ficar a 5 °C ou menos. Acima de 10 °C, só podem ficar expostos por até 2 horas.",
      },
      {
        title: "Trocar as tábuas e facas entre crus e prontos",
        instructions:
          "Use cores diferentes: vermelha para carnes cruas, verde para vegetais e branca para prontos. Nunca use a mesma tábua sem lavar.",
      },
    ],
  },
  {
    id: "kitchen-closing",
    segment: "restaurant",
    name: "Cozinha: fechamento",
    period: "closing",
    description: "Sobras, fritadeira, chapa e fogão.",
    tasks: [
      {
        title: "Resfriar e guardar as sobras corretamente",
        instructions:
          "Reduza de 60 °C para 10 °C em até 2 horas, em recipientes rasos. Etiquete com nome e data e use em até 3 dias.",
      },
      {
        title: "Filtrar ou trocar o óleo da fritadeira",
      },
      {
        title: "Limpar chapa, fogão, forno e coifa externa",
      },
      {
        title: "Limpar os filtros da coifa",
        frequency: "weekly",
        instructions:
          "Gordura acumulada nos filtros é a principal causa de incêndio em cozinha.",
      },
      {
        title: "Limpar a caixa de gordura",
        frequency: "monthly",
      },
    ],
  },
  {
    id: "acai-opening",
    segment: "acai",
    name: "Açaí: abertura",
    period: "opening",
    description: "Freezer, expositor e acompanhamentos prontos.",
    tasks: [
      {
        title: "Temperatura do freezer de açaí",
        ...FREEZER_RANGE,
        instructions: FREEZER_INSTRUCTIONS,
      },
      {
        title: "Temperatura do expositor",
        kind: "temperature",
        maxTemperature: -12,
        instructions:
          "O expositor deve estar a -12 °C ou menos. Mais quente, o açaí perde textura e pode cristalizar quando volta a congelar.",
      },
      {
        title: "Montar os acompanhamentos em potes limpos e tampados",
        instructions:
          "Use uma colher exclusiva para cada pote, para não misturar alergênicos como amendoim, leite em pó e granola.",
      },
      {
        title: "Conferir validade de coberturas, caldas e frutas",
      },
      {
        title: "Higienizar e cortar as frutas do dia",
        instructions:
          "Lave em água corrente, deixe 15 minutos de molho em solução clorada própria para alimentos, enxágue e corte. Guarde na geladeira, tampado.",
      },
    ],
  },
  {
    id: "acai-closing",
    segment: "acai",
    name: "Açaí: fechamento",
    period: "closing",
    description: "Higiene da batedeira, dos potes e do expositor.",
    tasks: [
      {
        title: "Higienizar a batedeira ou o processador",
      },
      {
        title: "Lavar colheres, conchas e potes dos acompanhamentos",
      },
      {
        title: "Guardar as frutas cortadas etiquetadas na geladeira",
      },
      {
        title: "Limpar o expositor, as tampas e o balcão",
      },
      {
        title: "Fazer o degelo e a higienização do freezer de açaí",
        frequency: "monthly",
        instructions:
          "Passe o açaí para outro freezer, desligue, deixe descongelar, lave com detergente, seque bem e só religue vazio. Volte o produto quando chegar a -18 °C.",
      },
    ],
  },
];

export function getProcessTemplate(templateId: string) {
  return PROCESS_TEMPLATES.find((template) => template.id === templateId);
}
