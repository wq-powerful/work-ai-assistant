import json
from typing import AsyncGenerator

import httpx

from config import load_config


def _sse_json(payload: dict) -> str:
    """Serialize an SSE JSON payload safely."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _could_be_partial(tag: str, candidate: str) -> bool:
    """Check if candidate is a non-complete prefix of tag."""
    return len(candidate) < len(tag) and tag.startswith(candidate)


def _parse_think_tags(
    text: str, in_think: bool, buffer: str
) -> tuple[list[tuple[str, str]], bool, str]:
    """Parse <think>...</think> tags in streaming content.

    Returns (segments, in_think, buffer) where segments is a list of
    ("thinking", text) or ("content", text) tuples.
    """
    text = buffer + text
    buffer = ""
    segments: list[tuple[str, str]] = []
    pos = 0

    while pos < len(text):
        remaining = text[pos:]
        if in_think:
            idx = remaining.find("</think>")
            if idx != -1:
                segment = remaining[:idx]
                if segment:
                    segments.append(("thinking", segment))
                pos += idx + len("</think>")
                in_think = False
            else:
                last_lt = remaining.rfind("<")
                if last_lt != -1 and _could_be_partial(
                    "</think>", remaining[last_lt:]
                ):
                    segment = remaining[:last_lt]
                    if segment:
                        segments.append(("thinking", segment))
                    buffer = remaining[last_lt:]
                else:
                    if remaining:
                        segments.append(("thinking", remaining))
                break
        else:
            idx = remaining.find("<think>")
            if idx != -1:
                segment = remaining[:idx]
                if segment:
                    segments.append(("content", segment))
                pos += idx + len("<think>")
                in_think = True
            else:
                last_lt = remaining.rfind("<")
                if last_lt != -1 and _could_be_partial(
                    "<think>", remaining[last_lt:]
                ):
                    segment = remaining[:last_lt]
                    if segment:
                        segments.append(("content", segment))
                    buffer = remaining[last_lt:]
                else:
                    if remaining:
                        segments.append(("content", remaining))
                break

    return segments, in_think, buffer


async def stream_chat_completion(
    messages: list[dict],
    config_override: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat completion from an OpenAI-compatible API endpoint."""
    config = load_config()
    if config_override:
        config.update(config_override)

    api_base = config["api_base_url"].rstrip("/")
    url = f"{api_base}/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": config["temperature"],
        "max_tokens": config["max_tokens"],
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    error_text = error_body.decode("utf-8", errors="replace")
                    yield _sse_json(
                        {"error": f"API returned status {response.status_code}: {error_text}"}
                    )
                    return

                # State for <think> tag parsing (Qwen thinking models)
                in_think_block = False
                tag_buffer = ""

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            # Flush any remaining buffer
                            if tag_buffer:
                                msg_type = "thinking" if in_think_block else "content"
                                yield _sse_json({msg_type: tag_buffer})
                            yield "data: [DONE]\n\n"
                            return
                        try:
                            parsed = json.loads(data)
                            choices = parsed.get("choices", [])
                            if not choices:
                                continue
                            delta = choices[0].get("delta", {})

                            # Extract thinking/reasoning content (DeepSeek, o1/o3, etc.)
                            thinking = delta.get("reasoning_content") or delta.get("reasoning", "")
                            if thinking:
                                yield _sse_json({"thinking": thinking})

                            # Parse <think> tags in content (Qwen thinking models)
                            content = delta.get("content", "")
                            if content:
                                segments, in_think_block, tag_buffer = _parse_think_tags(
                                    content, in_think_block, tag_buffer
                                )
                                for msg_type, segment_text in segments:
                                    yield _sse_json({msg_type: segment_text})
                        except json.JSONDecodeError:
                            continue

                # Flush any remaining buffer at stream end
                if tag_buffer:
                    msg_type = "thinking" if in_think_block else "content"
                    yield _sse_json({msg_type: tag_buffer})

        yield "data: [DONE]\n\n"

    except GeneratorExit:
        # Client disconnected, exit gracefully
        return
    except httpx.ConnectTimeout:
        yield _sse_json({"error": "连接超时：无法连接到 API 服务器，请检查 API 地址配置"})
        yield "data: [DONE]\n\n"
    except httpx.ReadTimeout:
        yield _sse_json({"error": "读取超时：API 服务器响应时间过长"})
        yield "data: [DONE]\n\n"
    except httpx.ConnectError:
        yield _sse_json({"error": "连接失败：无法连接到 API 服务器，请检查网络和 API 地址"})
        yield "data: [DONE]\n\n"
    except httpx.HTTPError as e:
        yield _sse_json({"error": f"HTTP 请求错误：{str(e)}"})
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield _sse_json({"error": f"未知错误：{str(e)}"})
        yield "data: [DONE]\n\n"
