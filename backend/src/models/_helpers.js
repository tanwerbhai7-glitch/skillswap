function parseJson(value, fallback = []) {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeRow(row) {
  if (!row) return null;
  const out = { ...row };
  if (out.id != null) out._id = out.id;
  if (out.is_active != null) out.isActive = !!out.is_active;
  if (out.created_at != null) out.createdAt = out.created_at;
  if (out.updated_at != null) out.updatedAt = out.updated_at;
  delete out.is_active; delete out.created_at; delete out.updated_at;
  return out;
}

module.exports = { parseJson, normalizeRow };
