export const publicBasePath = process.env.NEXT_PUBLIC_TNLASTATION_BASE_PATH?.replace(/\/$/, "") ?? "";

export function withBasePath(path: `/${string}`): string {
  return `${publicBasePath}${path}`;
}
