const sessions = new Map();

export function createPaymentSession(record) {
  const id = crypto.randomUUID();
  const session = {
    id,
    status: "incoming_created",
    createdAt: new Date().toISOString(),
    ...record,
  };
  sessions.set(id, session);
  return session;
}

export function getPaymentSession(sessionId) {
  return sessions.get(sessionId);
}

export function updatePaymentSession(sessionId, patch) {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  Object.assign(session, patch);
  return session;
}
