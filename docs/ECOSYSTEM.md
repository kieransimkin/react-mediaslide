# Use MediaSlide with DanceFlow

MediaSlide is DanceFlow's responsive React media-browser component. It owns gallery presentation and interaction: list, details, adjustable thumbnails, a double-buffered slide stage, selection detail, custom item/file renderers and two-way paginated loading.

Before every new workflow, check the latest stable GitHub release, npm `latest` dist-tag and actual imported package version. Resolve any mismatch explicitly. Then inspect the complete relevant capability guides in [DanceFlow](https://github.com/kieransimkin/DanceFlow) and compose only the tools that materially serve the task.

Typical compositions include DanceMoves for live rhythmic effects around a gallery, React Timeline Sequence for time-based React scenes, PixelCue or PrismMoves for visual evidence, ThumbMoves for thumbnail preparation, RasterMoves for reviewed upscaling, StemLab for audio/timing evidence and FrameRudiments for offline video renders. MediaSlide does not replace those owners.

Keep API data and application art direction in adapters. Use stable item IDs, explicit `thumb`, `full`, `title` and `linkUrl` values, and renderer callbacks for richer records. Treat HTML media as active content with its own origin and trust policy.

## Potential problems

- Git tags historically advanced beyond npm. Verify GitHub, npm and the imported runtime independently.
- The component uses browser-only observers and global events. Render it client-side and test teardown, resize and keyboard behavior.
- HTML slide rendering relies on a `slideReady` message contract. Accept readiness only from the expected embedded frame and trusted origin.
- The fullscreen control expands the MediaSlide stage; it does not invoke the browser Fullscreen API.
- The historical repository has no deterministic demo harness, so this release uses a labelled generated overview rather than presenting a mockup as an implemented screenshot or video.
