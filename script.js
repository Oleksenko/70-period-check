const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");
const result = document.getElementById("result");
const copyBtn = document.getElementById("copyBtn");

let selectedFile = null;

uploadBox.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {

    selectedFile = e.target.files[0];

    if(selectedFile){

        document.getElementById("selectedFile").innerText =
            `📄 Обраний файл: ${selectedFile.name}`;

        result.innerHTML = "";
        copyBtn.disabled = true;

    }

});

uploadBox.addEventListener("dragover", (e) => {

    e.preventDefault();
    uploadBox.classList.add("dragover");

});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragover");
});

uploadBox.addEventListener("drop", (e) => {

    e.preventDefault();

    uploadBox.classList.remove("dragover");

    const file = e.dataTransfer.files[0];

    if(file){

        selectedFile = file;

        document.getElementById("selectedFile").innerText =
            `📄 Обраний файл: ${file.name}`;

        result.innerHTML = "";
        copyBtn.disabled = true;

    }

});

function parseDate(dateStr){

    const [day, month, year] = dateStr.split(".");

    return new Date(year, month - 1, day);

}

function countDays(periodStr){

    let totalDays = 0;

    let cleaned = periodStr
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/;/g, " ");

    cleaned = cleaned.replace(/\s+/g, " ").trim();

    const rangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;

    let match;

    while((match = rangeRegex.exec(cleaned)) !== null){

        const start = parseDate(match[1]);
        const end = parseDate(match[2]);

        const diffDays =
            Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

        totalDays += diffDays;

    }

    cleaned = cleaned.replace(rangeRegex, "");

    const singleDates = cleaned.match(/\d{2}\.\d{2}\.\d{4}/g) || [];

    totalDays += singleDates.length;

    return totalDays;

}

function extractTablesFromHtml(html){

    const parser = new DOMParser();

    const doc = parser.parseFromString(html, "text/html");

    return doc.querySelectorAll("table");

}

function checkTables(tables){

    const errors = [];

    let checkedRows = 0;

    if(tables.length === 0){

        errors.push("❌ У файлі не знайдено таблиць.");

        return {
            errors,
            checkedRows
        };

    }

    tables.forEach((table, tableIndex) => {

        const rows = table.querySelectorAll("tr");

        rows.forEach((row, rowIndex) => {

            if(rowIndex === 0){
                return;
            }

            const cells = row.querySelectorAll("td");

            if(cells.length === 0){
                return;
            }

            if(cells.length < 5){

                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, рядок ${rowIndex + 1}: недостатньо колонок`
                );

                return;

            }

            const datesText =
                cells[3]?.innerText?.trim() || "";

            const daysText =
                cells[4]?.innerText?.trim() || "";

            if(!datesText && !daysText){
                return;
            }
            
            if(datesText && !daysText){
            
                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, рядок ${rowIndex + 1}: не вказана кількість днів`
                );
            
                return;
            
            }
            
            if(!datesText && daysText){
            
                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, рядок ${rowIndex + 1}: не вказані дати`
                );
            
                return;
            
            }

            if(!/^\d+$/.test(daysText)){

                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, рядок ${rowIndex + 1}: невірний формат кількості днів "${daysText}"`
                );
            
                return;
            
            }

            checkedRows++;

            const calculatedDays = countDays(datesText);

            const expectedDays = Number(daysText);

            if(calculatedDays !== expectedDays){

                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, рядок ${rowIndex + 1}: ` +
                    `періоди "${datesText}", ` +
                    `вказано ${expectedDays}, ` +
                    `обчислено ${calculatedDays}`
                );

            }

        });

    });

    return {
        errors,
        checkedRows
    };

}

document.getElementById("checkBtn").addEventListener("click", async () => {

    if(!selectedFile){

        result.innerHTML =
            `<span class="error">❌ Оберіть файл .docx</span>`;

        return;

    }

    if(!selectedFile.name.toLowerCase().endsWith(".docx")){

        result.innerHTML =
            `<span class="error">❌ Потрібен файл .docx</span>`;

        return;

    }

    result.innerHTML = `<span class="info">⏳ Перевіряю файл...</span>`;

    copyBtn.disabled = true;

    try{

        const arrayBuffer = await selectedFile.arrayBuffer();

        const mammothResult = await mammoth.convertToHtml({
            arrayBuffer
        });

        const tables = extractTablesFromHtml(mammothResult.value);

        const checkResult = checkTables(tables);

        const errors = checkResult.errors;

        const checkedRows = checkResult.checkedRows;

        if(errors.length > 0){

            copyBtn.disabled = false;

            result.innerHTML =
                `<div class="error">` +
                `<b>🔴 Знайдено помилок: ${errors.length}</b><br><br>` +
                `📋 Перевірено рядків: ${checkedRows}<br>` +
                `📄 Таблиць знайдено: ${tables.length}<br><br>` +
                errors.join("<br><br>") +
                `</div>`;

        } else {

            result.innerHTML =
                `<div class="success">` +
                `✅ Помилок не знайдено<br><br>` +
                `📋 Перевірено рядків: ${checkedRows}<br>` +
                `📄 Таблиць знайдено: ${tables.length}` +
                `</div>`;

        }

    } catch(error){

        console.error(error);

        result.innerHTML =
            `<span class="error">❌ Помилка обробки Word файлу</span>`;

    }

});

copyBtn.addEventListener("click", () => {

    const text = result.innerText;

    navigator.clipboard.writeText(text);

    alert("Повідомлення скопійовано 📋");

});
