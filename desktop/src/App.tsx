import { useEffect, useState } from "react";
import {
  createDeal,
  saveStatement,
  getDeals,
  getDeal,
  updateTransaction,
  updateDeal,
} from "./api";
import { parseIllionJson } from "./parser/jsonParser";
import { parseIllionHtml } from "./parser/htmlParser";
import type { ParsedStatement } from "./parser/types";
type User = {
  email?: string;
  displayName?: string;
};

type DealType = "Consumer" | "Commercial";

type DealStatus = "Uploaded" | "Parsed" | "Checked" | "Completed";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [transactionTags, setTransactionTags] = useState<
    Record<string, string>
  >({});

  const [transactionAnnotations, setTransactionAnnotations] = useState<
    Record<string, string>
  >({});
  const getTransactionKey = (accountIndex: number, transactionIndex: number) =>
    `${accountIndex}-${transactionIndex}`;

  const isLikelyTransfer = (
    accountIndex: number,
    transactionIndex: number,
  ): boolean => {
    if (!statement) {
      return false;
    }

    const transaction =
      statement.accounts[accountIndex]?.transactions[transactionIndex];

    if (!transaction) {
      return false;
    }

    const description = transaction.description.toLowerCase();

    const transferKeywords = [
      "transfer",
      "internal transfer",
      "interbank",
      "fund transfer",
      "own account",
    ];

    if (transferKeywords.some((keyword) => description.includes(keyword))) {
      return true;
    }

    return statement.accounts.some((account, otherAccountIndex) => {
      if (otherAccountIndex === accountIndex) {
        return false;
      }

      return account.transactions.some((otherTransaction) => {
        return (
          otherTransaction.date === transaction.date &&
          Math.abs(otherTransaction.amount + transaction.amount) < 0.01
        );
      });
    });
  };

  const exportTransactionsToCsv = () => {
    if (!statement) {
      return;
    }

    const account = statement.accounts[selectedAccountIndex];

    if (!account) {
      return;
    }

    const headers = [
      "Date",
      "Description",
      "Amount",
      "Balance",
      "Type",
      "Tag",
      "Annotation",
    ];

    const escapeCsv = (value: string | number | null) => {
      if (value === null || value === undefined) {
        return "";
      }

      const stringValue = String(value);

      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const rows = account.transactions.map((transaction, index) => {
      const key = getTransactionKey(selectedAccountIndex, index);

      return [
        transaction.date,
        transaction.description,
        transaction.amount.toFixed(2),
        transaction.balance !== null ? transaction.balance.toFixed(2) : "",
        transaction.type ?? "",
        transactionTags[key] ?? "",
        transactionAnnotations[key] ?? "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `bank-statement-${account.accountNumber}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };
  const [dealType, setDealType] = useState<DealType>("Consumer");
  const [dealStatus, setDealStatus] = useState<DealStatus>("Uploaded");
  const [transactionIds, setTransactionIds] = useState<Record<string, string>>(
    {},
  );
  const [latestDealId, setLatestDealId] = useState<string | null>(null);
  const restoreLatestDeal = async () => {
    try {
      const dealsResponse = await getDeals();

      if (!dealsResponse.ok) {
        return;
      }

      const deals = await dealsResponse.json();

      if (!deals.length) {
        return;
      }

      const latestDeal = deals[0];

      const dealResponse = await getDeal(latestDeal.id);

      if (!dealResponse.ok) {
        return;
      }

      const deal = await dealResponse.json();

      setLatestDealId(deal.id);

      const latestStatement = deal.statements?.[deal.statements.length - 1];

      if (!latestStatement) {
        return;
      }

      const restoredTransactionIds: Record<string, string> = {};
      const restoredTags: Record<string, string> = {};
      const restoredAnnotations: Record<string, string> = {};

      const restoredStatement: ParsedStatement = {
        format: latestStatement.format,
        reference: latestStatement.reference,
        submissionTime: latestStatement.submissionTime,

        accounts: latestStatement.accounts.map(
          (account: any, accountIndex: number) => ({
            bankName: account.bankName,
            accountHolder: account.accountHolder,
            accountType: account.accountType,
            bsb: account.bsb,
            accountNumber: account.accountNumber,

            currentBalance:
              account.currentBalance !== null
                ? Number(account.currentBalance)
                : null,

            availableBalance:
              account.availableBalance !== null
                ? Number(account.availableBalance)
                : null,

            transactions: account.transactions.map(
              (transaction: any, transactionIndex: number) => {
                const key = getTransactionKey(accountIndex, transactionIndex);

                restoredTransactionIds[key] = transaction.id;

                if (transaction.tag) {
                  restoredTags[key] = transaction.tag;
                }

                if (transaction.annotation) {
                  restoredAnnotations[key] = transaction.annotation;
                }

                return {
                  date: transaction.date,
                  description: transaction.description,
                  amount: Number(transaction.amount),

                  balance:
                    transaction.balance !== null
                      ? Number(transaction.balance)
                      : null,

                  type: transaction.type,
                  originalTags: transaction.originalTags ?? [],
                };
              },
            ),
          }),
        ),
      };

      setTransactionIds(restoredTransactionIds);
      setTransactionTags(restoredTags);
      setTransactionAnnotations(restoredAnnotations);

      setStatement(restoredStatement);
      setSelectedAccountIndex(0);
      setSearch("");

      setDealType(latestDeal.type === "commercial" ? "Commercial" : "Consumer");

      setDealStatus(
        latestDeal.status === "checked"
          ? "Checked"
          : latestDeal.status === "completed"
            ? "Completed"
            : latestDeal.status === "parsed"
              ? "Parsed"
              : "Uploaded",
      );
    } catch (err) {
      console.error("Failed to restore latest deal:", err);
    }
  };
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await window.electronAPI.getSession();

        if (session) {
          setUser({
            displayName: "Signed-in user",
          });
          await restoreLatestDeal();
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setError("");

      const result = await window.electronAPI.signIn();

      setUser({
        email: result.email,
        displayName: result.displayName,
      });
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <p>Loading...</p>
      </main>
    );
  }

  if (user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <section style={{ textAlign: "center" }}>
          <h1>Welcome to Swyft Finance</h1>

          <button
            onClick={async () => {
              try {
                const files = await window.electronAPI.pickStatementFile();

                if (!files || files.length === 0) {
                  return;
                }

                const parsedStatements = files.map(({ filePath, content }) => {
                  const extension = filePath.split(".").pop()?.toLowerCase();
                  //
                  if (extension === "json") {
                    return parseIllionJson(JSON.parse(content));
                  }
                  //
                  if (extension === "html" || extension === "htm") {
                    return parseIllionHtml(content);
                  }

                  throw new Error(`Unsupported statement format: ${extension}`);
                });

                const combinedStatement: ParsedStatement = {
                  format: parsedStatements[0].format,
                  reference: parsedStatements[0].reference,
                  submissionTime: parsedStatements[0].submissionTime,
                  accounts: parsedStatements.flatMap(
                    (parsedStatement) => parsedStatement.accounts,
                  ),
                };

                console.log("Parsed statements:", parsedStatements);
                console.log("Combined statement:", combinedStatement);

                const dealResponse = await createDeal(dealType);

                if (!dealResponse.ok) {
                  throw new Error("Failed to create deal");
                }

                const deal = await dealResponse.json();

                setLatestDealId(deal.id);

                const firstFile = files[0];

                const sourceFileName = firstFile.filePath.split(/[\\/]/).pop();

                const saveResponse = await saveStatement(deal.id, {
                  ...combinedStatement,
                  sourceFileName,
                  sourceFileContent: firstFile.content,
                });

                if (!saveResponse.ok) {
                  throw new Error("Failed to save statement");
                }

                const saveResult = await saveResponse.json();

                const savedTransactionIds: Record<string, string> = {};

                saveResult.accounts.forEach(
                  (
                    account: { transactionIds: string[] },
                    accountIndex: number,
                  ) => {
                    account.transactionIds.forEach(
                      (transactionId: string, transactionIndex: number) => {
                        savedTransactionIds[
                          getTransactionKey(accountIndex, transactionIndex)
                        ] = transactionId;
                      },
                    );
                  },
                );

                setTransactionIds(savedTransactionIds);
                setTransactionTags({});
                setTransactionAnnotations({});

                setStatement(combinedStatement);
                setSelectedAccountIndex(0);
                setSearch("");
                setDealStatus("Parsed");
              } catch (err) {
                console.error("Statement parsing failed:", err);
              }
            }}
          >
            Upload Statement
          </button>
          {statement && (
            <section style={{ marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  overflowX: "auto",
                  marginBottom: "20px",
                }}
              >
                {statement.accounts.map((account, index) => (
                  <button
                    key={`${account.accountNumber}-${index}`}
                    onClick={() => {
                      setSelectedAccountIndex(index);
                      setSearch("");
                    }}
                    style={{
                      minWidth: "180px",
                      padding: "16px",
                      border:
                        selectedAccountIndex === index
                          ? "2px solid #4f8cff"
                          : "1px solid #444",
                      borderRadius: "10px",
                      background:
                        selectedAccountIndex === index ? "#1d2a44" : "#1b1f26",
                      color: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      {account.bankName}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#b8bec9",
                      }}
                    >
                      {account.accountNumber} · {account.transactions.length}{" "}
                      txns
                    </div>
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                  padding: "16px",
                  border: "1px solid #333",
                  borderRadius: "10px",
                  background: "#151922",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9aa3b2",
                      marginBottom: "6px",
                    }}
                  >
                    Analysis Mode
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={async () => {
                        setDealType("Consumer");

                        if (latestDealId) {
                          await updateDeal(latestDealId, {
                            type: "consumer",
                          });
                        }
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border:
                          dealType === "Consumer"
                            ? "2px solid #4f8cff"
                            : "1px solid #444",
                        background:
                          dealType === "Consumer" ? "#1d2a44" : "#1b1f26",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Consumer
                    </button>

                    <button
                      onClick={async () => {
                        setDealType("Commercial");

                        if (latestDealId) {
                          await updateDeal(latestDealId, {
                            type: "commercial",
                          });
                        }
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border:
                          dealType === "Commercial"
                            ? "2px solid #4f8cff"
                            : "1px solid #444",
                        background:
                          dealType === "Commercial" ? "#1d2a44" : "#1b1f26",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Commercial
                    </button>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9aa3b2",
                      marginBottom: "6px",
                    }}
                  >
                    Deal Status
                  </div>

                  <select
                    value={dealStatus}
                    onChange={async (event) => {
                      const value = event.target.value as DealStatus;

                      setDealStatus(value);

                      if (latestDealId) {
                        await updateDeal(latestDealId, {
                          status: value.toLowerCase() as
                            | "uploaded"
                            | "parsed"
                            | "checked"
                            | "completed",
                        });
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #444",
                      background: "#1b1f26",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Uploaded">Uploaded</option>
                    <option value="Parsed">Parsed</option>
                    <option value="Checked">Checked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              {statement.accounts[selectedAccountIndex] &&
                (() => {
                  const transactions =
                    statement.accounts[selectedAccountIndex].transactions;

                  const totalIncome = transactions
                    .filter((transaction) => transaction.amount > 0)
                    .reduce((sum, transaction) => sum + transaction.amount, 0);

                  const totalExpenses = transactions
                    .filter((transaction) => transaction.amount < 0)
                    .reduce(
                      (sum, transaction) => sum + Math.abs(transaction.amount),
                      0,
                    );

                  const netCashFlow = totalIncome - totalExpenses;

                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          padding: "16px",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          background: "#151922",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#9aa3b2" }}>
                          Income
                        </div>
                        <strong style={{ fontSize: "20px" }}>
                          {totalIncome.toFixed(2)}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: "16px",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          background: "#151922",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#9aa3b2" }}>
                          Expenses
                        </div>
                        <strong style={{ fontSize: "20px" }}>
                          {totalExpenses.toFixed(2)}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: "16px",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          background: "#151922",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#9aa3b2" }}>
                          Net Cash Flow
                        </div>
                        <strong style={{ fontSize: "20px" }}>
                          {netCashFlow.toFixed(2)}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: "16px",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          background: "#151922",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#9aa3b2" }}>
                          Transactions
                        </div>
                        <strong style={{ fontSize: "20px" }}>
                          {transactions.length}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              <h2>Statement</h2>
              <button
                onClick={exportTransactionsToCsv}
                style={{
                  padding: "8px 14px",
                  marginBottom: "16px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "#1d2a44",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
              <p>
                <strong>Analysis mode:</strong> {dealType}
              </p>

              <p>
                <strong>Status:</strong> {dealStatus}
              </p>
              <p>
                <strong>Bank:</strong>{" "}
                {statement.accounts[selectedAccountIndex]?.bankName}
              </p>

              <p>
                <strong>Account holder:</strong>{" "}
                {statement.accounts[selectedAccountIndex]?.accountHolder}
              </p>

              <p>
                <strong>Account type:</strong>{" "}
                {statement.accounts[selectedAccountIndex]?.accountType}
              </p>

              <p>
                <strong>Account number:</strong>{" "}
                {statement.accounts[selectedAccountIndex]?.accountNumber}
              </p>

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "16px",
                  marginBottom: "12px",
                  boxSizing: "border-box",
                }}
              />
              <p>
                <strong>Transactions:</strong>{" "}
                {statement.accounts[selectedAccountIndex]?.transactions
                  .length ?? 0}
              </p>
              <h3>Transactions</h3>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "12px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Date
                      </th>

                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Description
                      </th>

                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Amount
                      </th>

                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Balance
                      </th>

                      <th style={{ textAlign: "left", padding: "8px" }}>Tag</th>

                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Annotation
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Type
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {statement.accounts[selectedAccountIndex]?.transactions
                      .map((transaction, transactionIndex) => ({
                        transaction,
                        transactionIndex,
                      }))
                      .filter(({ transaction }) => {
                        const query = search.toLowerCase().trim();

                        if (!query) {
                          return true;
                        }

                        return transaction.description
                          .toLowerCase()
                          .includes(query);
                      })
                      .map(({ transaction, transactionIndex }) => {
                        const transactionKey = getTransactionKey(
                          selectedAccountIndex,
                          transactionIndex,
                        );

                        return (
                          <tr key={transactionKey}>
                            <td style={{ padding: "8px" }}>
                              {transaction.date}
                            </td>

                            <td style={{ padding: "8px" }}>
                              {transaction.description}
                            </td>

                            <td
                              style={{
                                padding: "8px",
                                textAlign: "right",
                                fontWeight: 500,
                              }}
                            >
                              {transaction.amount.toFixed(2)}
                            </td>

                            <td
                              style={{
                                padding: "8px",
                                textAlign: "right",
                              }}
                            >
                              {transaction.balance !== null
                                ? transaction.balance.toFixed(2)
                                : "-"}
                            </td>

                            <td style={{ padding: "8px", minWidth: "150px" }}>
                              <input
                                type="text"
                                placeholder="Add tag..."
                                value={transactionTags[transactionKey] ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value;

                                  setTransactionTags((current) => ({
                                    ...current,
                                    [transactionKey]: value,
                                  }));
                                }}
                                onBlur={async () => {
                                  const transactionId =
                                    transactionIds[transactionKey];

                                  if (!transactionId || !latestDealId) {
                                    return;
                                  }

                                  await updateTransaction(
                                    latestDealId,
                                    transactionId,
                                    {
                                      tag:
                                        transactionTags[transactionKey] ?? "",
                                    },
                                  );
                                }}
                                style={{
                                  width: "130px",
                                  padding: "6px",
                                  border: "1px solid #ccc",
                                  borderRadius: "6px",
                                  boxSizing: "border-box",
                                }}
                              />
                            </td>

                            <td style={{ padding: "8px", minWidth: "220px" }}>
                              <textarea
                                placeholder="Add annotation..."
                                value={
                                  transactionAnnotations[transactionKey] ?? ""
                                }
                                onChange={(event) => {
                                  const value = event.target.value;

                                  setTransactionAnnotations((current) => ({
                                    ...current,
                                    [transactionKey]: value,
                                  }));
                                }}
                                onBlur={async () => {
                                  const transactionId =
                                    transactionIds[transactionKey];

                                  if (!transactionId || !latestDealId) {
                                    return;
                                  }

                                  await updateTransaction(
                                    latestDealId,
                                    transactionId,
                                    {
                                      annotation:
                                        transactionAnnotations[
                                          transactionKey
                                        ] ?? "",
                                    },
                                  );
                                }}
                                rows={2}
                                style={{
                                  width: "200px",
                                  padding: "6px",
                                  border: "1px solid #ccc",
                                  borderRadius: "6px",
                                  resize: "vertical",
                                  boxSizing: "border-box",
                                  fontFamily: "inherit",
                                }}
                              />
                            </td>

                            <td style={{ padding: "8px" }}>
                              {isLikelyTransfer(
                                selectedAccountIndex,
                                transactionIndex,
                              ) ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    background: "#243b53",
                                    fontSize: "12px",
                                  }}
                                >
                                  Transfer
                                </span>
                              ) : (
                                transaction.type || "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <button
            onClick={async () => {
              try {
                await window.electronAPI.signOut();
                setUser(null);
              } catch (err) {
                console.error("Sign-out failed:", err);
                setError(
                  err instanceof Error ? err.message : "Sign-out failed",
                );
              }
            }}
          >
            Sign out
          </button>
          <p>
            Signed in as <strong>{user.displayName || user.email}</strong>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <section style={{ textAlign: "center" }}>
        <h1>Swyft Finance</h1>

        <p>Bank Statement Tool</p>

        <button onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? "Opening Google..." : "Sign in with Google"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </section>
    </main>
  );
}

export default App;
