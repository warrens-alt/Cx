/** A URL chooses a workspace; it never grants permission to that workspace. */
export function resolveWorkspace(params: URLSearchParams, allowedIds: string[], currentId = ''): string {
  const requested = params.getAll('workspace');
  if (requested.length > 1) throw new Error('Repeated workspace selection. Choose one authorised workspace.');
  if (!requested.length) return allowedIds.includes(currentId) ? currentId : allowedIds[0] || '';
  const id = requested[0];
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('The workspace selection in this link is invalid. Choose an authorised workspace.');
  if (!allowedIds.includes(id)) throw new Error('This account does not have access to the workspace requested by this link.');
  return id;
}
