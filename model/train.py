import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import classification_report, confusion_matrix, mean_absolute_error, r2_score
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier, XGBRegressor
import shap
from imblearn.over_sampling import SMOTE
import joblib

# ---------------------------
# 1. Load Data
# ---------------------------
df = pd.read_csv(r"D:\training1\Sleep_health_and_lifestyle_dataset.csv")

# ---------------------------
# 2. Preprocessing
# ---------------------------
# Features for both tasks
features = [
    "Sleep Duration", "Physical Activity Level", "Stress Level",
    "BMI Category", "Blood Pressure", "Heart Rate", "Daily Steps", "Age", "Gender"
]

X = df[features].copy()

# Split Blood Pressure
if "Blood Pressure" in X.columns:
    bp_split = X["Blood Pressure"].astype(str).str.split("/", expand=True)
    X["BP_Systolic"] = pd.to_numeric(bp_split[0], errors="coerce")
    X["BP_Diastolic"] = pd.to_numeric(bp_split[1], errors="coerce")
    X.drop(columns=["Blood Pressure"], inplace=True)

# Handle categorical + numeric separately
cat_cols = ["BMI Category", "Gender"]
num_cols = [c for c in X.columns if c not in cat_cols]

# Impute numeric with median
num_imputer = SimpleImputer(strategy="median")
X[num_cols] = num_imputer.fit_transform(X[num_cols])

# Impute categorical with most frequent
cat_imputer = SimpleImputer(strategy="most_frequent")
X[cat_cols] = cat_imputer.fit_transform(X[cat_cols])

# One-hot encode categorical
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)

# ---------------------------
# 3A. Regression Task — Quality of Sleep
# ---------------------------
y_reg = df["Quality of Sleep"].fillna(df["Quality of Sleep"].median())  # impute missing target

X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
    X, y_reg, test_size=0.2, random_state=42
)

regressor = XGBRegressor(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

regressor.fit(X_train_r, y_train_r)
y_pred_r = regressor.predict(X_test_r)

print("\n📊 Regression Task — Quality of Sleep")
print("MAE:", mean_absolute_error(y_test_r, y_pred_r))
print("R² Score:", r2_score(y_test_r, y_pred_r))

# Save regression model
regressor_path = r"D:\training1\xgb_sleep_quality.pth"
joblib.dump(regressor, regressor_path)
print(f"✅ Regressor saved at {regressor_path}")

# ---------------------------
# 3B. Classification Task — Sleep Disorder
# ---------------------------
y_clf = df["Sleep Disorder"].fillna("None")
y_clf = y_clf.replace({"None": 0, "Insomnia": 1, "Sleep Apnea": 2})

X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X, y_clf, test_size=0.2, stratify=y_clf, random_state=42
)

# Handle imbalance with SMOTE
smote = SMOTE(random_state=42)
X_train_res, y_train_res = smote.fit_resample(X_train_c, y_train_c)

classifier = XGBClassifier(
    objective="multi:softprob",
    num_class=3,
    eval_metric="mlogloss",
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

classifier.fit(X_train_res, y_train_res)
y_pred_c = classifier.predict(X_test_c)

print("\n📊 Classification Task — Sleep Disorder")
print(classification_report(y_test_c, y_pred_c, target_names=["None", "Insomnia", "Sleep Apnea"]))
print("Confusion Matrix:\n", confusion_matrix(y_test_c, y_pred_c))

# Save classifier
classifier_path = r"D:\training1\xgb_sleep_disorder.pth"
joblib.dump(classifier, classifier_path)
print(f"✅ Classifier saved at {classifier_path}")

# ---------------------------
# 4. Explainability with SHAP (Classification)
# ---------------------------
explainer = shap.TreeExplainer(classifier)
shap_values = explainer(X_test_c)

# Global feature importance
shap.summary_plot(shap_values, X_test_c, plot_type="bar")

# Local explanation — first sample
i = 0
pred_class = y_pred_c[i]
print(f"\nExplaining sample {i}, predicted class = {pred_class}")
shap.plots.waterfall(shap_values[i][:, pred_class])

# ------- Save preprocessing artifacts for inference -------
import joblib
preproc_artifacts = {
    "num_medians": {c: float(X[c].median()) for c in X.select_dtypes(include=[np.number]).columns},
    "cat_modes": {
        "BMI Category": str(df["BMI Category"].mode(dropna=True).iloc[0]) if df["BMI Category"].notna().any() else "Normal",
        "Gender": str(df["Gender"].mode(dropna=True).iloc[0]) if df["Gender"].notna().any() else "Male",
    },
    # exact one-hot levels used at train time (from the fitted X columns):
    "feature_columns": list(X.columns),
    # for convenience, which base categorical columns we one-hot’d:
    "cat_cols": ["BMI Category", "Gender"],
    # which columns were created by BP split (so we keep schema stable)
    "bp_cols": ["BP_Systolic", "BP_Diastolic"]
}
joblib.dump(preproc_artifacts, r"D:\training1\preprocessor.pkl")
print("✅ Preprocessor artifacts saved.")
