const translations = {
    ar: {
        app_title: "التحليل الإحصائي لمشاريع التخرج",
        app_desc: "أداة احترافية لتحليل استبيانات الأبحاث العلمية بنقرة واحدة",
        start_button: "ابدأ تحليلاً جديداً",
        settings: "الإعدادات",
        api_key_label: "مفتاح Gemini API",
        save_settings: "حفظ الإعدادات",
        step1_title: "1. رفع الملف",
        step2_title: "2. تعريف المتغيرات",
        step3_title: "3. مراجعة وتشغيل",
        upload_prompt: "اسحب وأفلت ملف البيانات هنا أو اضغط للاختيار",
        supported_files: "الامتدادات المدعومة: xlsx, xls, csv",
        preview_data: "معاينة البيانات",
        data_quality_report: "تقرير جودة البيانات",
        next: "التالي",
        prev: "السابق",
        available_cols: "الأعمدة المتاحة في الملف:",
        cols_hint: "اضغط على أي عمود لإضافته للمتغيرات الديموغرافية",
        demo_vars_label: "المتغيرات الديموغرافية",
        demo_hint: "مثل: الجنس، العمر، المستوى الدراسي",
        no_demo_selected: "لا يوجد متغيرات ديموغرافية محددة",
        likert_vars_label: "متغيرات الدراسة الأساسية",
        add_variable: "إضافة متغير",
        add_var_hint: "اضغط \"إضافة متغير\" لبدء تعريف متغيرات الدراسة",
        var_name: "اسم المتغير",
        var_items: "الأسئلة المرتبطة",
        var_type: "نوع المتغير",
        independent: "مستقل (X)",
        dependent: "تابع (Y)",
        run_analysis: "تشغيل التحليل الآن 🚀",
        ready_to_run: "جاهز للتحليل!",
        results_dashboard: "لوحة النتائج",
        cronbach_alpha: "تحليل الثبات (ألفا كرونباخ)",
        descriptive_stats: "التحليل الوصفي للمتغيرات الأساسية",
        correlation: "تحليل الارتباط (Pearson)",
        regression: "تحليل الانحدار",
        data_fix: "أداة تحسين البيانات 🪄",
        copy_word: "نسخ للبحث",
        gen_ai: "توليد تعليق أكاديمي 🤖",
        copied: "تم النسخ!",
        processing: "جاري المعالجة...",
        missing_values_method: "طريقة التعامل مع القيم المفقودة:",
        mean_imputation: "الاستبدال بالمتوسط",
        drop_rows: "حذف الصفوف",
        variable_name_empty: "لا يمكن ترك اسم المتغير فارغاً",
        error_no_dependent: "يجب تحديد متغير تابع واحد على الأقل",
        error_no_independent: "يجب تحديد متغير مستقل واحد على الأقل",
        fix_data_prompt: "إذا كانت النتائج ضعيفة، يمكنك توليد بيانات طبيعية بخصائص نموذجية",
        target_sample_size: "حجم العينة المطلوب",
        generate_data: "توليد وتنزيل البيانات",
        cancel: "إلغاء",
        feature_privacy: "خصوصية كاملة",
        feature_privacy_desc: "بياناتك آمنة 100%. لا يتم حفظ أي بيانات على أي سيرفر.",
        feature_copy: "نسخ أكاديمي",
        feature_copy_desc: "نسخ مباشر لجميع الجداول بتنسيق أكاديمي (APA) لملفات Word.",
        feature_ai: "تعليق ذكي",
        feature_ai_desc: "المساعد الذكي (Gemini) جاهز لكتابة التعليق العلمي تحت كل جدول.",
        reg_diagnostics: "تشخيصات الانحدار",
        residuals_vs_fitted: "البواقي مقابل القيم المُقدَّرة",
        qq_plot: "رسم Q-Q الطبيعي",
        dep_var_label: "المتغيرات التابعة (Y)",
        indep_var_label: "المتغيرات المستقلة (X)",
        missing_method_label: "طريقة القيم المفقودة",
        col_var: "المتغير",
        col_items_count: "عدد الأسئلة",
        col_alpha: "ألفا كرونباخ",
        col_interpretation: "التفسير",
        col_n: "العدد (N)",
        col_mean: "المتوسط",
        col_std: "الانحراف المعياري",
        col_median: "الوسيط",
        col_min: "الحد الأدنى",
        col_max: "الحد الأقصى",
        dev_name: "أخوكم محمد عاصم",
        copyright: "حقوق هذا الموقع محفوظة لـ محمد عاصم &copy; 2024",
        hero_dev: "أخوكم محمد عاصم"
    },
    en: {
        app_title: "Graduation Project Statistical Analysis",
        app_desc: "A professional tool for analyzing academic surveys in one click",
        start_button: "Start New Analysis",
        settings: "Settings",
        api_key_label: "Gemini API Key",
        save_settings: "Save Settings",
        step1_title: "1. Upload File",
        step2_title: "2. Define Variables",
        step3_title: "3. Review & Run",
        upload_prompt: "Drag and drop data file here or click to select",
        supported_files: "Supported formats: xlsx, xls, csv",
        preview_data: "Data Preview",
        data_quality_report: "Data Quality Report",
        next: "Next",
        prev: "Previous",
        available_cols: "Available Columns in File:",
        cols_hint: "Click any column to add it to demographic variables",
        demo_vars_label: "Demographic Variables",
        demo_hint: "e.g., Gender, Age, Education Level",
        no_demo_selected: "No demographic variables selected",
        likert_vars_label: "Core Study Variables",
        add_variable: "Add Variable",
        add_var_hint: "Click \"Add Variable\" to start defining your study variables",
        var_name: "Variable Name",
        var_items: "Associated Items",
        var_type: "Variable Type",
        independent: "Independent (X)",
        dependent: "Dependent (Y)",
        run_analysis: "Run Analysis Now 🚀",
        ready_to_run: "Ready to Analyze!",
        results_dashboard: "Results Dashboard",
        cronbach_alpha: "Reliability Analysis (Cronbach's Alpha)",
        descriptive_stats: "Descriptive Statistics for Core Variables",
        correlation: "Correlation Analysis (Pearson)",
        regression: "Regression Analysis",
        data_fix: "Data Optimizer Tool 🪄",
        copy_word: "Copy to Word",
        gen_ai: "Generate Academic Commentary 🤖",
        copied: "Copied!",
        processing: "Processing...",
        missing_values_method: "Missing Values Handling:",
        mean_imputation: "Mean Imputation",
        drop_rows: "Listwise Deletion",
        variable_name_empty: "Variable name cannot be empty",
        error_no_dependent: "Must define at least one Dependent variable",
        error_no_independent: "Must define at least one Independent variable",
        fix_data_prompt: "If results are poor, you can generate normal data with ideal properties",
        target_sample_size: "Target Sample Size",
        generate_data: "Generate & Download Data",
        cancel: "Cancel",
        feature_privacy: "Full Privacy",
        feature_privacy_desc: "Your data is 100% safe. No data is stored on any server.",
        feature_copy: "Academic Copy",
        feature_copy_desc: "Direct copy of all tables in APA academic format for Word files.",
        feature_ai: "AI Commentary",
        feature_ai_desc: "Gemini AI assistant ready to write scientific commentary under each table.",
        reg_diagnostics: "Regression Diagnostics",
        residuals_vs_fitted: "Residuals vs Fitted Values",
        qq_plot: "Normal Q-Q Plot",
        dep_var_label: "Dependent Variables (Y)",
        indep_var_label: "Independent Variables (X)",
        missing_method_label: "Missing Values Method",
        col_var: "Variable",
        col_items_count: "Items",
        col_alpha: "Cronbach's Alpha",
        col_interpretation: "Interpretation",
        col_n: "N",
        col_mean: "Mean",
        col_std: "Std. Deviation",
        col_median: "Median",
        col_min: "Minimum",
        col_max: "Maximum",
        dev_name: "T.A. Mohamed Asim",
        copyright: "Copyrights reserved to T.A. Mohamed Asim &copy; 2024",
        hero_dev: "By T.A. Mohamed Asim"
    }
};

class I18n {
    constructor() {
        this.lang = localStorage.getItem('appLang') || 'ar';
        document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.lang;
    }

    setLang(lang) {
        if (lang === this.lang) return;
        this.lang = lang;
        localStorage.setItem('appLang', lang);
        document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.lang;
        this.translatePage();
    }

    get(key) {
        return translations[this.lang][key] || key;
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[this.lang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                    el.placeholder = translations[this.lang][key];
                } else {
                    el.innerText = translations[this.lang][key];
                }
            }
        });
        
        // Dispatch event for components that need manual re-rendering
        document.dispatchEvent(new Event('languageChanged'));
    }
}

window.i18n = new I18n();
