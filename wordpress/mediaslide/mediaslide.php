<?php
/**
 * Plugin Name: MediaSlide
 * Description: Display WordPress Media Library galleries using the MediaSlide React component.
 * Version: 1.1.26
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Text Domain: mediaslide
 */
defined('ABSPATH') || exit;

function mediaslide_register() {
    $asset = plugin_dir_path(__FILE__) . 'assets/mediaslide.js';
    if (!file_exists($asset)) {
        return;
    }
    wp_register_script('mediaslide-view', plugins_url('assets/mediaslide.js', __FILE__), array(), (string) filemtime($asset), true);
    wp_register_style('mediaslide-view', plugins_url('assets/mediaslide.css', __FILE__), array(), (string) filemtime(plugin_dir_path(__FILE__) . 'assets/mediaslide.css'));
    register_block_type('mediaslide/gallery', array(
        'api_version' => 2,
        'attributes' => array(
            'ids' => array('type' => 'array', 'default' => array(), 'items' => array('type' => 'number')),
            'sourcePost' => array('type' => 'number', 'default' => 0),
            'mode' => array('type' => 'string', 'default' => 'thumbnails'),
            'height' => array('type' => 'number', 'default' => 560),
        ),
        'render_callback' => 'mediaslide_render',
        'editor_script' => 'mediaslide-editor',
    ));
    wp_register_script('mediaslide-editor', plugins_url('assets/editor.js', __FILE__), array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components'), '1.1.26', true);
}
add_action('init', 'mediaslide_register');

function mediaslide_ids_from_post($post_id) {
    $post = get_post($post_id);
    if (!$post || $post->post_status !== 'publish' || !is_post_publicly_viewable($post)) {
        return array();
    }
    $ids = array();
    $walk = function ($blocks) use (&$walk, &$ids) {
        foreach ($blocks as $block) {
            if ($block['blockName'] === 'core/gallery') {
                foreach (($block['attrs']['ids'] ?? array()) as $id) $ids[] = absint($id);
                foreach (($block['innerBlocks'] ?? array()) as $inner) {
                    if ($inner['blockName'] === 'core/image' && !empty($inner['attrs']['id'])) $ids[] = absint($inner['attrs']['id']);
                }
            }
            if (!empty($block['innerBlocks'])) $walk($block['innerBlocks']);
        }
    };
    $walk(parse_blocks($post->post_content));
    if (preg_match_all('/\[gallery\b[^\]]*\]/', $post->post_content, $matches)) {
        foreach ($matches[0] as $shortcode) {
            $atts = shortcode_parse_atts(substr($shortcode, 8, -1));
            if (!empty($atts['ids'])) {
                foreach (explode(',', $atts['ids']) as $id) $ids[] = absint($id);
            }
        }
    }
    return array_values(array_unique(array_filter($ids)));
}

function mediaslide_render($atts) {
    $atts = shortcode_atts(array('ids' => array(), 'sourcePost' => 0, 'mode' => 'thumbnails', 'height' => 560), $atts, 'mediaslide');
    $ids = is_array($atts['ids']) ? $atts['ids'] : explode(',', (string) $atts['ids']);
    if (absint($atts['sourcePost'])) $ids = array_merge($ids, mediaslide_ids_from_post(absint($atts['sourcePost'])));
    $ids = array_values(array_unique(array_filter(array_map('absint', $ids))));
    $items = array();
    foreach ($ids as $id) {
        if (!wp_attachment_is_image($id) || get_post_status($id) !== 'inherit') continue;
        $full = wp_get_attachment_image_url($id, 'large');
        $thumb = wp_get_attachment_image_url($id, 'medium');
        if (!$full || !$thumb) continue;
        $items[] = array(
            'id' => (string) $id,
            'title' => get_the_title($id) ?: ('Image ' . $id),
            'thumb' => esc_url_raw($thumb),
            'full' => esc_url_raw($full),
            'linkUrl' => esc_url_raw(wp_get_attachment_url($id)),
            'metadata' => array('files' => array(), 'caption' => wp_get_attachment_caption($id)),
        );
    }
    $items = apply_filters('mediaslide_gallery_items', $items, $atts);
    if (!is_array($items) || !$items) return '';
    $mode = in_array($atts['mode'], array('list', 'details', 'thumbnails', 'slide'), true) ? $atts['mode'] : 'thumbnails';
    $height = max(240, min(1200, absint($atts['height'])));
    wp_enqueue_script('mediaslide-view');
    wp_enqueue_style('mediaslide-view');
    $json = wp_json_encode(array('gallery' => array_values($items), 'mode' => $mode), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    return '<div class="mediaslide-wp" style="height:' . esc_attr($height) . 'px" data-mediaslide="' . esc_attr($json) . '"></div>';
}

function mediaslide_shortcode($atts) {
    $atts = shortcode_atts(array('ids' => '', 'post_id' => 0, 'mode' => 'thumbnails', 'height' => 560), $atts, 'mediaslide');
    return mediaslide_render(array('ids' => $atts['ids'], 'sourcePost' => $atts['post_id'], 'mode' => $atts['mode'], 'height' => $atts['height']));
}
add_shortcode('mediaslide', 'mediaslide_shortcode');
