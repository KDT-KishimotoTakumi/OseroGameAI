"""Copy official Spec Kit skills to the dynamically resolved Hermes skills home."""

import os
import pathlib
import shutil
import subprocess

src_root = pathlib.Path(os.path.expanduser("~/.hermes/skills")).resolve()
dst_root = None
if os.environ.get("HERMES_HOME"):
    dst_root = pathlib.Path(os.environ["HERMES_HOME"]) / "skills"
else:
    try:
        cfg = subprocess.run(
            ["hermes", "config", "path"], capture_output=True,
            text=True, timeout=30, check=True,
        ).stdout.strip()
        if cfg:
            config_path = pathlib.Path(cfg)
            if config_path.name == "config.yaml":
                dst_root = config_path.parent / "skills"
    except (OSError, subprocess.SubprocessError):
        pass
if dst_root is None:
    dst_root = pathlib.Path.home() / ".hermes" / "skills"
dst_root = dst_root.expanduser().resolve()

for source in sorted(src_root.iterdir()):
    if source.name.startswith("speckit-") and source.is_dir():
        target = dst_root / source.name
        # Verify the absolute deletion target stays directly inside skills/.
        if target.is_symlink() or target.resolve().parent != dst_root:
            raise RuntimeError(f"Unsafe destination: {target}")
        if source.resolve() == target.resolve():
            continue  # The fallback can resolve to the source itself.
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)
print("dst_root:", dst_root)
