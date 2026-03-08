"""Logging system."""
import logging
import sys
from logging.handlers import RotatingFileHandler

from src.config import LOG_FILE

# Callback để gửi log lên UI
_ui_callback = None


def set_ui_callback(callback):
    global _ui_callback
    _ui_callback = callback


class UIHandler(logging.Handler):
    """Gửi log message lên UI."""
    def emit(self, record):
        if _ui_callback:
            msg = self.format(record)
            try:
                _ui_callback(msg)
            except Exception:
                pass


def setup_logger():
    logger = logging.getLogger("realsearch")
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )

    # File handler
    fh = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # UI handler
    uh = UIHandler()
    uh.setLevel(logging.INFO)
    uh.setFormatter(fmt)
    logger.addHandler(uh)

    return logger


log = setup_logger()
