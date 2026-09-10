import * as migration_20260910_161356_initial from './20260910_161356_initial';

export const migrations = [
  {
    up: migration_20260910_161356_initial.up,
    down: migration_20260910_161356_initial.down,
    name: '20260910_161356_initial'
  },
];
