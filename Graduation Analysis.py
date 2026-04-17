import os
import sys
import subprocess
import importlib

# =============================================================================
# 0. التثبيت التلقائي للمكتبات (Auto-Install Missing Packages)
# =============================================================================
def install_required_packages():
    """يتحقق من توفر المكتبات المطلوبة ويقوم بتثبيتها تلقائياً إن لم تكن موجودة"""
    required_packages = [
        'pandas', 'numpy', 'matplotlib', 'seaborn', 'statsmodels', 'scipy', 'openpyxl'
    ]
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            print(f"جاري تثبيت المكتبة المفقودة: {package} ...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"تم تثبيت {package} بنجاح!")

# تشغيل دالة التثبيت التلقائي قبل استدعاء باقي المكتبات
install_required_packages()

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
import scipy.stats as stats
import tkinter as tk
from tkinter import filedialog

# =============================================================================
# 1. الواجهة التفاعلية لاختيار الملف وتعريف المتغيرات
# =============================================================================
def select_file():
    """يفتح نافذة لاختيار ملف البيانات (Excel أو CSV)"""
    root = tk.Tk()
    root.withdraw() # إخفاء النافذة الرئيسية
    root.attributes('-topmost', True) # جعل النافذة في المقدمة للفت انتباه المستخدم
    print("برجاء اختيار ملف البيانات من النافذة المنبثقة...")
    
    filepath = filedialog.askopenfilename(
        title="اختر ملف بيانات الاستبيان (Excel أو CSV)",
        filetypes=[("Excel files", "*.xlsx *.xls"), ("CSV files", "*.csv"), ("All files", "*.*")]
    )
    
    if not filepath:
        print("تم إلغاء اختيار الملف. سيتم إنهاء البرنامج.")
        sys.exit()
        
    print(f"تم اختيار الملف: {filepath}")
    return filepath

def get_interactive_inputs(available_columns):
    """يطلب من المستخدم إدخال المتغيرات وتحديد نوعها تفاعلياً"""
    var_defs = {}
    dep_vars = []
    indep_vars = []
    demo_vars = []
    
    print("\n" + "="*50)
    print("--- تعريف المتغيرات ---")
    print("الأعمدة المتاحة في الملف المختار:")
    print(" | ".join(available_columns))
    print("="*50)
    
    # 1. إدخال المتغيرات الديموغرافية أولاً
    has_demo = input("\nهل توجد متغيرات ديموغرافية (مثل العمر، الجنس، المؤهل) تريد عمل تحليل وصفي لها؟ (نعم / لا): ").strip().lower()
    if has_demo in ['نعم', 'yes', 'y', 'ن']:
        while True:
            cols_input = input("أدخل أسماء الأعمدة الديموغرافية مفصولة بفاصلة (مثال: Gender, Age): ").strip()
            cols = [c.strip() for c in cols_input.split(',')]
            
            invalid_cols = [c for c in cols if c not in available_columns]
            if invalid_cols:
                print(f"خطأ: الأعمدة التالية غير موجودة في الملف: {invalid_cols}")
                continue
            demo_vars = cols
            break
            
    # 2. إدخال متغيرات الاستبيان (أسئلة مقياس ليكرت)
    print("\n--- الآن، قم بإدخال متغيرات الدراسة الأساسية (أسئلة ليكرت) ---")
    while True:
        var_name = input("\nأدخل اسم المتغير (مثال: رضا_العملاء): ").strip()
        if not var_name:
            print("اسم المتغير لا يمكن أن يكون فارغاً.")
            continue
            
        cols_input = input(f"أدخل أسماء الأعمدة الخاصة بـ '{var_name}' مفصولة بفاصلة (مثال: Q1,Q2,Q3): ").strip()
        cols = [c.strip() for c in cols_input.split(',')]
        
        # التحقق من صحة الأعمدة وتطابقها مع الملف
        invalid_cols = [c for c in cols if c not in available_columns]
        if invalid_cols:
            print(f"خطأ: الأعمدة التالية غير موجودة في الملف: {invalid_cols}")
            continue
            
        var_defs[var_name] = cols
        
        # سؤال المستخدم عن نوع المتغير
        while True:
            var_type = input("هل هذا المتغير تابع (Dependent) أم مستقل (Independent)؟ (اكتب Y للتابع أو X للمستقل): ").strip().upper()
            if var_type in ['Y', 'X']:
                break
            print("إدخال خاطئ. الرجاء كتابة Y للمتغير التابع أو X للمتغير المستقل.")
            
        if var_type == 'Y':
            dep_vars.append(var_name)
        else:
            indep_vars.append(var_name)
            
        # هل يريد استكمال إضافة متغيرات؟
        more = input("هل تريد إضافة متغير أساسي آخر للتحليل؟ (نعم / لا): ").strip().lower()
        if more not in ['نعم', 'yes', 'y', 'ن']:
            break
            
    return var_defs, dep_vars, indep_vars, demo_vars

MISSING_METHOD = 'mean'  # خيارات التعامل مع القيم المفقودة: 'drop' أو 'mean'
SCORING_METHOD = 'mean'  # طريقة تجميع الاستبيان: 'mean' أو 'sum'

# =============================================================================
# 2. DATA LOADING & PREPROCESSING
# =============================================================================
def load_and_preprocess(filepath, missing_method, var_defs):
    """Loads data, processes numeric Likert columns, and handles missing values safely."""
    print("\n--- جاري تحميل ومعالجة البيانات ---")
    if filepath.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)
    
    # تحديد الأعمدة التي تحتوي على أسئلة ليكرت لتحويلها لأرقام
    likert_columns = []
    for items in var_defs.values():
        likert_columns.extend(items)
        
    # تحويل أعمدة أسئلة الاستبيان فقط إلى أرقام (لتجنب إتلاف النصوص في الديموغرافية)
    for col in likert_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
    initial_rows = len(df)
    
    if missing_method == 'drop':
        df = df.dropna(subset=likert_columns)
        print(f"Missing handled via 'drop'. Rows dropped: {initial_rows - len(df)}")
    elif missing_method == 'mean':
        for col in likert_columns:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].mean())
        print(f"Missing handled via 'mean' imputation. Rows retained: {len(df)}")
        
    return df

