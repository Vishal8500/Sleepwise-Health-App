import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from xgboost import XGBClassifier, XGBRegressor
import shap
from dotenv import load_dotenv

# ─────────────────────────── ENV ───────────────────────────
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "model")
REGRESSOR_PATH = os.path.join(ARTIFACT_DIR, "xgb_sleep_quality.pth")
CLASSIFIER_PATH = os.path.join(ARTIFACT_DIR, "xgb_sleep_disorder.pth")
PREPROCESSOR_PATH = os.path.join(ARTIFACT_DIR, "preprocessor.pkl")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "") 

# ────────────────────── Supabase client ────────────────────
from supabase import create_client, Client
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ─────────────────────── Cohere client ─────────────────────
import cohere
co = None
if COHERE_API_KEY:
    co = cohere.Client(COHERE_API_KEY)

# ───────────────────────── FastAPI ─────────────────────────
app = FastAPI(title="SleepWise Coach API", version="1.3.0")

origins = [
    "https://mysleepwise.netlify.app",
]

# CORS for Lovable frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────── Load models & artifacts ───────────────
regressor: XGBRegressor = joblib.load(REGRESSOR_PATH)
classifier: XGBClassifier = joblib.load(CLASSIFIER_PATH)
preproc = joblib.load(PREPROCESSOR_PATH)
feature_columns: List[str] = preproc["feature_columns"]
num_medians: Dict[str, float] = preproc["num_medians"]
cat_modes: Dict[str, str] = preproc["cat_modes"]
cat_cols: List[str] = preproc["cat_cols"]
bp_cols: List[str] = preproc["bp_cols"]
shap_explainer = shap.TreeExplainer(classifier)

