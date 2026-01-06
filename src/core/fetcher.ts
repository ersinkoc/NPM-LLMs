/**
 * NPM package fetcher
 * Downloads and extracts packages from the NPM registry
 * @module core/fetcher
 */

import {
  PackageNotFoundError,
  VersionNotFoundError,
  DownloadError,
  ValidationError,
} from '../errors.js';
import type { PackageMetadata, PackageInfo } from '../types.js';
import {
  fetchJson,
  fetchGzipped,
  buildPackageUrl,
  DEFAULT_REGISTRY,
  type HttpOptions,
} from '../utils/http.js';
import { extractTarToMap } from '../utils/tar.js';

/**
 * NPM registry response for package metadata
 */
interface NpmRegistryResponse {
  name: string;
  description?: string;
  'dist-tags'?: Record<string, string>;
  versions?: Record<
    string,
    {
      name: string;
      version: string;
      description?: string;
      main?: string;
      types?: string;
      typings?: string;
      exports?: Record<string, unknown>;
      repository?: { type: string; url: string } | string;
      keywords?: string[];
      author?: string | { name: string; email?: string };
      license?: string;
      homepage?: string;
      dist?: {
        tarball: string;
        shasum?: string;
        integrity?: string;
      };
    }
  >;
}

/**
 * NPM registry response for a specific version
 */
interface NpmVersionResponse {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  typings?: string;
  exports?: Record<string, unknown>;
  repository?: { type: string; url: string } | string;
  keywords?: string[];
  author?: string | { name: string; email?: string };
  license?: string;
  homepage?: string;
  dist?: {
    tarball: string;
    shasum?: string;
    integrity?: string;
  };
}

/**
 * Validate package name format
 * @param name - Package name to validate
 * @throws ValidationError if invalid
 */
export function validatePackageName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Package name is required', 'name');
  }

  // NPM package name rules
  const validPattern = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

  if (!validPattern.test(name)) {
    throw new ValidationError(
      `Invalid package name: "${name}". Package names must be lowercase and may contain letters, numbers, hyphens, dots, and underscores.`,
      'name'
    );
  }

  // Additional checks
  if (name.length > 214) {
    throw new ValidationError('Package name cannot exceed 214 characters', 'name');
  }
}

/**
 * Parse package specifier (name@version)
 * @param spec - Package specifier (e.g., "lodash", "lodash@4.17.21", "@scope/pkg@1.0.0")
 * @returns Parsed name and version
 */
export function parsePackageSpec(spec: string): { name: string; version?: string } {
  if (!spec || typeof spec !== 'string') {
    throw new ValidationError('Package specifier is required', 'spec');
  }

  const trimmed = spec.trim();

  // Handle scoped packages: @scope/name@version
  if (trimmed.startsWith('@')) {
    const firstSlash = trimmed.indexOf('/');
    if (firstSlash === -1) {
      throw new ValidationError(`Invalid scoped package: "${spec}"`, 'spec');
    }

    // Find @ after the scope/name part
    const afterScope = trimmed.slice(firstSlash + 1);
    const versionSep = afterScope.lastIndexOf('@');

    if (versionSep > 0) {
      const name = trimmed.slice(0, firstSlash + 1 + versionSep);
      const version = afterScope.slice(versionSep + 1);
      return { name, version: version || undefined };
    }

    return { name: trimmed };
  }

  // Unscoped package: name@version
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex > 0) {
    const name = trimmed.slice(0, atIndex);
    const version = trimmed.slice(atIndex + 1);
    return { name, version: version || undefined };
  }

  return { name: trimmed };
}

/**
 * Resolve version tag to actual version
 * @param versions - Available versions
 * @param distTags - Distribution tags
 * @param requested - Requested version/tag
 * @returns Resolved version
 * @throws VersionNotFoundError if not found
 */
function resolveVersion(
  packageName: string,
  versions: string[],
  distTags: Record<string, string>,
  requested?: string
): string {
  // No version specified - use latest
  if (!requested) {
    const latest = distTags['latest'];
    if (latest && versions.includes(latest)) {
      return latest;
    }
    // Fallback to highest version
    return versions.sort(compareVersions).pop()!;
  }

  // Check if it's a dist-tag
  if (distTags[requested]) {
    return distTags[requested];
  }

  // Check if it's an exact version
  if (versions.includes(requested)) {
    return requested;
  }

  // Try to find matching version
  const matching = versions.filter((v) => v.startsWith(requested));
  if (matching.length > 0) {
    return matching.sort(compareVersions).pop()!;
  }

  throw new VersionNotFoundError(packageName, requested);
}

/**
 * Compare semantic versions
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }

  return 0;
}

/**
 * Fetcher options
 */
