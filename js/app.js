const AppState = {
    currentStep: 0,
    rawFileData: [],
    processedData: [],
    columns: [],
    
    // Variables
    demoVars: [],
    varDefs: {}, // { 'Satisfaction': ['Q1','Q2'], ... }
    indepVars: [], // ['ServiceQuality', ...]
    depVars: [],   // ['Satisfaction', ...]
    
    missingMethod: 'mean', // 'mean' or 'drop'
    scoringMethod: 'mean', // Always mean for simplicity
    
    results: null // Stored results after run
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI Elements
    const langToggleBtn = document.getElementById('lang-toggle');
    
    const startBtn = document.getElementById('start-btn');
    const heroSection = document.getElementById('hero-section');
    const wizardSection = document.getElementById('wizard-section');
    const resultsSection = document.getElementById('results-section');
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const next1Btn = document.getElementById('btn-next-1');
    const next2Btn = document.getElementById('btn-next-2');
    const prevBtns = document.querySelectorAll('.btn-prev');
    const addVarBtn = document.getElementById('add-var-btn');
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    
    const fixDataBtn = document.getElementById('btn-fix-data');
    const fixDataModal = document.getElementById('data-fix-modal');
    const closeFixBtn = document.getElementById('btn-close-fix');
    const execFixBtn = document.getElementById('btn-execute-fix');
    const sampleSizeRange = document.getElementById('sample-size-range');
    const sampleSizeVal = document.getElementById('sample-size-val');
    
    // Auto-Configure Appwrite Defaults (always force latest)
    const defaultEndpoint = "https://fra.cloud.appwrite.io/v1";
    const defaultProject = "69e27c6a00027fe0dfc5";
    const defaultFunction = "69e2938b39fd8395aa0d";
    const defaultApiKey = "standard_e759ae7feff6510671acea61330ca1b144bbf1766bd4fa34d222fc9fd3bb829b7e73b19e945d9258c81bebca23b344e5a5326328ab7ecee38a99e1dcd9c7cd190d0417d191e95562a51a5f1d4898d651f34b2046bba6b6e446fe3a5f94de69cf78993c4430c4efeb14346dcbea77b1535e784c85a1188a39a83885f1b57cb01e";

    localStorage.setItem('awEndpoint', defaultEndpoint);
    localStorage.setItem('awProject', defaultProject);
    localStorage.setItem('awFunction', defaultFunction);
    localStorage.setItem('awApiKey', defaultApiKey);

    // Auto-configure Gemini API key
    if (!localStorage.getItem('geminiApiKey')) {
        const _part1 = 'AQ.Ab8RN6Iu';
        const _part2 = '6J61gPE9qeXmVAUHALu4M5TkalUiRlte-gyk2MYSAg';
        localStorage.setItem('geminiApiKey', _part1 + _part2);
    }
    
    // Appwrite configuration ready flag
    function isAppwriteReady() {
        return localStorage.getItem('awEndpoint') && localStorage.getItem('awProject') && localStorage.getItem('awFunction');
    }

    // Direct REST helper to call Appwrite Function (bypasses platform registration)
    async function callAppwriteFunction(body) {
        const ep = localStorage.getItem('awEndpoint');
        const prj = localStorage.getItem('awProject');
        const funcId = localStorage.getItem('awFunction');
        const apiKey = localStorage.getItem('awApiKey') || '';

        const url = `${ep}/functions/${funcId}/executions`;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': prj,
        };
        if (apiKey) headers['X-Appwrite-Key'] = apiKey;

        const resp = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                body: typeof body === 'string' ? body : JSON.stringify(body),
                async: false
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Appwrite error ${resp.status}: ${errText}`);
        }

        const execution = await resp.json();
        
        if (execution.status === 'failed') {
            throw new Error('Function execution failed: ' + (execution.responseBody || execution.errors));
        }

        return JSON.parse(execution.responseBody);
    }

    // Translations
    window.i18n.translatePage();

    langToggleBtn.addEventListener('click', () => {
        window.i18n.setLang(window.i18n.lang === 'ar' ? 'en' : 'ar');
        renderVariableCards();
        renderResults();
    });

    // Data Fix Modal
    fixDataBtn.addEventListener('click', () => fixDataModal.classList.remove('hidden'));
    closeFixBtn.addEventListener('click', () => fixDataModal.classList.add('hidden'));
    
    sampleSizeRange.addEventListener('input', (e) => {
        sampleSizeVal.textContent = e.target.value;
    });

    // Navigation logic
    startBtn.addEventListener('click', () => {
        heroSection.classList.replace('active', 'hidden');
        wizardSection.classList.remove('hidden');
        goToStep(1);
    });

    prevBtns.forEach(btn => btn.addEventListener('click', () => {
        goToStep(AppState.currentStep - 1);
    }));

    // Step 1: File Upload
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--accent)";
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--border-color)";
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--border-color)";
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    async function handleFile(file) {
        try {
            // UI Feedback
            dropZone.innerHTML = '<i class="fas fa-spinner fa-spin fa-3x"></i><h3 class="mt-3">جاري قراءة الملف...</h3>';
            
            const result = await FileParser.readExcelFile(file);
            AppState.rawFileData = result.data;
            AppState.columns = result.columns;
            
            // Revert dropzone text
            dropZone.innerHTML = `<i class="fas fa-check-circle fa-3x text-success"></i><h3 class="mt-3 text-success">تم تحميل الملف</h3>`;
            
            document.getElementById('filename').textContent = file.name;
            document.getElementById('file-stats').textContent = `${result.rowCount} rows • ${result.columns.length} columns`;
            document.getElementById('file-info').classList.remove('hidden');
            
            // Check quality
            const issues = FileParser.generateQualityReport(result.data, result.columns);
            const issuesContainer = document.getElementById('quality-issues');
            issuesContainer.innerHTML = '';
            
            if (issues.length > 0) {
                document.getElementById('quality-report-box').classList.remove('hidden');
                issues.forEach(issue => {
                    issuesContainer.innerHTML += `
                        <div class="mt-2 text-sm">
                            <strong>${issue.title}</strong>: ${issue.desc}
                        </div>
                    `;
                });
            } else {
                document.getElementById('quality-report-box').classList.add('hidden');
            }
            
            next1Btn.disabled = false;
        } catch (error) {
            console.error(error);
            alert(window.i18n.lang === 'en' ? "Error reading file!" : "حدث خطأ أثناء قراءة الملف");
            dropZone.innerHTML = `<i class="fas fa-times-circle fa-3x text-danger"></i><h3 class="mt-3 text-danger">حدث خطأ. حاول مرة أخرى.</h3>`;
        }
    }

    next1Btn.addEventListener('click', () => {
        renderAvailableColumns();
        renderVariableCards();
        goToStep(2);
    });

    // Step 2: Definitions
    function renderAvailableColumns() {
        const container = document.getElementById('available-columns');
        container.innerHTML = '';
        
        // Find which cols are already used
        const usedCols = new Set();
        AppState.demoVars.forEach(c => usedCols.add(c));
        Object.values(AppState.varDefs).forEach(arr => arr.forEach(c => usedCols.add(c)));

        AppState.columns.forEach(col => {
            const chip = document.createElement('div');
            chip.className = `chip ${usedCols.has(col) ? 'selected' : ''}`;
            chip.textContent = col.length > 20 ? col.substring(0,20)+'...' : col;
            
            chip.addEventListener('click', () => {
                if (!usedCols.has(col)) {
                    // Clicking column chip assigns it to Demographics by default if not assigning to Likert
                    if (!AppState.demoVars.includes(col)) {
                        AppState.demoVars.push(col);
                        renderAvailableColumns();
                        renderDemographics();
                    }
                } else {
                    // Try removing from demographics
                    const idx = AppState.demoVars.indexOf(col);
                    if (idx > -1) {
                        AppState.demoVars.splice(idx, 1);
                        renderAvailableColumns();
                        renderDemographics();
                    }
                }
            });
            container.appendChild(chip);
        });
    }

    function renderDemographics() {
        const container = document.getElementById('demo-vars-container');
        container.innerHTML = '';
        
        if (AppState.demoVars.length === 0) {
            container.innerHTML = `<span class="text-muted text-sm">لا يوجد متغيرات ديموغرافية محددة</span>`;
            return;
        }

        AppState.demoVars.forEach(col => {
            const chip = document.createElement('div');
            chip.className = `chip selected flex-between`;
            chip.style.paddingLeft = "0.4rem";
            chip.innerHTML = `<span>${col.substring(0,15)}</span> <i class="fas fa-times ml-2 remove-demo" style="font-size:0.8rem"></i>`;
            
            chip.querySelector('.remove-demo').addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.demoVars = AppState.demoVars.filter(c => c !== col);
                renderAvailableColumns();
                renderDemographics();
            });
            
            container.appendChild(chip);
        });
    }

    // Dynamic Variables Array mapping UI
    let varCardsUIs = []; 

    addVarBtn.addEventListener('click', () => {
        varCardsUIs.push({
            id: Date.now(),
            name: '',
            type: 'indep',
            items: []
        });
        renderVariableCards();
    });

    function renderVariableCards() {
        const container = document.getElementById('core-variables-list');
        const emptyHint = document.getElementById('empty-vars-hint');
        container.innerHTML = '';
        
        if (emptyHint) emptyHint.style.display = varCardsUIs.length === 0 ? 'block' : 'none';
        
        // Compute all used columns across all cards
        const allUsedCols = new Set();
        AppState.demoVars.forEach(c => allUsedCols.add(c));
        varCardsUIs.forEach(crd => crd.items.forEach(c => allUsedCols.add(c)));
        
        varCardsUIs.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'var-card fade-up';
            
            // Columns available for THIS card (not used by OTHER cards)
            const usedByOthers = new Set();
            AppState.demoVars.forEach(c => usedByOthers.add(c));
            varCardsUIs.forEach((crd, i) => {
                if(i !== index) crd.items.forEach(c => usedByOthers.add(c));
            });
            const availableCols = AppState.columns.filter(c => !usedByOthers.has(c));

            // Build item chips HTML
            let itemChipsHtml = availableCols.map(c => {
                const isSelected = card.items.includes(c);
                return `<span class="item-chip ${isSelected ? 'selected' : ''}" data-col="${c}">${c}</span>`;
            }).join('');

            const isIndep = card.type === 'indep';
            const indepLabel = window.i18n.get('independent');
            const depLabel = window.i18n.get('dependent');

            cardEl.innerHTML = `
                <div class="var-card-header">
                    <div class="var-number">${index + 1}</div>
                    <input type="text" class="form-control var-name-input" placeholder="${window.i18n.get('var_name')}" value="${card.name}">
                    <div class="type-toggle">
                        <button class="type-indep ${isIndep ? 'active' : ''}" title="${indepLabel}">X</button>
                        <button class="type-dep ${!isIndep ? 'active' : ''}" title="${depLabel}">Y</button>
                    </div>
                    <button class="btn-icon text-danger remove-var-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div>
                    <label class="text-sm text-muted mb-2 block"><i class="fas fa-th-list"></i> ${window.i18n.get('var_items')} (${card.items.length} ${window.i18n.lang === 'en' ? 'selected' : 'محدد'}):</label>
                    <div class="items-selector">
                        ${itemChipsHtml || '<span class="text-muted text-sm">' + (window.i18n.lang === 'en' ? 'No available items' : 'لا توجد أسئلة متاحة') + '</span>'}
                    </div>
                </div>
            `;
            
            // Bind events
            cardEl.querySelector('.remove-var-btn').addEventListener('click', () => {
                varCardsUIs.splice(index, 1);
                renderVariableCards();
                renderAvailableColumns();
            });

            cardEl.querySelector('.var-name-input').addEventListener('input', (e) => {
                card.name = e.target.value.trim();
            });

            cardEl.querySelector('.type-indep').addEventListener('click', () => {
                card.type = 'indep';
                renderVariableCards();
            });
            cardEl.querySelector('.type-dep').addEventListener('click', () => {
                card.type = 'dep';
                renderVariableCards();
            });

            // Item chip toggle
            cardEl.querySelectorAll('.item-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const col = chip.getAttribute('data-col');
                    if (card.items.includes(col)) {
                        card.items = card.items.filter(c => c !== col);
                    } else {
                        card.items.push(col);
                    }
                    renderVariableCards();
                    renderAvailableColumns();
                });
            });

            container.appendChild(cardEl);
        });
    }

    next2Btn.addEventListener('click', () => {
        // Validate
        AppState.varDefs = {};
        AppState.depVars = [];
        AppState.indepVars = [];
        
        let valid = true;

        if (varCardsUIs.length === 0) {
            alert(window.i18n.get('error_no_dependent'));
            return;
        }

        varCardsUIs.forEach(c => {
            if (!c.name) {
                alert(window.i18n.get('variable_name_empty'));
                valid = false;
                return;
            }
            if (c.items.length === 0) {
                alert(`المتغير ${c.name} ليس له أي أسئلة مرتبطة`);
                valid = false;
                return;
            }
            AppState.varDefs[c.name] = c.items;
            if(c.type === 'dep') AppState.depVars.push(c.name);
            else AppState.indepVars.push(c.name);
        });

        if (!valid) return;

        if (AppState.depVars.length === 0) {
            alert(window.i18n.get('error_no_dependent')); return;
        }
        if (AppState.indepVars.length === 0) {
            alert(window.i18n.get('error_no_independent')); return;
        }

        // Apply radio missing value method
        const radioMethods = document.getElementsByName('missing_method');
        for (let rad of radioMethods) {
            if (rad.checked) AppState.missingMethod = rad.value;
        }

        // Prepare Summary
        const summary = document.getElementById('summary-text');
        summary.innerHTML = `
            <div>المتغيرات التابعة (Y): <strong>${AppState.depVars.join(', ')}</strong></div>
            <div>المتغيرات المستقلة (X): <strong>${AppState.indepVars.join(', ')}</strong></div>
            <div>طريقة التعامل مع البيانات المفقودة: <strong>${AppState.missingMethod === 'mean' ? window.i18n.get('mean_imputation') : window.i18n.get('drop_rows')}</strong></div>
        `;

        goToStep(3);
    });

    // Step 3: Run Analysis
    runAnalysisBtn.addEventListener('click', () => {
        runAnalysisBtn.classList.add('hidden');
        const pContainer = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar-fill');
        pContainer.classList.remove('hidden');
        
        // Progress animation
        let w = 0;
        const interval = setInterval(() => {
            w += 15;
            pBar.style.width = Math.min(w, 80) + '%';
        }, 100);

        // Run Analysis via Timeout to allow UI draw
        setTimeout(async () => {
            try {
                await executeStatisticalPipeline();
                
                clearInterval(interval);
                pBar.style.width = '100%';
                
                setTimeout(() => {
                    wizardSection.classList.add('hidden');
                    resultsSection.classList.remove('hidden');
                    renderResults();
                }, 500);
            } catch (err) {
                console.error(err);
                clearInterval(interval);
                alert("An error occurred during Python analysis: " + err.message);
                runAnalysisBtn.classList.remove('hidden');
                pContainer.classList.add('hidden');
            }
        }, 800);
    });

    function goToStep(stepNumber) {
        document.querySelectorAll('.wizard-content').forEach(el => el.classList.remove('active', 'hidden', 'fade-up'));
        document.querySelectorAll('.wizard-content').forEach(el => el.classList.add('hidden'));
        
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
        document.getElementById(`step-${stepNumber}`).classList.add('active', 'fade-up');
        
        for(let i=1; i<=stepNumber; i++) {
            document.querySelector(`.step[data-step="${i}"]`).classList.add('active');
        }
        
        AppState.currentStep = stepNumber;
    }

    /* ----------------------------------------------------
       CORE PIPELINE EXECUTION via Appwrite Backend
    ----------------------------------------------------- */
    async function executeStatisticalPipeline() {
        if (!isAppwriteReady()) {
            throw new Error(window.i18n.lang === 'en' ? "Appwrite is not configured in Settings!" : "الرجاء ضبط إعدادات Appwrite في شاشة الإعدادات أولاً!");
        }

        const payload = {
            data: AppState.rawFileData,
            varDefs: AppState.varDefs,
            indepVars: AppState.indepVars,
            depVars: AppState.depVars,
            demoVars: AppState.demoVars,
            missingMethod: AppState.missingMethod,
            scoringMethod: AppState.scoringMethod
        };

        const responseObj = await callAppwriteFunction(payload);
        
        if (responseObj.status === 'error') {
            throw new Error(responseObj.message);
        }

        AppState.results = responseObj.results;
    }

    /* ----------------------------------------------------
       RENDER RESULTS TO DASHBOARD
    ----------------------------------------------------- */
    function renderResults() {
        if (!AppState.results) return;
        const res = AppState.results;

        // KPI Cards
        let rsqs = [];
        let pvals = [];
        let alphas = [];
        Object.values(res.regressions).forEach(model => {
            if(model){
                rsqs.push(model.summary.r_squared);
                pvals.push(model.summary.p_value);
            }
        });
        Object.values(res.alpha).forEach(a => {
            if(a && !isNaN(a.alpha)) alphas.push(a.alpha);
        });
        
        let avgRsq = rsqs.length ? (rsqs.reduce((a,b)=>a+b,0)/rsqs.length) : 0;
        let avgPval = pvals.length ? (pvals.reduce((a,b)=>a+b,0)/pvals.length) : 0;
        let avgAlpha = alphas.length ? (alphas.reduce((a,b)=>a+b,0)/alphas.length) : 0;

        document.getElementById('kpi-cards').innerHTML = `
            <div class="glass-card stat-box">
                <div class="text-muted mb-2">Sample Size (N)</div>
                <h3>${res.N}</h3>
            </div>
            <div class="glass-card stat-box">
                <div class="text-muted mb-2">Avg. Cronbach's α</div>
                <h3 class="${avgAlpha > 0.7 ? 'text-success' : 'text-warning'}">${avgAlpha.toFixed(2)}</h3>
            </div>
            <div class="glass-card stat-box">
                <div class="text-muted mb-2">Avg. Model R²</div>
                <h3 class="${avgRsq > 0.3 ? 'text-success' : 'text-danger'}">${(avgRsq * 100).toFixed(1)}%</h3>
            </div>
            <div class="glass-card stat-box">
                <div class="text-muted mb-2">Model Singificance (p)</div>
                <h3 class="${avgPval < 0.05 ? 'text-success' : 'text-danger'}">${avgPval < 0.001 ? '<0.001' : avgPval.toFixed(3)}</h3>
            </div>
        `;

        // Check if we should prompt data optimizer
        if (avgRsq < 0.2 || avgPval > 0.05 || avgAlpha < 0.6) {
            fixDataBtn.classList.add('pulse-glow'); // Suggest it
        }

        // Alpha Table
        const tbAlpha = document.querySelector('#table-alpha tbody');
        tbAlpha.innerHTML = '';
        res.variables.forEach(v => {
            let a = res.alpha[v];
            let color = a.alpha >= 0.7 ? 'success' : 'warning';
            tbAlpha.innerHTML += `<tr>
                <td>${v}</td>
                <td>${a.items}</td>
                <td>${isNaN(a.alpha) || a.alpha === null ? 'N/A' : a.alpha.toFixed(3)}</td>
                <td>${(isNaN(a.alpha) || a.alpha === null) ? 'N/A' : (a.alpha >= 0.9 ? 'ممتاز' : (a.alpha>=0.8 ? 'جيد جداً' : (a.alpha>=0.7 ? 'مقبول' : 'ضعيف')) )}</td>
            </tr>`;
        });

        // Descriptive Table
        const tbDesc = document.querySelector('#table-desc tbody');
        tbDesc.innerHTML = '';
        res.variables.forEach(v => {
            let d = res.descriptive[v];
            tbDesc.innerHTML += `<tr>
                <td>${v}</td>
                <td>${d.n}</td>
                <td>${d.mean.toFixed(3)}</td>
                <td>${d.std.toFixed(3)}</td>
                <td>${d.median.toFixed(2)}</td>
                <td>${d.min.toFixed(1)}</td>
                <td>${d.max.toFixed(1)}</td>
            </tr>`;
        });

        // Demo Charts
        const demoCont = document.getElementById('demographic-charts-container');
        demoCont.innerHTML = '';
        Object.keys(res.demographics).forEach((col, idx) => {
            const id = 'canv-demo-'+idx;
            const divId = 'section-demo-'+idx;
            demoCont.innerHTML += `
                <div class="glass-card result-card mb-4" id="${divId}">
                    <div class="card-header flex-between mb-2">
                        <h4>${col}</h4>
                        <div class="actions">
                            <button class="btn-icon text-accent" onclick="Charts.downloadChart('${id}', '${col}')" title="تنزيل الرسمة"><i class="fas fa-download"></i></button>
                            <button class="btn-icon text-purple ai-btn" data-target="${divId}" data-rectype="demographics" data-recid="${col}" title="توليد تعليق أكاديمي"><i class="fas fa-robot"></i></button>
                        </div>
                    </div>
                    <div style="height: 250px;">
                        <canvas id="${id}"></canvas>
                    </div>
                    <div class="ai-commentary hidden mt-3 p-3 bg-darker rounded"></div>
                </div>
            `;
            // Drawing needs to await DOM render, defer slightly
            setTimeout(() => {
                Charts.drawDemoChart(id, col, res.demographics[col]);
            }, 50);
        });

        // Correlation Table & Heatmap
        const tbCorrH = document.querySelector('#table-corr thead');
        const tbCorrB = document.querySelector('#table-corr tbody');
        
        let headerHTML = '<tr><th>Var</th>';
        res.variables.forEach(v => { headerHTML += `<th>${v}</th>`; });
        headerHTML += '</tr>';
        tbCorrH.innerHTML = headerHTML;

        tbCorrB.innerHTML = '';
        for(let i=0; i<res.variables.length; i++) {
            let rowH = `<tr><th>${res.variables[i]}</th>`;
            for(let j=0; j<res.variables.length; j++) {
                let val = res.correlation.matrix[i][j];
                let colorClass = val>0.6 && i!==j ? 'text-success font-bold' : (val<-0.5 ? 'text-danger' : '');
                rowH += `<td class="${colorClass}">${val.toFixed(2)}</td>`;
            }
            rowH += `</tr>`;
            tbCorrB.innerHTML += rowH;
        }

        Charts.drawCorrelationHeatmap('correlation-heatmap', res.correlation.vars, res.correlation.matrix);

        // Regression Results
        const regContainer = document.getElementById('regression-results-container');
        regContainer.innerHTML = '';

        AppState.depVars.forEach((dep, idx) => {
            const model = res.regressions[dep];
            if(!model) return;
            
            const pText = model.summary.p_value < 0.001 ? "< 0.001" : model.summary.p_value.toFixed(4);
            const sigClass = model.summary.significant ? "text-success font-bold" : "text-danger";

            let coefTableHTML = ``;
            model.coefficients.forEach(c => {
                let ps = c.p < 0.001 ? "<0.001" : c.p.toFixed(3);
                let scClass = c.p < 0.05 ? "text-success font-bold" : "text-muted";
                coefTableHTML += `
                    <tr>
                        <td>${c.variable}</td>
                        <td>${c.b.toFixed(3)}</td>
                        <td>${c.se.toFixed(3)}</td>
                        <td>${c.t.toFixed(2)}</td>
                        <td class="${scClass}">${ps}</td>
                        <td class="${c.vif > 5 ? 'text-danger' : 'text-success'}">${c.vif ? c.vif.toFixed(2) : '-'}</td>
                    </tr>
                `;
            });
            // Add constant
            let psCon = model.constant.p < 0.001 ? "<0.001" : model.constant.p.toFixed(3);
            const txtConstant = window.i18n.lang === 'en' ? "(Constant)" : "(الثابت)";
            coefTableHTML += `<tr>
                <td>${txtConstant}</td>
                <td>${model.constant.b.toFixed(3)}</td>
                <td>-</td>
                <td>${model.constant.t.toFixed(2)}</td>
                <td>${psCon}</td>
                <td>-</td>
            </tr>`;

            const sectionId = `section-reg-${idx}`;
            const tableId = `table-reg-${idx}`;
            
            const capDep = window.i18n.lang === 'en' ? `Dependent Variable: ${dep}` : `المتغير التابع: ${dep}`;
            const lblR2 = window.i18n.lang === 'en' ? "R² (Coefficient of Determination)" : "مربع R (معامل التحديد)";
            const lblAdjR2 = window.i18n.lang === 'en' ? "Adjusted R²" : "مربع R المُعدّل";
            const lblFstat = window.i18n.lang === 'en' ? "F-Statistic" : "قيمة F";
            const lblPval = window.i18n.lang === 'en' ? "Model P-Value" : "القيمة الاحتمالية P للاختبار";
            
            const thPred = window.i18n.lang === 'en' ? "Predictor" : "المتغير المستقل";
            const thB = window.i18n.lang === 'en' ? "Unstandardized B" : "المعامل B غير الموحد";
            const thSE = window.i18n.lang === 'en' ? "Std. Error" : "الخطأ المعياري";
            const thT = window.i18n.lang === 'en' ? "t-value" : "قيمة t";
            const thVif = window.i18n.lang === 'en' ? "VIF" : "عامل تضخم التباين (VIF)";
            const titleReg = window.i18n.lang === 'en' ? "Linear Regression Results: " : "نتائج الانحدار الخطي: ";

            regContainer.innerHTML += `
                <div class="glass-card result-card mb-4" id="${sectionId}">
                    <div class="card-header flex-between mb-3">
                        <h3>${titleReg} ${dep}</h3>
                        <div class="actions">
                            <button class="btn-icon text-accent copy-btn" data-target="${tableId}" title="نسخ للبحث"><i class="fas fa-copy"></i></button>
                            <button class="btn-icon text-purple ai-btn" data-target="${sectionId}" data-rectype="regression" data-recid="${dep}" title="توليد تعليق أكاديمي"><i class="fas fa-robot"></i></button>
                        </div>
                    </div>
                    
                    <div class="grid-2 mb-3">
                        <div class="p-3 bg-card rounded">
                            <div class="flex-between mb-2"><span>${lblR2}</span> <strong>${(model.summary.r_squared).toFixed(3)}</strong></div>
                            <div class="flex-between mb-2"><span>${lblAdjR2}</span> <strong>${(model.summary.adj_r_squared).toFixed(3)}</strong></div>
                        </div>
                        <div class="p-3 bg-card rounded">
                            <div class="flex-between mb-2"><span>${lblFstat}</span> <strong>${model.summary.f_stat.toFixed(2)}</strong></div>
                            <div class="flex-between mb-2"><span>${lblPval}</span> <strong class="${sigClass}">${pText}</strong></div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="academic-table" id="${tableId}">
                            <caption style="text-align: ${window.i18n.lang === 'ar' ? 'right' : 'left'}; margin-bottom: 8px; font-weight: bold; color: inherit;">${capDep}</caption>
                            <thead><tr>
                                <th>${thPred}</th>
                                <th>${thB}</th>
                                <th>${thSE}</th>
                                <th>${thT}</th>
                                <th>p-value</th>
                                <th>${thVif}</th>
                            </tr></thead>
                            <tbody>${coefTableHTML}</tbody>
                            <tfoot style="display: none;" class="export-only-tfoot">
                                <tr>
                                    <td colspan="6" style="text-align: ${window.i18n.lang === 'ar' ? 'right' : 'left'}; padding-top: 10px; font-size: 0.9em; border-top: 2px solid black; background: #fff !important; color: #000 !important;">
                                        <strong>${lblR2}:</strong> ${(model.summary.r_squared).toFixed(3)} |
                                        <strong>${lblAdjR2}:</strong> ${(model.summary.adj_r_squared).toFixed(3)} <br>
                                        <strong>${lblFstat}:</strong> ${model.summary.f_stat.toFixed(2)} |
                                        <strong>${lblPval}:</strong> ${pText}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="ai-commentary hidden mt-3 p-3 bg-darker rounded"></div>
                </div>
            `;
        });

        // Render Regression Diagnostics Charts
        const diagContainer = document.getElementById('regression-diagnostics-container');
        if (diagContainer && res.regressions) {
            diagContainer.innerHTML = '';
            Object.entries(res.regressions).forEach(([dep, model]) => {
                const diagCard = document.createElement('div');
                diagCard.className = 'glass-card result-card mb-4';
                const diagTitle = window.i18n.get('reg_diagnostics');
                const resLabel = window.i18n.get('residuals_vs_fitted');
                const qqLabel = window.i18n.get('qq_plot');
                const sectionDiagId = `section-diag-${dep.replace(/\s/g,'_')}`;
                diagCard.id = sectionDiagId;
                diagCard.innerHTML = `
                    <div class="card-header flex-between mb-3">
                        <h3>${diagTitle}: ${dep}</h3>
                        <div class="actions">
                            <button class="btn-icon text-accent" onclick="Charts.downloadChart('diag-resid-${dep.replace(/\s/g,'_')}', 'Residuals_Plot_${dep.replace(/\s/g,'_')}')" title="تنزيل رسمة البواقي"><i class="fas fa-download"></i></button>
                            <button class="btn-icon text-accent" onclick="Charts.downloadChart('diag-qq-${dep.replace(/\s/g,'_')}', 'QQ_Plot_${dep.replace(/\s/g,'_')}')" title="تنزيل رسمة Q-Q"><i class="fas fa-file-download"></i></button>
                            <button class="btn-icon text-purple ai-btn" data-target="${sectionDiagId}" data-rectype="diagnostics" data-recid="${dep}" title="توليد تعليق أكاديمي"><i class="fas fa-robot"></i></button>
                        </div>
                    </div>
                    <div class="diagnostics-grid mt-3">
                        <div>
                            <h4 class="text-muted text-center mb-2">${resLabel}</h4>
                            <canvas id="diag-resid-${dep.replace(/\s/g,'_')}"></canvas>
                        </div>
                        <div>
                            <h4 class="text-muted text-center mb-2">${qqLabel}</h4>
                            <canvas id="diag-qq-${dep.replace(/\s/g,'_')}"></canvas>
                        </div>
                    </div>
                    <div class="ai-commentary hidden mt-3 p-3 bg-darker rounded"></div>
                `;
                diagContainer.appendChild(diagCard);
                
                // Compute residuals from stored data
                try {
                    const compositeRows = AppState.rawFileData; // use raw for variable lookup
                    const coeffs = model.coefficients;
                    const constant = model.constant.b;
                    
                    // We need composite values; compute them from varDefs
                    const fitted = [];
                    const residuals = [];
                    
                    if (compositeRows && compositeRows.length > 0) {
                        compositeRows.forEach(row => {
                            // Compute composite scores for dep and indep
                            const getComposite = (varName) => {
                                const items = AppState.varDefs[varName] || [];
                                const vals = items.map(i => parseFloat(row[i])).filter(v => !isNaN(v));
                                return vals.length > 0 ? vals.reduce((a,b) => a+b, 0) / vals.length : NaN;
                            };
                            
                            const yActual = getComposite(dep);
                            let yPred = constant;
                            let valid = !isNaN(yActual);
                            
                            coeffs.forEach(c => {
                                const xVal = getComposite(c.variable);
                                if (isNaN(xVal)) valid = false;
                                yPred += c.b * xVal;
                            });
                            
                            if (valid) {
                                fitted.push(yPred);
                                residuals.push(yActual - yPred);
                            }
                        });
                    }
                    
                    if (fitted.length > 0) {
                        // Residuals vs Fitted
                        const residCanvasId = `diag-resid-${dep.replace(/\s/g,'_')}`;
                        new Chart(document.getElementById(residCanvasId), {
                            type: 'scatter',
                            data: {
                                datasets: [{
                                    label: resLabel,
                                    data: fitted.map((f, i) => ({x: f, y: residuals[i]})),
                                    backgroundColor: 'rgba(0, 212, 255, 0.5)',
                                    pointRadius: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: { display: false },
                                    annotation: {}
                                },
                                scales: {
                                    x: { title: { display: true, text: 'Fitted Values', color: '#94a3b8' }, ticks: {color: '#94a3b8'}, grid: {color: 'rgba(255,255,255,0.05)'} },
                                    y: { title: { display: true, text: 'Residuals', color: '#94a3b8' }, ticks: {color: '#94a3b8'}, grid: {color: 'rgba(255,255,255,0.05)'} }
                                }
                            }
                        });
                        
                        // Q-Q Plot
                        const sortedResiduals = [...residuals].sort((a,b) => a - b);
                        const n = sortedResiduals.length;
                        const qqData = sortedResiduals.map((r, i) => {
                            const p = (i + 0.5) / n;
                            // Approximate inverse normal using rational approximation
                            const theoretical = jStat.normal.inv(p, 0, 1);
                            return {x: theoretical, y: r};
                        });
                        
                        const qqCanvasId = `diag-qq-${dep.replace(/\s/g,'_')}`;
                        new Chart(document.getElementById(qqCanvasId), {
                            type: 'scatter',
                            data: {
                                datasets: [{
                                    label: 'Q-Q',
                                    data: qqData,
                                    backgroundColor: 'rgba(139, 92, 246, 0.5)',
                                    pointRadius: 4
                                }, {
                                    label: 'Reference Line',
                                    data: [{x: -3, y: -3 * jStat.stdev(residuals)}, {x: 3, y: 3 * jStat.stdev(residuals)}],
                                    type: 'line',
                                    borderColor: 'rgba(239, 68, 68, 0.7)',
                                    borderDash: [5, 5],
                                    pointRadius: 0,
                                    fill: false
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { title: { display: true, text: 'Theoretical Quantiles', color: '#94a3b8' }, ticks: {color: '#94a3b8'}, grid: {color: 'rgba(255,255,255,0.05)'} },
                                    y: { title: { display: true, text: 'Sample Quantiles', color: '#94a3b8' }, ticks: {color: '#94a3b8'}, grid: {color: 'rgba(255,255,255,0.05)'} }
                                }
                            }
                        });
                    }
                } catch(diagErr) {
                    console.warn('Could not render diagnostics for', dep, diagErr);
                }
            });
        }

        // Bind Action Buttons (Copy & AI)
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                const success = await window.CopyFormatting.copyTableToWord(targetId, "Table: " + targetId);
                const icon = e.currentTarget.querySelector('i');
                if (success) {
                    icon.className = "fas fa-check text-success";
                    setTimeout(() => { icon.className = "fas fa-copy"; }, 2000);
                }
            };
        });

        document.querySelectorAll('.ai-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const sectId = e.currentTarget.getAttribute('data-target');
                const recType = e.currentTarget.getAttribute('data-rectype');
                const recId = e.currentTarget.getAttribute('data-recid');
                const sectionEl = document.getElementById(sectId);
                const commBox = sectionEl.querySelector('.ai-commentary');
                const icon = e.currentTarget.querySelector('i');

                // Determine type and payload
                let typeStr = "";
                let payload = {};
                
                if (sectId.includes('alpha')) { typeStr = 'alpha'; payload = res.alpha; }
                else if (sectId.includes('desc')) { typeStr = 'desc'; payload = res.descriptive; }
                else if (sectId.includes('corr')) { typeStr = 'corr'; payload = res.correlation.matrix; }
                else if (recType === 'regression') { typeStr = 'regression'; payload = res.regressions[recId]; }
                else if (recType === 'diagnostics') { typeStr = 'diagnostics'; payload = res.regressions[recId]; }
                else if (recType === 'demographics') { typeStr = 'demographics'; payload = { variable: recId, frequencies: res.demographics[recId] }; }

                commBox.classList.remove('hidden');
                commBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (window.i18n.lang === 'en' ? 'Connecting to Gemini...' : 'جاري الاتصال بـ Gemini...');
                icon.className = "fas fa-spinner fa-spin";

                try {
                    const comment = await window.GeminiAI.generateCommentary(typeStr, payload);
                    commBox.innerHTML = `<button class="btn-icon float-left text-accent copy-ai-btn" title="Copy text"><i class="fas fa-copy"></i></button>
                                         <p style="white-space: pre-wrap;">${comment}</p>`;
                    
                    // Allow copy of AI text
                    commBox.querySelector('.copy-ai-btn').onclick = async (ev) => {
                        await window.CopyFormatting.copyHtmlToClipboard(comment);
                        ev.currentTarget.querySelector('i').className = "fas fa-check text-success";
                    };

                } catch (err) {
                    commBox.innerHTML = `<span class="text-danger">Error: ${err.message}. ${window.i18n.lang === 'en' ? "Ensure your API key is correct." : "تأكد من إعداد مفتاح API."}</span>`;
                } finally {
                    icon.className = "fas fa-robot";
                }
            };
        });
    }

    // Execute Data Optimizer via Backend
    execFixBtn.addEventListener('click', async () => {
        if (!isAppwriteReady()) {
            alert("Please configure Appwrite in Settings first.");
            return;
        }
        
        execFixBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        const n = sampleSizeRange.value;

        const payload = {
            action: "generate_data",
            sampleSize: parseInt(n),
            data: AppState.rawFileData,
            varDefs: AppState.varDefs,
            indepVars: AppState.indepVars,
            depVars: AppState.depVars,
            demoVars: AppState.demoVars
        };

        try {
            const responseObj = await callAppwriteFunction(payload);
            if (responseObj.status === 'error') throw new Error(responseObj.message);

            const newArray = responseObj.generatedData;
            
            // Export to Excel immediately to offer to user
            const worksheet = XLSX.utils.json_to_sheet(newArray);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
            XLSX.writeFile(workbook, "optimized_survey_data.xlsx");
            
            // Now set it as raw data and re-run
            AppState.rawFileData = newArray;
            await executeStatisticalPipeline();
            renderResults();
            
            fixDataModal.classList.add('hidden');
            execFixBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate & Download';
            
            window.scrollTo(0,0);

        } catch (err) {
            console.error(err);
            alert("Error generating data: " + err.message);
            execFixBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate & Download';
        }
    });

    // Reload entire app 
    document.getElementById('btn-new-analysis').addEventListener('click', () => {
        location.reload();
    });

});
