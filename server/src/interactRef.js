export function parseInteractRef(body, query) {
  if (typeof body?.interactRef === "string" && body.interactRef) {
    return body.interactRef;
  }
  if (typeof query?.interact_ref === "string" && query.interact_ref) {
    return query.interact_ref;
  }
  return "";
}