# ───────────────────────── Schemas ─────────────────────────
class LogPayload(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = None
    sleep_duration: Optional[float] = Field(None, ge=0, le=24)
    physical_activity: Optional[int] = None
    stress_level: Optional[int] = Field(None, ge=0, le=10)
    bmi_category: Optional[str] = None
    blood_pressure: Optional[str] = None  # "120/80"
    heart_rate: Optional[int] = None
    daily_steps: Optional[int] = None

class PredictRequest(LogPayload):
    token: Optional[str] = None  # Supabase JWT

class PredictResponse(BaseModel):
    predicted_quality: float
    disorder_risk: str
    top_drivers: List[str]
    coach_tip: str
    confidence: str
    rule_override_flag: bool

# ───────────────────────── Helpers ─────────────────────────
RISK_MAP = {0: "None", 1: "Insomnia", 2: "Sleep Apnea"}

def age_to_bracket(age: Optional[int]) -> str:
    if age is None: return "Unknown"
    for lo, hi in [(0,17),(18,24),(25,34),(35,44),(45,54),(55,64),(65,200)]:
        if lo <= age <= hi: return f"{lo}-{hi}"
    return "Unknown"

def get_user_id_from_token(token: Optional[str]) -> Optional[str]:
    if not (token and supabase):
        return None
    try:
        res = supabase.auth.get_user(token)
        return res.user.id if res and res.user else None
    except Exception:
        return None

def preprocess_one(payload: LogPayload) -> pd.DataFrame:
    row = {
        "Sleep Duration": payload.sleep_duration,
        "Physical Activity Level": payload.physical_activity,
        "Stress Level": payload.stress_level,
        "BMI Category": payload.bmi_category,
        "Blood Pressure": payload.blood_pressure,
        "Heart Rate": payload.heart_rate,
        "Daily Steps": payload.daily_steps,
        "Age": payload.age,
        "Gender": payload.gender
    }
    X = pd.DataFrame([row])

    # BP split
    if "Blood Pressure" in X.columns:
        bp_split = X["Blood Pressure"].astype(str).str.split("/", expand=True)
        X["BP_Systolic"] = pd.to_numeric(bp_split[0], errors="coerce")
        X["BP_Diastolic"] = pd.to_numeric(bp_split[1], errors="coerce")
        X.drop(columns=["Blood Pressure"], inplace=True)
    else:
        for c in bp_cols:
            if c not in X.columns:
                X[c] = np.nan

    # Impute numerics
    for col, median_val in num_medians.items():
        if col in X.columns:
            X[col] = pd.to_numeric(X[col], errors="coerce").fillna(median_val)
        else:
            X[col] = median_val

    # Impute categoricals
    for c in cat_cols:
        if c not in X.columns:
            X[c] = cat_modes.get(c, "Unknown")
        X[c] = X[c].fillna(cat_modes.get(c, "Unknown"))

    # One-hot and align
    X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
    for col in feature_columns:
        if col not in X.columns:
            X[col] = 0
    return X[feature_columns]

def extract_top2_shap(sv_sample, feature_names) -> List[str]:
    contrib = np.abs(sv_sample)
    idxs = np.argsort(contrib)[::-1][:2]
    return [feature_names[i] for i in idxs]

def rule_engine(disorder_risk: str, bmi_category: Optional[str]) -> Optional[str]:
    if disorder_risk == "Sleep Apnea" and (bmi_category or "").lower() == "obese":
        return "Recommend clinical evaluation; clinician review required."
    return None

# ─────────────────────── Cohere call ───────────────────────
def call_cohere(prompt_data: str) -> dict:
    if not co:
        return {
            "tip": "LLM not configured. Please set COHERE_API_KEY.",
            "confidence": "n/a"
        }
    
    preamble = """
    You are a creative lifestyle sleep coach. You must respond with only a JSON object with three keys: 'tip', 'rationale', and 'confidence'.
    The 'tip' should be a single, actionable piece of advice.
    The 'rationale' should briefly explain why the tip is relevant.
    The 'confidence' should be 'low', 'medium', or 'high'.
    """

    try:
        response = co.chat(
            model='command-a-03-2025',   # ✅ now using command-r-plus
            preamble=preamble,
            message=prompt_data
        )
        text = response.text.strip()

        # Clean markdown fences like ```json ... ```
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(text)
            return {
                "tip": data.get("tip", text),
                "rationale": data.get("rationale", ""),
                "confidence": data.get("confidence", "medium")
            }
        except Exception:
            return {"tip": text, "confidence": "medium"}
    except Exception as e:
        return {"tip": f"LLM call failed: {str(e)}", "confidence": "n/a"}

# ───────────────────────── Predict ─────────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    user_id = get_user_id_from_token(req.token)
    X = preprocess_one(req)

    pred_quality = float(regressor.predict(X)[0])
    pred_quality = max(1.0, min(10.0, pred_quality))

    pred_class_idx = int(classifier.predict(X)[0])
    disorder = RISK_MAP[pred_class_idx]

    sv = shap_explainer(X)
    sv_class = sv.values[0][:, pred_class_idx]
    top2 = extract_top2_shap(sv_class, list(X.columns))

    override_msg = rule_engine(disorder, req.bmi_category)

    if override_msg:
        out = {"tip": override_msg, "confidence": "n/a", "rationale": ""}
        flag = True
    else:
        llm_prompt = f"""
        You are a creative lifestyle sleep coach.
        Input (de-identified):
        - Age Bracket: {age_to_bracket(req.age)}
        - Sleep Duration: {req.sleep_duration}h
        - Predicted Quality: {round(pred_quality,1)}/10
        - Stress Level: {req.stress_level}/10
        - Daily Steps: {req.daily_steps}
        - BMI: {req.bmi_category}
        - Disorder Risk: {disorder}
        - Top Drivers: {", ".join(top2)}
        """
        out = call_cohere(llm_prompt)
        flag = False

        if supabase and user_id:
            try:
                supabase.table("coach_logs").insert({
                    "user_id": str(user_id),
                    "prompt": llm_prompt,
                    "response": json.dumps(out),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
                print("✅ Coach log stored (predict)")
            except Exception as e:
                print(f"❌ Failed to log coach output (predict): {e}")

    return PredictResponse(
        predicted_quality=round(pred_quality, 1),
        disorder_risk=disorder,
        top_drivers=top2,
        coach_tip=out.get("tip", ""),
        confidence=out.get("confidence", "medium"),
        rule_override_flag=flag
    )

# ──────────────────────── Coach only ───────────────────────
@app.post("/coach")
def coach_endpoint(
    token: Optional[str] = None,
    age: int = Body(...),
    gender: str = Body(...),
    sleep_duration: float = Body(...),
    stress_level: int = Body(...),
    daily_steps: int = Body(...),
    bmi_category: str = Body(...),
    disorder_risk: str = Body(...),
    top_drivers: List[str] = Body(...)
):
    user_id = get_user_id_from_token(token)

    llm_prompt = f"""
    You are a creative lifestyle sleep coach.
    Input (de-identified):
    - Age: {age}, Gender: {gender}
    - Sleep Duration: {sleep_duration}h
    - Stress Level: {stress_level}/10
    - Daily Steps: {daily_steps}
    - BMI: {bmi_category}
    - Disorder Risk: {disorder_risk}
    - Top Drivers: {", ".join(top_drivers)}
    """

    out = call_cohere(llm_prompt)
    
    if supabase and user_id:
        try:
            supabase.table("coach_logs").insert({
                "user_id": str(user_id),
                "prompt": llm_prompt,
                "response": json.dumps(out),
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            print("✅ Coach log stored (coach)")
        except Exception as e:
            print(f"❌ Failed to log coach output (coach): {e}")

    return {
        "tip": out.get("tip", ""),
        "rationale": out.get("rationale", ""),
        "confidence": out.get("confidence", "medium"),
        "rule_override_flag": False
    }

# ───────────────────────── Logs ────────────────────────────
class LogRequest(LogPayload):
    token: Optional[str] = None  # JWT included in body

@app.post("/log")
def log_daily(req: LogRequest):
    user_id = get_user_id_from_token(req.token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    if supabase:
        try:
            supabase.table("sleep_logs").insert({
                "user_id": user_id,
                "age": req.age,
                "gender": req.gender,
                "sleep_duration": req.sleep_duration,
                "physical_activity": req.physical_activity,
                "stress_level": req.stress_level,
                "bmi_category": req.bmi_category,
                "blood_pressure": req.blood_pressure,
                "heart_rate": req.heart_rate,
                "daily_steps": req.daily_steps,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            raise HTTPException(400, f"Failed to log: {e}")

    return {"status": "ok", "message": "Daily log stored successfully"}

# ───────────────────── Dashboard APIs ──────────────────────
@app.get("/dashboard/series")
def dashboard_series(
    token: str = Query(..., description="Supabase JWT"),
    days: int = Query(7, ge=1, le=30)
):
    user_id = get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    items: List[Dict[str, Any]] = []
    if supabase:
        try:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            resp = supabase.table("sleep_logs") \
                .select("created_at, sleep_duration, predicted_quality, stress_level, daily_steps") \
                .eq("user_id", user_id) \
                .gte("created_at", since) \
                .order("created_at", desc=False) \
                .execute()
            items = resp.data or []
        except Exception as e:
            raise HTTPException(400, f"Fetch failed: {e}")

    if not items:
        return {
            "logs": [],
            "averages": {"sleep": 0, "quality": 0, "stress": 0, "steps": 0}
        }

    df = pd.DataFrame(items)
    log_count = len(df)
    
    df['sleep_duration'] = pd.to_numeric(df['sleep_duration']).fillna(0)
    df['predicted_quality'] = pd.to_numeric(df['predicted_quality']).fillna(0)
    df['stress_level'] = pd.to_numeric(df['stress_level']).fillna(0)
    df['daily_steps'] = pd.to_numeric(df['daily_steps']).fillna(0)

    averages = {
        "sleep": round(df['sleep_duration'].sum() / log_count, 1),
        "quality": round(df['predicted_quality'].sum() / log_count, 1),
        "stress": round(df['stress_level'].sum() / log_count),
        "steps": round(df['daily_steps'].sum() / log_count)
    }

    logs_for_response = df.to_dict('records')

    return {"logs": logs_for_response, "averages": averages}


@app.get("/dashboard/top-drivers")
def dashboard_top_drivers(
    token: str = Query(..., description="Supabase JWT"),
    days: int = Query(7, ge=1, le=30)
):
    user_id = get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    items = []
    if supabase:
        try:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            resp = supabase.table("sleep_logs") \
                .select("top_drivers,created_at") \
                .eq("user_id", user_id) \
                .gte("created_at", since) \
                .order("created_at", desc=False) \
                .execute()
            items = resp.data or []
        except Exception as e:
            raise HTTPException(400, f"Fetch failed: {e}")

    latest_top = []
    counts: Dict[str,int] = {}
    for i in items:
        td = i.get("top_drivers")
        if isinstance(td, str):
            try:
                td = json.loads(td)
            except Exception:
                td = []
        if not latest_top and td:
            latest_top = td
        for f in (td or []):
            counts[f] = counts.get(f, 0) + 1

    return {"latest_top_drivers": latest_top, "driver_counts": counts}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Render automatically sets PORT
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)