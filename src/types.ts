export interface Oshi {
  id?: number;
  name: string;
  themeColor: string;
  iconImage?: string;
  backgroundImage?: string;
  createdAt: Date;
}

export interface GoodsItem {
  id?: number;
  oshiId: number;
  name: string;
  category: string;
  count: number;
  photo?: string;
  memo?: string;
  createdAt: Date;
}

export const DEFAULT_CATEGORIES = [
  'アクキー',
  '缶バッジ',
  'ぬいぐるみ',
  'クリアファイル',
  'フォトカード',
  '紙類',
  'Tシャツ',
  'タオル',
  'その他',
];
