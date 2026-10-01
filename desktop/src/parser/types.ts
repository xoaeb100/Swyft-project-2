//
export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  type: string | null;
  originalTags: Record<string, string>[];
};

export type ParsedAccount = {
  bankName: string;
  accountHolder: string;
  accountType: string;
  bsb: string;
  accountNumber: string;
  currentBalance: number | null;
  availableBalance: number | null;
  transactions: ParsedTransaction[];
};

export type ParsedStatement = {
  format: "json" | "html";
  reference: string | null;
  submissionTime: string | null;
  accounts: ParsedAccount[];
};
