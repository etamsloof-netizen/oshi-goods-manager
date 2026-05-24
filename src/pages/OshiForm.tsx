import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('推しの名前を入力してください');
    try {
      if (isEdit && oshiId) {
        await db.oshis.update(oshiId, { name, themeColor, iconImage, backgroundImage });
      } else {
        await db.oshis.add({ name, themeColor, iconImage, backgroundImage, createdAt: Date.now() });
      }
      navigate('/');
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました: ' + String(e));
    }
  };

  const handleDelete = async () => {
    if (!oshiId) return;
    if (!confirm(`「${name}」を削除しますか？グッズも全て削除されます。`)) return;
    await db.goods.where('oshiId').equals(oshiId).delete();
    await db.oshis.delete(oshiId);
    navigate('/');
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
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setIconImage)} />
          {iconImage && <button className="clear-btn" onClick={() => setIconImage(undefined)}>削除</button>}
        </div>

        <div className="form-group">
          <label>背景画像</label>
          {backgroundImage && <img src={backgroundImage} alt="bg" className="preview-img" />}
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBackgroundImage)} />
          {backgroundImage && <button className="clear-btn" onClick={() => setBackgroundImage(undefined)}>削除</button>}
        </div>

        <button className="save-btn" style={{ backgroundColor: themeColor }} onClick={handleSave}>
          保存する
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
