import io
import sys
from pathlib import Path

from flask import Flask, Response, request

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / "app"))

import server as simpenan  # noqa: E402

app = Flask(__name__, static_folder=None)
METHODS = ["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"]


def _proxy(path=None):
    payload = request.get_data(cache=False)
    environ = request.environ.copy()
    environ["PATH_INFO"] = request.path
    environ["SCRIPT_NAME"] = ""
    environ["QUERY_STRING"] = request.query_string.decode("utf-8", "replace")
    environ["wsgi.input"] = io.BytesIO(payload)
    environ["CONTENT_LENGTH"] = str(len(payload))
    captured = {}

    def start_response(status, headers, exc_info=None):
        captured["status"] = status
        captured["headers"] = headers
        return lambda chunk: None

    chunks = simpenan.app(environ, start_response)
    try:
        body = b"".join(chunks)
    finally:
        if hasattr(chunks, "close"):
            chunks.close()

    status = int(captured.get("status", "500 Internal Server Error").split()[0])
    response = Response(body, status=status)
    response.headers.clear()
    for key, value in captured.get("headers", []):
        response.headers.add(key, value)
    return response


app.add_url_rule("/", "proxy_root", _proxy, methods=METHODS)
app.add_url_rule("/<path:path>", "proxy_path", _proxy, methods=METHODS)
