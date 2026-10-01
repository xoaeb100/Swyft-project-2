import type {
  ParsedAccount,
  ParsedStatement,
  ParsedTransaction,
} from "./types";

type IllionJson = {
  dataVersion?: number;
  reference?: string;
  submissionTime?: string;
  bankData?: {
    bankName?: string;
    bankSlug?: string;
    bankAccounts?: Array<{
      id?: number;
      accountType?: string;
      accountHolder?: string;
      accountName?: string;
      bsb?: string;
      accountNumber?: string;
      currentBalance?: string | number;
      availableBalance?: string | number;
      transactions?: Array<{
        date?: string;
        text?: string;
        amount?: number | string;
        balance?: number | string;
        type?: string;
        tags?: Record<string, string>[];
      }>;
    }>;
  };
};

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}
//
export function parseIllionJson(input: unknown): ParsedStatement {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid JSON: expected an object");
  }

  const data = input as IllionJson;

  if (data.dataVersion === undefined) {
    throw new Error("Invalid illion JSON: missing dataVersion");
  }

  if (!data.bankData || !Array.isArray(data.bankData.bankAccounts)) {
    throw new Error("Invalid illion JSON: missing bankData.bankAccounts");
  }

  const accounts: ParsedAccount[] = data.bankData.bankAccounts.map(
    (account) => {
      const transactions: ParsedTransaction[] = (
        account.transactions ?? []
      ).map((transaction) => ({
        date: transaction.date ?? "",
        description: transaction.text ?? "",
        amount: toNumber(transaction.amount) ?? 0,
        balance: toNumber(transaction.balance),
        type: transaction.type ?? null,
        originalTags: transaction.tags ?? [],
      }));

      return {
        bankName: data.bankData?.bankName ?? "",
        accountHolder: account.accountHolder ?? "",
        accountType: account.accountType ?? "",
        bsb: account.bsb ?? "",
        accountNumber: account.accountNumber ?? "",
        currentBalance: toNumber(account.currentBalance),
        availableBalance: toNumber(account.availableBalance),
        transactions,
      };
    },
  );

  return {
    format: "json",
    reference: data.reference ?? null,
    submissionTime: data.submissionTime ?? null,
    accounts,
  };
}
