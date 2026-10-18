// 端末の空き容量が足りなくなったときに、このアプリのデータを消さないようブラウザへ申請する
// 許可するかはブラウザが決める。断られても申請できなくても、アプリの動作には影響しない
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    // 何もしない
  }
}
