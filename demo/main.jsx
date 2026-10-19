import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MediaSlide from '../src/MediaSlide';
import './style.css';

const media = Array.from({ length: 12 }, (_, i) => ({
  id: `sample-${String(i + 1).padStart(2, '0')}`,
  title: `Study ${String(i + 1).padStart(2, '0')}`,
  thumb: `${import.meta.env.BASE_URL}media/study-${i % 4}.svg`,
  full: `${import.meta.env.BASE_URL}media/study-${i % 4}.svg`,
  linkUrl: `${import.meta.env.BASE_URL}media/study-${i % 4}.svg`,
  metadata: { files: [], palette: ['Indigo', 'Coral', 'Mint', 'Amber'][i % 4] },
}));
const PAGE_SIZE = 4;
function App() {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState('none');
  const [custom, setCustom] = useState(false);
  const [requests, setRequests] = useState([]);
  const [mode, setMode] = useState('thumbnails');
  const gallery = media.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const move = (direction) => {
    setRequests((old) => [...old, direction]);
    setPage((old) => Math.max(0, Math.min(2, old + (direction === 'left' || direction === 'previous' ? -1 : 1))));
  };
  const renderer = (click) => (item) => <li key={item.id} data-id={item.id} onClick={click(item)} className="custom-tile" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') click(item)({ detail: 1 }); }}><img src={item.thumb} alt=""/><strong>{item.title}</strong><small>{item.metadata.palette} · custom renderer</small></li>;
  return <main>
    <header><h1>MediaSlide <span>component laboratory</span></h1><p>Local SVG fixtures · deterministic pagination · real component</p></header>
    <div className="controls">
      <label>View <select aria-label="Demo view" value={mode} onChange={e => setMode(e.target.value)}>{['list','details','thumbnails','slide'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label><input aria-label="Custom renderer" type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)}/> Custom thumbnail renderer</label>
      <button data-testid="previous-page" disabled={page === 0} onClick={() => move('left')}>Previous page</button>
      <output data-testid="page">Page {page + 1} of 3</output>
      <button data-testid="next-page" disabled={page === 2} onClick={() => move('right')}>Next page</button>
      <output data-testid="selection">Selected: {selection}</output>
      <output data-testid="requests">Requests: {requests.join(', ') || 'none'}</output>
    </div>
    <div className="gallery" data-testid="gallery" data-page={page}>
      <MediaSlide key={mode} gallery={gallery} loading={false} pagination={{page,totalPages:2}}
        defaultDisplayType={mode} defaultNavbarHidden={false}
        selectionChange={item => setSelection(item.id)}
        onLoadMoreData={(_, direction) => move(direction)}
        renderBigInfo={(item) => <article className="info"><h2>{item.title}</h2><p>{item.metadata.palette} study</p></article>}
        renderFile={async () => null}
        {...(custom ? { thumbnailsItemHTML: renderer } : {})}/>
    </div>
    <footer>MediaSlide browser harness · no external media requests</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
