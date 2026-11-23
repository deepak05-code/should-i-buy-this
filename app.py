import os
import random
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, abort
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone,timedelta

IST = timezone(timedelta(hours=5, minutes=30))

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
db_url = os.environ.get("DATABASE_URL", "sqlite:///users.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"

# ==========================================
# DATABASE MODEL
# ==========================================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    total_saved = db.Column(db.Float, default=0.0)

class SalaryCheck(db.Model):
    __tablename__ = "salary_checks"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = db.Column(db.String(120), nullable=False)
    item_price = db.Column(db.Float, nullable=False)
    monthly_income = db.Column(db.Float, nullable=False)
    hours_per_day = db.Column(db.Float, nullable=False)
    days_per_week = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class WalletCheck(db.Model):
    __tablename__ = "wallet_checks"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = db.Column(db.String(120), nullable=False)
    item_price = db.Column(db.Float, nullable=False)
    daily_spend = db.Column(db.Float, nullable=False)
    wallet_balance = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# ==========================================
# CALCULATOR LOGIC
# ==========================================
EQUIVALENTS = [
    {"name": "Cutting Chais", "cost": 15, "emoji": "☕"},
    {"name": "Plates of Pani Puri", "cost": 30, "emoji": "🥟"},
    {"name": "Crispy Masala Dosas", "cost": 60, "emoji": "🥞"},
    {"name": "Plates of Chicken Biryani", "cost": 220, "emoji": "🍛"},
    {"name": "Months of OTT Subscription", "cost": 199, "emoji": "🎬"},
    {"name": "Multiplex Movie Tickets", "cost": 350, "emoji": "🍿"},
    {"name": "Litres of Petrol", "cost": 102, "emoji": "⛽"},
    {"name": "Plates of Steamed Momos", "cost": 70, "emoji": "🥟"},
    {"name": "Packets of Maggi", "cost": 14, "emoji": "🍜"},
    {"name": "Goa Sleeper Bus Tickets", "cost": 1200, "emoji": "🏖️"},
    {"name": "Grams of 24K Gold", "cost": 7500, "emoji": "🪙"},
    {"name": "Months of Gym Membership", "cost": 1500, "emoji": "🏋️"},
    {"name": "Cold Coffees at a Cafe", "cost": 250, "emoji": "🧋"},
    {"name": "Plates of Chole Bhature", "cost": 90, "emoji": "🥘"}
]

def get_salary_verdict(work_days):
    if work_days < 0.25:
        return {
            "badge": "Treat Yourself 🟢",
            "title": "Barely a dent in your life force.",
            "roast": "This costs less than two hours of staring at spreadsheets. If it genuinely makes your day better, go for it guilt-free.",
            "color": "emerald"
        }
    elif work_days <= 1.5:
        return {
            "badge": "Sleep On It 🟡",
            "title": "That's a full shift at the office.",
            "roast": "Picture your most exhausting Monday morning meeting. Are you willing to trade a full day of that just to own this item? Wait 24 hours.",
            "color": "amber"
        }
    elif work_days <= 5:
        return {
            "badge": "Danger Zone 🟠",
            "title": "An entire work week of your life!",
            "roast": "Monday to Friday. Every alarm, every traffic jam, and every 'per my last email' this week goes strictly toward paying for this single purchase.",
            "color": "orange"
        }
    else:
        return {
            "badge": "Financial Emergency 🔴",
            "title": "Step away from the checkout button!",
            "roast": "You are trading a massive chunk of your mortal existence for a depreciating object. Put this money in an index fund and go eat a Masala Dosa.",
            "color": "rose"
        }

def get_wallet_verdict(wallet_pct):
    if wallet_pct <= 10:
        return {
            "badge": "Safe Pocket Spend 🟢",
            "title": "Your wallet barely felt that.",
            "roast": "This takes up less than 10% of your current balance. You'll still have plenty left for chai, momos, and hanging out with friends.",
            "color": "emerald"
        }
    elif wallet_pct <= 35:
        return {
            "badge": "Noticeable Dent 🟡",
            "title": "A solid chunk of your savings!",
            "roast": "Buying this wipes out up to a third of your entire wallet. Make sure you don't have any upcoming trips, birthdays, or college fests this month.",
            "color": "amber"
        }
    elif wallet_pct <= 75:
        return {
            "badge": "Broke Alert 🟠",
            "title": "Kiss your pocket money goodbye!",
            "roast": "This single purchase drains most of your wallet. You will be surviving strictly on hostel mess food and ₹14 Maggi for the next few weeks.",
            "color": "orange"
        }
    elif wallet_pct <= 100:
        return {
            "badge": "Wallet Wipeout 🔴",
            "title": "You will be left with almost ₹0!",
            "roast": "One click and your bank balance flatlines. One unexpected auto ride or Zomato craving tomorrow and you'll be begging friends for a UPI transfer.",
            "color": "rose"
        }
    else:
        return {
            "badge": "Insufficient Funds 💀",
            "title": "This costs MORE than your entire wallet!",
            "roast": "You literally cannot afford this without borrowing money or falling into an EMI trap. Close the tab immediately and protect your peace!",
            "color": "rose"
        }

# ==========================================
# ROUTES (AUTH + MAIN APP)
# ==========================================
ADMIN_ID = 4

@app.route("/")
def index():
    is_admin = current_user.is_authenticated and current_user.id == ADMIN_ID
    return render_template("index.html", is_admin=is_admin)

@app.route("/admin")
@login_required
def admin_dashboard():
    if current_user.id != ADMIN_ID:
        abort(403)  # Blocks every other user with 403 Forbidden

    users = User.query.order_by(User.id.asc()).all()
    total_users = len(users)
    total_platform_saved = sum((u.total_saved or 0) for u in users)

    return render_template(
        "admin.html",
        users=users,
        total_users=total_users,
        total_platform_saved=total_platform_saved,
    )

@app.route("/admin/delete/<int:user_id>", methods=["POST"])
@login_required
def admin_delete_user(user_id):
    if current_user.id != ADMIN_ID:
        abort(403)

    if user_id == ADMIN_ID:
        return redirect(url_for("admin_dashboard"))  # Prevents deleting your own admin account

    user_to_delete = User.query.get_or_404(user_id)
    db.session.delete(user_to_delete)
    db.session.commit()

    return redirect(url_for("admin_dashboard"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        action = request.form.get("action")
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")

        if not username or not password:
            flash("Please enter both a username and password.", "error")
            return redirect(url_for("login"))

        if action == "register":
            if User.query.filter_by(username=username).first():
                flash("That username is already taken. Try another!", "error")
                return redirect(url_for("login"))

            new_user = User(
                username=username,
                password_hash=generate_password_hash(password)
            )
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user)
            return redirect(url_for("index"))

        else:
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password_hash, password):
                login_user(user)
                return redirect(url_for("index"))
            flash("Invalid username or password.", "error")

    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

@app.route("/api/save_money", methods=["POST"])
def save_money():
    if not current_user.is_authenticated:
        return jsonify({"logged_in": False})

    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    if amount > 0:
        current_user.total_saved += amount
        db.session.commit()

    return jsonify({
        "logged_in": True,
        "total_saved": f"{int(round(current_user.total_saved)):,}"
    })

@app.route("/api/calculate", methods=["POST"])
def calculate():
    data = request.get_json() or {}
    try:
        mode = data.get("mode", "salary")
        item_name = str(data.get("item_name", "")).strip() or "Mystery Temptation"
        item_price = float(data.get("item_price", 0))

        if item_price <= 0:
            return jsonify({"error": "Invalid item price"}), 400

        future_value_10yr = round(item_price * ((1 + 0.12) ** 10))

        comparisons = []
        for eq in EQUIVALENTS:
            qty = item_price / eq["cost"]
            qty_str = f"{int(round(qty)):,}" if qty >= 1 else f"{round(qty, 2)}"
            comparisons.append({
                "name": eq["name"],
                "qty": qty_str,
                "emoji": eq["emoji"],
                "raw_qty": qty
            })

        valid_comps = [c for c in comparisons if c["raw_qty"] >= 1]
        selected_comps = random.sample(valid_comps, 6) if len(valid_comps) >= 6 else comparisons[:6]

        if mode == "wallet":
            wallet_balance = float(data.get("wallet_balance", 5000))
            daily_spend = float(data.get("daily_spend", 200))
            print(f"Check Wallet Mode -> Item: {item_name} || Price: {item_price} || Balance: {wallet_balance} || Spend: {daily_spend}")
            if wallet_balance <= 0 or daily_spend <= 0:
                return jsonify({"error": "Invalid wallet inputs"}), 400

            wallet_pct = round((item_price / wallet_balance) * 100, 1)
            remaining = wallet_balance - item_price
            survival_days = round(item_price / daily_spend, 1)
            rem_str = f"₹{int(round(remaining)):,}" if remaining >= 0 else f"-₹{int(round(abs(remaining))):,}"
            
            if current_user.is_authenticated:
              db.session.add(WalletCheck(
                user_id=current_user.id,
                item_name=item_name[:120],
                item_price=item_price,
                daily_spend=daily_spend,
                wallet_balance=wallet_balance,
              ))
              db.session.commit()

            return jsonify({
                "mode": "wallet",
                "item_name": item_name,
                "item_price": f"{int(round(item_price)):,}",
                "raw_price": item_price,
                "top_right_label": "Your Current Wallet",
                "top_right_value": f"₹{int(round(wallet_balance)):,}",
                "drain_title": "Total Wallet Wiped Out",
                "drain_label": f"{wallet_pct}% of Wallet",
                "raw_percentage": wallet_pct,
                "card1": {
                    "emoji": "👛",
                    "label": "Balance Left After",
                    "value": rem_str,
                    "sub": "Remaining in your pocket" if remaining >= 0 else "You are short by this much!"
                },
                "card2": {
                    "emoji": "🍜",
                    "label": "Survival Days Lost",
                    "value": f"{survival_days} days",
                    "sub": f"At ₹{int(round(daily_spend))}/day daily expenses"
                },
                "future_value_10yr": f"{future_value_10yr:,}",
                "comparisons": selected_comps,
                "verdict": get_wallet_verdict(wallet_pct)
            })

        else:
            monthly_income = float(data.get("monthly_income", 50000))
            hours_per_day = float(data.get("hours_per_day", 8))
            days_per_week = float(data.get("days_per_week", 5))
            print(f"Check Salary Mode -> Item: {item_name} || Price: {item_price} || Income: {monthly_income} || Hours: {hours_per_day} || Days: {days_per_week}")

            if monthly_income <= 0 or hours_per_day <= 0 or days_per_week <= 0:
                return jsonify({"error": "Invalid salary inputs"}), 400

            monthly_work_hours = hours_per_day * days_per_week * 4.33
            hourly_wage = monthly_income / monthly_work_hours
            hours_of_life = round(item_price / hourly_wage, 1)
            work_days = round(hours_of_life / hours_per_day, 1)
            income_percentage = round((item_price / monthly_income) * 100, 1)

            if current_user.is_authenticated:
              db.session.add(SalaryCheck(
                user_id=current_user.id,
                item_name=item_name[:120],
                item_price=item_price,
                monthly_income=monthly_income,
                hours_per_day=hours_per_day,
                days_per_week=days_per_week,
              ))
              db.session.commit()

            return jsonify({
                "mode": "salary",
                "item_name": item_name,
                "item_price": f"{int(round(item_price)):,}",
                "raw_price": item_price,
                "top_right_label": "Your Real Time Value",
                "top_right_value": f"₹{int(round(hourly_wage)):,} / hr",
                "drain_title": "Monthly Salary Consumed",
                "drain_label": f"{income_percentage}% of Monthly Pay",
                "raw_percentage": income_percentage,
                "card1": {
                    "emoji": "⏳",
                    "label": "Hours of Life",
                    "value": f"{hours_of_life} hrs",
                    "sub": "Non-refundable work time"
                },
                "card2": {
                    "emoji": "💼",
                    "label": "Office Shifts",
                    "value": f"{work_days} days",
                    "sub": "Full workdays required"
                },
                "future_value_10yr": f"{future_value_10yr:,}",
                "comparisons": selected_comps,
                "verdict": get_salary_verdict(work_days)
            })

    except (ValueError, TypeError):
        return jsonify({"error": "Calculation error"}), 400

@app.route("/api/history/mine", methods=["GET"])
@login_required
def get_my_history():
    salary_rows = (
        SalaryCheck.query.filter_by(user_id=current_user.id)
        .order_by(SalaryCheck.created_at.desc())
        .limit(100)
        .all()
    )
    wallet_rows = (
        WalletCheck.query.filter_by(user_id=current_user.id)
        .order_by(WalletCheck.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify({
        "salary_history": [
            {
                "id": r.id,
                "item_name": r.item_name,
                "item_price": r.item_price,
                "monthly_income": r.monthly_income,
                "hours_per_day": r.hours_per_day,
                "days_per_week": r.days_per_week,
                "created_at": r.created_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime("%d %b, %I:%M %p"),
            }
            for r in salary_rows
        ],
        "wallet_history": [
            {
                "id": r.id,
                "item_name": r.item_name,
                "item_price": r.item_price,
                "daily_spend": r.daily_spend,
                "wallet_balance": r.wallet_balance,
                "created_at": r.created_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime("%d %b, %I:%M %p"),
            }
            for r in wallet_rows
        ],
    })

@app.route("/api/history/delete/<mode>/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_single_history(mode, entry_id):
    model = SalaryCheck if mode == "salary" else WalletCheck
    entry = model.query.filter_by(id=entry_id, user_id=current_user.id).first()
    if not entry:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"status": "deleted"})


@app.route("/api/history/clear/<mode>", methods=["DELETE"])
@login_required
def clear_mode_history(mode):
    model = SalaryCheck if mode == "salary" else WalletCheck
    model.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({"status": "cleared"})


if __name__ == "__main__":
    app.run(port=5000)
