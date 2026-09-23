import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';

type SortKey = 'created' | 'name' | 'countDesc' | 'countAsc';

const SORT_STORAGE_KEY = 'goodsSortKey';
const GROUP_STORAGE_KEY = 'goodsGroupByCategory';
const collator = new Intl.Collator('ja', { numeric: true });

// 並び順の設定は端末ごとに記憶する（グッズのデータには触れない）
function loadSetting(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できなくても表示には影響しない
  }
}

function sortGoods(list: any[], sortKey: SortKey) {
  const byName = (a: any, b: any) => collator.compare(a.name ?? '', b.name ?? '');
  const sorted = [...list];
  switch (sortKey) {
    case 'name':
      return sorted.sort(byName);
    case 'countDesc':
      return sorted.sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || byName(a, b));
    case 'countAsc':
      return sorted.sort((a, b) => (a.count ?? 0) - (b.count ?? 0) || byName(a, b));
    default:
      return sorted;
  }
}

export default function OshiDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const oshiId = Number(id);

  const oshi = useLiveQuery(() => db.oshis.get(oshiId), [oshiId]);
  const goods = useLiveQuery(() => db.goods.where('oshiId').equals(oshiId).toArray(), [oshiId]);
  const [sortKey, setSortKey] = useState<SortKey>(() => loadSetting(SORT_STORAGE_KEY, 'created') as SortKey);
  const [groupByCategory, setGroupByCategory] = useState(() => loadSetting(GROUP_STORAGE_KEY, 'true') === 'true');

  if (!oshi) return <div className="page"><p>読み込み中...</p></div>;

  const categories = [...new Set(goods?.map((g: any) => g.category as string) ?? [])] as string[];
  const totalCount = goods?.reduce((sum, g) => sum + g.count, 0) ?? 0;
  const sortedGoods = sortGoods(goods ?? [], sortKey);
  const sections = groupByCategory
    ? categories.map((category) => ({ title: category, items: sortedGoods.filter((g) => g.category === category) }))
    : [{ title: null as string | null, items: sortedGoods }];

  const handleSortChange = (value: SortKey) => {
    setSortKey(value);
    saveSetting(SORT_STORAGE_KEY, value);
  };

  const handleGroupChange = (checked: boolean) => {
    setGroupByCategory(checked);
    saveSetting(GROUP_STORAGE_KEY, String(checked));
  };

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

        {goods && goods.length > 0 && (
          <div className="sort-bar">
            <select value={sortKey} onChange={(e) => handleSortChange(e.target.value as SortKey)}>
              <option value="created">登録順</option>
              <option value="name">あいうえお順</option>
              <option value="countDesc">持ってる数が多い順</option>
              <option value="countAsc">持ってる数が少ない順</option>
            </select>
            <label className="group-toggle">
              <input
                type="checkbox"
                checked={groupByCategory}
                onChange={(e) => handleGroupChange(e.target.checked)}
              />
              カテゴリごとに分ける
            </label>
          </div>
        )}

        {goods?.length === 0 && (
          <div className="empty-state">
            <p>まだグッズが登録されていません</p>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title ?? 'all'} className="category-section">
            {section.title && (
              <h3 className="category-title" style={{ borderColor: oshi.themeColor }}>
                {section.title}
              </h3>
            )}
            <div className="goods-list">
              {section.items.map((item) => (
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