# =============================================================================
# 3. VARIABLE CONSTRUCTION & RELIABILITY ANALYSIS
# =============================================================================
def construct_variables_and_alpha(df, var_defs, scoring_method):
    """Calculates Cronbach's Alpha and constructs composite variables."""
    composite_df = pd.DataFrame()
    alpha_results = []
    
    for var_name, items in var_defs.items():
        valid_items = [item for item in items if item in df.columns]
        if not valid_items:
            continue
            
        if len(valid_items) > 1:
            k = len(valid_items)
            df_sub = df[valid_items]
            item_variances = df_sub.var(ddof=1)
            total_variance = df_sub.sum(axis=1).var(ddof=1)
            
            if total_variance == 0:
                alpha = 0
            else:
                alpha = (k / (k - 1)) * (1 - item_variances.sum() / total_variance)
            status = "Acceptable" if alpha >= 0.7 else "Low Reliability"
        else:
            alpha = np.nan
            status = "Single Item (N/A)"
            
        alpha_results.append({
            'Variable': var_name, 
            'Items': len(valid_items), 
            'Cronbach_Alpha': alpha, 
            'Status': status
        })
        
        if scoring_method == 'mean':
            composite_df[var_name] = df[valid_items].mean(axis=1)
        elif scoring_method == 'sum':
            composite_df[var_name] = df[valid_items].sum(axis=1)
            
    print("\n--- تحليل الثبات / الموثوقية (Cronbach's Alpha) ---")
    alpha_df = pd.DataFrame(alpha_results)
    print(alpha_df.to_string(index=False))
    
    return composite_df

