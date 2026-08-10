#Requires -Version 5.1
<#
.SYNOPSIS
  在本机 D:\ 与 E:\ 写入固定文案的 txt（供 write-de-txt skill 本机执行）。
#>
$ErrorActionPreference = 'Stop'

function Assert-Drive([string]$Letter) {
  $root = "${Letter}:\"
  if (-not (Test-Path -LiteralPath $root)) {
    throw "磁盘 ${Letter}: 不存在或不可访问。请确认本机有 ${Letter}: 盘后再运行。"
  }
  return $root
}

Assert-Drive 'D' | Out-Null
Assert-Drive 'E' | Out-Null

# UTF-8 无 BOM，整文件仅一行正文
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('D:\1.txt', '李逸飞大好人', $utf8NoBom)
[System.IO.File]::WriteAllText('E:\2.txt', '天摆平啦啦啦', $utf8NoBom)

Write-Host "已写入:"
Write-Host "  D:\1.txt -> $([System.IO.File]::ReadAllText('D:\1.txt'))"
Write-Host "  E:\2.txt -> $([System.IO.File]::ReadAllText('E:\2.txt'))"
