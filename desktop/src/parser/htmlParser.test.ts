import { describe, expect, it } from "vitest";
import { parseIllionHtml } from "./htmlParser";

describe("parseIllionHtml", () => {
  it("parses an Illion HTML statement", () => {
    const html = `
      <html>
        <head>
          <title>BankStatements.com.au Statement</title>
        </head>
        <body>
          <div id="account-details">
            <table>
              <tr>
                <td class="inner-header">Institution:</td>
                <td class="inner-value">ANZ</td>
              </tr>
              <tr>
                <td class="inner-header">Account Number:</td>
                <td class="inner-value">123456789</td>
              </tr>
              <tr>
                <td class="inner-header">BSB:</td>
                <td class="inner-value">123456</td>
              </tr>
              <tr>
                <td class="inner-header">Account Type:</td>
                <td class="inner-value">Everyday</td>
              </tr>
              <tr>
                <td class="inner-header">Account Holder:</td>
                <td class="inner-value">Test User</td>
              </tr>
            </table>
          </div>

          <table id="transaction-table">
            <tbody>
              <tr>
                <td class="transaction-data-date" data-sort-value="20250929-7">
                  Mon 29 Sep
                </td>
                <td class="transaction-data-indicator"></td>
                <td class="transaction-data-category">External Transfers</td>
                <td class="transaction-data-description">
                  ANZ MOBILE BANKING PAYMENT 834171 TO A-T
                </td>
                <td class="transaction-data-debit">$760.00</td>
                <td class="transaction-data-credit"></td>
                <td class="transaction-data-amount">$0.55</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const result = parseIllionHtml(html);

    expect(result.format).toBe("html");
    expect(result.accounts).toHaveLength(1);

    expect(result.accounts[0].bankName).toBe("ANZ");
    expect(result.accounts[0].accountNumber).toBe("123456789");

    expect(result.accounts[0].transactions).toHaveLength(1);

    const transaction = result.accounts[0].transactions[0];

    expect(transaction.date).toBe("2025-09-29");
    expect(transaction.description).toBe(
      "ANZ MOBILE BANKING PAYMENT 834171 TO A-T",
    );
    expect(transaction.amount).toBe(-760);
  });

  it("rejects non-Illion HTML", () => {
    expect(() =>
      parseIllionHtml(`
        <html>
          <head>
            <title>Some Other Statement</title>
          </head>
        </html>
      `),
    ).toThrow("Invalid illion HTML statement");
  });
});
