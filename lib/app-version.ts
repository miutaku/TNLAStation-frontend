import packageJson from "@/package.json";

const injectedVersion = process.env.NEXT_PUBLIC_TNLASTATION_VERSION?.trim();

export const frontendVersion = injectedVersion || packageJson.version;

export function displayVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

export function displayBackendVersion(backendVersion: string, frontendBuildVersion = frontendVersion): string {
  const architecture = frontendBuildVersion.match(/-(amd64|arm64|armv7|386)$/i)?.[1];
  const version = displayVersion(backendVersion);
  if (!architecture || version.toLocaleLowerCase().endsWith(`-${architecture.toLocaleLowerCase()}`)) return version;
  return `${version}-${architecture}`;
}
