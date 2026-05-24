import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';

export default function OshiDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const oshiId = Number(id);

  const oshi = useLiveQuery(() => db.oshis.get(oshiId), [oshiId]);
  const goods = useLiveQuery(() => db.goods.where('oshiId').equals(oshiId).toArray(), [oshiId]);

  if (!oshi) return <div className="page"><p>読み込み中...</p></div>;

  const categories = [...new Set(goods?.map((g: any) => g.category as string) ?? [])] as string[];
  const totalCount = goods?.reduce((sum, g) => sum + g.count, 0) ?? 0;

  return (
    <div className="page">
      <header
        className="detail-header"
        style={{
          backgroundColor: oshi.themeColor,
          backgroundImage: oshi.backgroundImage ? `url(${oshi.backgroundImage})` : undefined,
        }}
      >
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <button className="edit-btn" onClick={() => navigate(`/oshi/${id}/edit`)}>編集</button>
        <div className="detail-header-content">
          {oshi.iconImage
            ? <img src={oshi.iconImage} alt={oshi.name} className="detail-icon" />
            : <div className="detail-icon-placeholder">★</div>
          }
          <h2>{oshi.name}</h2>
          <p>グッズ合計: {totalCount}個</p>
        </div>
      </header>

      <div className="detail-body">
        <div className="goods-actions">
          <button
            className="add-btn"
            style={{ backgroundColor: oshi.themeColor }}
            onClick={() => navigate(`/oshi/${id}/goods/new`)}
          >
            ＋ グッズを追加
          </button>
        </div>

        {goods?.length === 0 && (
          <div className="empty-state">
            <p>まだグッズが登録されていません</p>
          </div>
        )}

        {categories.map((category) => (
          <div key={category} className="category-section">
            <h3 className="category-title" style={{ borderColor: oshi.themeColor }}>
              {category}
            </h3>
            <div className="goods-list">
              {goods?.filter((g) => g.category === category).map((item) => (
                <div
                  key={item.id}
                  className="goods-card"
                  onClick={() => navigate(`/oshi/${id}/goods/${item.id}`)}
                >
                  {item.photo
                    ? <img src={item.photo} alt={item.name} className="goods-photo" />
                    : <div className="goods-photo-placeholder">📦</div>
                  }
                  <div className="goods-info">
                    <span className="goods-name">{item.name}</span>
                    <span className="goods-count" style={{ color: oshi.themeColor }}>{item.count}個</span>
                  </div>
                  {item.memo && <p className="goods-memo">{item.memo}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
