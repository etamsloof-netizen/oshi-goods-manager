import { db } from './db';
import { BACKUP_APP_ID, BACKUP_FORMAT_VERSION } from './backup';

// バックアップファイルを確かめて、選んだ推しとそのグッズを追加する
// 今あるデータは消さない・書き換えない（追加だけ）

type OshiRecord = {
  name: string;
  themeColor: string;
  iconImage?: string;
  backgroundImage?: string;
  createdAt: number;
};

type GoodsRecord = {
  oshiId: number;
  name: string;
  category: string;
  count: number;
  photo?: string;
  memo?: string;
  createdAt: number;
};

export type BackupOshi = OshiRecord & { id: number };
export type BackupGoods = GoodsRecord & { id: number };

export type ParsedBackup = {
  exportedAt: string;
  oshis: BackupOshi[];
  goods: BackupGoods[];
  // どの推しにも属していないグッズ（アプリ上にも表示されていなかったもの）の数。これは取り込まない
  orphanGoodsCount: number;
  // 形式がおかしいため外した画像の数（推しの元の番号ごと。その推しのグッズの写真も含む）
  droppedImagesByOshi: Map<number, number>;
};

export type RestoreCandidate = {
  id: number;
  name: string;
  goodsCount: number;
  droppedImageCount: number;
  // 同じ名前の推しがすでにいる（選ぶと二重になるかもしれない）
  nameExists: boolean;
};

// 利用者にそのまま見せるメッセージを持つエラー
export class BackupFormatError extends Error {}

const BROKEN_MESSAGE = 'バックアップファイルが壊れているため、読み込めません。';
const DEFAULT_THEME_COLOR = '#FF8FAB';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

// このアプリが保存する画像の形（data:種類;base64,中身）。かっこや引用符などは含まない
const DATA_URL_PATTERN = /^data:[\w.+/-]*(;[\w.+/-]+=[\w.+/-]+)*;base64,[A-Za-z0-9+/]*={0,2}$/;

type ReadContext = { droppedImagesByOshi: Map<number, number> };

// 画像は「なし」か、上の形のものだけを受け付ける（画像以外のファイルが保存されていても、そのまま戻す）
// 形が違うもの（壊れている・細工されている）は、ファイル全体ははじかずにその画像だけ外す
function readImage(value: unknown, ctx: ReadContext, oshiId: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && DATA_URL_PATTERN.test(value)) return value;
  ctx.droppedImagesByOshi.set(oshiId, (ctx.droppedImagesByOshi.get(oshiId) ?? 0) + 1);
  return undefined;
}

// 数量や日付がおかしくても、ファイル全体ははじかずに安全な値で取り込む
function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function readCreatedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

function readOshi(value: unknown, ctx: ReadContext): BackupOshi {
  if (!isObject(value) || !isId(value.id) || typeof value.name !== 'string') {
    throw new BackupFormatError(BROKEN_MESSAGE);
  }
  return {
    id: value.id,
    name: value.name,
    themeColor: typeof value.themeColor === 'string' ? value.themeColor : DEFAULT_THEME_COLOR,
    iconImage: readImage(value.iconImage, ctx, value.id),
    backgroundImage: readImage(value.backgroundImage, ctx, value.id),
    createdAt: readCreatedAt(value.createdAt),
  };
}

function readGoods(value: Json, id: number, oshiId: number, ctx: ReadContext): BackupGoods {
  if (typeof value.name !== 'string' || typeof value.category !== 'string') {
    throw new BackupFormatError(BROKEN_MESSAGE);
  }
  return {
    id,
    oshiId,
    name: value.name,
    category: value.category,
    count: readCount(value.count),
    photo: readImage(value.photo, ctx, oshiId),
    memo: typeof value.memo === 'string' ? value.memo : undefined,
    createdAt: readCreatedAt(value.createdAt),
  };
}

