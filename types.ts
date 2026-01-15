
export enum Rank {
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S'
}

export enum Job {
  NONE = 'Nenhum',
  MAGE = 'Mago',
  ASSASSIN = 'Assassino',
  WARRIOR = 'Guerreiro',
  NECROMANCER = 'Monarca das Sombras'
}

export enum Title {
  NEWBIE = 'O Recém-Desperto',
  SLAUGHTERER = 'O Carniceiro',
  MONARCH = 'Monarca das Sombras'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

export enum Recurrence {
  NONE = 'Nenhuma',
  DAILY = 'Diária',
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensal'
}

export interface Stats {
  force: number;
  intelligence: number;
  focus: number;
  vitality: number;
  charisma: number;
}

export interface Quest {
  id: string;
  name: string;
  target: number;
  current: number;
  description: string;
  priority: Priority;
  rewardXP: number;
  rewardRankPoints: number;
  recurrence: Recurrence;
  nextAvailableAt?: string; // ISO String
}

export interface Player {
  name: string;
  level: number;
  rank: Rank;
  rankPoints: number;
  job: Job;
  title: Title;
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  fatigue: number;
  stats: Stats;
  statPoints: number;
  gold: number;
  exp: number;
  expToNext: number;
}
