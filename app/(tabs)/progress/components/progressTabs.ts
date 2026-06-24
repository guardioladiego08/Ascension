export type ProgressTabId = 'strength' | 'running' | 'nutrition' | 'body';

export type ProgressTabDefinition = {
  id: ProgressTabId;
  label: string;
  heading: string;
};

export const PROGRESS_TABS: ProgressTabDefinition[] = [
  {
    id: 'strength',
    label: 'Strength',
    heading: 'Strength Training',
  },
  {
    id: 'running',
    label: 'Running',
    heading: 'Running',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    heading: 'Nutrition',
  },
  {
    id: 'body',
    label: 'Body',
    heading: 'Body Composition',
  },
];