// ファイルの中身を確かめる。DBには触らない
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFormatError('このアプリのバックアップファイルではないか、ファイルが壊れています。');
  }
  if (!isObject(data) || data.app !== BACKUP_APP_ID) {
    throw new BackupFormatError('このアプリのバックアップファイルではありません。');
  }
  if (data.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError('このバックアップは今のアプリでは読み込めない形式です。アプリを最新にしてから、もう一度お試しください。');
  }
  if (!Array.isArray(data.oshis) || !Array.isArray(data.goods)) {
    throw new BackupFormatError(BROKEN_MESSAGE);
  }

  const ctx: ReadContext = { droppedImagesByOshi: new Map() };
  const oshis = data.oshis.map((value) => readOshi(value, ctx));
  const oshiIds = new Set(oshis.map((oshi) => oshi.id));
  if (oshiIds.size !== oshis.length) throw new BackupFormatError(BROKEN_MESSAGE);

  const goods: BackupGoods[] = [];
  const goodsIds = new Set<number>();
  let orphanGoodsCount = 0;
  for (const value of data.goods) {
    if (!isObject(value) || !isId(value.id) || goodsIds.has(value.id)) {
      throw new BackupFormatError(BROKEN_MESSAGE);
    }
    goodsIds.add(value.id);
    if (!isId(value.oshiId) || !oshiIds.has(value.oshiId)) {
      orphanGoodsCount++;
      continue;
    }
    goods.push(readGoods(value, value.id, value.oshiId, ctx));
  }

  return {
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    oshis,
    goods,
    orphanGoodsCount,
    droppedImagesByOshi: ctx.droppedImagesByOshi,
  };
}

export async function getExistingOshiNames(): Promise<Set<string>> {
  const names = new Set<string>();
  await db.oshis.each((oshi: { name: string }) => {
    names.add(oshi.name);
  });
  return names;
}

export function buildRestoreCandidates(backup: ParsedBackup, existingNames: Set<string>): RestoreCandidate[] {
  return backup.oshis.map((oshi) => ({
    id: oshi.id,
    name: oshi.name,
    goodsCount: backup.goods.filter((item) => item.oshiId === oshi.id).length,
    droppedImageCount: backup.droppedImagesByOshi.get(oshi.id) ?? 0,
    nameExists: existingNames.has(oshi.name),
  }));
}

function toOshiRecord(oshi: BackupOshi): OshiRecord {
  return {
    name: oshi.name,
    themeColor: oshi.themeColor,
    iconImage: oshi.iconImage,
    backgroundImage: oshi.backgroundImage,
    createdAt: oshi.createdAt,
  };
}

function toGoodsRecord(item: BackupGoods, oshiId: number): GoodsRecord {
  return {
    oshiId,
    name: item.name,
    category: item.category,
    count: item.count,
    photo: item.photo,
    memo: item.memo,
    createdAt: item.createdAt,
  };
}

// 選んだ推しとそのグッズを、新しい番号を振って追加する（今あるデータと番号がぶつからないように）
// 1つの処理にまとめているので、途中で失敗したら1件も追加されない
// 元の登録順を保つため、元の番号の順に追加する
export async function restoreBackup(backup: ParsedBackup, selectedOshiIds: Set<number>) {
  const oshis = backup.oshis.filter((oshi) => selectedOshiIds.has(oshi.id)).sort((a, b) => a.id - b.id);
  const goods = backup.goods.filter((item) => selectedOshiIds.has(item.oshiId)).sort((a, b) => a.id - b.id);
  await db.transaction('rw', db.oshis, db.goods, async () => {
    const newOshiIds: number[] = await db.oshis.bulkAdd(oshis.map(toOshiRecord), { allKeys: true });
    const idMap = new Map(oshis.map((oshi, i) => [oshi.id, newOshiIds[i]]));
    await db.goods.bulkAdd(goods.map((item) => toGoodsRecord(item, idMap.get(item.oshiId))));
  });
  return { oshis: oshis.length, goods: goods.length };
}
