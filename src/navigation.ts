import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// フォームを閉じるときの移動
// アプリ内から来たときは1つ前の画面に戻り（フォームを履歴から外す）、URLを直接開いたときは fallback に移る
// 保存中に利用者がすでに別の画面へ移っていたら、何もしない（移った先を上書きしないため）
export function useCloseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (fallback: string) => {
    if (!mountedRef.current) return;
    if (location.key !== 'default') navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
