
const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
    const { data, error } = await window.supabaseClient
        .from('discipliny')
        .select('*')
        .order('nazev');

    if (error) {
        console.error("Chyba při načítání disciplín:", error);
        return;
    }

    data.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
        select.appendChild(option);
    });
}

loadDisciplines();
