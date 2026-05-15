"""Use SQLite >= 3.35 when the stdlib sqlite3 is too old (common on Windows)."""


def patch_sqlite() -> None:
    """Swap stdlib sqlite3 for pysqlite3-binary before ChromaDB imports."""
    try:
        __import__("pysqlite3")
        import sys

        sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
    except ImportError:
        pass
