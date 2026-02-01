<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png">
    <img alt="sk-get logo" src="./assets/logo.png" width="200">
  </picture>
</p>

# sk-get

English | [简体中文](./README_CN.md)

A simple and efficient CLI tool to manage and add AI Agent Skills to Cursor, Claude, and VSCode via GitHub/GitLab API.

## Features

- **Status Overview**: `sg status` gives an immediate view of your active repo and installed skills.
- **Smart Platform Detection**: Automatically detects installed AI apps (Cursor, Claude, VSCode) and streamlines selection.
- **Multi-Repo Management**: Configure multiple skill repositories and switch between them easily.
- **Interactive Batch Operations**: Support for adding or removing multiple skills and targeting multiple platforms at once.
- **Symbolic Link Installation**: Default installation method that keeps your skills updated via a central library.
- **GitHub & GitLab Support**: Fetch skills from any public or private repository.
- **Local Caching**: Automatically caches skill lists for offline viewing.

## Installation

```bash
npm install -g sk-get
```

After installation, you can use the `sk-get` or the shorthand `sg` command.

## Common Commands

### Status

```bash
sg status
```

Displays the active repository, configured repositories, and a detailed list of installed skills across all platforms.

### Repository Management (Repo)

```bash
# Add a repository
sg repo add <repository-url>

# List all repositories
sg repo ls

# Switch active repository (Interactive)
sg repo use

# Remove a repository (Interactive)
sg repo rm
```

### Skill Management

#### List Skills
```bash
# List skills in the currently active repository
sg ls

# Interactively switch repository and list its skills
sg ls -r
```

#### Add Skill
`sg add` is used to install skills from a remote repository.

- **Interactive Mode (Recommended)**:
  Run `sg add` without arguments. It will **auto-detect** your platforms and guide you through selecting skills and platforms.
- **Batch Installation**:
  You can select multiple skills and multiple platforms simultaneously.
- **Command Line Mode**:
  `sg add <skill-names> <platforms> [options]`

**Arguments:**
- `skill-names`: Comma-separated folder names (e.g., `git-commit,vue`).
- `platforms`: Comma-separated target platforms (e.g., `cursor,claude`).

**Options:**
- `-g, --global`: Install to the system global directory.
- `-m, --method <method>`: `link` (default) or `copy`.

**Examples:**
```bash
# Interactive add (Auto-detects platforms)
sg add

# Install multiple skills to Cursor
sg add git-commit,vue cursor

# Install to multiple platforms
sg add git-commit cursor,claude
```

#### Remove Skill
`sg rm` supports interactive **multi-selection** for bulk removal.

- **Interactive Mode**:
  Run `sg rm` to see all installed skill instances and select multiple for removal.
- **Command Line Mode**:
  `sg rm <skill-name> <platform> [options]`

## Platform Details

| Platform | Default Path (Local) | Global Path (Global `-g`) | Description |
| :--- | :--- | :--- | :--- |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` | Real folder with symlinked files |
| **Claude** | `.claude/skills/` | `~/.claude/skills/` | Real folder with symlinked files |
| **VSCode** | `.github/copilot-instructions.md` | Not Supported | Appends `SKILL.md` content |

## License

ISC
