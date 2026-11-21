"""Single-shot "agent" for the LLM Wiki starter: the model returns whole files, this script writes them.

usage: python3 -I wiki_run.py <workdir> <step> [model]
steps: ingest-probes | ingest-search | ask-stage | ingest-1012 | ask
"""
import json, re, sys, urllib.request
from pathlib import Path

W = Path(sys.argv[1]).resolve()
STEP = sys.argv[2]
MODEL = sys.argv[3] if len(sys.argv) > 3 else "qwen2.5:3b"
OUT = W.parent / "out"
OUT.mkdir(exist_ok=True)


def chat(prompt):
    body = json.dumps({"model": MODEL, "stream": False,
                       "options": {"temperature": 0, "seed": 42, "num_ctx": 16384, "num_predict": 3000},
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request("http://127.0.0.1:11434/api/chat", body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=900) as r:
        d = json.load(r)
    return d["message"]["content"], d.get("eval_count"), d.get("total_duration", 0) / 1e9


def dump(paths):
    parts = []
    for p in paths:
        f = W / p
        if f.is_file():
            parts.append(f"===FILE: {p}===\n{f.read_text(encoding='utf-8')}\n===END===")
    return "\n\n".join(parts)


def wiki_files():
    return sorted(str(p.relative_to(W)) for p in (W / "wiki").rglob("*.md"))


FORMAT = """
输出要求：只输出需要新建或修改的文件，每个文件完整内容按下面格式给出，不要输出其他格式：
===FILE: wiki/相对路径.md===
文件完整内容
===END===
最后用一个普通段落列出修改文件及理由。相对链接以文件所在目录为基准，例如 wiki/concepts/x.md 链接 raw 写 ../../raw/xxx.md#锚点。
"""

INGEST_PROBES = """先读 SCHEMA.md 和 wiki/index.md。
处理 raw/k8s-probes-reference.md 与 raw/incident-demo.md。

先列出两份资料分别支持的事实、推测和建议。
检查 wiki 中是否已有相同概念，优先更新已有页面。
更新 sources/probes-and-incident.md 和 concepts/probe-failure.md。
重要结论链接到 raw 的具体章节，保留事故材料的教学示例标记。
无法确认的根因写入待补证据，不补写为事实。
更新 index 和 log，最后列出修改文件及理由。"""

INGEST_SEARCH = """先读 SCHEMA.md 和 wiki/index.md。
处理 raw/decision-1001.md 与 raw/proposal-1008.md。
新建 wiki/sources/search-decisions.md 和 wiki/decisions/search-backend.md，
记录每份资料的日期、状态和适用范围，提案不能写成已确认决定。
重要结论链接到 raw 的具体章节。更新 index 和 log，最后列出修改文件及理由。"""

INGEST_1012 = """读取 raw/decision-1012.md，更新 wiki/decisions/search-backend.md。
逐项比较原决策与新决定的适用资料、状态和生效日期。
保留历史选择及其原因，明确哪些范围被新决定替代。
更新来源摘要、索引描述和日志。
若已有问答页引用旧结论，列出需要复核的页面。"""

QUESTIONS = ["readiness 失败为什么没有触发重启？",
             "现有记录能否确定是连接池耗尽？",
             "2026-10-09 已确认使用哪个搜索后端？",
             "2026-10-13 是否允许上传私人笔记？",
             "托管搜索是否已经完成部署？"]

ASK = """你是这个知识库的查询助手。规则见 SCHEMA.md。查询只读，不修改文件。
先看 wiki/index.md，再读相关 wiki 页，必要时核对 raw。
仅根据下面的文件回答，每个判断附上来源文件与章节链接（如 raw/incident-demo.md#gaps）。
用三五句中文回答。

{files}

问题：{q}"""


def apply(reply, tag):
    (OUT / f"{tag}.reply.md").write_text(reply, encoding="utf-8")
    written = []
    for path, content in re.findall(r"===FILE:\s*(\S+?)\s*===\n(.*?)\n===END===", reply, re.S):
        path = path.strip("`")
        target = (W / path).resolve()
        if not str(target).startswith(str((W / "wiki").resolve())):
            print("skip (outside wiki):", path)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content.strip() + "\n", encoding="utf-8")
        written.append(path)
    print(tag, "wrote:", written)


def ingest(task, raws, tag):
    ctx = dump(["SCHEMA.md"] + wiki_files() + raws)
    reply, n, t = chat(f"{ctx}\n\n任务：\n{task}\n{FORMAT}")
    print(f"{tag}: {n} tokens, {t:.1f}s")
    apply(reply, tag)


def ask(qs, tag):
    raws = sorted(str(p.relative_to(W)) for p in (W / "raw").glob("*.md"))
    files = dump(["SCHEMA.md"] + wiki_files() + raws)
    log = []
    for i, q in enumerate(qs, 1):
        reply, n, t = chat(ASK.format(files=files, q=q))
        log.append(f"## Q{i} {q}\n({n} tokens, {t:.1f}s)\n\n{reply}\n")
        print(f"--- Q{i} {q} ({t:.1f}s)\n{reply}\n")
    (OUT / f"{tag}.md").write_text("\n".join(log), encoding="utf-8")


if STEP == "ingest-probes":
    ingest(INGEST_PROBES, ["raw/k8s-probes-reference.md", "raw/incident-demo.md"], STEP)
elif STEP == "ingest-search":
    ingest(INGEST_SEARCH, ["raw/decision-1001.md", "raw/proposal-1008.md"], STEP)
elif STEP == "ingest-1012":
    ingest(INGEST_1012, ["raw/decision-1001.md", "raw/proposal-1008.md", "raw/decision-1012.md"], STEP)
elif STEP == "ask-stage":
    ask(["当前已确认使用哪个搜索后端？"], STEP)
elif STEP == "ask":
    ask(QUESTIONS, STEP)
