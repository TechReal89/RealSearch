"""Browser fingerprint randomization for anti-detection."""
import random
from dataclasses import dataclass, field


# Chrome versions (recent stable releases)
_CHROME_VERSIONS = [
    "130.0.6723.116",
    "131.0.6778.85",
    "131.0.6778.108",
    "132.0.6834.57",
    "132.0.6834.83",
    "133.0.6880.53",
    "133.0.6880.85",
    "134.0.6897.45",
    "134.0.6897.72",
    "135.0.6935.37",
]

# Common screen resolutions (width, height)
_VIEWPORTS = [
    (1920, 1080),
    (1366, 768),
    (1536, 864),
    (1440, 900),
    (1280, 720),
    (1600, 900),
    (1280, 800),
    (1024, 768),
]

# Realistic WebGL GPU combos (vendor, renderer)
_WEBGL_GPUS = [
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 630, D3D11)"),
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 620, D3D11)"),
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, D3D11)"),
    ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, D3D11)"),
    ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB, D3D11)"),
    ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060, D3D11)"),
    ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060, D3D11)"),
    ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon RX 580, D3D11)"),
    ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon(TM) Graphics, D3D11)"),
    ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) HD Graphics 530, D3D11)"),
]

# Windows versions for UA
_WINDOWS_VERSIONS = [
    "Windows NT 10.0; Win64; x64",  # Windows 10/11
]

_HARDWARE_CONCURRENCY = [4, 8, 12, 16]
_DEVICE_MEMORY = [4, 8, 16]


@dataclass
class Fingerprint:
    user_agent: str = ""
    viewport: dict = field(default_factory=dict)
    webgl_vendor: str = ""
    webgl_renderer: str = ""
    hardware_concurrency: int = 8
    device_memory: int = 8
    platform: str = "Win32"
    languages: list = field(default_factory=lambda: ["vi-VN", "vi", "en-US", "en"])


def generate_fingerprint() -> Fingerprint:
    """Generate a randomized browser fingerprint."""
    chrome_ver = random.choice(_CHROME_VERSIONS)
    win_ver = random.choice(_WINDOWS_VERSIONS)
    vp = random.choice(_VIEWPORTS)
    gpu = random.choice(_WEBGL_GPUS)

    ua = (
        f"Mozilla/5.0 ({win_ver}) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) "
        f"Chrome/{chrome_ver} Safari/537.36"
    )

    return Fingerprint(
        user_agent=ua,
        viewport={"width": vp[0], "height": vp[1]},
        webgl_vendor=gpu[0],
        webgl_renderer=gpu[1],
        hardware_concurrency=random.choice(_HARDWARE_CONCURRENCY),
        device_memory=random.choice(_DEVICE_MEMORY),
        platform="Win32",
        languages=["vi-VN", "vi", "en-US", "en"],
    )
