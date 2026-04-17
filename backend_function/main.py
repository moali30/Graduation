import json
import numpy as np
from scipy import stats as sp_stats

# ========== Statistical Helpers ==========

def cronbach_alpha(items_matrix):
    """Calculate Cronbach's Alpha from an N x K matrix."""
    k = items_matrix.shape[1]
    if k < 2:
        return float('nan')
    item_vars = np.nanvar(items_matrix, axis=0, ddof=1)
    total_var = np.nanvar(np.nansum(items_matrix, axis=1), ddof=1)
    if total_var == 0:
        return 0.0
    return float((k / (k - 1)) * (1 - np.sum(item_vars) / total_var))


def ols_regression(Y, X):
    """
    Multiple OLS regression using numpy linear algebra.
    Returns dict with summary, coefficients, and constant.
    X should NOT include constant column yet.
    """
    n = len(Y)
    k = X.shape[1]  # number of predictors (without constant)
    
    # Add constant column
    ones = np.ones((n, 1))
    X_full = np.hstack([ones, X])  # [const, x1, x2, ...]
    
    # Beta = (X'X)^-1 X'Y
    try:
        XtX_inv = np.linalg.inv(X_full.T @ X_full)
    except np.linalg.LinAlgError:
        XtX_inv = np.linalg.pinv(X_full.T @ X_full)
    
    beta = XtX_inv @ X_full.T @ Y
    
    # Predictions and residuals
    Y_hat = X_full @ beta
    residuals = Y - Y_hat
    
    # Sum of squares
    SS_res = float(np.sum(residuals ** 2))
    SS_tot = float(np.sum((Y - np.mean(Y)) ** 2))
    
    # R-squared
    r_squared = 1 - SS_res / SS_tot if SS_tot > 0 else 0.0
    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - k - 1) if n > k + 1 else 0.0
    
    # MSE
    df_res = n - k - 1
    df_reg = k
    mse = SS_res / df_res if df_res > 0 else 0.0
    
    # Standard errors of coefficients
    se = np.sqrt(np.diagonal(XtX_inv) * mse)
    
    # t-values and p-values
    t_vals = beta / se
    p_vals = np.array([2 * (1 - sp_stats.t.cdf(abs(t), df_res)) for t in t_vals])
    
    # F-statistic
    MS_reg = (SS_tot - SS_res) / df_reg if df_reg > 0 else 0.0
    f_stat = MS_reg / mse if mse > 0 else 0.0
    f_pvalue = float(1 - sp_stats.f.cdf(f_stat, df_reg, df_res)) if df_res > 0 else 1.0
    
    return {
        "beta": beta,
        "se": se,
        "t_vals": t_vals,
        "p_vals": p_vals,
        "r_squared": r_squared,
        "adj_r_squared": adj_r_squared,
        "f_stat": f_stat,
        "f_pvalue": f_pvalue,
        "n": n
    }


def compute_vif(X):
    """Compute VIF for each column in X (without constant)."""
    vifs = []
    k = X.shape[1]
    for i in range(k):
        y_i = X[:, i]
        X_others = np.delete(X, i, axis=1)
        if X_others.shape[1] == 0:
            vifs.append(1.0)
            continue
        ones = np.ones((X_others.shape[0], 1))
        X_oth = np.hstack([ones, X_others])
        try:
            XtX_inv = np.linalg.inv(X_oth.T @ X_oth)
            beta = XtX_inv @ X_oth.T @ y_i
            y_hat = X_oth @ beta
            ss_res = np.sum((y_i - y_hat) ** 2)
            ss_tot = np.sum((y_i - np.mean(y_i)) ** 2)
            r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
            vifs.append(1.0 / (1 - r2) if r2 < 1 else float('inf'))
        except:
            vifs.append(float('inf'))
    return vifs


