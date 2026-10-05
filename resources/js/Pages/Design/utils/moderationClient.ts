"use client";

type ModerationResponse = {
  allowed?: boolean;
  message?: string;
  reason?: string;
};

const readCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

const parseModerationResponse = async (response: Response): Promise<ModerationResponse> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return (await response.json()) as ModerationResponse;
  } catch {
    return {};
  }
};

export async function moderateDesignText(text: string): Promise<{ allowed: boolean; message?: string }> {
  const csrfToken = readCsrfToken();
  const response = await fetch("/design/moderate-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ text }),
  });

  const payload = await parseModerationResponse(response);
  if (response.ok && payload.allowed !== false) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: payload.message || "This text could not be used due to content policy checks.",
  };
}

export async function moderateDesignImage(file: File): Promise<{ allowed: boolean; message?: string }> {
  const csrfToken = readCsrfToken();
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/design/moderate-image", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
    },
    credentials: "include",
    body: formData,
  });

  const payload = await parseModerationResponse(response);
  if (response.ok && payload.allowed !== false) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: payload.message || "This image could not be used due to content policy checks.",
  };
}
