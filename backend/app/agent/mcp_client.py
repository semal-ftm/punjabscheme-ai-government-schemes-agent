"""MCP client: launches the PunjabScheme MCP server over stdio and calls its tools.

The session lives on a dedicated event-loop thread so it works from synchronous LangGraph nodes and
from any web-server event loop (on Windows a Proactor loop is required to spawn the server process).
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import threading
import time
from concurrent.futures import Future
from contextlib import AsyncExitStack
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app import config


class MCPToolClient:
    def __init__(self, env: dict[str, str] | None = None):
        self._env = {**os.environ, **(env or {}), "PYTHONIOENCODING": "utf-8"}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._session: ClientSession | None = None
        self._stack: AsyncExitStack | None = None
        self._ready = threading.Event()
        self._start_error: BaseException | None = None
        self.tools: list[dict[str, Any]] = []
        self.server_info: dict[str, Any] = {}

    # ------------------------------------------------------------ lifecycle
    def start(self, timeout: float = 60) -> "MCPToolClient":
        if self._thread:
            return self
        self._thread = threading.Thread(target=self._run_loop, name="mcp-client", daemon=True)
        self._thread.start()
        if not self._ready.wait(timeout):
            raise TimeoutError("MCP server did not start in time")
        if self._start_error:
            raise RuntimeError(f"MCP server failed to start: {self._start_error}") from self._start_error
        return self

    def _run_loop(self) -> None:
        self._loop = asyncio.ProactorEventLoop() if sys.platform == "win32" else asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._open())
        except BaseException as exc:  # noqa: BLE001 - reported to the caller of start()
            self._start_error = exc
            self._ready.set()
            return
        self._ready.set()
        self._loop.run_forever()

    async def _open(self) -> None:
        params = StdioServerParameters(command=sys.executable, args=["-m", config.MCP_SERVER_MODULE],
                                       cwd=str(config.BACKEND_DIR), env=self._env)
        self._stack = AsyncExitStack()
        read, write = await self._stack.enter_async_context(stdio_client(params))
        self._session = await self._stack.enter_async_context(ClientSession(read, write))
        init = await self._session.initialize()
        self.server_info = {"name": init.server_info.name, "version": init.server_info.version,
                            "protocol": init.protocol_version}
        listed = await self._session.list_tools()
        self.tools = [{"name": t.name, "description": (t.description or "").strip().split("\n")[0],
                       "input_schema": t.input_schema} for t in listed.tools]

    def close(self) -> None:
        if not self._loop or not self._thread:
            return
        fut = asyncio.run_coroutine_threadsafe(self._stack.aclose(), self._loop) if self._stack else None
        try:
            if fut:
                fut.result(timeout=10)
        except Exception:  # noqa: BLE001 - best effort shutdown
            pass
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=10)
        self._thread = None

    # ------------------------------------------------------------ calls
    async def _call(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        result = await self._session.call_tool(name, args)
        if result.is_error:
            text = " ".join(getattr(c, "text", "") for c in result.content)
            return {"error": text or "tool error"}
        if result.structured_content:
            data = result.structured_content
            # The SDK wraps non-object return values as {"result": ...}
            return data.get("result", data) if set(data) == {"result"} else data
        for c in result.content:
            if getattr(c, "type", "") == "text":
                try:
                    return json.loads(c.text)
                except json.JSONDecodeError:
                    return {"text": c.text}
        return {}

    def call(self, name: str, args: dict[str, Any], timeout: float = 60) -> dict[str, Any]:
        """Synchronous tool call. Returns the parsed result plus timing metadata."""
        if not self._session or not self._loop:
            raise RuntimeError("MCP client is not started")
        started = time.perf_counter()
        future: Future = asyncio.run_coroutine_threadsafe(self._call(name, args), self._loop)
        data = future.result(timeout=timeout)
        return {"result": data, "elapsed_ms": round((time.perf_counter() - started) * 1000)}


_client: MCPToolClient | None = None
_client_lock = threading.Lock()


def get_mcp_client() -> MCPToolClient:
    global _client
    with _client_lock:
        if _client is None:
            _client = MCPToolClient().start()
        return _client


def shutdown_mcp_client() -> None:
    global _client
    with _client_lock:
        if _client:
            _client.close()
            _client = None
