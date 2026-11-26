/**
 * Joining a dialling code to the local part. The database normalises to E.164
 * on the way in, so this only has to produce something it can parse.
 */
export const fullNumber = (code: string, number: string): string =>
  number.trim() ? `${code}${number.trim()}` : "";
