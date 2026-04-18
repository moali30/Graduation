class GeminiAI {
    
    static async generateCommentary(type, dataJson) {
        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) {
            throw new Error(window.i18n.lang === 'en' ? "Please set your Gemini API Key in the settings first." : "الرجاء إدخال مفتاح Gemini API في الإعدادات أولاً.");
        }

        const isEnglish = window.i18n.lang === 'en';
        const langInst = isEnglish ? "in English" : "باللغة العربية";
        const noLatexRule = isEnglish 
            ? "IMPORTANT: Do NOT use LaTeX, dollar signs $$, or any math notation. Write all symbols as plain text (e.g., write R² not $R^2$, write α not $\\alpha$). Round ALL numbers to exactly 3 decimal places. The text must be ready to copy-paste directly into a Word document."
            : "مهم جداً: لا تستخدم أي رموز LaTeX أو علامات $$ أو أي ترميز رياضي. اكتب جميع الرموز كنص عادي (مثلاً: اكتب R² وليس $R^2$، اكتب α وليس $\\alpha$). قرّب جميع الأرقام إلى 3 خانات عشرية فقط. النص يجب أن يكون جاهزاً للنسخ واللصق في ملف Word مباشرة.";
        
        let prompt = "";
        
        if (type === 'alpha') {
            prompt = isEnglish
                ? `Write an academic commentary in English on the following Cronbach's Alpha reliability analysis results for a graduation research project.
Use formal academic writing style used in scientific research papers.
Avoid tables and use one coherent paragraph.
${noLatexRule}
Data:
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية على نتائج تحليل الثبات (ألفا كرونباخ) التالية لبحث تخرج.
استخدم أسلوب الكتابة الأكاديمية المعتمد في الأبحاث العلمية.
تجنب الجداول واستخدم فقرة نصية واحدة متماسكة.
${noLatexRule}
البيانات الرقمية:
${JSON.stringify(dataJson)}`;
        } 
        else if (type === 'desc') {
            prompt = isEnglish
                ? `Write an academic commentary in English on the following descriptive statistics for a graduation research project showing means and standard deviations of core study variables on a 5-point Likert scale.
Use formal descriptive academic style in one paragraph.
${noLatexRule}
Data:
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية على الإحصاءات الوصفية التالية لبحث تخرج يبين المتوسطات والانحرافات المعيارية لمتغيرات الدراسة الأساسية، علماً بأن المقياس خماسي (ليكرت 1-5).
استخدم أسلوب وصفي أكاديمي في فقرة واحدة.
${noLatexRule}
البيانات:
${JSON.stringify(dataJson)}`;
        }
        else if (type === 'corr') {
            prompt = isEnglish
                ? `Write an academic commentary in English on the following Pearson Correlation matrix between study variables.
Focus on the strongest positive correlations in one coherent paragraph.
${noLatexRule}
Data:
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية على مصفوفة الارتباط التالية (Pearson Correlation) بين متغيرات الدراسة.
قم بالتركيز على أقوى الارتباطات الإيجابية في فقرة واحدة متماسكة.
${noLatexRule}
البيانات:
${JSON.stringify(dataJson)}`;
        }
        else if (type === 'regression') {
            prompt = isEnglish
                ? `Write an academic commentary in English on the following multiple linear regression results for a graduation research project.
Mention the R² value and its interpretation, p-value, and which independent variables are significant and which are not, based on t and p values.
Write it in one scientific paragraph ready to be inserted in the research as a discussion of results.
${noLatexRule}
Data (Model + Coefficients):
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية على نتائج تحليل الانحدار الخطي المتعدد التالية لبحث تخرج.
اذكر قيمة R² وتفسيرها، ثم قيمة p-value، والمعاملات المستقلة المؤثرة وغير المؤثرة بناء على قيم t و p.
اكتبها في فقرة واحدة علمية جاهزة للإدراج في البحث كمناقشة للنتائج.
${noLatexRule}
البيانات (Model + Coefficients):
${JSON.stringify(dataJson)}`;
        }
        else if (type === 'diagnostics') {
            prompt = isEnglish
                ? `Write a brief academic commentary in English on the regression diagnostics (Residuals vs Fitted and Q-Q plot).
State that based on the R-squared and p-value summary, the assumptions of linearity and normality are generally acceptable for this model.
${noLatexRule}
Data Summary:
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً موجزاً باللغة العربية عن تشخيصات الانحدار (الافتراضات الخاصة بالبواقي مقابل القيم المتوقعة، والرسم البياني Q-Q) لهذا النموذج.
اذكر أنه بناءً على دلالة النموذج وقيمة مربع R، فإن افتراضات الخطية والتوزيع الطبيعي تعتبر مقبولة عموماً لهذا النموذج.
${noLatexRule}
ملخص البيانات:
${JSON.stringify(dataJson)}`;
        }
        else if (type === 'demographics') {
            prompt = isEnglish
                ? `Write a brief academic commentary in English describing the frequencies of the following demographic variable for the participants of this study.
${noLatexRule}
Data:
${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية يصف التكرارات الخاصة بالمتغير الديموغرافي التالي للمشاركين في هذه الدراسة.
${noLatexRule}
البيانات:
${JSON.stringify(dataJson)}`;
        }
        else {
            prompt = isEnglish
                ? `Write an academic commentary in English explaining this data:\n${noLatexRule}\n${JSON.stringify(dataJson)}`
                : `اكتب تعليقاً أكاديمياً باللغة العربية يشرح هذه البيانات:\n${noLatexRule}\n${JSON.stringify(dataJson)}`;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "API Request Failed");
            }

            const result = await response.json();
            let textResponse = result.candidates[0].content.parts[0].text;
            
            // Post-process: Remove any remaining $$ or $ LaTeX markers
            textResponse = textResponse.replace(/\$\$/g, '').replace(/\$/g, '');
            // Remove backslash commands like \times, \alpha etc
            textResponse = textResponse.replace(/\\times/g, '×');
            textResponse = textResponse.replace(/\\alpha/g, 'α');
            textResponse = textResponse.replace(/\\beta/g, 'β');
            textResponse = textResponse.replace(/\\leq/g, '≤');
            textResponse = textResponse.replace(/\\geq/g, '≥');
            textResponse = textResponse.replace(/\\lt/g, '<');
            textResponse = textResponse.replace(/\\gt/g, '>');
            textResponse = textResponse.replace(/\\\\/g, '');
            
            return textResponse;
            
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

window.GeminiAI = GeminiAI;
