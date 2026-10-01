export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await window.electronAPI.getIdToken();

  if (!token) {
    throw new Error("Not authenticated");
  }
  //
  return fetch(
    `https://swyft-backend-230428326737.asia-south1.run.app${path}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
}
export async function createDeal(type: "Consumer" | "Commercial") {
  return apiFetch("/deals", {
    method: "POST",
    body: JSON.stringify({
      type: type.toLowerCase(),
    }),
  });
}
export async function saveStatement(dealId: string, statement: unknown) {
  return apiFetch(`/deals/${dealId}/statements`, {
    method: "POST",
    body: JSON.stringify(statement),
  });
}
export async function getDeals() {
  return apiFetch("/deals");
}

export async function getDeal(dealId: string) {
  return apiFetch(`/deals/${dealId}`);
}
export async function updateTransaction(
  dealId: string,
  transactionId: string,
  input: {
    tag?: string | null;
    annotation?: string | null;
  },
) {
  return apiFetch(`/deals/${dealId}/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateDeal(
  dealId: string,
  input: {
    type?: "consumer" | "commercial";
    status?: "uploaded" | "parsed" | "checked" | "completed";
  },
) {
  return apiFetch(`/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
