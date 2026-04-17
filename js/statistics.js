class Statistics {
    
    // 1. Cronbach's Alpha
    static calculateCronbachAlpha(data, items) {
        if (!items || items.length < 2) return null;
        
        const k = items.length;
        let itemVariancesSum = 0;
        
        // Calculate variance for each item
        const itemArrays = {};
        items.forEach(item => {
            itemArrays[item] = data.map(row => row[item]);
            itemVariancesSum += jStat.variance(itemArrays[item], true); // true for sample variance
        });
        
        // Calculate variance of the sum of items
        const totalScores = data.map(row => {
            let sum = 0;
            items.forEach(item => sum += row[item]);
            return sum;
        });
        const totalVariance = jStat.variance(totalScores, true);
        
        if (totalVariance === 0) return 0;
        
        const alpha = (k / (k - 1)) * (1 - (itemVariancesSum / totalVariance));
        return alpha;
    }

    // Determine status of Cronbach's Alpha
    static interpretAlpha(alpha) {
        const lang = window.i18n.lang;
        if (alpha >= 0.90) return lang === 'en' ? 'Excellent' : 'ممتاز';
        if (alpha >= 0.80) return lang === 'en' ? 'Good' : 'جيد جداً';
        if (alpha >= 0.70) return lang === 'en' ? 'Acceptable' : 'مقبول';
        if (alpha >= 0.60) return lang === 'en' ? 'Questionable' : 'ضعيف';
        return lang === 'en' ? 'Poor' : 'مرفوض';
    }

    // 2. Descriptive Stats
    static descriptiveStats(dataArray) {
        if (!dataArray || dataArray.length === 0) return null;
        
        const n = dataArray.length;
        const mean = jStat.mean(dataArray);
        const std = jStat.stdev(dataArray, true); // true for sample stdev
        const median = jStat.median(dataArray);
        const min = jStat.min(dataArray);
        const max = jStat.max(dataArray);
        
        return { n, mean, std, median, min, max };
    }

    // 3. Construct Composite Variables Base on definitions
    static constructCompositeVariables(data, varDefs, method = 'mean') {
        const compositeData = data.map(row => ({...row}));
        
        for (const [varName, items] of Object.entries(varDefs)) {
            compositeData.forEach(row => {
                let sum = 0;
                let count = 0;
                items.forEach(item => {
                    if (row[item] !== null && row[item] !== undefined) {
                        sum += row[item];
                        count++;
                    }
                });
                if (count > 0) {
                    row[varName] = method === 'mean' ? (sum / count) : sum;
                } else {
                    row[varName] = null;
                }
            });
        }
        
        return compositeData;
    }

    // 4. Pearson Correlation Matrix
    static calculateCorrelationMatrix(data, variables) {
        const matrix = [];
        
        for (let i = 0; i < variables.length; i++) {
            matrix[i] = [];
            const arrA = data.map(row => row[variables[i]]);
            for (let j = 0; j < variables.length; j++) {
                if (i === j) {
                    matrix[i][j] = 1.0;
                } else if (j < i) {
                    matrix[i][j] = matrix[j][i];
                } else {
                    const arrB = data.map(row => row[variables[j]]);
                    matrix[i][j] = jStat.corrcoeff(arrA, arrB);
                }
            }
        }
        
        return matrix;
    }

    // 5. Multiple Linear Regression (OLS)
    static multipleRegression(data, depVar, indepVars) {
        const n = data.length;
        const k = indepVars.length;
        
        // Prepare Y matrix (n x 1)
        const Y = data.map(row => [row[depVar]]);
        
        // Prepare X matrix (n x (k+1)) - add constant column
        const X = data.map(row => {
            const rowArr = [1]; // Constant term
            indepVars.forEach(v => rowArr.push(row[v]));
            return rowArr;
        });

        try {
            // Beta = (X'X)^-1 X'Y
            const Xt = jStat.transpose(X);
            const XtX = jStat.multiply(Xt, X);
            const XtX_inv = jStat.inv(XtX);
            if (!XtX_inv) throw new Error("Matrix inversion failed (multicollinearity?)");

            const XtY = jStat.multiply(Xt, Y);
            const beta = jStat.multiply(XtX_inv, XtY); // [(k+1) x 1] matrix

            // Fitted values
            const Y_hat = jStat.multiply(X, beta);
            
            // Residuals
            const residuals = [];
            let sse = 0; // sum of squared errors
            let sst = 0; // total sum of squares
            
            const y_arr = Y.map(row => row[0]);
            const y_mean = jStat.mean(y_arr);
            
            for (let i = 0; i < n; i++) {
                const e = Y[i][0] - Y_hat[i][0];
                residuals.push(e);
                sse += e * e;
                sst += Math.pow(Y[i][0] - y_mean, 2);
            }
            
            // R-squared
            const r_squared = 1 - (sse / sst);
            const adj_r_squared = 1 - ((1 - r_squared) * (n - 1) / (n - k - 1));
            
            // F-statistic
            const msr = (sst - sse) / k;
            const mse = sse / (n - k - 1);
            const f_stat = msr / mse;
            const p_value_f = 1 - jStat.centralF.cdf(f_stat, k, n - k - 1);
            
            // T-statistics for coefficients
            const var_beta = jStat.multiply(XtX_inv, mse); // covariance matrix
            const se_beta = [];
            const t_stats = [];
            const p_values_t = [];
            
            for (let i = 0; i < beta.length; i++) {
                const se = Math.sqrt(var_beta[i][i]);
                se_beta.push(se);
                const t = beta[i][0] / se;
                t_stats.push(t);
                // Two-tailed p-value
                const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - k - 1));
                p_values_t.push(p);
            }

            // Beta Coefficients structured
            const coefficients = indepVars.map((v, i) => ({
                variable: v,
                b: beta[i+1][0],
                se: se_beta[i+1],
                t: t_stats[i+1],
                p: p_values_t[i+1]
            }));

            // Calculate VIF for each variable
            const vif = this.calculateVIF(X, k);

            indepVars.forEach((v, i) => {
                coefficients[i].vif = vif[i];
            });

            return {
                summary: {
                    dependentVar: depVar,
                    r: Math.sqrt(r_squared),
                    r_squared: r_squared,
                    adj_r_squared: adj_r_squared,
                    f_stat: f_stat,
                    p_value: p_value_f,
                    n: n,
                    significant: p_value_f < 0.05
                },
                coefficients: coefficients,
                constant: {
                    b: beta[0][0],
                    t: t_stats[0],
                    p: p_values_t[0]
                },
                diagnostics: {
                    residuals: residuals,
                    fittedAndResiduals: Y_hat.map((val, i) => ({ fitted: val[0], residual: residuals[i] }))
                }
            };
            
        } catch (error) {
            console.error("Regression error: ", error);
            return null;
        }
    }

    // VIF Calculation roughly: VIF_i = 1 / (1 - R_i^2)
    static calculateVIF(X, k) {
        // X is already constructed with constant string at pos 0
        const vifArray = [];
        // Extract just the variables data columns
        const dataCols = [];
        for (let j=1; j<=k; j++) {
            dataCols.push(X.map(row => row[j]));
        }

        // For each variable, regress it on all other variables
        for (let i=0; i<k; i++) {
            if (k === 1) { vifArray.push(1.0); continue; }
            
            const Y_temp = dataCols[i].map(v => [v]);
            const X_temp = [];
            for (let r=0; r<X.length; r++) {
                const row = [1];
                for (let c=0; c<k; c++) {
                    if (c !== i) row.push(dataCols[c][r]);
                }
                X_temp.push(row);
            }
            
            try {
                const Xt = jStat.transpose(X_temp);
                const XtX = jStat.multiply(Xt, X_temp);
                const XtX_inv = jStat.inv(XtX);
                const XtY = jStat.multiply(Xt, Y_temp);
                const betaT = jStat.multiply(XtX_inv, XtY);
                const Y_hatT = jStat.multiply(X_temp, betaT);
                
                let sse = 0, sst = 0;
                const mY = jStat.mean(Y_temp.map(v => v[0]));
                for (let r=0; r<Y_temp.length; r++) {
                    sse += Math.pow(Y_temp[r][0] - Y_hatT[r][0], 2);
                    sst += Math.pow(Y_temp[r][0] - mY, 2);
                }
                const r2 = 1 - (sse/sst);
                vifArray.push(1 / (1 - r2));
            } catch {
                vifArray.push(Infinity);
            }
        }
        return vifArray;
    }
}

window.Statistics = Statistics;
