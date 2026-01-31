# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2026-01-31
### Added
- **GitHub API Integration**: Refactored core to use GitHub API for faster, lightweight skill retrieval without full repository cloning.
- **Multi-Repo Management**: New `sg repo` command suite to add, remove, list, and switch between multiple skill sources.
- **Interactive Mode**: Commands `add`, `rm`, and `repo use` now support full interactive menus when run without arguments.
- **Status Overview**: New `sg status` command to view active repo and installed skills across all platforms.
- **Improved Removal**: Precise removal of skills from Cursor, Claude, and VSCode configuration.
- **Detailed Documentation**: Added comprehensive English and Chinese READMEs and enhanced `--help` documentation.

### Changed
- Renamed `install` command to `add` for brevity and consistency.
- Standardized command aliases (`ls` for `list`, `rm` for `remove`).

## [1.0.1] - 2026-01-31
### Added
- Initial project structure and core functionality.
