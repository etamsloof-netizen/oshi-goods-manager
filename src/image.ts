// 選んだ写真を縮小してから保存する（スマホの写真は1枚数MBあり、そのままだと端末の容量を圧迫するため）
// 縮小できない画像のときは、これまでどおり元の画像をそのまま使う

export const ICON_MAX_SIZE = 512;
export const PHOTO_MAX_SIZE = 1280;

const JPEG_QUALITY = 0.85;
// これより小さいファイルは、縮小せずそのまま使う（画質を落とさないため）
const KEEP_ORIGINAL_BYTES = 300 * 1024;
// GIF（アニメが止まる）やSVGなどは縮小しない
const RESIZABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = url;
  });
}

// 縮小する必要がないときや、縮小しても小さくならないときは null を返す
async function resize(file: File, maxSize: number): Promise<string | null> {
  if (!RESIZABLE_TYPES.includes(file.type)) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) return null;
    if (longest <= maxSize && file.size <= KEEP_ORIGINAL_BYTES) return null;
    const scale = Math.min(1, maxSize / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // 透過PNGの透明部分が黒くならないよう、白で塗ってから描く
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    // 元の画像をそのまま保存した場合（ファイルサイズの約4/3）より小さくなったときだけ使う
    return dataUrl.startsWith('data:image/jpeg') && dataUrl.length < (file.size * 4) / 3 ? dataUrl : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageFileToDataUrl(file: File, maxSize: number): Promise<string> {
  try {
    const resized = await resize(file, maxSize);
    if (resized) return resized;
  } catch {
    // 縮小に失敗したときは、元の画像をそのまま使う
  }
  return readAsDataUrl(file);
}
