
//
import * as cheerio from "cheerio";
import type {
  ParsedAccount,
  ParsedStatement,
  ParsedTransaction,
} from "./types";

function parseMoney(value: string): number | null {
  const cleaned = value
    .replace(/[$,]/g, "")
    .replace(/\(CR\)/g, "")
    .replace(/\(DR\)/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  if (!Number.isFinite(number)) {
    return null;
  }

  return value.includes("(DR)") ? -Math.abs(number) : number;
}

function getAccountValue($: cheerio.CheerioAPI, label: string): string {
  const row = $("#account-details tr").filter((_, element) => {
    const text = $(element).find(".inner-header").first().text().trim();
    return text === label;
  });

  return row.find(".inner-value").first().text().trim();
}

export function parseIllionHtml(html: string): ParsedStatement {
  if (!html || typeof html !== "string") {
    throw new Error("Invalid HTML");
  }

  const $ = cheerio.load(html);

  const title = $("title").text().trim();

  if (title !== "BankStatements.com.au Statement") {
    throw new Error("Invalid illion HTML statement");
  }

  const bankName = getAccountValue($, "Institution:");
  const accountNumber = getAccountValue($, "Account Number:");
  const bsb = getAccountValue($, "BSB:");
  const accountType = getAccountValue($, "Account Type:");
  const accountHolder = getAccountValue($, "Account Holder:");
  //   const accountName = getAccountValue($, "Account Nickname:");

  if (!bankName || !accountNumber || !bsb || !accountHolder) {
    throw new Error("Invalid illion HTML statement: missing account details");
  }

  const transactions: ParsedTransaction[] = [];

  $("#transaction-table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 7) return;

    const dateCell = $(cells[0]);
    const description = $(cells[3]).text().trim();

    const rawDate = dateCell.attr("data-sort-value") ?? "";

    const dateMatch = rawDate.match(/^(\d{8})-/);

    const date = dateMatch
      ? `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
      : dateCell.text().trim();
    const category = $(cells[2]).text().trim();

    const credit = $(row)
      .find(".transaction-data-credit")
      .first()
      .text()
      .trim();
    const debit = $(row).find(".transaction-data-debit").first().text().trim();

    let amount: number | null = null;

    if (credit) {
      amount = parseMoney(credit);
    } else if (debit) {
      amount = parseMoney(debit);
      if (amount !== null) {
        amount = -Math.abs(amount);
      }
    }

    if (!date || !description || amount === null) {
      return;
    }
    transactions.push({
      date,
      description,
      amount,
      balance: parseMoney($(cells[6]).text().trim()),
      type: null,
      originalTags: category ? [{ category }] : [],
    });
  });

  const account: ParsedAccount = {
    bankName,
    accountHolder,
    accountType,
    bsb,
    accountNumber,
    currentBalance: parseMoney(getAccountValue($, "Closing Balance:")),
    availableBalance: parseMoney(getAccountValue($, "Available Balance:")),
    transactions,
  };

  return {
    format: "html",
    reference: null,
    submissionTime: getAccountValue($, "Submission Time:") || null,
    accounts: [account],
  };
}
