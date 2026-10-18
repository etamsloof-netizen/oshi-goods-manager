import { useState } from 'react';
import {
  parseBackup,
  restoreBackup,
  buildRestoreCandidates,
  getExistingOshiNames,
  BackupFormatError,
  type ParsedBackup,
  type RestoreCandidate,
} from '../restore';
import { requestPersistentStorage } from '../persist';

export default function RestorePanel() {
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [candidates, setCandidates] = useState<RestoreCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setBackup(null);
    setCandidates([]);
    setSelected(new Set());
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルをもう一度選べるようにする
    if (!file) return;
    setBusy(true);
    try {
      const parsed = parseBackup(await file.text());
      const list = buildRestoreCandidates(parsed, await getExistingOshiNames());
      setBackup(parsed);
      setCandidates(list);
      // 同じ名前の推しがすでにいるものは、二重にならないよう最初はチェックを外しておく
      setSelected(new Set(list.filter((c) => !c.nameExists).map((c) => c.id)));
    } catch (err) {
      console.error('バックアップ読み込みエラー:', err);
      alert(err instanceof BackupFormatError ? err.message : 'ファイルを読み込めませんでした: ' + String(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async () => {
    if (!backup || selected.size === 0) return;
    setBusy(true);
    try {
      const result = await restoreBackup(backup, selected);
      requestPersistentStorage();
      reset();
      alert(`推し${result.oshis}人・グッズ${result.goods}件を戻しました`);
    } catch (err) {
      console.error('取り込みエラー:', err);
      alert('取り込みに失敗しました。データは何も変わっていません。\n' + String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!backup) {
    return (
      <>
        <label className={`restore-btn ${busy ? 'disabled' : ''}`}>
          {busy ? '読み込み中...' : 'バックアップから戻す'}
          <input type="file" accept=".json,application/json" onChange={handleFile} disabled={busy} />
        </label>
        <p className="backup-note">今あるデータは消えません。バックアップの中から選んだ推しとグッズが追加されます。</p>
      </>
    );
  }

  const exportedAt = Date.parse(backup.exportedAt);
  const selectedGoodsCount = candidates
    .filter((c) => selected.has(c.id))
    .reduce((sum, c) => sum + c.goodsCount, 0);

  return (
    <>
      <p className="backup-status">
        {Number.isNaN(exportedAt) ? '' : `${new Date(exportedAt).toLocaleString('ja-JP')} のバックアップです。`}
        戻す推しを選んでください。
      </p>
      {candidates.length === 0 ? (
        <p className="backup-note">このバックアップには推しが入っていません。</p>
      ) : (
        <ul className="restore-list">
          {candidates.map((c) => (
            <li key={c.id}>
              <label>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} disabled={busy} />
                {c.name}（グッズ{c.goodsCount}件）
              </label>
              {c.nameExists && <p className="restore-exists">同じ名前の推しがすでにいます（選ぶと二重になります）</p>}
            </li>
          ))}
        </ul>
      )}
      {backup.orphanGoodsCount > 0 && (
        <p className="backup-note">
          どの推しにも属していないグッズ{backup.orphanGoodsCount}件は取り込みません（アプリにも表示されていなかったものです）。
        </p>
      )}
      <p className="backup-note">今あるデータは消えません。選んだ推しとそのグッズが追加されます。</p>
      <button className="backup-btn" onClick={handleRestore} disabled={busy || selected.size === 0}>
        {busy ? '取り込み中...' : `推し${selected.size}人・グッズ${selectedGoodsCount}件を追加する`}
      </button>
      <button className="clear-btn" onClick={reset} disabled={busy}>やめる</button>
    </>
  );
}