def run_regression(composite_data, dep_vars, indep_vars, var_names_map):
    """Run multiple regression for each dependent variable."""
    results = {}
    for dv in dep_vars:
        Y = np.array([row[dv] for row in composite_data], dtype=float)
        X = np.column_stack([
            np.array([row[iv] for row in composite_data], dtype=float) 
            for iv in indep_vars
        ])
        
        # Remove rows with NaN
        mask = ~(np.isnan(Y) | np.any(np.isnan(X), axis=1))
        Y_clean = Y[mask]
        X_clean = X[mask]
        
        if len(Y_clean) < len(indep_vars) + 2:
            continue
        
        reg = ols_regression(Y_clean, X_clean)
        vifs = compute_vif(X_clean)
        
        coefficients = []
        for i, iv in enumerate(indep_vars):
            idx = i + 1  # skip constant at index 0
            coefficients.append({
                "variable": iv,
                "b": float(reg["beta"][idx]),
                "se": float(reg["se"][idx]),
                "t": float(reg["t_vals"][idx]),
                "p": float(reg["p_vals"][idx]),
                "vif": float(vifs[i])
            })
        
        results[dv] = {
            "summary": {
                "dependentVar": dv,
                "r_squared": float(reg["r_squared"]),
                "adj_r_squared": float(reg["adj_r_squared"]),
                "f_stat": float(reg["f_stat"]),
                "p_value": float(reg["f_pvalue"]),
                "n": int(reg["n"]),
                "significant": reg["f_pvalue"] < 0.05
            },
            "coefficients": coefficients,
            "constant": {
                "b": float(reg["beta"][0]),
                "t": float(reg["t_vals"][0]),
                "p": float(reg["p_vals"][0])
            }
        }
    return results


def generate_optimized_data(raw_data, var_defs, dep_vars, indep_vars, demo_vars, n_samples):
    n = int(n_samples)
    new_data = {}
    
    # Demographics
    for col in demo_vars:
        vals = [r.get(col) for r in raw_data if r.get(col) is not None]
        if vals:
            new_data[col] = [vals[int(x)] for x in np.random.randint(0, len(vals), n)]
        else:
            new_data[col] = ['Unknown'] * n

    global_factor = np.random.normal(loc=3.8, scale=0.7, size=n)
    construct_factors = {}
    
    for indep in indep_vars:
        # Strong loading on global factor, very little specific noise
        construct_factors[indep] = (global_factor * 0.85) + np.random.normal(loc=0.6, scale=0.2, size=n)
        for item in var_defs.get(indep, []):
            raw_score = construct_factors[indep] + np.random.normal(loc=0, scale=0.3, size=n)
            new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int).tolist()
            
    for dep in dep_vars:
        indep_sum = np.zeros(n)
        for indep in indep_vars:
            indep_sum += construct_factors[indep]
        
        # dep_factor is strongly caused by indep_sum
        avg_indep = indep_sum / max(1, len(indep_vars))
        dep_factor = (avg_indep * 0.9) + np.random.normal(loc=0.4, scale=0.2, size=n)
        
        construct_factors[dep] = dep_factor
        for item in var_defs.get(dep, []):
            raw_score = dep_factor + np.random.normal(loc=0, scale=0.3, size=n)
            new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int).tolist()
            
    for var_name, items in var_defs.items():
        if var_name not in dep_vars and var_name not in indep_vars:
            factor = np.random.normal(loc=3.2, scale=0.8, size=n)
            for item in items:
                raw_score = factor + np.random.normal(loc=0, scale=0.6, size=n)
                new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int).tolist()
                
    return new_data


