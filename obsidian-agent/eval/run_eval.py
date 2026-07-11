# obsidian-agent/eval/run_eval.py
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from agent import run_turn

CASES_PATH = Path(__file__).parent / "eval_cases.json"


def run_all():
    cases = json.loads(CASES_PATH.read_text())
    results = []

    for i, case in enumerate(cases, 1):
        print(f"\n[{i}/{len(cases)}] {case['query']}")
        result = run_turn(case["query"])
        tools_called = [c["tool"] for c in result["tool_calls"]]
        expected_tool = case["expected_tool"]

        if expected_tool is None:
            verdict = "PASS" if not tools_called else "JUDGMENT_NEEDED"
        else:
            verdict = "PASS" if expected_tool in tools_called else "FAIL"

        print(f"  expected_tool={expected_tool} actual_tools={tools_called} -> {verdict}")
        print(f"  expected_behavior: {case['expected_behavior']}")
        print(f"  actual_response: {result['response'][:200]}")

        results.append({
            "query": case["query"],
            "category": case["category"],
            "expected_tool": expected_tool,
            "actual_tools": tools_called,
            "verdict": verdict,
            "response_preview": result["response"][:200],
        })

    passed = sum(1 for r in results if r["verdict"] == "PASS")
    failed = sum(1 for r in results if r["verdict"] == "FAIL")
    judgment = sum(1 for r in results if r["verdict"] == "JUDGMENT_NEEDED")
    print(f"\n--- {passed} passed, {failed} failed, {judgment} need judgment (of {len(results)}) ---")

    return results


if __name__ == "__main__":
    run_all()
