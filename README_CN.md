<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png">
    <img alt="sk-get logo" src="./assets/logo.png" width="200">
  </picture>
</p>

# sk-get

[English](./README.md) | 简体中文

一个简单高效的 CLI 工具，用于通过 GitHub API 从指定的仓库管理并添加 AI Agent Skills 到 Cursor、Claude 和 VSCode 中。

## 功能

- **状态概览**: `sg status` 一眼查看当前环境及已安装技能。
- **多仓库管理**: 支持配置多个 Skill 仓库，并通过交互式菜单自由切换。
- **交互式操作**: `add`、`rm`、`repo use` 等命令在缺失参数时自动进入交互模式。
- **多平台支持**: 支持 Cursor (本地/全局)、Claude (本地/全局) 和 VSCode。
- **GitHub API 驱动**: 快速获取内容，无需克隆整个仓库。
- **本地缓存**: 自动缓存技能列表，支持离线查看。

## 安装

```bash
npm install -g sk-get
```

安装后，你可以使用 `sk-get` 或简写 `sg` 命令。

## 常用命令

### 状态查看 (Status)

```bash
sg status
```

显示当前激活的仓库、所有已配置的仓库列表，以及在各个平台（Cursor, Claude, VSCode）本地和全局已安装的技能详细列表。

### 仓库管理 (Repo)

```bash
# 添加仓库
sg repo add <repository-url>

# 列出仓库
sg repo ls

# 切换激活仓库 (交互式)
sg repo use

# 移除仓库 (支持交互)
sg repo rm
```

### 技能管理 (Skill)

#### 列出技能 (List)
```bash
# 查看当前激活仓库的远程技能列表
sg ls

# 交互式切换仓库并查看其技能
sg ls -r
```

#### 添加技能 (Add)
`sg add` 用于将远程仓库中的技能安装到本地或全局环境。

- **交互模式 (推荐)**:
  直接输入 `sg add`，程序将引导你选择技能、目标平台以及安装方式。
- **命令行模式**:
  `sg add <skill-name> <platform> [options]`

**参数说明:**
- `skill-name`: 远程仓库 `skills/` 目录下的文件夹名称。
- `platform`: 目标平台，可选值为 `cursor`, `claude`, `vscode`。

**选项:**
- `-g, --global`: 安装到系统全局目录。仅适用于 `cursor` 和 `claude`。
- `-m, --method <method>`: 安装方式。可选值为 `link` (默认), `copy`。
  - `link`: 创建指向中央库的软链接（Symbolic Link）。推荐使用，方便统一更新。
  - `copy`: 直接复制文件到项目中。适合需要静态快照的项目。

**示例:**
```bash
# 交互式添加 (包含安装方式选择)
sg add

# 通过软链接安装 (默认)
sg add git-commit cursor

# 通过复制方式安装
sg add git-commit cursor -m copy

# 添加 hello-world 到当前项目的 VSCode 指令文件
sg add hello-world vscode
```

#### 移除技能 (Remove)
`sg rm` 用于移除已安装的技能。

- **交互模式 (推荐)**:
  直接输入 `sg rm`，程序会先让你选择平台，然后**自动扫描**该平台已安装的技能供你选择删除。
- **命令行模式**:
  `sg rm <skill-name> <platform> [options]`

**示例:**
```bash
# 交互式移除
sg rm

# 移除本地 Cursor 的 git-commit 技能
sg rm git-commit cursor

# 移除全局 Cursor 的技能
sg rm git-commit cursor --global
```

## 平台支持细节

| 平台 | 默认路径 (Local) | 全局路径 (Global `-g`) | 说明 |
| :--- | :--- | :--- | :--- |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` | 整个文件夹拷贝 |
| **Claude** | `.claude/skills/` | `~/.claude/skills/` | 整个文件夹拷贝 |
| **VSCode** | `.github/copilot-instructions.md` | 不支持 | 将 `SKILL.md` 内容追加到文件末尾 |

## 仓库结构要求

你的 Skills 仓库应遵循以下结构：

```text
.
└── skills/
    ├── skill-name-1/
    │   └── SKILL.md
    └── skill-name-2/
        └── SKILL.md
```

每个 Skill 文件夹必须包含一个 `SKILL.md` 文件。

## 许可证

ISC
