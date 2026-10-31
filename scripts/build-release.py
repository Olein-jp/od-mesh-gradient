#!/usr/bin/env python3
"""タグの番号を埋め込み、実行時の依存だけを含む配布 ZIP を作成する。"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = "od-mesh-gradient"


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", sys.argv[1]):
        sys.exit("バージョンを 0.0.0 形式で指定してください（v 接頭辞は不要です）。")
    version = sys.argv[1]
    for name in ("index.js", "index.css", "index.asset.php"):
        if not (ROOT / "build" / name).is_file():
            sys.exit("ビルド成果物がありません。先に npm run build を実行してください。")
    with tempfile.TemporaryDirectory() as temporary:
        staging = Path(temporary) / SLUG
        staging.mkdir()
        # 配布対象は明示する。機能追加時には必要なディレクトリもここへ追加する。
        for name in (f"{SLUG}.php", "README.md", "readme.txt", "LICENSE", "composer.json", "composer.lock"):
            shutil.copy2(ROOT / name, staging / name)
        for name in ("languages", "includes", "build", "docs"):
            shutil.copytree(ROOT / name, staging / name)
        for name, pattern, replacement in (
            (f"{SLUG}.php", r"(?m)^ \* Version: .*?$", f" * Version: {version}"),
            ("readme.txt", r"(?m)^Stable tag: .*?$", f"Stable tag: {version}"),
        ):
            path = staging / name
            content, count = re.subn(pattern, replacement, path.read_text())
            if count != 1:
                sys.exit(f"{name} のバージョン欄を特定できません。")
            path.write_text(content)
        subprocess.run(
            ["composer", "install", "--no-dev", "--prefer-dist", "--no-interaction",
             "--no-progress", "--no-plugins", "--no-scripts", "--optimize-autoloader"],
            cwd=staging, check=True,
        )
        installed = json.loads((staging / "vendor/composer/installed.json").read_text())
        if installed["dev"] or installed["dev-package-names"]:
            sys.exit("開発用の依存パッケージが含まれています。")
        if not (staging / "vendor/autoload.php").is_file():
            sys.exit("オートローダーがありません。")
        # 依存パッケージに同梱された CI 設定やテストも配布しない。
        for path in sorted((staging / "vendor").rglob("*"), reverse=True):
            if path.is_dir() and path.name in {".git", ".github", "tests", "Tests", "test"}:
                shutil.rmtree(path)
        # Composer の設定は開発情報なので配布しない。
        (staging / "composer.json").unlink()
        (staging / "composer.lock").unlink()
        destination = ROOT / "dist" / f"{SLUG}.zip"
        destination.parent.mkdir(exist_ok=True)
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(staging.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(staging.parent))
        with zipfile.ZipFile(destination) as archive:
            if archive.testzip():
                sys.exit("ZIP の整合性確認に失敗しました。")
        print(f"配布 ZIP: {destination}（{version}）")


if __name__ == "__main__":
    main()
