"""Build a dependency-free Pages artifact from the game's runtime files."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import re
import shutil
import stat

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "dist"
ENTRIES = ("index.html", "duel.html", "survivors.html")


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("src", "href") and value:
                self.links.append(value)


def local_reference(base, url):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path or url.startswith("#"):
        return
    if parsed.path.startswith("/"):
        raise ValueError(f"Root-relative URL breaks project Pages: {base.name}: {url}")
    target = (base.parent / unquote(parsed.path)).resolve()
    if not target.is_relative_to(DEST):
        raise ValueError(f"Reference outside deployment: {base.name}: {url}")
    if not target.is_file():
        raise ValueError(f"Missing runtime file: {base.name}: {url}")
    # Verify spelling on Windows too; Pages serves case-sensitive paths.
    current = DEST
    for part in target.relative_to(DEST).parts:
        if part not in {p.name for p in current.iterdir()}:
            raise ValueError(f"Case mismatch: {base.name}: {url}")
        current /= part


def main():
    if DEST.exists():
        assert DEST.resolve().parent == ROOT
        def remove_readonly(function, filename, exc_info):
            if not isinstance(exc_info[1], PermissionError):
                raise exc_info[1]
            Path(filename).chmod(stat.S_IWRITE)
            function(filename)
        shutil.rmtree(DEST, onerror=remove_readonly)
    DEST.mkdir()
    for file in ROOT.iterdir():
        if file.is_file() and file.suffix in (".html", ".css", ".js", ".svg", ".ico"):
            shutil.copy2(file, DEST / file.name)
    shutil.copytree(ROOT / "assets", DEST / "assets")
    (DEST / ".nojekyll").write_text("", encoding="utf-8")
    for name in ENTRIES:
        assert (DEST / name).is_file(), f"Missing game entry: {name}"
    for file in DEST.iterdir():
        if file.suffix not in (".html", ".css", ".js"):
            continue
        source = file.read_text(encoding="utf-8-sig")
        if file.suffix == ".html":
            parser = References()
            parser.feed(source)
            for link in parser.links:
                local_reference(file, link)
        for ref in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", source):
            local_reference(file, ref)
        for ref in re.findall(r"['\"](\.?/?assets/[^'\"\s]+)['\"]", source):
            local_reference(file, ref)
    files = [p for p in DEST.rglob("*") if p.is_file()]
    print(f"Built {len(files)} files, {sum(p.stat().st_size for p in files)/1024/1024:.1f} MiB; all local references valid.")


if __name__ == "__main__":
    main()
