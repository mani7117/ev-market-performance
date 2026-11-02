"""EV Insights - Flask server.

Serves one page, a downloadable project summary and friendly error pages.
All values you need to edit are in the CONFIG block below.
"""
from datetime import datetime

from flask import Flask, Response, render_template, render_template_string

app = Flask(__name__)

# ============================ CONFIG: EDIT HERE ============================
# Published Tableau Public links. The normal "app/profile/..." links work;
# tableau.js converts them to the embeddable form automatically.
DASHBOARD_URL = (
    "https://public.tableau.com/views/"
    "EVMarketPerformanceInsights_17935594784180/Dashboard1"
)
STORY_URL = (
    "https://public.tableau.com/views/"
    "EVMarketPerformanceInsightsStory/Story1"
)
DEVELOPER = "Manika Gupta"  # shown in the footer

# KPI values: copy them from your dashboard. value=None shows a placeholder.
# decimals = digits after the decimal point, unit = text shown after the value.
KPIS = [
    {"label": "Total manufacturers", "value": 200, "decimals": 0, "unit": "", "icon": "factory"},
    {"label": "Total EV models", "value": 100000, "decimals": 0, "unit": "", "icon": "car"},
    {"label": "Average customer rating", "value": 4.08, "decimals": 2, "unit": "/ 5", "icon": "star"},
    {"label": "Average battery capacity", "value": 78.2, "decimals": 1, "unit": "kWh", "icon": "battery-charging"},
]

# Insight cards. Replace text=None with a finding you can see in your dashboard.
CATEGORIES = {
    "market": "Market",
    "manufacturers": "Manufacturers",
    "battery": "Battery",
    "ratings": "Ratings",
}
INSIGHTS = [
    {"cat": "market", "title": "Sales held steady, with no clear growth trend",
     "text": "Total annual sales units stayed between about 82.6 million (model year 2025) and 88.1 million (2021) "
             "across model years 2018 to 2026, with no sustained rise or fall."},
    {"cat": "manufacturers", "title": "A very fragmented manufacturer landscape",
     "text": "Sales are spread across 200 manufacturers. The largest, SurgeWorks, sold about 4.88 million units, "
             "only 0.63% of the total, and the top 10 together hold about 6.0%."},
    {"cat": "battery", "title": "Bigger batteries only slightly extend range",
     "text": "The average battery is 78.2 kWh and the average range is about 324 km. Battery size and range show "
             "only a weak positive link (correlation about 0.27), so other factors also drive range."},
    {"cat": "ratings", "title": "Ratings are consistently good and tightly clustered",
     "text": "The average customer rating is 4.08 out of 5. Manufacturer averages range only from 4.01 "
             "(DynamoMobility) to 4.17 (ElektraDynamics), and price, range and battery size show almost no link to rating."},
    {"cat": "market", "title": "AWD costs the most, but charging time barely differs",
     "text": "AWD vehicles average about $76,400, compared with about $60,200 for FWD and $59,500 for RWD. "
             "Average DC fast-charging time is similar across all three, at about 21 minutes."},
]

# Snapshot data for the hero preview (calculated from the dataset in your Tableau workbook).
SALES_BY_YEAR = [(2018, 84.7), (2019, 87.2), (2020, 83.9), (2021, 88.1), (2022, 87.0),
                 (2023, 87.6), (2024, 86.6), (2025, 82.6), (2026, 84.9)]  # million units
BATTERY_SHARE = [("NMC", 33.8, "#2f7bff"), ("LFP", 32.1, "#22d3ee"), ("NCA", 17.2, "#34d399"),
                 ("Sodium-Ion", 9.8, "#f59e0b"), ("Solid-State", 7.0, "#a78bfa")]  # % of vehicles
TICKER = ["100,000 vehicles analysed", "200 manufacturers", "Model years 2018 to 2026",
          "5 battery technologies", "772.6 million annual sales units"]

# About section: (icon, title, text). All figures come from the dataset in your Tableau workbook.
FEATURES = [
    ("trending-up", "Market scale", "100,000 vehicles and 772.6 million annual sales units across model years 2018 to 2026."),
    ("battery-charging", "Battery technology", "Five battery types, led by NMC (33.8%) and LFP (32.1%), at 78.2 kWh on average."),
    ("factory", "Manufacturer landscape", "200 manufacturers, and none holds more than 0.63% of total sales."),
    ("star", "Customer confidence", "An average rating of 4.08 out of 5 across 98,069 rated vehicles."),
]
# Image cards: (image file in static/img, title, text)
SPOTLIGHTS = [
    ("battery.svg", "Battery capacity", "Capacity averages 78.2 kWh but ranges from 1.5 to 410 kWh, with an average range of about 324 km."),
    ("charging-station.svg", "Charging performance", "DC fast charging takes about 21 minutes on average, and is similar for FWD, RWD and AWD."),
]
# ===========================================================================


def donut_gradient(shares):
    """Build a CSS conic-gradient string for the battery share donut."""
    stops, start = [], 0.0
    for i, (_, pct, color) in enumerate(shares):
        end = 100.0 if i == len(shares) - 1 else start + pct
        stops.append(f"{color} {start:.1f}% {end:.1f}%")
        start = end
    return "conic-gradient(" + ", ".join(stops) + ")"


@app.route("/")
def index():
    """Render the single-page application."""
    return render_template(
        "index.html",
        dashboard_url=DASHBOARD_URL,
        story_url=STORY_URL,
        developer=DEVELOPER,
        kpis=KPIS,
        categories=CATEGORIES,
        insights=INSIGHTS,
        year=datetime.now().year,
        sales_by_year=SALES_BY_YEAR,
        battery_share=BATTERY_SHARE,
        donut=donut_gradient(BATTERY_SHARE),
        ticker=TICKER,
        features=FEATURES,
        spotlights=SPOTLIGHTS,
    )


@app.route("/download/summary")
def download_summary():
    """Return a plain-text project summary built from the CONFIG block."""
    lines = [
        "ELECTRIC VEHICLE MARKET PERFORMANCE & INSIGHTS",
        "=" * 46,
        f"Developer : {DEVELOPER}",
        f"Generated : {datetime.now():%d %B %Y}",
        f"Dashboard : {DASHBOARD_URL}",
        f"Story     : {STORY_URL}",
        "",
        "KEY METRICS",
        "-" * 11,
    ]
    for k in KPIS:
        value = "(not set)" if k["value"] is None else f"{k['value']:.{k['decimals']}f} {k['unit']}".strip()
        lines.append(f"- {k['label']}: {value}")
    lines += ["", "INSIGHTS", "-" * 8]
    for i in INSIGHTS:
        lines.append(f"- {i['title']}: {i['text'] or '(not set)'}")
    return Response(
        "\n".join(lines) + "\n",
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment; filename=ev-insights-summary.txt"},
    )


# ------------------------------ error pages -------------------------------
ERROR_PAGE = """<!doctype html><meta charset="utf-8"><title>{{ code }} | EV Insights</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#060a13;
color:#e9eefb;font-family:system-ui,sans-serif;text-align:center">
<div><h1 style="font-size:3rem;margin:0;color:#22d3ee">{{ code }}</h1>
<p style="color:#92a1bf">{{ message }}</p>
<a href="/" style="color:#2f7bff">Back to EV Insights</a></div></body>"""


@app.errorhandler(404)
def not_found(_):
    return render_template_string(ERROR_PAGE, code=404, message="That page doesn't exist."), 404


@app.errorhandler(500)
def server_error(_):
    return render_template_string(ERROR_PAGE, code=500, message="Something went wrong on our side."), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
