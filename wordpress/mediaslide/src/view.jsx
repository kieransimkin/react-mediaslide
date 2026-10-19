import React from 'react';
import { createRoot } from 'react-dom/client';
import MediaSlide from '../../../src/MediaSlide';
import './view.css';

document.querySelectorAll('.mediaslide-wp[data-mediaslide]').forEach((element) => {
  try {
    const { gallery, mode } = JSON.parse(element.dataset.mediaslide);
    if (!Array.isArray(gallery) || !gallery.length) return;
    const root = createRoot(element);
    const itemRenderer = (click, size, spacing) => (item) => (
      <li key={item.id} data-id={item.id} style={{padding: spacing}} onClick={click(item)}>
        <button type="button" className="mediaslide-wp-item" onDoubleClick={(e) => e.preventDefault()}>
          <img src={item.thumb} width={size || 160} alt={item.title} loading="lazy" />
          <span>{item.title}</span>
        </button>
      </li>
    );
    root.render(
      <MediaSlide gallery={gallery} loading={false} pagination={{page:0,totalPages:0}}
        defaultDisplayType={mode} onLoadMoreData={() => {}}
        selectionChange={() => {}}
        listItemHTML={itemRenderer} detailsItemHTML={(click, size, spacing) => (item) => (
          <tr key={item.id}><td onClick={click(item)}><button type="button">{item.title}</button></td></tr>
        )}
        thumbnailsItemHTML={itemRenderer} slideItemHTML={itemRenderer}
        renderBigInfo={(item) => <article className="mediaslide-wp-info"><h3>{item.title}</h3><p>{item.metadata?.caption}</p></article>}
        renderFile={async () => null}
      />
    );
  } catch (error) {
    element.textContent = 'MediaSlide gallery could not be displayed.';
    console.error('MediaSlide:', error);
  }
});
