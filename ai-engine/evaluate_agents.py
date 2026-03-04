"""
WMS Multi-Agent System — Research Paper Evaluation Framework
============================================================
Evaluates all 6 specialist agents + the Master Agent orchestrator:
  Inventory, Market Pricing, Storage Duration, Loan Risk, Anomaly, Email

Metrics produced:
  1. Intent Routing Accuracy  (confusion matrix)
  2. Agent Success Rate        (per agent)
  3. Response Latency          (per agent, mean ± std)
  4. Agent Utilization         (distribution of master's routing decisions)
  5. Orchestration Overhead    (master round-trip vs direct call delta)
  6. Key-Insight Completeness  (response contains expected domain keywords)

Output:
  • Console: full metrics table + LaTeX table snippet
  • eval_results/  folder:
      - confusion_matrix.png
      - response_latency.png
      - success_rate.png
      - agent_utilization.png
      - orchestration_overhead.png
      - radar_chart.png
      - eval_summary.json

Run from ai-engine/ directory:
    python evaluate_agents.py
"""

import asyncio
import json
import os
import sys
import time
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe
from matplotlib.gridspec import GridSpec
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from datetime import datetime

# ── make sure imports work when running from ai-engine/ ──────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Force UTF-8 output so emoji / box-drawing chars don't crash on Windows CP1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from coordinator.master_agent import MasterAgent

# ─────────────────────────────────────────────────────────────────────────────
#  Ground-truth routing test set
#  Each entry: (query_text, expected_agent)
# ─────────────────────────────────────────────────────────────────────────────
ROUTING_TEST_SET = [
    # ── Inventory (8 queries) ──────────────────────────────────────────────
    ("How many bags of rice are currently in the warehouse?",          "inventory"),
    ("What is the total stock quantity available right now?",          "inventory"),
    ("Show me the current inventory levels for all grain types.",      "inventory"),
    ("Which grain has the highest quantity in storage?",               "inventory"),
    ("Is there a shortage of wheat in the warehouse?",                 "inventory"),
    ("What is the warehouse occupancy percentage today?",              "inventory"),
    ("Give me a complete inventory breakdown by commodity.",           "inventory"),
    ("How much maize stock do we currently hold?",                     "inventory"),

    # ── Market Pricing (8 queries) ─────────────────────────────────────────
    ("What is the current market price of wheat?",                     "pricing"),
    ("Predict rice prices for the next 3 months.",                     "pricing"),
    ("Should I sell my grain now or wait for better prices?",          "pricing"),
    ("What is the price trend for soybean this season?",               "pricing"),
    ("Give me market price forecast for all grains.",                  "pricing"),
    ("Are grain prices expected to rise or fall next quarter?",        "pricing"),
    ("What is the best time to sell maize based on market analysis?",  "pricing"),
    ("Compare current prices with historical averages.",               "pricing"),

    # ── Storage Duration (8 queries) ──────────────────────────────────────
    ("How long has the grain been stored in the warehouse?",           "duration"),
    ("Which customers have grain stored for more than 6 months?",      "duration"),
    ("What is the average storage duration for rice?",                 "duration"),
    ("Predict the optimal storage duration to maximise profit.",       "duration"),
    ("Which lots are approaching their maximum safe storage period?",  "duration"),
    ("Estimate the storage charges for the current inventory.",        "duration"),
    ("How many days has customer John's wheat been in storage?",       "duration"),
    ("What is the storage duration distribution across all lots?",     "duration"),

    # ── Loan Risk (8 queries) ──────────────────────────────────────────────
    ("What is the loan default risk for my current portfolio?",        "loan_risk"),
    ("Which customers are at high risk of loan default?",              "loan_risk"),
    ("Assess the credit risk for a new loan application.",             "loan_risk"),
    ("What percentage of outstanding loans are high risk?",            "loan_risk"),
    ("Give me a loan risk portfolio summary.",                         "loan_risk"),
    ("Which loans should I flag for immediate review?",                "loan_risk"),
    ("What is the total exposure on risky loans?",                     "loan_risk"),
    ("Recommend loan limits based on grain collateral value.",         "loan_risk"),

    # ── Anomaly Detection (8 queries) ─────────────────────────────────────
    ("Are there any suspicious transactions in the weighbridge data?", "anomaly"),
    ("Detect any fraud or anomalies in recent operations.",            "anomaly"),
    ("Flag transactions that look unusual or out of pattern.",         "anomaly"),
    ("Have there been any weight discrepancies in the last week?",     "anomaly"),
    ("Check for irregularities in vehicle weighing records.",          "anomaly"),
    ("Are there any outliers in the payment data?",                    "anomaly"),
    ("Identify abnormal patterns in grain movements.",                 "anomaly"),
    ("Has there been any data tampering or unusual activity?",         "anomaly"),

    # ── Email Agent (8 queries) ──────────────────────────────────────────────
    ("Send a loan reminder email to overdue customers.",               "email"),
    ("Draft a payment alert for customers with pending dues.",         "email"),
    ("Write a storage expiry notice for grain stored over 6 months.",  "email"),
    ("Generate a bulk outreach email for all active customers.",       "email"),
    ("Email a loan approval notification to the customer.",            "email"),
    ("Compose a professional email reminding customers about repayment.", "email"),
    ("Send a warehouse storage charge invoice via email.",             "email"),
    ("Notify customers whose grain is approaching the storage deadline.", "email"),
]

