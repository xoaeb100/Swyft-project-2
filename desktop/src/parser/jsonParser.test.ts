import { describe, expect, it } from "vitest";
import { parseIllionJson } from "./jsonParser";

describe("parseIllionJson", () => {
  it("parses a valid illion JSON statement", () => {
    const input = {
      dataVersion: 20170401,
      reference: "TEST-123",
      submissionTime: "2025-12-27T08:34:31",
      bankData: {
        bankName: "ANZ",
        bankSlug: "anz",
        bankAccounts: [
          {
            id: 0,
            accountType: "transaction",
            accountHolder: "Test User",
            accountName: "Everyday Account",
            bsb: "123456",
            accountNumber: "123456789",
            currentBalance: "1000.50",
            availableBalance: "900.50",
            transactions: [
              {
                date: "2025-12-22",
                text: "TEST PAYMENT",
                amount: -199,
                balance: "801.50",
                type: "General Payment",
                tags: [{ thirdParty: "Test Merchant" }],
              },
            ],
          },
        ],
      },
    };

    const result = parseIllionJson(input);

    expect(result.format).toBe("json");
    expect(result.reference).toBe("TEST-123");
    expect(result.accounts).toHaveLength(1);

    expect(result.accounts[0].bankName).toBe("ANZ");
    expect(result.accounts[0].accountNumber).toBe("123456789");

    expect(result.accounts[0].transactions).toHaveLength(1);
    expect(result.accounts[0].transactions[0].amount).toBe(-199);
    expect(result.accounts[0].transactions[0].description).toBe(
      "TEST PAYMENT",
    );
  });

  it("rejects invalid illion JSON", () => {
    expect(() => parseIllionJson({})).toThrow(
      "Invalid illion JSON: missing dataVersion",
    );
  });
});