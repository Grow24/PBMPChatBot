#!/usr/bin/env python3
"""
PBMP WhatsApp — Other section math tools (runs in Python).

Usage:
  python3 math_tools.py --text "Zeabur-python-add (3,4)"
  python3 math_tools.py --op add --a 3 --b 4
  python3 math_tools.py --expr "10-2*3"

Prints one JSON object to stdout:
  {"ok": true, "message": "✅ 3+4=7", "result": 7, "engine": "python", ...}
"""

from __future__ import annotations

import argparse
import ast
import json
import operator
import re
import sys
from typing import Any


OPS = {
    "add": ("+", operator.add),
    "sub": ("-", operator.sub),
    "subtract": ("-", operator.sub),
    "mul": ("×", operator.mul),
    "multiply": ("×", operator.mul),
    "div": ("÷", operator.truediv),
    "divide": ("÷", operator.truediv),
    "mod": ("%", operator.mod),
    "modulus": ("%", operator.mod),
    "pow": ("^", operator.pow),
    "power": ("^", operator.pow),
}

CMD_RE = re.compile(
    r"^zeabur[-\s]?python[-\s]?(add|sub|subtract|mul|multiply|div|divide|mod|modulus|pow|power)"
    r"\s*\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)\s*$",
    re.IGNORECASE,
)

HELP_RE = re.compile(r"^zeabur[-\s]?python\b", re.IGNORECASE)


def format_number(n: float | int) -> str:
    if isinstance(n, bool):
        return str(n)
    if isinstance(n, int) or (isinstance(n, float) and n.is_integer()):
        return str(int(n))
    return str(round(float(n), 10)).rstrip("0").rstrip(".")


def ok_payload(message: str, **extra: Any) -> dict[str, Any]:
    payload = {"ok": True, "message": message, "engine": "python", **extra}
    return payload


def err_payload(message: str, **extra: Any) -> dict[str, Any]:
    return {"ok": False, "message": message, "engine": "python", **extra}


def help_message() -> str:
    return (
        "🧮 *Other — math & tools (Python)*\n\n"
        "Try commands like:\n"
        "• `Zeabur-python-add (3,4)` → 3+4=7\n"
        "• `Zeabur-python-sub (10,3)` → 10-3=7\n"
        "• `Zeabur-python-mul (3,4)` → 3×4=12\n"
        "• `Zeabur-python-div (10,2)` → 10÷2=5\n"
        "• `Zeabur-python-mod (10,3)` → 10%3=1\n"
        "• `Zeabur-python-pow (2,8)` → 2^8=256\n\n"
        "Or type an expression directly:\n"
        "• `3+4` · `10-2*3` · `(8+2)/5` · `2^10`\n\n"
        "Reply *menu* for main options, or *1* to switch to PBMP / Grow24."
    )


def run_binary_op(op_name: str, a: float, b: float) -> dict[str, Any]:
    key = op_name.lower()
    if key not in OPS:
        return err_payload(f"❌ Unknown operation: {op_name}")

    symbol, fn = OPS[key]
    if key in {"div", "divide", "mod", "modulus"} and b == 0:
        return err_payload("❌ Cannot divide/mod by zero.")

    try:
        result = fn(a, b)
    except Exception as exc:  # noqa: BLE001
        return err_payload(f"❌ Calculation error: {exc}")

    if not isinstance(result, (int, float)) or isinstance(result, bool):
        return err_payload("❌ Result is not a number.")
    if isinstance(result, float) and (result != result or result in (float("inf"), float("-inf"))):
        return err_payload("❌ Result is not a finite number.")

    expression = f"{format_number(a)}{symbol}{format_number(b)}"
    out = f"{expression}={format_number(result)}"
    return ok_payload(f"✅ {out}", expression=expression, symbol=symbol, result=result, op=key)


_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_ALLOWED_UNARY = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _eval_ast(node: ast.AST) -> float | int:
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        left = _eval_ast(node.left)
        right = _eval_ast(node.right)
        return _ALLOWED_BINOPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARY:
        return _ALLOWED_UNARY[type(node.op)](_eval_ast(node.operand))
    raise ValueError("Unsupported expression")


def eval_expression(expr: str) -> dict[str, Any]:
    cleaned = (
        str(expr or "")
        .strip()
        .replace("×", "*")
        .replace("÷", "/")
        .replace("^", "**")
        .replace(" ", "")
    )
    if not cleaned:
        return err_payload("❌ Empty expression.")
    if not re.fullmatch(r"[0-9+\-*/().*]+", cleaned):
        return err_payload(
            "❌ Could not evaluate that expression.\n\n"
            "Examples: `3+4` · `10-2*3` · `Zeabur-python-add (3,4)`"
        )
    try:
        tree = ast.parse(cleaned, mode="eval")
        value = _eval_ast(tree)
    except Exception:
        return err_payload(
            "❌ Could not evaluate that expression.\n\n"
            "Examples: `3+4` · `10-2*3` · `Zeabur-python-add (3,4)`"
        )

    if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
        return err_payload("❌ Result is not a finite number.")

    display = str(expr).replace(" ", "")
    return ok_payload(f"✅ {display}={format_number(value)}", result=value, expression=display)


def evaluate_text(text: str) -> dict[str, Any]:
    raw = str(text or "").strip()
    if not raw:
        return err_payload("❌ Empty input.", help=True)

    match = CMD_RE.match(raw)
    if match:
        return run_binary_op(match.group(1), float(match.group(2)), float(match.group(3)))

    # Help for bare Zeabur-python
    rest = HELP_RE.sub("", raw, count=1).strip()
    if HELP_RE.match(raw) and not re.search(r"[+\-*/^=(]", rest):
        return ok_payload(help_message(), help=True)

    if re.search(r"[+\-*/×÷^()]", raw) and re.search(r"[\d)]", raw):
        return eval_expression(raw)

    return {
        "ok": False,
        "recognized": False,
        "message": "🧮 I did not recognize that as a math command.\n\n" + help_message(),
        "engine": "python",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PBMP WhatsApp Python math tools")
    parser.add_argument("--text", help="Full user message, e.g. Zeabur-python-add (3,4)")
    parser.add_argument("--op", help="Operation name: add|sub|mul|div|mod|pow")
    parser.add_argument("--a", type=float, help="First operand")
    parser.add_argument("--b", type=float, help="Second operand")
    parser.add_argument("--expr", help="Arithmetic expression, e.g. 3+4")
    args = parser.parse_args()

    if args.text:
        result = evaluate_text(args.text)
    elif args.op is not None and args.a is not None and args.b is not None:
        result = run_binary_op(args.op, args.a, args.b)
    elif args.expr:
        result = eval_expression(args.expr)
    else:
        result = err_payload("Usage: --text 'Zeabur-python-add (3,4)' or --op add --a 3 --b 4")

    sys.stdout.write(json.dumps(result, ensure_ascii=False))
    sys.stdout.write("\n")
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