AGENT_LABELS = ["inventory", "pricing", "duration", "loan_risk", "anomaly", "email"]

# Expected keywords that a good agent response should contain
EXPECTED_KEYWORDS = {
    "inventory":  ["stock", "bag", "quantity", "grain", "inventory", "warehouse", "ton", "kg"],
    "pricing":    ["price", "market", "forecast", "predict", "trend", "₹", "sell", "rate"],
    "duration":   ["day", "month", "storage", "duration", "stored", "period", "charge", "lot"],
    "loan_risk":  ["loan", "risk", "default", "credit", "portfolio", "customer", "exposure"],
    "anomaly":    ["anomaly", "unusual", "fraud", "irregular", "discrepancy", "pattern", "flag"],
    "email":      ["email", "subject", "dear", "reminder", "notice", "payment", "regards"],
}

AGENT_COLORS = {
    "inventory":  "#4caf50",
    "pricing":    "#f44336",
    "duration":   "#2196f3",
    "loan_risk":  "#9c27b0",
    "anomaly":    "#795548",
    "email":      "#00bcd4",
    "master":     "#3f51b5",
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
#  Evaluation runner
# ─────────────────────────────────────────────────────────────────────────────

async def evaluate_routing(master: MasterAgent, n_runs: int = 1):
    """
    Test master agent intent routing on the labelled query set.
    Returns per-query results with predicted agent + latency.
    """
    print("\n" + "="*60)
    print("  PHASE 1: Intent Routing Accuracy")
    print("="*60)

    results = []
    total = len(ROUTING_TEST_SET)
    for i, (query, expected) in enumerate(ROUTING_TEST_SET):
        print(f"  [{i+1:02d}/{total}] {expected.upper():12s} | {query[:55]}...", end="", flush=True)
        t0 = time.perf_counter()
        try:
            predicted = await master._classify_intent(query)
            predicted = predicted.strip().lower()
        except Exception as e:
            predicted = "error"
        latency = (time.perf_counter() - t0) * 1000  # ms
        correct = (predicted == expected)
        results.append({
            "query": query,
            "expected": expected,
            "predicted": predicted,
            "correct": correct,
            "latency_ms": round(latency, 1),
        })
        print(f"  → {predicted.upper():12s}  {'✓' if correct else '✗'}  {latency:.0f}ms")
        await asyncio.sleep(0.3)   # polite rate-limiting

    return results


async def evaluate_agents_directly(master: MasterAgent, n_runs: int = 3):
    """
    Call each specialist agent directly (bypass routing) and measure
    success rate, response latency, and keyword completeness.
    """
    print("\n" + "="*60)
    print("  PHASE 2: Individual Agent Performance")
    print("="*60)

    # One representative payload per agent
    agent_payloads = {
        "inventory":  {"action": "analyze", "role": "owner"},
        "pricing":    {"action": "predict", "grainType": "all", "horizon": "3months", "role": "owner"},
        "duration":   {"action": "predict", "grainType": "all", "role": "owner"},
        "loan_risk":  {"action": "portfolio", "role": "owner"},
        "anomaly":    {"action": "detect", "role": "owner"},
        "email":      {"action": "loan_reminder", "customerName": "Test Customer", "loanAmount": 50000, "dueDate": "2025-08-01", "daysOverdue": 15, "role": "owner"},
    }

    agent_results = {}
    for agent_name, payload in agent_payloads.items():
        latencies, successes, kw_scores = [], [], []
        print(f"\n  Agent: {agent_name.upper()}")
        for run in range(n_runs):
            t0 = time.perf_counter()
            try:
                result = await master.route(agent_name, payload)
                latency = (time.perf_counter() - t0) * 1000
                success = bool(result.get("success", False) or result.get("data") or result.get("reply"))
                # keyword completeness
                text = json.dumps(result, default=str).lower()
                kws = EXPECTED_KEYWORDS.get(agent_name, [])
                kw_score = sum(1 for k in kws if k in text) / len(kws) if kws else 1.0
            except Exception as e:
                latency = (time.perf_counter() - t0) * 1000
                success = False
                kw_score = 0.0
                print(f"    Run {run+1}: ERROR — {e}")

            latencies.append(latency)
            successes.append(int(success))
            kw_scores.append(kw_score)
            print(f"    Run {run+1}: {'✓' if success else '✗'}  {latency:.0f}ms  kw={kw_score:.0%}")
            await asyncio.sleep(0.5)

        agent_results[agent_name] = {
            "success_rate":       round(np.mean(successes) * 100, 1),
            "mean_latency_ms":    round(np.mean(latencies), 0),
            "std_latency_ms":     round(np.std(latencies), 0),
            "min_latency_ms":     round(np.min(latencies), 0),
            "max_latency_ms":     round(np.max(latencies), 0),
            "keyword_completeness": round(np.mean(kw_scores) * 100, 1),
        }

    return agent_results


async def evaluate_orchestration_overhead(master: MasterAgent, n_samples: int = 2):
    """
    Compare: (a) master auto_route()  vs  (b) direct agent call
    for the same query. The difference is the orchestration overhead
    (routing classification + chat-agent formatting pass).
    """
    print("\n" + "="*60)
    print("  PHASE 3: Orchestration Overhead")
    print("="*60)

    test_pairs = [
        ("How many bags of rice are stored right now?",   "inventory",  {"action": "analyze", "role": "owner"}),
        ("What is the market price forecast for wheat?",  "pricing",    {"action": "predict", "grainType": "wheat", "role": "owner"}),
        ("Any suspicious transactions this week?",        "anomaly",    {"action": "detect", "role": "owner"}),
    ]

    overhead_data = []
    for query, agent, direct_payload in test_pairs:
        direct_times, master_times = [], []
        for _ in range(n_samples):
            # Direct call
            t0 = time.perf_counter()
            try:
                await master.route(agent, direct_payload)
            except Exception:
                pass
            direct_times.append((time.perf_counter() - t0) * 1000)
            await asyncio.sleep(0.4)

            # Master auto_route
            t0 = time.perf_counter()
            try:
                await master.auto_route(query, {"role": "owner"})
            except Exception:
                pass
            master_times.append((time.perf_counter() - t0) * 1000)
            await asyncio.sleep(0.4)

        overhead_data.append({
            "query_label": agent,
            "direct_mean":  round(np.mean(direct_times), 0),
            "master_mean":  round(np.mean(master_times), 0),
            "overhead_ms":  round(np.mean(master_times) - np.mean(direct_times), 0),
            "overhead_pct": round((np.mean(master_times) - np.mean(direct_times)) / np.mean(master_times) * 100, 1),
        })
        print(f"  {agent:12s}  direct={overhead_data[-1]['direct_mean']}ms  master={overhead_data[-1]['master_mean']}ms  overhead={overhead_data[-1]['overhead_ms']}ms ({overhead_data[-1]['overhead_pct']}%)")
        await asyncio.sleep(0.5)

    return overhead_data


# ─────────────────────────────────────────────────────────────────────────────
#  Chart generators
# ─────────────────────────────────────────────────────────────────────────────

def plot_confusion_matrix(routing_results):
    """Confusion matrix: predicted vs expected agent for routing."""
    labels = AGENT_LABELS
    n = len(labels)
    matrix = np.zeros((n, n), dtype=int)
    idx = {l: i for i, l in enumerate(labels)}

    for r in routing_results:
        i = idx.get(r["expected"], -1)
        j = idx.get(r["predicted"], -1)
        if i >= 0 and j >= 0:
            matrix[i][j] += 1

    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(matrix, interpolation='nearest', cmap='Blues')
    plt.colorbar(im, ax=ax, label='Query Count')

    tick_labels = [l.replace("_", "\n") for l in labels]
    ax.set(xticks=range(n), yticks=range(n),
           xticklabels=tick_labels, yticklabels=tick_labels,
           ylabel='True Agent (Expected)', xlabel='Predicted Agent')
    ax.set_title("Master Agent — Intent Routing Confusion Matrix", fontsize=13, fontweight='bold', pad=12)

    thresh = matrix.max() / 2.0
    for i in range(n):
        for j in range(n):
            ax.text(j, i, str(matrix[i][j]), ha='center', va='center',
                    color='white' if matrix[i][j] > thresh else 'black', fontsize=11, fontweight='bold')

    # Accuracy annotation
    correct = sum(1 for r in routing_results if r["correct"])
    acc = correct / len(routing_results) * 100
    fig.text(0.5, 0.01, f"Overall Routing Accuracy: {acc:.1f}%  ({correct}/{len(routing_results)} queries correct)",
             ha='center', fontsize=11, color='#3f51b5', fontweight='bold')

    plt.tight_layout(rect=[0, 0.04, 1, 1])
    out = os.path.join(OUTPUT_DIR, "confusion_matrix.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")
    return acc


def plot_response_latency(agent_results):
    """Grouped bar chart: mean latency ± std per agent."""
    agents = list(agent_results.keys())
    means  = [agent_results[a]["mean_latency_ms"] for a in agents]
    stds   = [agent_results[a]["std_latency_ms"]  for a in agents]
    colors = [AGENT_COLORS.get(a, "#999") for a in agents]
    names  = [a.replace("_", "\n") for a in agents]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(names, means, yerr=stds, capsize=6,
                  color=colors, alpha=0.85, edgecolor='black', linewidth=0.6,
                  error_kw={"elinewidth": 1.5, "ecolor": "#333"})

    for bar, mean, std in zip(bars, means, stds):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + std + 30,
                f"{mean:.0f}ms", ha='center', va='bottom', fontsize=9, fontweight='bold')

    ax.set_xlabel("Agent", fontsize=11)
    ax.set_ylabel("Response Latency (ms)", fontsize=11)
    ax.set_title("Agent Response Latency — Mean ± Std Dev", fontsize=13, fontweight='bold')
    ax.yaxis.grid(True, linestyle='--', alpha=0.5)
    ax.set_axisbelow(True)
    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "response_latency.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_success_rate(agent_results):
    """Horizontal bar chart: success rate + keyword completeness per agent."""
    agents = list(agent_results.keys())
    sr     = [agent_results[a]["success_rate"]        for a in agents]
    kw     = [agent_results[a]["keyword_completeness"] for a in agents]
    y      = np.arange(len(agents))
    h      = 0.35
    colors = [AGENT_COLORS.get(a, "#999") for a in agents]
    labels = [a.replace("_", " ").title() for a in agents]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars1 = ax.barh(y + h/2, sr, h, label='Success Rate (%)', color=colors, alpha=0.85, edgecolor='black', linewidth=0.5)
    bars2 = ax.barh(y - h/2, kw, h, label='Keyword Completeness (%)', color=colors, alpha=0.45, edgecolor='black', linewidth=0.5, hatch='//')

    for bar, val in zip(bars1, sr):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f"{val:.0f}%", va='center', fontsize=9, fontweight='bold')
    for bar, val in zip(bars2, kw):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f"{val:.0f}%", va='center', fontsize=9)

    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=10)
    ax.set_xlabel("Score (%)", fontsize=11)
    ax.set_xlim(0, 115)
    ax.set_title("Agent Success Rate & Response Completeness", fontsize=13, fontweight='bold')
    ax.legend(loc='lower right', fontsize=9)
    ax.xaxis.grid(True, linestyle='--', alpha=0.5)
    ax.set_axisbelow(True)
    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "success_rate.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_agent_utilization(routing_results):
    """Pie chart: how often the master routes to each agent."""
    counts = {a: 0 for a in AGENT_LABELS}
    for r in routing_results:
        p = r["predicted"]
        if p in counts:
            counts[p] += 1

    labels  = [a.replace("_", "\n") for a in counts]
    sizes   = list(counts.values())
    colors  = [AGENT_COLORS.get(a, "#999") for a in counts]
    explode = [0.04] * len(sizes)

    fig, ax = plt.subplots(figsize=(7, 7))
    wedges, texts, autotexts = ax.pie(
        sizes, explode=explode, labels=labels, autopct='%1.1f%%',
        colors=colors, startangle=140, pctdistance=0.78,
        wedgeprops={"edgecolor": "white", "linewidth": 2},
        textprops={"fontsize": 10}
    )
    for at in autotexts:
        at.set_fontsize(9)
        at.set_fontweight('bold')
        at.set_color('white')

    ax.set_title("Master Agent — Routing Distribution\n(Agent Utilization across test queries)",
                 fontsize=12, fontweight='bold')
    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "agent_utilization.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_orchestration_overhead(overhead_data):
    """Stacked bar showing direct call time vs orchestration overhead."""
    labels   = [d["query_label"].replace("_", "\n") for d in overhead_data]
    direct   = [d["direct_mean"] for d in overhead_data]
    overhead = [d["overhead_ms"] for d in overhead_data]

    x  = np.arange(len(labels))
    fig, ax = plt.subplots(figsize=(7, 5))
    b1 = ax.bar(x, direct,   color='#4caf50', alpha=0.85, label='Direct Agent Call', edgecolor='black', linewidth=0.6)
    b2 = ax.bar(x, overhead, bottom=direct, color='#ff9800', alpha=0.85, label='Orchestration Overhead', edgecolor='black', linewidth=0.6)

    total_labels = [d["master_mean"] for d in overhead_data]
    for xi, tot in zip(x, total_labels):
        ax.text(xi, tot + 30, f"{tot:.0f}ms total", ha='center', va='bottom', fontsize=9, fontweight='bold')

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Response Time (ms)", fontsize=11)
    ax.set_title("Orchestration Overhead:\nMaster Agent vs Direct Specialist Call", fontsize=12, fontweight='bold')
    ax.legend(fontsize=9)
    ax.yaxis.grid(True, linestyle='--', alpha=0.5)
    ax.set_axisbelow(True)

    # Overhead % label
    for d, xi in zip(overhead_data, x):
        ax.text(xi, d["direct_mean"] + d["overhead_ms"] / 2, f"+{d['overhead_pct']}%",
                ha='center', va='center', fontsize=8, color='white', fontweight='bold')

    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "orchestration_overhead.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_radar_chart(agent_results, routing_acc):
    """Radar (spider) chart showing multi-dimensional agent performance."""
    agents     = [a for a in AGENT_LABELS if a in agent_results]
    categories = ['Success\nRate', 'Keyword\nCompleteness', 'Speed\nScore', 'Routing\nAccuracy']
    N          = len(categories)
    angles     = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    angles    += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

    # Per-agent routing accuracy
    per_agent_routing = {}
    for a in agents:
        total   = sum(1 for r in ROUTING_TEST_SET if r[1] == a)
        correct = sum(1 for r in routing_results_global if r["expected"] == a and r["correct"])
        per_agent_routing[a] = (correct / total * 100) if total > 0 else 0

    for agent in agents:
        r = agent_results[agent]
        # Speed score: invert latency (higher is faster/better), normalize to 0-100
        max_lat = max(agent_results[a]["mean_latency_ms"] for a in agents)
        speed   = max(0, 100 * (1 - r["mean_latency_ms"] / max_lat))
        values  = [
            r["success_rate"],
            r["keyword_completeness"],
            speed,
            per_agent_routing.get(agent, 0),
        ]
        values += values[:1]
        color  = AGENT_COLORS.get(agent, "#999")
        ax.plot(angles, values, 'o-', linewidth=1.8, label=agent.replace("_", " ").title(), color=color)
        ax.fill(angles, values, alpha=0.12, color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=11)
    ax.set_ylim(0, 100)
    ax.set_yticks([20, 40, 60, 80, 100])
    ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=7)
    ax.set_title("Multi-Agent Performance Profile\n(All evaluation dimensions)", fontsize=12, fontweight='bold', y=1.08)
    ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.1), fontsize=9)
    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "radar_chart.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_per_agent_accuracy(routing_results, agent_results):
    """
    Dedicated per-agent accuracy chart combining:
      - Routing accuracy  (% of intent queries routed correctly)
      - Success rate      (% of direct agent calls that returned valid data)
      - Keyword completeness (% of expected keywords found in response)
    """
    agents = AGENT_LABELS
    n = len(agents)

    # Compute per-agent routing accuracy
    routing_acc_per = []
    for a in agents:
        total   = sum(1 for r in ROUTING_TEST_SET if r[1] == a)
        correct = sum(1 for r in routing_results if r["expected"] == a and r["correct"])
        routing_acc_per.append((correct / total * 100) if total > 0 else 0.0)

    success_rates = [agent_results.get(a, {}).get("success_rate", 0) for a in agents]
    kw_scores     = [agent_results.get(a, {}).get("keyword_completeness", 0) for a in agents]

    x      = np.arange(n)
    width  = 0.26
    labels = [a.replace("_", "\n").title() for a in agents]
    colors = [AGENT_COLORS.get(a, "#999") for a in agents]

    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    fig.suptitle("Per-Agent Accuracy — WMS Multi-Agent System", fontsize=14, fontweight='bold', y=1.02)

    # ── Left: grouped bar chart ──────────────────────────────────────────
    ax = axes[0]
    b1 = ax.bar(x - width, routing_acc_per, width, label='Routing Accuracy (%)',
                color=[c + 'cc' for c in colors], edgecolor='black', linewidth=0.6)
    b2 = ax.bar(x,          success_rates,  width, label='Agent Success Rate (%)',
                color=colors, edgecolor='black', linewidth=0.6)
    b3 = ax.bar(x + width,  kw_scores,      width, label='Keyword Completeness (%)',
                color=colors, edgecolor='black', linewidth=0.6, alpha=0.55, hatch='//')

    for bars in [b1, b2, b3]:
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.8,
                    f"{h:.0f}%", ha='center', va='bottom', fontsize=7.5, fontweight='bold')

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylabel("Score (%)", fontsize=11)
    ax.set_ylim(0, 118)
    ax.set_title("Routing Accuracy vs Success Rate vs Keyword Completeness", fontsize=11, fontweight='bold')
    ax.legend(fontsize=9)
    ax.yaxis.grid(True, linestyle='--', alpha=0.4)
    ax.set_axisbelow(True)

    # ── Right: combined accuracy score (mean of all 3 metrics) ──────────
    ax2 = axes[1]
    combined = [(r + s + k) / 3 for r, s, k in zip(routing_acc_per, success_rates, kw_scores)]
    bars = ax2.bar(labels, combined, color=colors, edgecolor='black', linewidth=0.7, alpha=0.88)

    for bar, val, agent, ra, sr, kw in zip(bars, combined, agents, routing_acc_per, success_rates, kw_scores):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.8,
                 f"{val:.1f}%", ha='center', va='bottom', fontsize=9, fontweight='bold')
        # mini breakdown inside bar
        mid = bar.get_height() / 2
        ax2.text(bar.get_x() + bar.get_width() / 2, mid,
                 f"R:{ra:.0f}% S:{sr:.0f}%\nKW:{kw:.0f}%",
                 ha='center', va='center', fontsize=7, color='white', fontweight='bold')

    ax2.set_ylabel("Combined Accuracy Score (%)", fontsize=11)
    ax2.set_ylim(0, 118)
    ax2.set_title("Combined Accuracy Score per Agent\n(mean of Routing + Success + KW Completeness)",
                  fontsize=11, fontweight='bold')
    ax2.yaxis.grid(True, linestyle='--', alpha=0.4)
    ax2.set_axisbelow(True)

    # Dashed mean line
    mean_combined = np.mean(combined)
    ax2.axhline(mean_combined, color='#333', linestyle='--', linewidth=1.3,
                label=f'System Mean: {mean_combined:.1f}%')
    ax2.legend(fontsize=9)

    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "per_agent_accuracy.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


