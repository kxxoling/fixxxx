// WBI signing removed as requested to test Vercel deployment without crypto dependency.
export async function encWbi(params: Record<string, string | number>) {
  return params;
}
