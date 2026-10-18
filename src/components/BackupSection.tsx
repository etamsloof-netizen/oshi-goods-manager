import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { createBackupFile, saveBackupFile, getLastBackupAt, recordBackupDone } from '../backup';

const REMIND_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// 作成と保存をあえて2回のタップに分けている。iPhoneの共有シートはタップの直後にしか開けないため、
// 時間のかかるファイル作成を先に済ませておく
export default function BackupSection() {
  const hasData = useLiveQuery(async () => (await db.oshis.count()) > 0);
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt);
  const [now, setNow] = useState(Date.now);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hasData) return null;

  const daysSince = lastBackupAt === null ? null : Math.max(0, Math.floor((now - lastBackupAt) / DAY_MS));
  const needsBackup = daysSince === null || daysSince >= REMIND_AFTER_DAYS;

  const handleCreate = async () => {
    setBusy(true);
    try {
      setFile(await createBackupFile());
    } catch (e) {
      console.error('バックアップ作成エラー:', e);
      alert('バックアップの作成に失敗しました: ' + String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setBusy(true);
    try {
      if (await saveBackupFile(file)) {
        const doneAt = recordBackupDone();
        setLastBackupAt(doneAt);
        setNow(doneAt);
        setFile(null);
      }
    } catch (e) {
      console.error('バックアップ保存エラー:', e);
      alert('バックアップの保存に失敗しました: ' + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="backup-section">
      <h2>データのバックアップ</h2>
      <p className={`backup-status ${needsBackup ? 'warning' : ''}`}>
        {lastBackupAt === null
          ? 'まだバックアップしていません'
          : `最終バックアップ: ${new Date(lastBackupAt).toLocaleDateString('ja-JP')}（${daysSince === 0 ? '今日' : `${daysSince}日前`}）`}
      </p>
      <p className="backup-note">
        データはこの端末のブラウザの中にだけ保存されています。機種変更やブラウザのデータ削除に備えて、ときどきバックアップを保存しておきましょう（写真も含めて1つのファイルになります）。
      </p>
      <p className="backup-note">
        保存先は「iCloud Drive」や「Googleドライブ」などのクラウドがおすすめです（「このiPhone内」だと、iPhoneをなくしたときに一緒に消えてしまいます）。バックアップから元に戻す機能は近日追加予定です。
      </p>
      {file ? (
        <>
          <p className="backup-status">ファイルの準備ができました（{formatSize(file.size)}）</p>
          <button className="backup-btn" onClick={handleSave} disabled={busy}>保存する</button>
          <button className="clear-btn" onClick={() => setFile(null)} disabled={busy}>やめる</button>
        </>
      ) : (
        <button className="backup-btn" onClick={handleCreate} disabled={busy}>
          {busy ? '作成中...' : 'バックアップを作成'}
        </button>
      )}
    </section>
  );
}