def plot_architecture_diagram(agent_results, routing_acc):
    """
    Draws the WMS Master-Coordinator architecture diagram showing:
      User Query → Master Agent → Intent Classifier → Specialist Agents
      Specialist results → Chat Agent → Enriched Response → User
    Annotated with live accuracy / success metrics.
    """
    fig, ax = plt.subplots(figsize=(18, 11))
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 11)
    ax.axis('off')
    fig.patch.set_facecolor('#fafafa')

    def box(ax, x, y, w, h, label, sublabel='', color='#3f51b5', text_color='white',
            fontsize=10, subfontsize=8, radius=0.25):
        fancy = FancyBboxPatch((x - w/2, y - h/2), w, h,
                               boxstyle=f"round,pad={radius}",
                               facecolor=color, edgecolor='white',
                               linewidth=2, zorder=3)
        ax.add_patch(fancy)
        ax.text(x, y + (0.12 if sublabel else 0), label,
                ha='center', va='center', fontsize=fontsize,
                fontweight='bold', color=text_color, zorder=4)
        if sublabel:
            ax.text(x, y - 0.28, sublabel, ha='center', va='center',
                    fontsize=subfontsize, color=text_color, alpha=0.88, zorder=4)

    def arrow(ax, x1, y1, x2, y2, color='#555', lw=1.8, style='->'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle=style, color=color,
                                   lw=lw, connectionstyle='arc3,rad=0.0'),
                    zorder=2)

    def curved_arrow(ax, x1, y1, x2, y2, color='#555', lw=1.5, rad=0.2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=color,
                                   lw=lw, connectionstyle=f'arc3,rad={rad}'),
                    zorder=2)

    # ── Title ────────────────────────────────────────────────────────────────
    ax.text(9, 10.5, 'WMS Multi-Agent System — Master-Coordinator Architecture',
            ha='center', va='center', fontsize=15, fontweight='bold', color='#1a237e')
    ax.text(9, 10.1, f'Overall Routing Accuracy: {routing_acc:.1f}%   |   Agents: {len(AGENT_LABELS)}   |   n8n + Gemini AI',
            ha='center', va='center', fontsize=10, color='#555')

    # ── User Query ────────────────────────────────────────────────────────────
    box(ax, 2.0, 7.8, 2.6, 0.9, '[USER]  User / Front-end',
        'Sends natural language query', color='#37474f', fontsize=9.5)

    # ── n8n Workflow ──────────────────────────────────────────────────────────
    box(ax, 5.5, 7.8, 2.4, 0.9, '[n8n]  n8n Webhook',
        'wms-chat / wms-full-analysis', color='#e65100', fontsize=9.5)
    arrow(ax, 3.3, 7.8, 4.3, 7.8, color='#e65100', lw=2)
    ax.text(3.8, 7.95, 'HTTP POST', ha='center', fontsize=7.5, color='#e65100')

    # ── Master Agent box ──────────────────────────────────────────────────────
    box(ax, 9.0, 7.8, 2.8, 1.05, '[MASTER]  Master Agent',
        f'Coordinator  |  Routing Acc: {routing_acc:.1f}%', color='#3f51b5', fontsize=10)
    arrow(ax, 6.7, 7.8, 7.6, 7.8, color='#3f51b5', lw=2)
    ax.text(7.15, 7.95, 'FastAPI', ha='center', fontsize=7.5, color='#3f51b5')

    # ── Intent Classifier sub-box ─────────────────────────────────────────────
    box(ax, 9.0, 6.4, 2.4, 0.75, '[ROUTER]  Intent Classifier',
        '_classify_intent( )', color='#5c6bc0', fontsize=9)
    arrow(ax, 9.0, 7.27, 9.0, 6.78, color='#5c6bc0', lw=1.8)

    # ── Specialist agents ────────────────────────────────────────────────────
    agent_specs = [
        ("inventory",  "[INV] Inventory Agent",      "Stock & capacity\nanalysis"),
        ("pricing",    "[PRC] Market Pricing Agent",  "Price forecast\n& sell advice"),
        ("duration",   "[DUR] Duration Agent",        "Storage period\nprediction"),
        ("loan_risk",  "[LOAN] Loan Risk Agent",      "Credit risk &\nportfolio"),
        ("anomaly",    "[ANO] Anomaly Agent",         "Fraud detection\n& alerts"),
        ("email",      "[EML] Email Agent",           "Draft reminders\n& notices"),
    ]

    xs = [1.5, 4.1, 6.7, 11.3, 13.9, 16.5]
    y_agent = 4.0

    for (agent_key, label, desc), x_pos in zip(agent_specs, xs):
        color  = AGENT_COLORS.get(agent_key, '#999')
        m      = agent_results.get(agent_key, {})
        sr     = m.get('success_rate', 0)
        kw     = m.get('keyword_completeness', 0)
        total  = sum(1 for r in ROUTING_TEST_SET if r[1] == agent_key)
        correct= sum(1 for r in routing_results_global if r['expected'] == agent_key and r['correct'])
        ra     = (correct / total * 100) if total > 0 else 0.0

        # Agent box
        box(ax, x_pos, y_agent, 2.3, 1.35, label, desc, color=color, fontsize=8.5, subfontsize=7.5)

        # Accuracy badge below
        badge_y = y_agent - 1.1
        badge = FancyBboxPatch((x_pos - 1.1, badge_y - 0.32), 2.2, 0.65,
                               boxstyle='round,pad=0.08', facecolor='white',
                               edgecolor=color, linewidth=1.5, zorder=3)
        ax.add_patch(badge)
        ax.text(x_pos, badge_y + 0.05,
                f'Route:{ra:.0f}%  SR:{sr:.0f}%  KW:{kw:.0f}%',
                ha='center', va='center', fontsize=6.8,
                color=color, fontweight='bold', zorder=4)
        ax.text(x_pos, badge_y - 0.18, 'Accuracy', ha='center',
                fontsize=6, color='#888', zorder=4)

        # Arrow from intent classifier down to agent
        curved_arrow(ax, 9.0, 6.02, x_pos, y_agent + 0.68,
                     color=color, lw=1.4, rad=-0.15 if x_pos < 9 else 0.15)

        # Arrow from agent up to Chat Agent (return path)
        curved_arrow(ax, x_pos, y_agent - 0.68, 9.0, 2.18,
                     color=color, lw=1.1, rad=0.15 if x_pos < 9 else -0.15)

    # ── Chat Agent ────────────────────────────────────────────────────────────
    box(ax, 9.0, 1.7, 2.8, 0.88, '[CHAT]  Chat Agent',
        'Formats specialist data\ninto natural language reply',
        color='#00897b', fontsize=9.5, subfontsize=7.8)
    ax.text(9.0, 1.06,
            'Synthesises multi-agent results → context-aware, conversational response',
            ha='center', fontsize=8, color='#00695c', style='italic')

    # ── Response arrow back to user ───────────────────────────────────────────
    arrow(ax, 7.6, 1.7, 6.7, 7.45, color='#00897b', lw=2)
    ax.text(6.6, 4.5, 'Natural\nLanguage\nResponse', ha='center', fontsize=7.5,
            color='#00897b', fontweight='bold')

    # ── DB / Tools note ───────────────────────────────────────────────────────
    box(ax, 9.0, 0.45, 7.0, 0.55,
        '[DB] MongoDB   |   [AI] Gemini AI   |   [n8n] Workflows   |   [ML] wms-analytics Models',
        color='#546e7a', fontsize=8.5)
    arrow(ax, 9.0, 1.26, 9.0, 0.73, color='#546e7a', lw=1.6)

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_patches = [
        mpatches.Patch(facecolor=AGENT_COLORS[a], label=a.replace('_',' ').title())
        for a in AGENT_LABELS
    ]
    legend_patches.append(mpatches.Patch(facecolor='#3f51b5', label='Master Agent'))
    legend_patches.append(mpatches.Patch(facecolor='#00897b', label='Chat Agent'))
    ax.legend(handles=legend_patches, loc='upper right', fontsize=8,
              ncol=2, framealpha=0.9, bbox_to_anchor=(1.0, 0.98))

    plt.tight_layout()
    out = os.path.join(OUTPUT_DIR, "architecture_diagram.png")
    plt.savefig(out, dpi=180, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {out}")


# ─────────────────────────────────────────────────────────────────────────────
#  Metrics table printer
# ─────────────────────────────────────────────────────────────────────────────

def print_metrics_table(routing_acc, agent_results, overhead_data):
    divider = "─" * 76
    print(f"\n{'='*76}")
    print(f"  WMS MULTI-AGENT EVALUATION RESULTS  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*76}")

    print(f"\n{'─'*76}")
    print(f"  {'METRIC':<40} {'VALUE':>15}")
    print(f"{'─'*76}")
    print(f"  {'Master Agent Routing Accuracy':<40} {routing_acc:>14.1f}%")
    n_correct = sum(1 for r in routing_results_global if r["correct"])
    print(f"  {'Correct Routings / Total Queries':<40} {n_correct:>10d} / {len(ROUTING_TEST_SET)}")
    mean_route_lat = np.mean([r["latency_ms"] for r in routing_results_global])
    print(f"  {'Mean Routing Classification Latency':<40} {mean_route_lat:>12.0f} ms")

    if overhead_data:
        oh_pct = np.mean([d["overhead_pct"] for d in overhead_data])
        print(f"  {'Mean Orchestration Overhead':<40} {oh_pct:>13.1f}%")

    # Per-agent routing accuracy
    per_agent_routing_acc = {}
    for a in AGENT_LABELS:
        total   = sum(1 for r in ROUTING_TEST_SET if r[1] == a)
        correct = sum(1 for r in routing_results_global if r["expected"] == a and r["correct"])
        per_agent_routing_acc[a] = (correct / total * 100) if total > 0 else 0.0

    print(f"\n{'─'*90}")
    print(f"  {'AGENT':<16} {'SUCCESS':>9} {'MEAN LAT':>10} {'STD LAT':>9} {'KW COMPL':>10} {'ROUTING ACC':>13}")
    print(f"{'─'*90}")
    for agent, m in agent_results.items():
        ra = per_agent_routing_acc.get(agent, 0.0)
        print(f"  {agent.replace('_',' ').title():<16} {m['success_rate']:>8.0f}% {m['mean_latency_ms']:>9.0f}ms"
              f" {m['std_latency_ms']:>8.0f}ms {m['keyword_completeness']:>9.0f}% {ra:>12.1f}%")

    overall_sr  = np.mean([m["success_rate"] for m in agent_results.values()])
    overall_lat = np.mean([m["mean_latency_ms"] for m in agent_results.values()])
    overall_kw  = np.mean([m["keyword_completeness"] for m in agent_results.values()])
    print(f"{'─'*90}")
    print(f"  {'SYSTEM AVERAGE':<16} {overall_sr:>8.0f}% {overall_lat:>9.0f}ms {'':>9} {overall_kw:>9.0f}% {routing_acc:>12.1f}%")
    print(f"{'='*90}\n")

    # LaTeX snippet
    print("  ── LaTeX Table (paste into your paper) ──────────────────────────────")
    print(r"  \begin{table}[h]")
    print(r"  \centering")
    print(r"  \caption{WMS Multi-Agent System --- Evaluation Results}")
    print(r"  \label{tab:agent_eval}")
    print(r"  \begin{tabular}{lrrrr}")
    print(r"  \hline")
    print(r"  \textbf{Agent} & \textbf{Success (\%)} & \textbf{Latency (ms)} & \textbf{KW Completeness (\%)} & \textbf{Routing Accuracy (\%)} \\")
    print(r"  \hline")
    per_agent_ra = {}
    for a in AGENT_LABELS:
        total   = sum(1 for r in ROUTING_TEST_SET if r[1] == a)
        correct = sum(1 for r in routing_results_global if r["expected"] == a and r["correct"])
        per_agent_ra[a] = (correct / total * 100) if total > 0 else 0.0
    for agent, m in agent_results.items():
        name = agent.replace("_", " ").title()
        ra   = per_agent_ra.get(agent, routing_acc)
        print(f"  {name} & {m['success_rate']:.0f} & {m['mean_latency_ms']:.0f} "
              f"& {m['keyword_completeness']:.0f} & {ra:.1f} \\\\")
    print(r"  \hline")
    print(f"  \\textbf{{System Average}} & {overall_sr:.0f} & {overall_lat:.0f} & {overall_kw:.0f} & {routing_acc:.1f} \\\\")
    print(r"  \multicolumn{5}{l}{\small Note: Routing Accuracy = per-agent correct routings / 8 test queries $\times$ 100} \\")
    print(r"  \hline")
    print(r"  \end{tabular}")
    print(r"  \end{table}")
    print()


# ─────────────────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────────────────

routing_results_global = []   # used by radar chart & per-agent routing acc

async def main():
    global routing_results_global

    print("\n" + "="*60)
    print("  WMS MULTI-AGENT EVALUATION FRAMEWORK")
    print("  Research Paper — Performance & Orchestration Metrics")
    print("="*60)

    master = MasterAgent()

    # ── Phase 1: Routing (use cache if available) ─────────────────────────
    p1_cache = os.path.join(OUTPUT_DIR, "_phase1.json")
    if os.path.exists(p1_cache):
        print("\n  [Phase 1] Loading cached routing results...")
        with open(p1_cache) as f:
            p1 = json.load(f)
        routing_results = p1["routing_results"]
        routing_acc     = p1["routing_acc"]
    else:
        routing_results = await evaluate_routing(master)
        routing_acc = sum(1 for r in routing_results if r["correct"]) / len(routing_results) * 100
        with open(p1_cache, "w") as f:
            json.dump({"routing_results": routing_results, "routing_acc": routing_acc}, f, indent=2)
    routing_results_global = routing_results

    # ── Phase 2: Agent performance (use cache if available) ───────────────
    p2_cache = os.path.join(OUTPUT_DIR, "_phase2.json")
    if os.path.exists(p2_cache):
        print("\n  [Phase 2] Loading cached agent results...")
        with open(p2_cache) as f:
            agent_results = json.load(f)
    else:
        agent_results = await evaluate_agents_directly(master, n_runs=2)
        with open(p2_cache, "w") as f:
            json.dump(agent_results, f, indent=2)

    # ── Generate Phase 1+2 charts immediately ────────────────────────────
    print("\n" + "="*60)
    print("  Generating Phase 1+2 charts...")
    print("="*60)
    plot_confusion_matrix(routing_results)
    plot_response_latency(agent_results)
    plot_success_rate(agent_results)
    plot_agent_utilization(routing_results)
    plot_radar_chart(agent_results, routing_acc)
    plot_per_agent_accuracy(routing_results, agent_results)
    plot_architecture_diagram(agent_results, routing_acc)

    # ── Phase 3: Orchestration overhead (1 sample, fast) ─────────────────
    p3_cache = os.path.join(OUTPUT_DIR, "_phase3.json")
    if os.path.exists(p3_cache):
        print("\n  [Phase 3] Loading cached overhead results...")
        with open(p3_cache) as f:
            overhead_data = json.load(f)
    else:
        overhead_data = await evaluate_orchestration_overhead(master, n_samples=1)
        with open(p3_cache, "w") as f:
            json.dump(overhead_data, f, indent=2)
    plot_orchestration_overhead(overhead_data)

    # ── Print metrics table ───────────────────────────────────────────────
    print_metrics_table(routing_acc, agent_results, overhead_data)

    # ── Save full JSON summary ─────────────────────────────────────────────
    summary = {
        "timestamp":        datetime.now().isoformat(),
        "routing_accuracy": round(routing_acc, 2),
        "routing_results":  routing_results,
        "agent_results":    agent_results,
        "overhead_data":    overhead_data,
    }
    json_path = os.path.join(OUTPUT_DIR, "eval_summary.json")
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"  Saved: {json_path}")

    print("\n" + "="*60)
    print(f"  DONE. All outputs in: {OUTPUT_DIR}")
    print("  Files: confusion_matrix.png  response_latency.png  success_rate.png")
    print("         agent_utilization.png  orchestration_overhead.png  radar_chart.png")
    print("         per_agent_accuracy.png  architecture_diagram.png")
    print("         eval_summary.json")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

