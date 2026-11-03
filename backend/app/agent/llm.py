"""LLM access (DeepSeek by default, or Groq, via LangChain) behind a tiny interface so tests can plug in a fake."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Protocol

from app import config

log = logging.getLogger(__name__)


class LLM(Protocol):
    name: str

    def json(self, system: str, prompt: str) -> dict[str, Any]: ...

    def text(self, system: str, prompt: str) -> str: ...


class LLMUnavailable(RuntimeError):
    pass


def _parse_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", raw, re.S)
    if fenced:
        raw = fenced.group(1)
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object in model output")
    return json.loads(raw[start:end + 1])


class ChatLLM:
    """Wraps a LangChain chat model. DeepSeek is reached through its OpenAI-compatible API."""

    def __init__(self, provider: str | None = None, model: str | None = None, api_key: str | None = None):
        provider = (provider or config.LLM_PROVIDER).lower()
        model = model or config.LLM_MODEL
        if provider == "deepseek":
            from langchain_openai import ChatOpenAI

            key = api_key or config.DEEPSEEK_API_KEY
            if not key:
                raise LLMUnavailable("DEEPSEEK_API_KEY is not set. Add it to backend/.env")
            self._chat = ChatOpenAI(model=model, temperature=config.LLM_TEMPERATURE, api_key=key,
                                    base_url=config.DEEPSEEK_BASE_URL, max_retries=2, timeout=90)
        elif provider == "groq":
            from langchain_groq import ChatGroq

            key = api_key or config.GROQ_API_KEY
            if not key:
                raise LLMUnavailable("GROQ_API_KEY is not set. Add it to backend/.env")
            self._chat = ChatGroq(model=model, temperature=config.LLM_TEMPERATURE, api_key=key,
                                  max_retries=2, timeout=60)
        else:
            raise LLMUnavailable(f"Unknown LLM_PROVIDER '{provider}' (use deepseek or groq)")
        self.name = f"{provider}:{model}"
        # JSON mode: DeepSeek and Groq both accept OpenAI's response_format (prompts mention "JSON").
        self._json_chat = self._chat.bind(response_format={"type": "json_object"})

    def json(self, system: str, prompt: str) -> dict[str, Any]:
        messages = [("system", system), ("user", prompt)]
        last_error: Exception | None = None
        for _ in range(2):
            raw = self._json_chat.invoke(messages).content
            try:
                return _parse_json(raw)
            except (ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                messages.append(("assistant", raw))
                messages.append(("user", "That was not valid JSON. Return only the JSON object."))
        raise ValueError(f"LLM did not return valid JSON: {last_error}")

    def text(self, system: str, prompt: str) -> str:
        return self._chat.invoke([("system", system), ("user", prompt)]).content


_default: LLM | None = None


def get_llm() -> LLM:
    global _default
    if _default is None:
        _default = ChatLLM()
    return _default
