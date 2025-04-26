// Připojení k Supabase
const supabase = window.supabaseClient;

// Načtení disciplín do selectu
async function loadDisciplines() {
    const { data, error } = await supabase.from('discipliny').select('*').order('nazev');
    const select = document.getElementById('disciplineSelect');
    select.innerHTML = '';

    if (error) {
        console.error('Chyba při načítání disciplín:', error);
        return;
    }

    data.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
        select.appendChild(option);
    });

    select.addEventListener('change', zobrazFormular);
}

// Zobrazení formuláře pro zápis výsledků
function zobrazFormular() {
    const disciplinaId = document.getElementById('disciplineSelect').value;
    if (!disciplinaId) return;

    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = `
        <h3>Zadání výsledků</h3>
        <input type="text" id="jmeno" placeholder="Jméno"><br><br>
        <input type="text" id="prijmeni" placeholder="Příjmení"><br><br>
        <input type="number" id="cas" placeholder="Výkon (čas v s / výkon v m)"><br><br>
        <button onclick="ulozitVysledek()">Uložit výsledek</button>
    `;

    zobrazVysledky();
}

// Uložení výsledku do databáze
async function ulozitVysledek() {
    const disciplinaId = document.getElementById('disciplineSelect').value;
    const jmeno = document.getElementById('jmeno').value.trim();
    const prijmeni = document.getElementById('prijmeni').value.trim();
    const cas = parseFloat(document.getElementById('cas').value);

    if (!jmeno || !prijmeni || isNaN(cas)) {
        alert('Vyplňte všechna pole správně.');
        return;
    }

    const { error } = await supabase.from('vysledky').insert([
        { disciplina_id: disciplinaId, jmeno, prijmeni, cas }
    ]);

    if (error) {
        console.error('Chyba při ukládání výsledku:', error);
        alert('Chyba při ukládání!');
    } else {
        alert('Výsledek uložen.');
        zobrazVysledky();
        document.getElementById('jmeno').value = '';
        document.getElementById('prijmeni').value = '';
        document.getElementById('cas').value = '';
    }
}

// Zobrazení výsledků pro vybranou disciplínu
async function zobrazVysledky() {
    const disciplinaId = document.getElementById('disciplineSelect').value;
    const { data, error } = await supabase.from('vysledky').select('*').eq('disciplina_id', disciplinaId);

    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';

    if (error) {
        console.error('Chyba při načítání výsledků:', error);
        return;
    }

    if (data.length === 0) {
        resultsContainer.innerHTML = '<p>Žádné výsledky zatím nejsou.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Pořadí</th>
                <th>Jméno</th>
                <th>Příjmení</th>
                <th>Výkon</th>
            </tr>
        </thead>
        <tbody>
            ${data.sort((a, b) => a.cas - b.cas).map((v, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${v.jmeno}</td>
                    <td>${v.prijmeni}</td>
                    <td>${v.cas}</td>
                </tr>
            `).join('')}
        </tbody>
    `;

    resultsContainer.appendChild(table);
    pridatTlacitkaExportu();
}

// Přidání tlačítek pro export
function pridatTlacitkaExportu() {
    const container = document.getElementById('resultsContainer');
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.marginTop = '20px';

    const pdfButton = document.createElement('button');
    pdfButton.textContent = 'Exportovat do PDF';
    pdfButton.onclick = exportToPDF;
    pdfButton.style.marginRight = '10px';

    const excelButton = document.createElement('button');
    excelButton.textContent = 'Exportovat do Excelu';
    excelButton.onclick = exportToExcel;

    buttonsDiv.appendChild(pdfButton);
    buttonsDiv.appendChild(excelButton);
    container.appendChild(buttonsDiv);
}

// Export výsledků do PDF
function exportToPDF() {
    const container = document.getElementById('resultsContainer');
    if (!container.innerHTML.trim()) {
        alert('Nejsou k dispozici žádné výsledky k exportu.');
        return;
    }

    const opt = {
        margin:       0.5,
        filename:     'vysledky.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(container).set(opt).save();
}

// Export výsledků do Excelu
function exportToExcel() {
    const table = document.querySelector('#resultsContainer table');
    if (!table) {
        alert('Nejsou k dispozici žádné výsledky k exportu.');
        return;
    }

    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(col => rowData.push(col.innerText));
        csv.push(rowData.join(','));
    }

    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vysledky.csv';
    link.click();
}

// Inicializace
loadDisciplines();
