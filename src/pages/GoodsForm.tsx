import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';

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

  useEffect(() => {
    db.oshis.get(parsedOshiId).then((o: any) => { if (o) setOshiColor(o.themeColor); });
    if (isEdit && parsedGoodsId) {
      db.goods.get(parsedGoodsId).then((g: any) => {
        if (g) {
          setName(g.name);
          setCategory(g.category);
          setCount(String(g.count));
          setPhoto(g.photo);
          setMemo(g.memo ?? '');
        }
      });
    }
  }, [parsedOshiId, parsedGoodsId, isEdit]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finalCategory = category === 'カスタム' ? customCategory : category;

  const handleSave = async () => {
    if (!name.trim()) return alert('グッズ名を入力してください');
    if (!finalCategory.trim()) return alert('カテゴリを入力してください');
    const countNum = Math.max(0, Math.floor(Number(count) || 0));
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
      navigate(`/oshi/${oshiId}`);
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました: ' + String(e));
    }
  };

  const handleDelete = async () => {
    if (!parsedGoodsId) return;
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await db.goods.delete(parsedGoodsId);
    navigate(`/oshi/${oshiId}`);
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

        <button className="save-btn" style={{ backgroundColor: oshiColor }} onClick={handleSave}>
          保存する
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
