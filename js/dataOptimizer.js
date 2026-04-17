class DataOptimizer {
    
    // Reverse engineers a normal-ish distribution that fits an ideal regression model
    // Translates the logic from python's generate_optimized_data
    static generateOptimizedData(originalData, varDefs, depVars, indepVars, demoVars, nSamples) {
        const newData = {};
        const n = parseInt(nSamples);
        
        // Helper: Generate array of random normal values using Box-Muller transform
        const randNormal = (loc, scale, size) => {
            const arr = new Array(size);
            for(let i = 0; i < size; i++) {
                let u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                arr[i] = num * scale + loc;
            }
            return arr;
        };

        const choice = (arr, size) => {
            const res = new Array(size);
            for(let i=0; i<size; i++){
                res[i] = arr[Math.floor(Math.random() * arr.length)];
            }
            return res;
        };

        // 1. Process demographics
        demoVars.forEach(col => {
            let validVals = originalData.map(row => row[col]).filter(val => val !== null && val !== undefined && val !== '');
            if(validVals.length > 0) {
                newData[col] = choice(validVals, n);
            } else {
                newData[col] = Array(n).fill('Unknown');
            }
        });

        // 2. Generate Likert data
        const globalFactor = randNormal(3.5, 0.6, n);
        const constructFactors = {};

        // Independent vars
        indepVars.forEach(indep => {
            constructFactors[indep] = [];
            const specifics = randNormal(1.8, 0.6, n);
            for(let i=0; i<n; i++) {
                constructFactors[indep][i] = (globalFactor[i] * 0.5) + specifics[i];
            }
            
            varDefs[indep].forEach(item => {
                newData[item] = [];
                const noise = randNormal(0, 0.5, n);
                for(let i=0; i<n; i++) {
                    let raw = constructFactors[indep][i] + noise[i];
                    let val = Math.round(raw);
                    // Clip between 1 and 5
                    newData[item][i] = Math.min(Math.max(val, 1), 5);
                }
            });
        });

        // Dependent vars
        depVars.forEach(dep => {
            constructFactors[dep] = [];
            const noiseFactor = randNormal(0.8, 0.5, n);
            let validIndeps = Math.max(1, indepVars.length);
            
            for(let i=0; i<n; i++) {
                let sumIndep = 0;
                indepVars.forEach(indep => sumIndep += constructFactors[indep][i]);
                constructFactors[dep][i] = (sumIndep / validIndeps) * 0.8 + noiseFactor[i];
            }
            
            varDefs[dep].forEach(item => {
                newData[item] = [];
                const noise = randNormal(0, 0.5, n);
                for(let i=0; i<n; i++) {
                    let raw = constructFactors[dep][i] + noise[i];
                    let val = Math.round(raw);
                    newData[item][i] = Math.min(Math.max(val, 1), 5);
                }
            });
        });

        // Other vars not defined as dep or indep
        for (const [varName, items] of Object.entries(varDefs)) {
            if (!depVars.includes(varName) && !indepVars.includes(varName)) {
                const factor = randNormal(3.2, 0.8, n);
                items.forEach(item => {
                    newData[item] = [];
                    const noise = randNormal(0, 0.6, n);
                    for(let i=0; i<n; i++) {
                        let raw = factor[i] + noise[i];
                        let val = Math.round(raw);
                        newData[item][i] = Math.min(Math.max(val, 1), 5);
                    }
                });
            }
        }

        // 3. Convert transposed dictionary to array of objects
        const optimizedRows = [];
        const finalCols = Object.keys(newData);
        
        for(let i=0; i<n; i++) {
            let row = {};
            finalCols.forEach(c => {
                row[c] = newData[c][i];
            });
            optimizedRows.push(row);
        }

        return optimizedRows;
    }

    // Export generated data to Excel
    static exportToExcel(dataArray, filename = "optimized_survey_data.xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(dataArray);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, filename);
    }
}

window.DataOptimizer = DataOptimizer;
