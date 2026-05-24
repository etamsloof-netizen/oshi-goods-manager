import Dexie from 'dexie';

const db = new Dexie('OshiAppDB') as any;

db.version(11).stores({
  oshis: '++id',
  goods: '++id, oshiId',
});

export { db };