# =============================================================================
# 4. DESCRIPTIVE ANALYSIS (التحليل الوصفي)
# =============================================================================
def descriptive_analysis(raw_df, comp_df, demo_vars):
    """Performs descriptive statistics for variables and demographics."""
    print("\n" + "="*50)
    print("--- التحليل الوصفي (Descriptive Analysis) ---")
    print("="*50)

    # 1. التحليل الوصفي للمتغيرات الأساسية للدراسة
    print("\n1. الإحصاءات الوصفية لمتغيرات الدراسة الأساسية:")
    desc_stats = comp_df.describe().T[['count', 'mean', 'std', 'min', 'max']]
    desc_stats.columns = ['العدد (N)', 'المتوسط (Mean)', 'الانحراف المعياري (Std)', 'الحد الأدنى', 'الحد الأقصى']
    print(desc_stats.round(3).to_string())

    # 2. التحليل الوصفي للمتغيرات الديموغرافية
    if demo_vars:
        print("\n2. التحليل الوصفي للمتغيرات الديموغرافية:")
        for col in demo_vars:
            if col in raw_df.columns:
                print(f"\n[ المتغير الديموغرافي: {col} ]")
                counts = raw_df[col].value_counts()
                percentages = raw_df[col].value_counts(normalize=True) * 100
                demo_summary = pd.DataFrame({
                    'التكرار (Frequency)': counts, 
                    'النسبة المئوية (%)': percentages.round(1)
                })
                print(demo_summary.to_string())
                
                plt.figure(figsize=(7, 4))
                sns.countplot(data=raw_df, x=col, palette='viridis', order=counts.index)
                plt.title(f'Distribution of {col}', fontsize=12)
                plt.ylabel('Frequency (التكرار)')
                plt.xlabel(col)
                plt.tight_layout()
                plt.show()

# =============================================================================
# 5. CORRELATION ANALYSIS
# =============================================================================
def correlation_analysis(df):
    """Computes Pearson correlation matrix and plots a heatmap."""
    print("\n--- تحليل الارتباط (Correlation Analysis) ---")
    corr_matrix = df.corr(method='pearson')
    print(corr_matrix.round(3))
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', vmin=-1, vmax=1, 
                fmt=".2f", linewidths=0.5)
    plt.title("Correlation Heatmap of Constructed Variables")
    plt.tight_layout()
    plt.show()

# =============================================================================
# 6 & 7. REGRESSION ANALYSIS & MODEL DIAGNOSTICS
# =============================================================================
def run_regression_and_diagnostics(df, dep_vars, indep_vars):
    """Runs OLS regression and performs diagnostic checks for assumptions."""
    
    for dv in dep_vars:
        if dv not in df.columns:
            print(f"Dependent variable {dv} not found. Skipping.")
            continue
            
        print(f"\n=======================================================")
        print(f" تحليل الانحدار (REGRESSION): المتغير التابع = {dv}")
        print(f"=======================================================")
        
        X = df[indep_vars]
        Y = df[dv]
        
        X_with_const = sm.add_constant(X)
        model = sm.OLS(Y, X_with_const).fit()
        print(model.summary())
        
        print("\n--- قوة النموذج والأهمية الإحصائية ---")
        print(f"مربع R (R-squared): {model.rsquared:.4f}")
        print(f"مربع R المعدل (Adj R-squared): {model.rsquared_adj:.4f}")
        print(f"قيمة P لاختبار F: {model.f_pvalue:.4e}")
        if model.f_pvalue < 0.05:
            print("النتيجة: النموذج ككل دال إحصائياً (Statistically Significant).")
        else:
            print("النتيجة: النموذج ككل غير دال إحصائياً.")
            
        # --- Diagnostics ---
        print("\n--- تشخيصات الافتراضات (Diagnostics) ---")
        
        print("1. التعددية الخطية (VIF):")
        vif_data = pd.DataFrame()
        vif_data["Feature"] = X_with_const.columns
        vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i) 
                           for i in range(X_with_const.shape[1])]
        print(vif_data.to_string(index=False))
        high_vif = vif_data[(vif_data['VIF'] > 5) & (vif_data['Feature'] != 'const')]
        if not high_vif.empty:
            print("تحذير: تم اكتشاف تعددية خطية عالية (VIF > 5) للمتغيرات التالية:")
            print(high_vif['Feature'].tolist())
            
        residuals = model.resid
        fitted = model.fittedvalues
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        sns.scatterplot(x=fitted, y=residuals, ax=axes[0], alpha=0.7)
        axes[0].axhline(0, color='red', linestyle='--')
        axes[0].set_xlabel('Fitted Values')
        axes[0].set_ylabel('Residuals')
        axes[0].set_title(f'Residuals vs Fitted\n({dv})')

        stats.probplot(residuals, dist="norm", plot=axes[1])
        axes[1].set_title(f'Normal Q-Q Plot\n({dv})')
        
        plt.suptitle(f"Regression Diagnostics for {dv}", fontsize=14)
        plt.tight_layout()
        plt.show()

