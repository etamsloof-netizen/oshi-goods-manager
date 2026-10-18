import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { requestPersistentStorage } from '../persist';
import { imageFileToDataUrl, PHOTO_MAX_SIZE } from '../image';

const DEFAULT_CATEGORIES = ['アクキー','缶バッジ','ぬいぐるみ','クリアファイル','フォトカード','紙類','Tシャツ','タオル','その他'];

export default function GoodsForm() {
  const { oshiId, goodsId } = useParams();
  const navigate = useNavigate();
  const isEdit = goodsId !== undefined;
  const parsedOshiId = Number(oshiId);
  const parsedGoodsId = goodsId ? Number(goodsId) : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [count, setCount] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [memo, setMemo] = useState('');
  const [oshiColor, setOshiColor] = useState('#FF8FAB');
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    db.oshis.get(parsedOshiId).then((o: any) => { if (o) setOshiColor(o.themeColor); });
    if (isEdit && parsedGoodsId) {
      db.goods.get(parsedGoodsId).then((g: any) => {
        if (g) {
          setName(g.name);
          // 選択肢にないカテゴリ（カスタム入力したもの）は、カスタム欄に入れて表示する
          if (DEFAULT_CATEGORIES.includes(g.category)) {
            setCategory(g.category);
          } else {
            setCategory('カスタム');
            setCustomCategory(g.category ?? '');
          }
          setCount(String(g.count));
          setPhoto(g.photo);
          setMemo(g.memo ?? '');
        }
      });
    }
  }, [parsedOshiId, parsedGoodsId, isEdit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    try {
      setPhoto(await imageFileToDataUrl(file, PHOTO_MAX_SIZE));
    } catch (err) {
      console.error('画像読み込みエラー:', err);
      alert('画像を読み込めませんでした: ' + String(err));
    } finally {
      setImageBusy(false);
    }
  };

  const finalCategory = category === 'カスタム' ? customCategory : category;

  const handleSave = async () => {
    if (savingRef.current) return; // 連打で二重に登録しないように
    if (!name.trim()) return alert('グッズ名を入力してください');
    if (!finalCategory.trim()) return alert('カテゴリを入力してください');
    const countNum = Math.max(0, Math.floor(Number(count) || 0));
    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit && parsedGoodsId) {
        await db.goods.update(parsedGoodsId, { name, category: finalCategory, count: countNum, photo, memo });
      } else {
        await db.goods.add({
          oshiId: parsedOshiId,
          name,
          category: finalCategory,
          count: countNum,
          photo,
          memo,
          createdAt: Date.now(),
        });
      }
      requestPersistentStorage();
      navigate(`/oshi/${oshiId}`);
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました: ' + String(e));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!parsedGoodsId) return;
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await db.goods.delete(parsedGoodsId);
      navigate(`/oshi/${oshiId}`);
    } catch (e) {
      console.error('削除エラー:', e);
      alert('削除に失敗しました: ' + String(e));
    }
  };

  return (
    <div className="page">
      <header className="form-header" style={{ backgroundColor: oshiColor }}>
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>{isEdit ? 'グッズを編集' : 'グッズを追加'}</h2>
      </header>

      <div className="form-body">
        <div className="form-group">
          <label>グッズ名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ○○アクキー"
          />
        </div>

        <div className="form-group">
          <label>カテゴリ</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="カスタム">カスタム入力...</option>
          </select>
          {category === 'カスタム' && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="カテゴリ名を入力"
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div className="form-group">
          <label>数量</label>
          <div className="count-input">
            <button onClick={() => setCount(String(Math.max(0, (Number(count) || 0) - 1)))}>−</button>
            <input
              type="number"
              value={count}
              min={0}
              placeholder="0"
              onChange={(e) => setCount(e.target.value)}
            />
            <button onClick={() => setCount(String((Number(count) || 0) + 1))}>＋</button>
          </div>
        </div>

        <div className="form-group">
          <label>写真</label>
          {photo && <img src={photo} alt="goods" className="preview-img" />}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          {photo && <button className="clear-btn" onClick={() => setPhoto(undefined)}>削除</button>}
        </div>

        <div className="form-group">
          <label>メモ</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="イベント名、購入日など自由にメモ"
            rows={3}
          />
        </div>

        <button className="save-btn" style={{ backgroundColor: oshiColor }} onClick={handleSave} disabled={imageBusy || saving}>
          {imageBusy ? '画像を処理中...' : saving ? '保存中...' : '保存する'}
        </button>

        {isEdit && (
          <button className="delete-btn" onClick={handleDelete}>
            このグッズを削除する
          </button>
        )}
      </div>
    </div>
  );
}
