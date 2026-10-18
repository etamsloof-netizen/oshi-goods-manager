import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// 戻る操作をしても、少し待ってまだ同じ画面だったら（戻れる履歴がなかったら）fallback へ移る
const BACK_FALLBACK_MS = 500;

// フォームを閉じるときの移動
// アプリ内から来たときは1つ前の画面に戻り（フォームを履歴から外す）、URLを直接開いたときは fallback に移る
// 閉じる処理は1回だけ。利用者がすでに別の画面へ移り始めていたら、何もしない（移った先を上書きしないため）
export function useCloseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);
  const closingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ブラウザがまだこのフォームの画面にいるか（戻るスワイプなどで移動が始まっていたら false）
  const stillHere = () => mountedRef.current && (window.history.state?.key ?? 'default') === location.key;

  return (fallback: string) => {
    if (closingRef.current || !stillHere()) return;
    closingRef.current = true;
    if (location.key === 'default') {
      navigate(fallback, { replace: true });
      return;
    }
    navigate(-1);
    setTimeout(() => {
      if (stillHere()) navigate(fallback, { replace: true });
    }, BACK_FALLBACK_MS);
  };
}
