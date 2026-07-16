export interface RepositoryLink {
  label: string;
  url: string;
}

export const REPOSITORY_LINKS: RepositoryLink[] = [
  {
    label: "Forgejo",
    url: "https://forgejo.o-st.dev/ST_Consultancy/Llm_companion",
  },
  {
    label: "GitHub Mirror",
    url: "https://github.com/shaked8634/Llm_Companion",
  },
];

export function getExtensionVersion(): string {
  return globalThis.chrome?.runtime?.getManifest?.().version_name ?? "0.0.0";
}
