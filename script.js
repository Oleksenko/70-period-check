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

function splitDates(text){

    const matches = text.match(/\d{2}\.\d{2}\.\d{4}/g);

    return matches || [];

}

function calculateRangeDays(startStr, endStr){

    const [sd, sm, sy] = startStr.split(".").map(Number);
    const [ed, em, ey] = endStr.split(".").map(Number);

    const start = Date.UTC(sy, sm - 1, sd);
    const end = Date.UTC(ey, em - 1, ed);

    return Math.floor((end - start) / 86400000) + 1;

}

function detectTableType(cells){

    const col4 = cells[3]?.innerText?.trim() || "";
    const col5 = cells[4]?.innerText?.trim() || "";
    const col6 = cells[5]?.innerText?.trim() || "";

    const hasDateInCol4 =
        /\d{2}\.\d{2}\.\d{4}/.test(col4);

    const hasDateInCol5 =
        /\d{2}\.\d{2}\.\d{4}/.test(col5);

    if(
        hasDateInCol4 &&
        hasDateInCol5
    ){
        return "new";
    }

    if(
        (col4.includes("-") || hasDateInCol4) &&
        (
            /^\d+$/.test(col5) ||
            col5 === ""
        )
    ){
        return "old";
    }

    return "unknown";

}

function checkNewFormat(cells, tableIndex, rowIndex, errors){

    const personName = getPersonName(cells);

    const startText =
        cells[3]?.innerText?.trim() || "";

    const endText =
        cells[4]?.innerText?.trim() || "";

    const daysText =
        cells[5]?.innerText?.trim() || "";

    if(!startText && !endText && !daysText){
        return false;
    }

    if(startText && !endText){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: не вказана дата завершення`
        );

        return false;

    }

    if(!startText && endText){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: не вказана дата початку`
        );

        return false;

    }

    if(!daysText){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: не вказана кількість днів`
        );

        return false;

    }

    if(!/^\d+$/.test(daysText)){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: невірний формат кількості днів`
        );

        return false;

    }

    const starts = splitDates(startText);
    const ends = splitDates(endText);

    if(starts.length !== ends.length){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: різна кількість дат початку і завершення`
        );

        return false;

    }

    let totalDays = 0;

    for(let i = 0; i < starts.length; i++){

        totalDays += calculateRangeDays(starts[i], ends[i]);

    }

    const expected = Number(daysText);

    if(totalDays !== expected){

        errors.push(
            `❌ Таблиця ${tableIndex + 1}, ${personName}: ` +
            `вказано ${expected}, обчислено ${totalDays}`
        );

    }

    return true;

}

function extractTablesFromHtml(html){

    const parser = new DOMParser();

    const doc = parser.parseFromString(html, "text/html");

    return doc.querySelectorAll("table");

}

function isHeaderRow(rowText){

    const normalized = rowText
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^\wа-яіїєґ ]/gi, "")
        .trim();

    const headerPatterns = [
        "період",
        "кількість днів",
        "з/п",
        "прізвище",
        "військове звання",
        "особовий номер",
        "підстава"
    ];

    for(const pattern of headerPatterns){

        if(normalized.includes(pattern)){
            return true;
        }

    }

    const compact = normalized.replace(/\s+/g, "");

    if(
        compact === "зпо" ||
        compact === "запо"
    ){
        return true;
    }

    return false;

}

function getPersonName(cells){

    const name =
        cells[2]?.innerText?.trim();

    if(!name){
        return "Невідомий ПІБ";
    }

    return `"${name}"`;

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

            const cells = row.querySelectorAll("td");

            const rowText = row.innerText;

            const personName = getPersonName(cells);

            if(isHeaderRow(rowText)){
                return;
            }
            
            if(cells.length === 0){
                return;
            }

            if(cells.length < 5){
            
                errors.push(
                    `❌ Таблиця ${tableIndex + 1}, ${personName}: недостатньо колонок`
                );
            
                return;
            
            }

            const tableType = detectTableType(cells);

            if(tableType === "unknown"){

                const hasAnyData =
                    cells[0]?.innerText?.trim() ||
                    cells[1]?.innerText?.trim() ||
                    cells[2]?.innerText?.trim() ||
                    cells[3]?.innerText?.trim() ||
                    cells[4]?.innerText?.trim();
            
                if(hasAnyData){
            
                    errors.push(
                        `❌ Таблиця ${tableIndex + 1}, ${personName}: неможливо визначити формат рядка`
                    );
            
                }
            
                return;
            
            }
            
            if(tableType === "old"){
            
                const datesText =
                    cells[3]?.innerText?.trim() || "";
            
                const daysText =
                    cells[4]?.innerText?.trim() || "";
            
                if(!datesText && !daysText){
                    return;
                }
            
                if(datesText && !daysText){
            
                    errors.push(
                        `❌ Таблиця ${tableIndex + 1}, ${personName}: не вказана кількість днів`
                    );
            
                    return;
            
                }
            
                if(!datesText && daysText){
            
                    errors.push(
                        `❌ Таблиця ${tableIndex + 1}, ${personName}: не вказані дати`
                    );
            
                    return;
            
                }
            
                if(!/^\d+$/.test(daysText)){
            
                    errors.push(
                        `❌ Таблиця ${tableIndex + 1}, ${personName}: невірний формат кількості днів`
                    );
            
                    return;
            
                }
            
                checkedRows++;
                const calculatedDays = countDays(datesText);

                const expectedDays = Number(daysText);
                
                if(calculatedDays !== expectedDays){
                
                    errors.push(
                        `❌ Таблиця ${tableIndex + 1}, ${personName}: ` +
                        `періоди "${datesText}", ` +
                        `вказано ${expectedDays}, ` +
                        `обчислено ${calculatedDays}`
                    );
                
                }
            
            }
            
            if(tableType === "new"){
            
                checkedRows++;
            
                checkNewFormat(
                    cells,
                    tableIndex,
                    rowIndex,
                    errors
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