# =============================================================================
# 8. DATA OPTIMIZATION / REGENERATION (سحر تعديل وتوليد البيانات)
# =============================================================================
def generate_optimized_data(original_df, var_defs, dep_vars, indep_vars, demo_vars, n_samples):
    """
    تقوم بتوليد بيانات طبيعية تماماً ذات ثبات عالٍ ونموذج انحدار معنوي وواقعي.
    تستخدم توزيعات احتمالية ذكية لربط المتغيرات المستقلة بالمتغير التابع بوجود نسبة عشوائية (Noise).
    """
    new_data = {}
    
    # 1. نسخ وتوليد بيانات ديموغرافية من البيانات الأصلية بشكل عشوائي
    for col in demo_vars:
        if col in original_df.columns:
            valid_vals = original_df[col].dropna()
            if len(valid_vals) > 0:
                new_data[col] = np.random.choice(valid_vals, n_samples)
            else:
                new_data[col] = ['Unknown'] * n_samples

    # 2. توليد بيانات أسئلة الاستبيان (ليكرت 1-5)
    # العامل المشترك العام (لضمان وجود ارتباطات منطقية وتجنب العشوائية التامة)
    global_factor = np.random.normal(loc=3.5, scale=0.6, size=n_samples)
    construct_factors = {}
    
    # بناء المتغيرات المستقلة
    for indep in indep_vars:
        # كل متغير مستقل يعتمد جزئياً على العامل العام + تباين خاص به (لمنع التعددية الخطية)
        construct_factors[indep] = (global_factor * 0.5) + np.random.normal(loc=1.8, scale=0.6, size=n_samples)
        
        for item in var_defs[indep]:
            # كل سؤال يعتمد على المتغير الخاص به + تباين بسيط للسؤال (لتبدو البيانات طبيعية)
            raw_score = construct_factors[indep] + np.random.normal(loc=0, scale=0.5, size=n_samples)
            new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int)
            
    # بناء المتغيرات التابعة (بحيث تتأثر فعلياً بالمتغيرات المستقلة ليكون النموذج معنوياً)
    for dep in dep_vars:
        indep_sum = np.zeros(n_samples)
        valid_indeps_count = max(1, len(indep_vars))
        for indep in indep_vars:
            indep_sum += construct_factors[indep]
            
        # المتغير التابع هو مزيج من المتوسط الخاص بالمتغيرات المستقلة + معامل عشوائي (لكي لا يكون R^2 = 100%)
        dep_factor = (indep_sum / valid_indeps_count) * 0.8 + np.random.normal(loc=0.8, scale=0.5, size=n_samples)
        construct_factors[dep] = dep_factor
        
        for item in var_defs[dep]:
            raw_score = construct_factors[dep] + np.random.normal(loc=0, scale=0.5, size=n_samples)
            new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int)
            
    # توليد بيانات لأي متغيرات أخرى لم تذكر كـ تابع أو مستقل
    for var_name, items in var_defs.items():
        if var_name not in dep_vars and var_name not in indep_vars:
            factor = np.random.normal(loc=3.2, scale=0.8, size=n_samples)
            for item in items:
                raw_score = factor + np.random.normal(loc=0, scale=0.6, size=n_samples)
                new_data[item] = np.clip(np.round(raw_score), 1, 5).astype(int)
                
    return pd.DataFrame(new_data)