export interface FetcherOptions {
  /** NPM registry URL */
  registry?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Fetch package metadata from NPM registry
 * @param name - Package name
 * @param version - Optional version
 * @param options - Fetcher options
 * @returns Package metadata
 * @throws PackageNotFoundError if package not found
 * @throws VersionNotFoundError if version not found
 */
export async function fetchPackageMetadata(
  name: string,
  version?: string,
  options: FetcherOptions = {}
): Promise<PackageMetadata> {
  validatePackageName(name);

  const registry = options.registry ?? DEFAULT_REGISTRY;
  const httpOptions: HttpOptions = { timeout: options.timeout };

  // If specific version requested, try direct endpoint first
  if (version && !['latest', 'next', 'beta', 'alpha'].includes(version)) {
    try {
      const url = buildPackageUrl(name, version, registry);
      const { data } = await fetchJson<NpmVersionResponse>(url, httpOptions);
      return extractMetadata(data);
    } catch (error) {
      // Fall through to full metadata fetch
      if (!(error instanceof DownloadError) || !error.message.includes('404')) {
        throw error;
      }
    }
  }

  // Fetch full package metadata
  const url = buildPackageUrl(name, undefined, registry);

  try {
    const { data } = await fetchJson<NpmRegistryResponse>(url, httpOptions);

    // Resolve version
    const versions = Object.keys(data.versions ?? {});
    if (versions.length === 0) {
      throw new PackageNotFoundError(name);
    }

    const resolvedVersion = resolveVersion(
      name,
      versions,
      data['dist-tags'] ?? {},
      version
    );

    const versionData = data.versions![resolvedVersion];
    if (!versionData) {
      throw new VersionNotFoundError(name, resolvedVersion);
    }

    return extractMetadata(versionData);
  } catch (error) {
    if (error instanceof DownloadError && error.message.includes('404')) {
      throw new PackageNotFoundError(name);
    }
    throw error;
  }
}

/**
 * Extract metadata from NPM response
 */
function extractMetadata(data: NpmVersionResponse): PackageMetadata {
  if (!data.dist?.tarball) {
    throw new DownloadError('Package metadata missing tarball URL');
  }

  // Normalize repository
  let repository: PackageMetadata['repository'];
  if (data.repository) {
    if (typeof data.repository === 'string') {
      repository = { type: 'git', url: data.repository };
    } else {
      repository = data.repository;
    }
  }

  return {
    name: data.name,
    version: data.version,
    description: data.description,
    tarball: data.dist.tarball,
    types: data.types ?? data.typings,
    main: data.main,
    exports: data.exports,
    repository,
    keywords: data.keywords,
    author: data.author,
    license: data.license,
    homepage: data.homepage,
  };
}

/**
 * Download and extract package files
 * @param tarballUrl - Tarball URL
 * @param options - HTTP options
 * @returns Map of file paths to content
 */
export async function downloadPackageFiles(
  tarballUrl: string,
  options: HttpOptions = {}
): Promise<Map<string, string>> {
  const buffer = await fetchGzipped(tarballUrl, options);
  return extractTarToMap(buffer);
}

/**
 * Fetch complete package with files
 * @param spec - Package specifier (e.g., "lodash@4.17.21")
 * @param options - Fetcher options
 * @returns Package info with files
 */
export async function fetchPackage(
  spec: string,
  options: FetcherOptions = {}
): Promise<PackageInfo> {
  const { name, version } = parsePackageSpec(spec);

  // Fetch metadata
  const metadata = await fetchPackageMetadata(name, version, options);

  // Download and extract files
  const files = await downloadPackageFiles(metadata.tarball, {
    timeout: options.timeout,
  });

  return {
    ...metadata,
    files,
  };
}

/**
 * List available versions for a package
 * @param name - Package name
 * @param options - Fetcher options
 * @returns Array of versions (sorted newest first)
 */
export async function listVersions(
  name: string,
  options: FetcherOptions = {}
): Promise<string[]> {
  validatePackageName(name);

  const registry = options.registry ?? DEFAULT_REGISTRY;
  const url = buildPackageUrl(name, undefined, registry);

  try {
    const { data } = await fetchJson<NpmRegistryResponse>(url, { timeout: options.timeout });
    const versions = Object.keys(data.versions ?? {});
    return versions.sort(compareVersions).reverse();
  } catch (error) {
    if (error instanceof DownloadError && error.message.includes('404')) {
      throw new PackageNotFoundError(name);
    }
    throw error;
  }
}

/**
 * Get dist-tags for a package
 * @param name - Package name
 * @param options - Fetcher options
 * @returns Dist-tags object
 */
export async function getDistTags(
  name: string,
  options: FetcherOptions = {}
): Promise<Record<string, string>> {
  validatePackageName(name);

  const registry = options.registry ?? DEFAULT_REGISTRY;
  const url = buildPackageUrl(name, undefined, registry);

  try {
    const { data } = await fetchJson<NpmRegistryResponse>(url, { timeout: options.timeout });
    return data['dist-tags'] ?? {};
  } catch (error) {
    if (error instanceof DownloadError && error.message.includes('404')) {
      throw new PackageNotFoundError(name);
    }
    throw error;
  }
}
