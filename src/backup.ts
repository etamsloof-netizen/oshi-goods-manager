import { db } from './db';

// バックアップファイルの目印。取り込み機能で、このアプリのバックアップかどうかを確かめるのに使う
export const BACKUP_APP_ID = 'oshi-goods-manager';
export const BACKUP_FORMAT_VERSION = 1;

const LAST_BACKUP_KEY = 'lastBackupAt';

type ReadableTable = { each(callback: (row: unknown) => void): Promise<unknown> };

async function appendRows(parts: string[], table: ReadableTable) {
  let first = true;
  await table.each((row) => {
    parts.push((first ? '' : ',') + JSON.stringify(row));
    first = false;
  });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// 全データを1つのJSONファイルにまとめる。DBは読むだけで、書き込みは一切しない
// 写真が多いと数百MBになりうるため、全体を一度に文字列化せず1件ずつ文字列にしてつなげる
export async function createBackupFile(): Promise<File> {
  const exportedAt = new Date();
  const parts: string[] = [];
  await db.transaction('r', db.oshis, db.goods, async () => {
    const header = {
      app: BACKUP_APP_ID,
      formatVersion: BACKUP_FORMAT_VERSION,
      dbVersion: db.verno,
      exportedAt: exportedAt.toISOString(),
    };
    // 末尾の "}" を外して、続けて oshis と goods を書き足す
    parts.push(JSON.stringify(header).slice(0, -1) + ',"oshis":[');
    await appendRows(parts, db.oshis);
    parts.push('],"goods":[');
    await appendRows(parts, db.goods);
    parts.push(']}');
  });
  const d = exportedAt;
  const fileName = `oshi-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  return new File(parts, fileName, { type: 'application/json' });
}

// iPhoneなどでは共有シートを開き、「ファイルに保存」やLINEで自分に送るなどを選べるようにする
// 共有シートが使えない環境（パソコンなど）では、普通にダウンロードする
// 保存（または共有）したら true、利用者が共有シートを閉じたら false を返す
export async function saveBackupFile(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // それ以外の理由で共有できなかったときは、ダウンロードに切り替える
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // すぐ解放するとダウンロードが始まる前に消えることがあるため、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export function getLastBackupAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

// 保存した日時を記録して返す（記録できなくても、バックアップ自体は済んでいる）
export function recordBackupDone(): number {
  const now = Date.now();
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(now));
  } catch {
    // 何もしない
  }
  return now;
}
