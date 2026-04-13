export interface Client {
  id: string;
  name: string;
  cnpj: string;
  ccm: string;
  city: string;
  accessType: string;
  accessLink: string;
  login: string;
  password: string;
  active: boolean;
  createdAt: string;
  startMonth: number;
  startYear: number;
}

export type StatusValue = 'yes' | 'no' | 'pending' | 'attention';

export interface MonthlyStatus {
  id: string;
  clientId: string;
  year: number;
  month: number;
  movi: StatusValue;
  servPrest: StatusValue;
  servTomad: StatusValue;
  pisCofins: StatusValue;
  irpjCsll: StatusValue;
  iss: StatusValue;
  debitos: StatusValue;
  hidden?: boolean;
}

export interface Period {
  id: string; // YYYY_MM
  closed: boolean;
}

export const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];
