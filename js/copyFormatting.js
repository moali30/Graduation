class CopyFormatting {
    
    // Copy the specified HTML table to clipboard in a Word-friendly format (APA Style)
    static async copyTableToWord(tableElementId, title = "") {
        const originalTable = document.getElementById(tableElementId);
        if (!originalTable) {
            console.error("Table not found:", tableElementId);
            return;
        }

        // Create a wrapper div to hold the APA styled table
        let wrapper = document.createElement('div');
        wrapper.style.fontFamily = "'Times New Roman', Times, serif";
        wrapper.style.fontSize = "12pt";
        wrapper.style.direction = window.i18n.lang === 'ar' ? 'rtl' : 'ltr';

        // Add table title if provided (APA style places title above table)
        if (title) {
            let pTitle = document.createElement('p');
            pTitle.style.marginBottom = "5px";
            pTitle.style.fontWeight = "bold";
            pTitle.innerText = title;
            wrapper.appendChild(pTitle);
        }

        // Clone table
        const cloneTable = originalTable.cloneNode(true);
        
        // Apply APA styling to the table
        cloneTable.style.width = "100%";
        cloneTable.style.borderCollapse = "collapse";
        cloneTable.style.border = "none";
        cloneTable.style.fontFamily = "'Times New Roman', Times, serif";
        cloneTable.style.fontSize = "12pt";

        // Style the headers and rows to have basic top and bottom borders only, typical for APA
        const headers = cloneTable.querySelectorAll('th');
        headers.forEach(th => {
            th.style.borderTop = "2px solid black";
            th.style.borderBottom = "1px solid black";
            th.style.borderLeft = "none";
            th.style.borderRight = "none";
            th.style.padding = "5px";
            th.style.textAlign = "center";
            th.style.backgroundColor = "transparent";
            th.style.color = "black";
            th.style.fontWeight = "bold";
        });

        const cells = cloneTable.querySelectorAll('td');
        cells.forEach(td => {
            td.style.border = "none";
            td.style.padding = "5px";
            td.style.textAlign = "center";
            td.style.backgroundColor = "transparent";
            td.style.color = "black";
        });

        // Make tfoot visible in copy
        const exportTfoot = cloneTable.querySelector('.export-only-tfoot');
        if (exportTfoot) {
            exportTfoot.style.display = 'table-footer-group';
        }

        // Bottom border for the last row
        const rows = cloneTable.querySelectorAll('tr');
        if (rows.length > 0) {
            const lastRowCells = rows[rows.length - 1].querySelectorAll('td, th');
            lastRowCells.forEach(td => {
                td.style.borderBottom = "2px solid black";
            });
        }

        wrapper.appendChild(cloneTable);

        // Make the wrapper temporarily visible to copy it
        wrapper.style.position = "absolute";
        wrapper.style.left = "-9999px";
        document.body.appendChild(wrapper);

        try {
            await this.copyHtmlToClipboard(wrapper.innerHTML);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        } finally {
            document.body.removeChild(wrapper);
        }
    }

    // Helper method using the newer Clipboard Item API, with fallback
    static async copyHtmlToClipboard(htmlContent) {
        if (navigator.clipboard && window.ClipboardItem) {
            const blobHtml = new Blob([htmlContent], { type: "text/html" });
            const blobText = new Blob([htmlContent.replace(/<[^>]*>?/gm, '')], { type: "text/plain" });
            
            const item = new ClipboardItem({
                "text/html": blobHtml,
                "text/plain": blobText
            });
            await navigator.clipboard.write([item]);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = htmlContent;
            textArea.style.position = "fixed";  //avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }
}

window.CopyFormatting = CopyFormatting;
