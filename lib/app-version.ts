import packageJson from "@/package.json";

const injectedVersion = process.env.NEXT_PUBLIC_TNLASTATION_VERSION?.trim();

export const frontendVersion = injectedVersion || packageJson.version;

export function displayVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