# ==========================================
# Appwrite Entrypoint
# ==========================================
def main(context):
    try:
        payload = context.req.body
        if isinstance(payload, str):
            payload = json.loads(payload)

        raw_data = payload.get("data", [])
        var_defs = payload.get("varDefs", {})
        indep_vars = payload.get("indepVars", [])
        dep_vars = payload.get("depVars", [])
        demo_vars = payload.get("demoVars", [])
        missing_method = payload.get("missingMethod", "mean")
        scoring_method = payload.get("scoringMethod", "mean")
        
        # Data generation request
        if payload.get("action") == "generate_data":
            sample_size = payload.get("sampleSize", 200)
            generated = generate_optimized_data(raw_data, var_defs, dep_vars, indep_vars, demo_vars, sample_size)
            keys = list(generated.keys())
            rows = [{k: generated[k][i] for k in keys} for i in range(sample_size)]
            return context.res.json({"status": "success", "generatedData": rows})
            
        # ==================== Analysis Pipeline ====================
        
        # Get all likert columns
        likert_cols = []
        for items in var_defs.values():
            likert_cols.extend(items)
        
        # Convert to numeric, handle missing
        for row in raw_data:
            for col in likert_cols:
                if col in row:
                    try:
                        row[col] = float(row[col]) if row[col] is not None and str(row[col]).strip() != '' else None
                    except (ValueError, TypeError):
                        row[col] = None
        
        if missing_method == 'drop':
            raw_data = [r for r in raw_data if all(r.get(c) is not None for c in likert_cols)]
        elif missing_method == 'mean':
            col_means = {}
            for col in likert_cols:
                vals = [r[col] for r in raw_data if r.get(col) is not None]
                col_means[col] = sum(vals) / len(vals) if vals else 0
            for row in raw_data:
                for col in likert_cols:
                    if row.get(col) is None:
                        row[col] = col_means[col]
        
        # Cronbach Alpha
        alpha_results = {}
        for var_name, items in var_defs.items():
            valid_items = [i for i in items if any(r.get(i) is not None for r in raw_data)]
            if len(valid_items) > 1:
                mat = np.array([[r.get(c, 0) for c in valid_items] for r in raw_data], dtype=float)
                alpha = cronbach_alpha(mat)
            else:
                alpha = float('nan')
            alpha_results[var_name] = {"items": len(valid_items), "alpha": alpha if not np.isnan(alpha) else None}
        
        # Composite variables
        composite_data = []
        for row in raw_data:
            new_row = dict(row)
            for var_name, items in var_defs.items():
                valid_items = [i for i in items if i in row and row[i] is not None]
                if valid_items:
                    vals = [float(row[i]) for i in valid_items]
                    new_row[var_name] = sum(vals) / len(vals) if scoring_method == 'mean' else sum(vals)
                else:
                    new_row[var_name] = 0
            composite_data.append(new_row)
        
        core_vars = dep_vars + indep_vars
        
        # Descriptive
        desc_stats = {}
        for cv in core_vars:
            vals = np.array([r[cv] for r in composite_data if cv in r], dtype=float)
            vals = vals[~np.isnan(vals)]
            desc_stats[cv] = {
                "n": int(len(vals)),
                "mean": float(np.mean(vals)) if len(vals) > 0 else 0,
                "std": float(np.std(vals, ddof=1)) if len(vals) > 1 else 0,
                "median": float(np.median(vals)) if len(vals) > 0 else 0,
                "min": float(np.min(vals)) if len(vals) > 0 else 0,
                "max": float(np.max(vals)) if len(vals) > 0 else 0
            }
        
        # Demographics
        demo_results = {}
        for c in demo_vars:
            counts = {}
            for r in raw_data:
                val = str(r.get(c, "Unknown"))
                counts[val] = counts.get(val, 0) + 1
            demo_results[c] = counts
        
        # Correlation
        data_matrix = np.column_stack([
            np.array([r.get(v, 0) for r in composite_data], dtype=float) for v in core_vars
        ])
        corr_matrix = np.corrcoef(data_matrix.T)
        corr_matrix = np.nan_to_num(corr_matrix, nan=0.0).tolist()
        
        # Regression
        regression_results = run_regression(composite_data, dep_vars, indep_vars, core_vars)
        
        return context.res.json({
            "status": "success",
            "results": {
                "N": len(raw_data),
                "variables": core_vars,
                "alpha": alpha_results,
                "descriptive": desc_stats,
                "demographics": demo_results,
                "correlation": {"matrix": corr_matrix, "vars": core_vars},
                "regressions": regression_results
            }
        })

    except Exception as e:
        import traceback
        context.error(traceback.format_exc())
        return context.res.json({"status": "error", "message": str(e)}, 500)
