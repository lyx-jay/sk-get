<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png">
    <img alt="sk-get logo" src="./assets/logo.png" width="200">
  </picture>
</p>

# sk-get

[English](./README.md) | 简体中文

一个简单高效的 CLI 工具，用于通过 GitHub/GitLab API 管理并添加 AI Agent Skills 到 Cursor、Claude 和 VSCode 中。

## 功能

- **状态概览**: `sg status` 一眼查看当前环境、活跃仓库及所有已安装技能。
- **智能平台检测**: 自动识别本地安装的 Cursor、Claude 和 VSCode，简化选择流程。
- **多仓库管理**: 支持配置多个 Skill 仓库（GitHub/GitLab），并可自由切换。
- **交互式批量操作**: 支持一次性选择并安装/删除多个技能，支持同时安装到多个平台。
- **软链接安装**: 默认通过 Symbolic Link 安装，支持通过中央库统一更新技能。
- **跨平台支持**: 完美支持 Cursor (本地/全局)、Claude (本地/全局) 和 VSCode。
- **GitHub & GitLab 驱动**: 快速获取内容，无需克隆整个仓库，支持私有库。

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

显示当前配置、活跃仓库以及在各个平台已安装的技能详细列表。

### 仓库管理 (Repo)

```bash
# 添加仓库 (支持 GitHub 和 GitLab)
sg repo add <repository-url>

# 列出所有已配置仓库
sg repo ls

# 切换当前活跃仓库 (交互式)
sg repo use

# 移除仓库 (支持交互选择)
sg repo rm
```

### 技能管理 (Skill)

#### 列出技能 (List)
```bash
# 查看当前活跃仓库的技能列表
sg ls

# 交互式切换仓库并查看其技能
sg ls -r
```

#### 添加技能 (Add)
`sg add` 支持极其灵活的批量安装和平台自适应。

- **交互模式 (推荐)**:
  直接输入 `sg add`，程序将**自动检测**本地平台并引导你完成多选。
- **批量安装**:
  支持一次勾选多个技能，并同时分发到多个平台。
- **命令行模式**:
  `sg add <skill-names> <platforms> [options]`

**参数说明:**
- `skill-names`: 技能文件夹名称，支持逗号分隔 (如 `s1,s2`)。
- `platforms`: 目标平台，支持逗号分隔 (如 `cursor,claude`)。

**选项:**
- `-g, --global`: 安装到系统全局目录。
- `-m, --method <method>`: 安装方式，可选 `link` (默认) 或 `copy`。

**示例:**
```bash
# 交互式添加 (自动检测并支持多选)
sg add

# 同时安装多个技能到 Cursor
sg add git-commit,vue cursor

# 同时安装到多个平台
sg add git-commit cursor,claude
```

#### 移除技能 (Remove)
`sg rm` 在交互模式下支持**多选批量删除**。

- **交互模式**:
  直接输入 `sg rm`，扫描所有已安装实例并支持勾选删除。
- **命令行模式**:
  `sg rm <skill-name> <platform> [options]`

## 平台支持细节

| 平台 | 默认路径 (Local) | 全局路径 (Global `-g`) | 实现说明 |
| :--- | :--- | :--- | :--- |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` | 真实目录 + 内部文件软链接 |
| **Claude** | `.claude/skills/` | `~/.claude/skills/` | 真实目录 + 内部文件软链接 |
| **VSCode** | `.github/copilot-instructions.md` | 不支持 | 将 `SKILL.md` 内容追加到文件 |

## 许可证

ISC
