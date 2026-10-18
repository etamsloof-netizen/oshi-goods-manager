import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import OshiDetail from './pages/OshiDetail';
import OshiForm from './pages/OshiForm';
import GoodsForm from './pages/GoodsForm';
import { db } from './db';
import { requestPersistentStorage } from './persist';
import './index.css';

export default function App() {
  useEffect(() => {
    // すでにデータがある人は、起動時にデータを消さないよう申請する
    db.oshis.count()
      .then((count: number) => { if (count > 0) requestPersistentStorage(); })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/oshi/new" element={<OshiForm />} />
        <Route path="/oshi/:id" element={<OshiDetail />} />
        <Route path="/oshi/:id/edit" element={<OshiForm />} />
        <Route path="/oshi/:oshiId/goods/new" element={<GoodsForm />} />
        <Route path="/oshi/:oshiId/goods/:goodsId" element={<GoodsForm />} />
      </Routes>
    </BrowserRouter>
  );
}
