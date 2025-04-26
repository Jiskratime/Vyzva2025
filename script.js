
const client = window.supabaseClient;

// Načti disciplíny
async function loadDisciplines() {
    const { data, error } = await client.from('discipliny').select('*').order('nazev');
    if (error) {
        console.error('Chyba při načítání disciplín:', error);
        return;
    }
    const select = document.getElementById('disciplineSelect');
    data.forEach(d => {
        const option = document.createElement('option');
        option.value = JSON.stringify(d);
        option.textContent = `${d.nazev} | ${d.kategorie} | ${d.pohlavi}`;
        select.appendChild(option);
    });
}

// Zobraz výsledky
async function zobrazVysledky() {
    const selected = document.getElementById('disciplineSelect').value;
    if (!selected) return;
    const discipline = JSON.parse(selected);
    const isTrack = discipline.typ === 'beh';

    const { data, error } = await client.from('vysledky')
        .select(`id, cas, nejlepsi, zavodnik: zavodnik_id (jmeno, prijmeni)`)
        .eq('disciplina_id', discipline.id)
        .order(isTrack ? 'cas' : 'nejlepsi', { ascending: true });

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (error) {
        console.error('Chyba při načítání výsledků:', error);
        return;
    }
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Žádné výsledky.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th>Pořadí</th><th>Jméno</th><th>Příjmení</th><th>${isTrack ? 'Čas (s)' : 'Výkon (m)'}</th></tr>
        </thead>
        <tbody>
            ${data.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.zavodnik?.jmeno || ''}</td>
                    <td>${row.zavodnik?.prijmeni || ''}</td>
                    <td>${isTrack ? row.cas : row.nejlepsi}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// Výpočet souhrnného bodování
async function vypocitejSouhrnBodu() {
    const { data, error } = await client.from('vysledky')
        .select('id, cas, nejlepsi, zavodnik: zavodnik_id (jmeno, prijmeni, kategorie, pohlavi), disciplina: disciplina_id (typ, kategorie, pohlavi)');
    
    const container = document.getElementById('resultsTableContainer');
    container.innerHTML = '';

    if (error) {
        console.error('Chyba při načítání výsledků:', error);
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p>Žádné výsledky k výpočtu.</p>';
        return;
    }

    const body = {};

    data.forEach(row => {
        const zavodnik = row.zavodnik;
        if (!zavodnik) return;
        const key = `${zavodnik.prijmeni}_${zavodnik.jmeno}_${zavodnik.kategorie}_${zavodnik.pohlavi}`;
        if (!body[key]) body[key] = { jmeno: zavodnik.jmeno, prijmeni: zavodnik.prijmeni, kategorie: zavodnik.kategorie, pohlavi: zavodnik.pohlavi, body: 0 };
        body[key].body += 10; // Zatím pevně 10 bodů za každý záznam (pak lze upravit podle pořadí)
    });

    const bodyArray = Object.values(body).sort((a, b) => b.body - a.body);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th>Pořadí</th><th>Jméno</th><th>Příjmení</th><th>Kategorie</th><th>Pohlaví</th><th>Body</th></tr>
        </thead>
        <tbody>
            ${bodyArray.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.jmeno}</td>
                    <td>${row.prijmeni}</td>
                    <td>${row.kategorie}</td>
                    <td>${row.pohlavi}</td>
                    <td>${row.body}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// Export výsledků
function exportToPDF() {
    const table = document.querySelector('#resultsContainer table');
    if (!table) return alert('Žádná tabulka k exportu.');
    const opt = { margin: 1, filename: 'vysledky.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().from(table).set(opt).save();
}

function exportToExcel() {
    const table = document.querySelector('#resultsContainer table');
    if (!table) return alert('Žádná tabulka k exportu.');
    const wb = XLSX.utils.table_to_book(table, { sheet: "Výsledky" });
    XLSX.writeFile(wb, "vysledky.xlsx");
}

// Eventy
document.getElementById('disciplineSelect').addEventListener('change', zobrazVysledky);
document.getElementById('vypocitatBodyButton').addEventListener('click', vypocitejSouhrnBodu);
document.getElementById('exportPDF').addEventListener('click', exportToPDF);
document.getElementById('exportExcel').addEventListener('click', exportToExcel);

// Inicializace
loadDisciplines();
