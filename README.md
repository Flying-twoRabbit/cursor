# cursor

## 小游戏

- [**差一毫**](index.html) — 烧脑找色：在几乎相同的色块里找出细微不同的那一块。直接用浏览器打开即可玩。

## Skills

- [`dianping-review`](.cursor/skills/dianping-review/SKILL.md) — 写大众点评评价 / 探店笔记（口味·环境·服务、三版文案、评分与配图提示）
- [`write-de-txt`](.cursor/skills/write-de-txt/SKILL.md) — 在本机 `D:\1.txt` / `E:\2.txt` 写入固定文案（需 Windows 本机，不能靠云端冒充）

用法：

- `/dianping-review`，或直接说「帮我写大众点评评价」
- `/write-de-txt`，或直接说「生成磁盘文件」（请在本机 Windows 的 Cursor 里说；云端 Agent 写不到你电脑的 `E:\`）
- 或在本机 PowerShell 运行：`powershell -ExecutionPolicy Bypass -File .\scripts\write-de-txt.ps1`
