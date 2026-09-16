import type { Terrain } from './terrain';
export const STAGES: { name: string; terrain: Terrain[] }[] = [
  {
    name: '草原の砦',
    terrain: [
      { index: 9, type: 'healing', label: '回復地' },
      { index: 54, type: 'magic', label: '魔法陣' },
    ],
  },
  {
    name: '魔導の庭',
    terrain: [
      { index: 10, type: 'magic', label: '魔法陣' },
      { index: 53, type: 'magic', label: '魔法陣' },
      { index: 21, type: 'healing', label: '回復地' },
    ],
  },
  {
    name: '荒野の門',
    terrain: [
      { index: 22, type: 'healing', label: '回復地' },
      { index: 41, type: 'magic', label: '魔法陣' },
    ],
  },
];
