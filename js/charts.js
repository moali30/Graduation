class Charts {
    static chartInstances = {};

    static destroyChart(id) {
        if (this.chartInstances[id]) {
            this.chartInstances[id].destroy();
        }
    }

    // Draw Demographic Bar Chart
    static drawDemoChart(canvasId, label, countsData) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const labels = Object.keys(countsData);
        const data = Object.values(countsData);
        
        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: window.i18n.lang === 'en' ? 'Frequency' : 'التكرار',
                    data: data,
                    backgroundColor: 'rgba(0, 212, 255, 0.6)',
                    borderColor: 'rgba(0, 212, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${window.i18n.lang === 'en' ? 'Distribution of ' : 'توزيع '}${label}`,
                        color: '#64748b'
                    },
                    legend: {
                        labels: { color: '#64748b' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#64748b' },
                        grid: { color: 'rgba(100,116,139,0.1)' }
                    },
                    x: {
                        ticks: { color: '#64748b' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Draw Correlation Heatmap
    static drawCorrelationHeatmap(canvasId, variables, matrix) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Prepare data for scatter-like heatmap (bubble chart)
        // Chart.js natively doesn't have a great heatmap without matrix plugin,
        // so we'll build an HTML table visually beside it, and implement a basic 2d grid here using bubbles or custom plugin.
        // Actually, custom drawing using canvas API directly is easier for a simple box heatmap
        
        // Wait, for simplicity in vanilla, drawing it natively in Canvas context
        const canvas = document.getElementById(canvasId);
        const width = canvas.parentElement.clientWidth || 400;
        const height = width; // square
        canvas.width = width;
        canvas.height = height;
        
        const n = variables.length;
        const cellSize = width / (n + 1);
        
        // Clear background with transparency instead of dark color
        ctx.clearRect(0, 0, width, height);
        
        ctx.font = '12px "Cairo"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for(let i = 0; i < n; i++) {
            // Draw row labels
            ctx.fillStyle = '#64748b';
            ctx.fillText(variables[i].substring(0,8), cellSize/2, cellSize * (i + 1.5));
            
            // Draw col labels
            ctx.save();
            ctx.translate(cellSize * (i + 1.5), cellSize/2);
            ctx.rotate(-Math.PI/4);
            ctx.fillText(variables[i].substring(0,8), 0, 0);
            ctx.restore();
            
            for(let j = 0; j < n; j++) {
                const val = matrix[i][j];
                // Color scale from cool(blue, -1) to warm(red, +1)
                // Using HSL
                let hue = ((1 - val) / 2) * 240; // 0 red (val=1), 240 blue (val=-1)
                ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                
                const x = cellSize * (j + 1);
                const y = cellSize * (i + 1);
                
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = 'rgba(100,116,139,0.2)';
                ctx.strokeRect(x, y, cellSize, cellSize);
                
                // Draw text value
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px "Cairo"';
                ctx.fillText(val.toFixed(2), x + cellSize/2, y + cellSize/2);
            }
        }
    }

    static downloadChart(canvasId, filename) {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        
        // Setup background color for export
        const destCanvas = document.createElement("canvas");
        destCanvas.width = canvas.width;
        destCanvas.height = canvas.height;
        const destCtx = destCanvas.getContext('2d');
        
        // Ensure transparent background (no fillRect)
        destCtx.clearRect(0,0,destCanvas.width, destCanvas.height);
        
        // Draw real canvas over it
        destCtx.drawImage(canvas, 0, 0);

        const dataURL = destCanvas.toDataURL("image/png", 1.0);
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataURL;
        link.click();
    }
}

window.Charts = Charts;