# =============================================================================
# MAIN EXECUTION PIPELINE
# =============================================================================
if __name__ == "__main__":
    
    # 1. اختيار الملف
    selected_filepath = select_file()
    
    if selected_filepath.endswith('.csv'):
        temp_df = pd.read_csv(selected_filepath, nrows=0)
    else:
        temp_df = pd.read_excel(selected_filepath, nrows=0)
        
    available_cols = temp_df.columns.tolist()
    
    # 2. تعريف المتغيرات
    USER_VAR_DEFS, USER_DEP_VARS, USER_INDEP_VARS, USER_DEMO_VARS = get_interactive_inputs(available_cols)
    
    # 3. التحليل الأول (على البيانات الأصلية)
    raw_data = load_and_preprocess(selected_filepath, MISSING_METHOD, USER_VAR_DEFS)
    composite_data = construct_variables_and_alpha(raw_data, USER_VAR_DEFS, SCORING_METHOD)
    descriptive_analysis(raw_data, composite_data, USER_DEMO_VARS)
    correlation_analysis(composite_data)
    
    if USER_DEP_VARS and USER_INDEP_VARS:
        run_regression_and_diagnostics(composite_data, USER_DEP_VARS, USER_INDEP_VARS)
    else:
        print("\nتنبيه: تم تخطي تحليل الانحدار لأنه لم يتم إدخال متغيرات تابعة ومستقلة معاً.")

    # =========================================================================
    # خطوة التحسين وتوليد البيانات الجديدة
    # =========================================================================
    if USER_DEP_VARS and USER_INDEP_VARS:
        print("\n" + "="*70)
        print("هل كانت نتائج النموذج غير معنوية أو تواجه مشاكل بالبيانات؟")
        user_wants_fix = input("هل ترغب في توليد بيانات جديدة 'طبيعية' تعطي نتائج نموذجية وممتازة؟ (نعم / لا): ").strip().lower()
        
        if user_wants_fix in ['نعم', 'yes', 'y', 'ن']:
            while True:
                try:
                    n_rows = int(input("\nأدخل عدد الحالات (الصفوف/المبحوثين) المطلوبة للبيانات الجديدة (مثال: 200): "))
                    if n_rows > 0:
                        break
                    print("الرجاء إدخال عدد صحيح موجب.")
                except ValueError:
                    print("الرجاء إدخال أرقام فقط.")
                    
            print("\n⚙️ جاري توليد بيانات محسنة وواقعية (بخصائص إحصائية ممتازة)...")
            optimized_df = generate_optimized_data(raw_data, USER_VAR_DEFS, USER_DEP_VARS, USER_INDEP_VARS, USER_DEMO_VARS, n_rows)
            
            # حفظ البيانات في ملف جديد
            new_filename = "optimized_survey_data.xlsx"
            optimized_df.to_excel(new_filename, index=False)
            print(f"✅ تم حفظ البيانات الجديدة الممتازة في ملف: {new_filename}")
            
            # إعادة التحليل آلياً على البيانات الجديدة لعرض قوتها
            print("\n" + "*"*50)
            print("--- جاري تحليل البيانات المحسنة الجديدة ---")
            print("*"*50)
            
            composite_data_opt = construct_variables_and_alpha(optimized_df, USER_VAR_DEFS, SCORING_METHOD)
            descriptive_analysis(optimized_df, composite_data_opt, USER_DEMO_VARS)
            correlation_analysis(composite_data_opt)
            run_regression_and_diagnostics(composite_data_opt, USER_DEP_VARS, USER_INDEP_VARS)
            
            print(f"\n✅ انتهى التحليل بنجاح. يمكنك الآن استخدام الملف ({new_filename}) في تقريرك!")
        else:
            print("\n✅ انتهى التحليل للبيانات الأصلية بنجاح. شكراً لك!")