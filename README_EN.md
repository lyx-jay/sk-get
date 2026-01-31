# sk-get

English | [简体中文](./README.md)

A simple and efficient CLI tool to manage and add AI Agent Skills to Cursor, Claude, and VSCode via GitHub API.

## Features

- **Status Overview**: `sg status` gives an immediate view of your active repo and installed skills.
- **Multi-Repo Management**: Configure multiple skill repositories and switch between them easily.
- **Interactive Operations**: Commands like `add`, `rm`, and `repo use` automatically enter interactive mode if arguments are missing.
- **Multi-Platform Support**: Supports Cursor (Local/Global), Claude (Local/Global), and VSCode.
- **GitHub API Driven**: Fast content retrieval without the need to clone the entire repository.
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

Displays the active repository, total number of configured repositories, and a list of installed skills across all platforms.

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
`sg add` is used to install skills from a remote repository to your local or global environment.

- **Interactive Mode (Recommended)**:
  Run `sg add` without arguments, and the tool will guide you through selecting a skill and target platform.
- **Command Line Mode**:
  `sg add <skill-name> <platform> [options]`

**Arguments:**
- `skill-name`: The folder name under the `skills/` directory in the remote repository.
- `platform`: Target platform. Choices: `cursor`, `claude`, `vscode`.

**Options:**
- `-g, --global`: Install to the system global directory. Only applicable for `cursor` and `claude`.

**Examples:**
```bash
# Interactive add
sg add

# Install git-commit to the current project's Cursor directory (.cursor/skills/)
sg add git-commit cursor

# Install git-commit globally to Cursor (~/.cursor/skills/)
sg add git-commit cursor --global

# Add hello-world to VSCode instructions (.github/copilot-instructions.md)
sg add hello-world vscode
```

#### Remove Skill
`sg rm` is used to remove installed skills.

- **Interactive Mode (Recommended)**:
  Run `sg rm` without arguments. You will be prompted to select a platform, and the tool will **automatically scan** for installed skills for you to choose from.
- **Command Line Mode**:
  `sg rm <skill-name> <platform> [options]`

**Examples:**
```bash
# Interactive remove
sg rm

# Remove git-commit from local Cursor
sg rm git-commit cursor

# Remove git-commit from global Cursor
sg rm git-commit cursor --global
```

## Platform Details

| Platform | Default Path (Local) | Global Path (Global `-g`) | Description |
| :--- | :--- | :--- | :--- |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` | Copies the entire folder |
| **Claude** | `.claude/skills/` | `~/.claude/skills/` | Copies the entire folder |
| **VSCode** | `.github/copilot-instructions.md` | Not Supported | Appends `SKILL.md` content to the file |

## Repository Structure Requirements

Your Skills repository should follow this structure:

```text
.
└── skills/
    ├── skill-name-1/
    │   └── SKILL.md
    └── skill-name-2/
        └── SKILL.md
```

Each skill folder must contain a `SKILL.md` file.

## License

ISC
