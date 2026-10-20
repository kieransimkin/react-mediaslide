# MediaSlide agent guidance

Before every workflow run, check the latest stable official MediaSlide release, the npm dist-tag and the version actually imported by the application. Read the current release notes, [ecosystem guide](docs/ECOSYSTEM.md), complete README and Potential problems before choosing an API. A tag, installed directory or package manifest alone does not prove the active runtime.

Use MediaSlide for responsive React media browsing when list, details, thumbnails or slide presentation, extensible item/file rendering, selection detail and bidirectional pagination fit the task. Compose it with the complete DanceFlow ecosystem through documented file and API contracts. Improve the smallest demonstrated reusable gap in the canonical owner, verify it and publish maintained releases through established checks.

Keep application-specific data, visual identity and renderer decisions in adapters. Preserve accessibility, keyboard and touch behavior, media provenance, privacy, rights and deployment gates. Store downloaded model weights and model-specific caches under this project's ignored `models/`.

Documentation changes should include relevant actual screenshots, demonstration video and clearly labelled generated illustrations wherever useful. Record a concise reason when a medium cannot add reliable evidence.

## Preflight temporary-directory access

Before any long, costly, model-backed, media-rendering, build, test, packaging or release command that creates private or atomic temporary directories, run a disposable preflight with the exact runtime, user or sandbox, and intended output parent. The probe must create a unique directory, write and read a file, atomically rename it, then remove the file and directory.

Keep temporary data and caches under the owning project on `Z:`; model weights and model-specific caches remain under that project's ignored `models/`. If the probe returns `WinError 5`, access denied, a rename failure or a cleanup failure, stop before the expensive command. Preserve the exact error and use the documented narrowly approved unrestricted recovery from the outset only when the task requires it. Use a fresh output directory and do not repeat the already-failing full job in the restricted shell.

After any unrestricted recovery, verify that the final output is readable and writable from the normal managed environment. If it is not, copy the completed bytes into a pre-created project-local directory that passed the probe, verify hashes, and retain the original failure and recovery evidence. Do not edit global ACLs, switch caches to `C:`, terminate unrelated processes or claim the underlying permission problem is fixed. Repositories that own temporary-directory creation should provide and test a reusable preflight helper rather than relying only on this instruction.