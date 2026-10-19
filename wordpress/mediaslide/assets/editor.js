(function (wp) {
  const el = wp.element.createElement;
  const { registerBlockType } = wp.blocks;
  const { MediaUpload, MediaUploadCheck, InspectorControls } = wp.blockEditor;
  const { Button, PanelBody, SelectControl, RangeControl, TextControl } = wp.components;
  registerBlockType('mediaslide/gallery', {
    title: 'MediaSlide Gallery',
    icon: 'format-gallery',
    category: 'media',
    edit: function ({ attributes, setAttributes }) {
      const { ids, mode, height, sourcePost } = attributes;
      return el('div', { className: 'mediaslide-editor' },
        el(InspectorControls, {},
          el(PanelBody, { title: 'MediaSlide settings' },
            el(SelectControl, { label: 'Presentation', value: mode,
              options: ['list', 'details', 'thumbnails', 'slide'].map(x => ({ label: x, value: x })),
              onChange: value => setAttributes({ mode: value }) }),
            el(RangeControl, { label: 'Height (px)', value: height, min: 240, max: 1200,
              onChange: value => setAttributes({ height: value }) }),
            el(TextControl, { label: 'Use galleries from published post ID (optional)', type: 'number',
              value: sourcePost || '', onChange: value => setAttributes({ sourcePost: Number(value) || 0 }) })
          )
        ),
        el('p', {}, 'MediaSlide Gallery · ' + (ids.length ? ids.length + ' selected images' : 'No images selected')),
        el(MediaUploadCheck, {}, el(MediaUpload, {
          onSelect: media => setAttributes({ ids: media.map(item => item.id) }),
          allowedTypes: ['image'], multiple: true, gallery: true,
          value: ids,
          render: ({ open }) => el(Button, { variant: 'primary', onClick: open }, 'Choose gallery images')
        })),
        el('p', {}, 'Preview on the published page. Presentation: ' + mode)
      );
    },
    save: () => null
  });
})(window.wp);
