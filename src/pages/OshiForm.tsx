import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { requestPersistentStorage } from '../persist';
import { imageFileToDataUrl, ICON_MAX_SIZE, PHOTO_MAX_SIZE } from '../image';

const PRESET_COLORS = [
  '#FF8FAB', '#FF6B9D', '#C77DFF', '#7B2FBE',
  '#48CAE4', '#0096C7', '#52B788', '#2D6A4F',
  '#FFB347', '#FF6B35', '#F72585', '#3A0CA3',
  '#FFFFFF', '#333333',
];

export default function OshiForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;
  const oshiId = id ? Number(id) : null;

  const [name, setName] = useState('');
  const [themeColor, setThemeColor] = useState('#FF8FAB');
  const [iconImage, setIconImage] = useState<string | undefined>();
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>();
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isEdit && oshiId) {
      db.oshis.get(oshiId).then((oshi: any) => {
        if (oshi) {
          setName(oshi.name);
          setThemeColor(oshi.themeColor);
          setIconImage(oshi.iconImage);
          setBackgroundImage(oshi.backgroundImage);
        }
      });
    }
  }, [oshiId, isEdit]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void, maxSize: number) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 削除したあとに同じ画像を選び直せるように
    if (!file) return;
    setImageBusy(true);
    try {
      setter(await imageFileToDataUrl(file, maxSize));
    } catch (err) {
      console.error('画像読み込みエラー:', err);
      alert('画像を読み込めませんでした: ' + String(err));
    } finally {
      setImageBusy(false);
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return; // 連打で二重に登録しないように
    if (!name.trim()) return alert('推しの名前を入力してください');
    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit && oshiId) {
        const updated = await db.oshis.update(oshiId, { name, themeColor, iconImage, backgroundImage });
        if (!updated) throw new Error('この推しはすでに削除されています');
      } else {
        await db.oshis.add({ name, themeColor, iconImage, backgroundImage, createdAt: Date.now() });
      }
      requestPersistentStorage();
      // 履歴を置き換えて、戻る操作で保存済みのフォームに戻らないようにする
      navigate('/', { replace: true });
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました: ' + String(e));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!oshiId) return;
    if (!confirm(`「${name}」を削除しますか？グッズも全て削除されます。`)) return;
    try {
      // グッズと推しをまとめて消す。途中で失敗したら何も消えない
      await db.transaction('rw', db.oshis, db.goods, async () => {
        await db.goods.where('oshiId').equals(oshiId).delete();
        await db.oshis.delete(oshiId);
      });
      navigate('/', { replace: true });
    } catch (e) {
      console.error('削除エラー:', e);
      alert('削除に失敗しました。データは何も変わっていません: ' + String(e));
    }
  };

  return (
    <div className="page">
      <header className="form-header" style={{ backgroundColor: themeColor }}>
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>{isEdit ? '推しを編集' : '推しを追加'}</h2>
      </header>

      <div className="form-body">
        <div className="form-group">
          <label>推しの名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田太郎"
          />
        </div>

        <div className="form-group">
          <label>テーマカラー</label>
          <div className="color-grid">
            {PRESET_COLORS.map((color) => (
              <div
                key={color}
                className={`color-swatch ${themeColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setThemeColor(color)}
              />
            ))}
          </div>
          <div className="custom-color">
            <label>カスタムカラー</label>
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>アイコン画像</label>
          {iconImage && <img src={iconImage} alt="icon" className="preview-img round" />}
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setIconImage, ICON_MAX_SIZE)} disabled={imageBusy} />
          {iconImage && <button className="clear-btn" onClick={() => setIconImage(undefined)}>削除</button>}
        </div>

        <div className="form-group">
          <label>背景画像</label>
          {backgroundImage && <img src={backgroundImage} alt="bg" className="preview-img" />}
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBackgroundImage, PHOTO_MAX_SIZE)} disabled={imageBusy} />
          {backgroundImage && <button className="clear-btn" onClick={() => setBackgroundImage(undefined)}>削除</button>}
        </div>

        <button className="save-btn" style={{ backgroundColor: themeColor }} onClick={handleSave} disabled={imageBusy || saving}>
          {imageBusy ? '画像を処理中...' : saving ? '保存中...' : '保存する'}
        </button>

        {isEdit && (
          <button className="delete-btn" onClick={handleDelete}>
            この推しを削除する
          </button>
        )}
      </div>
    </div>
  );
}
