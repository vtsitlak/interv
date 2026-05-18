export const WORK_LOCATION_PREFERENCES = ['remote', 'hybrid', 'onsite'] as const;
export const WORK_EMPLOYMENT_PREFERENCES = [
  'full-time',
  'part-time',
  'permanent',
  'contract',
  'freelance',
] as const;

export type WorkLocationPreference =
  (typeof WORK_LOCATION_PREFERENCES)[number];
export type WorkEmploymentPreference =
  (typeof WORK_EMPLOYMENT_PREFERENCES)[number];
export type WorkPreference = WorkLocationPreference | WorkEmploymentPreference;

export interface WorkPreferenceOption {
  id: WorkPreference;
  label: string;
}

export interface WorkPreferenceGroup {
  label: string;
  options: WorkPreferenceOption[];
}

export const WORK_PREFERENCE_GROUPS: WorkPreferenceGroup[] = [
  {
    label: 'Work location',
    options: [
      { id: 'remote', label: 'Remote' },
      { id: 'hybrid', label: 'Hybrid' },
      { id: 'onsite', label: 'On-site' },
    ],
  },
  {
    label: 'Employment type',
    options: [
      { id: 'full-time', label: 'Full-time' },
      { id: 'part-time', label: 'Part-time' },
      { id: 'permanent', label: 'Permanent' },
      { id: 'contract', label: 'Contract' },
      { id: 'freelance', label: 'Freelance' },
    ],
  },
];

const ALL_PREFERENCES = new Set<string>([
  ...WORK_LOCATION_PREFERENCES,
  ...WORK_EMPLOYMENT_PREFERENCES,
]);

const LABEL_BY_ID = new Map<WorkPreference, string>(
  WORK_PREFERENCE_GROUPS.flatMap((g) =>
    g.options.map((o) => [o.id, o.label] as const),
  ),
);

export function isWorkPreference(value: string): value is WorkPreference {
  return ALL_PREFERENCES.has(value);
}

/** Keep only known preference ids, in stable display order. */
export function normalizeWorkPreferences(
  values: string[] | undefined,
): WorkPreference[] {
  if (!values?.length) {
    return [];
  }
  const selected = new Set(
    values.filter((v): v is WorkPreference => isWorkPreference(v)),
  );
  const ordered: WorkPreference[] = [];
  for (const group of WORK_PREFERENCE_GROUPS) {
    for (const option of group.options) {
      if (selected.has(option.id)) {
        ordered.push(option.id);
      }
    }
  }
  return ordered;
}

export function formatWorkPreferenceLabel(id: WorkPreference): string {
  return LABEL_BY_ID.get(id) ?? id;
}

export function formatWorkPreferencesList(
  preferences: WorkPreference[] | undefined,
): string {
  const normalized = normalizeWorkPreferences(preferences);
  if (normalized.length === 0) {
    return '';
  }
  return normalized.map(formatWorkPreferenceLabel).join(', ');
}
