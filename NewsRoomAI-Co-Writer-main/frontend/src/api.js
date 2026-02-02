const BASE_URL = "http://127.0.0.1:8000";

export async function analyzeArticle({ text = "", link = "" }) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, link }),
  });

  if (!response.ok) {
    throw new Error("Analyze API failed");
  }

  return response.json();
}

/**
 * Fetch all articles
 */
export async function fetchArticles() {
  const response = await fetch(`${BASE_URL}/articles`);

  if (!response.ok) {
    throw new Error("Fetch articles failed");
  }

  return response.json();
}

/**
 * Fetch single article by ID
 */
export async function fetchArticleById(id) {
  const response = await fetch(`${BASE_URL}/articles/${id}`);

  if (!response.ok) {
    throw new Error("Fetch article failed");
  }

  return response.json();
}

/**
 * Update article text
 */
export async function updateArticle(id, text) {
  const response = await fetch(`${BASE_URL}/articles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Update article failed");
  }

  return response.json();
}

/**
 * Delete article
 */
export async function deleteArticle(id) {
  const response = await fetch(`${BASE_URL}/articles/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Delete article failed");
  }
}

/**
 * Fetch full analysis (used in /analysis/:id page)
 */
export async function fetchFullAnalysisById(id) {
  const response = await fetch(`${BASE_URL}/articles/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch full analysis");
  }

  return response.json();
}

export async function rewriteArticle({ article_id, text }) {
  const response = await fetch(`${BASE_URL}/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article_id, text }),
  });

  if (!response.ok) {
    throw new Error("Rewrite failed");
  }

  return response.json();
}

export const registerUser = (data) =>
  fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json());

export const loginUser = (data) =>
  fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json());

export const resetPassword = (data) =>
  fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
