export enum GateType {
  MBBANK = 'MBBANK',
  ACBBANK = 'ACBBANK',
}
export interface Payment {
  transaction_id: string;
  content: string;
  amount: number;
  date: Date;
  gate: GateType;
  account_receiver: string;
}

export interface GateConfig {
  name: string;
  type: GateType;
  password?: string;
  login_id?: string;
  account: string;
  token: string;
  repeat_interval_in_sec: number;
}
