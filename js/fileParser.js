class FileParser {
    static async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // Assume the first sheet is the one we want
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to raw JSON arrays to get header easily
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    if (jsonData.length < 2) {
                        throw new Error("File is empty or doesn't have headers");
                    }
                    
                    // First row is headers
                    const columnsRaw = jsonData[0];
                    // Clean columns (remove empty)
                    const columns = columnsRaw.map(c => c ? String(c).trim() : '').filter(c => c !== '');
                    
                    // Map the rest of the data to objects
                    const rows = [];
                    for(let i=1; i<jsonData.length; i++) {
                        const rowArr = jsonData[i];
                        if (!rowArr || rowArr.length === 0) continue;
                        
                        const rowObj = {};
                        let hasData = false;
                        for(let j=0; j<columns.length; j++) {
                            const val = rowArr[j];
                            if (val !== undefined && val !== null && val !== '') {
                                rowObj[columns[j]] = val;
                                hasData = true;
                            } else {
                                rowObj[columns[j]] = null;
                            }
                        }
                        if (hasData) rows.push(rowObj);
                    }
                    
                    resolve({
                        columns: columns,
                        data: rows,
                        rowCount: rows.length
                    });
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = function() {
                reject(new Error("Failed to read the file"));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    static generateQualityReport(data, columns) {
        const issues = [];
        const missingVals = {};
        let totalRows = data.length;
        
        if (totalRows < 30) {
            issues.push({
                type: 'warning',
                title: window.i18n.get('app_lang') === 'en' ? 'Small Sample Size' : 'عينة صغيرة جداً',
                desc: window.i18n.get('app_lang') === 'en' ? `Only ${totalRows} rows. Results might not be reliable (< 30).` : `عدد المبحوثين (${totalRows}) أقل من 30. قد تكون النتائج غير موثوقة.`
            });
        }
        
        // Check for missing values
        columns.forEach(col => {
            let missingCount = 0;
            data.forEach(row => {
                if (row[col] === null || row[col] === undefined || row[col] === '') {
                    missingCount++;
                }
            });
            if (missingCount > 0) {
                missingVals[col] = missingCount;
            }
        });
        
        const missingCols = Object.keys(missingVals);
        if (missingCols.length > 0) {
            let descAr = `تم رصد قيم مفقودة في: ${missingCols.slice(0,3).join(', ')} ${missingCols.length>3 ? 'وغيرها' : ''}`;
            let descEn = `Missing values detected in: ${missingCols.slice(0,3).join(', ')} ${missingCols.length>3 ? 'and others' : ''}`;
            issues.push({
                type: 'info',
                title: window.i18n.get('app_lang') === 'en' ? 'Missing Values' : 'قيم مفقودة',
                desc: window.i18n.get('app_lang') === 'en' ? descEn : descAr
            });
        }
        
        return issues;
    }

    // Process data similar to Python's load_and_preprocess
    static preprocessData(rawData, varDefs, missingMethod) {
        // Find all likert columns
        let likertCols = [];
        for (const [varName, items] of Object.entries(varDefs)) {
            likertCols = likertCols.concat(items);
        }
        
        // Clone data
        let pData = rawData.map(row => ({...row}));
        
        // Convert likert columns to numbers
        pData.forEach(row => {
            likertCols.forEach(col => {
                if (row[col] !== null) {
                    let val = Number(row[col]);
                    row[col] = isNaN(val) ? null : val;
                }
            });
        });
        
        // Handle missing values
        if (missingMethod === 'drop') {
            // Drop rows where ANY likert column is missing
            pData = pData.filter(row => {
                return likertCols.every(col => row[col] !== null);
            });
        } else if (missingMethod === 'mean') {
            // Calculate column means
            const colMeans = {};
            likertCols.forEach(col => {
                let sum = 0;
                let count = 0;
                pData.forEach(row => {
                    if (row[col] !== null) {
                        sum += row[col];
                        count++;
                    }
                });
                colMeans[col] = count > 0 ? (sum / count) : 0;
            });
            
            // Impute means
            pData.forEach(row => {
                likertCols.forEach(col => {
                    if (row[col] === null) {
                        row[col] = colMeans[col];
                    }
                });
            });
        }
        
        return pData;
    }
}

window.FileParser = FileParser;
