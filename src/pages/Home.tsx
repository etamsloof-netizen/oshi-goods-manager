import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';

export default function Home() {
  const oshis = useLiveQuery(() => db.oshis.toArray());
  const navigate = useNavigate();

  return (
    <div className="page">
      <header className="home-header">
        <h1>推し活グッズ管理</h1>
        <button className="add-btn" onClick={() => navigate('/oshi/new')}>＋ 推しを追加</button>
      </header>

      {oshis?.length === 0 && (
        <div className="empty-state">
          <p>推しをまだ登録していません</p>
          <p>「＋ 推しを追加」から始めましょう！</p>
        </div>
      )}

      <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, margin: '4px 0' }}>v1.2</p>

      <div className="oshi-grid">
        {oshis?.map((oshi) => (
          <div
            key={oshi.id}
            className="oshi-card"
            style={{ backgroundColor: oshi.themeColor, backgroundImage: oshi.backgroundImage ? `url(${oshi.backgroundImage})` : undefined }}
            onClick={() => navigate(`/oshi/${oshi.id}`)}
          >
            {oshi.iconImage && (
              <img src={oshi.iconImage} alt={oshi.name} className="oshi-icon" />
            )}
            {!oshi.iconImage && (
              <div className="oshi-icon-placeholder">★</div>
            )}
            <span className="oshi-name">{oshi.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
