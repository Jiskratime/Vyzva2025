
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = window.supabaseClient;

async function loadDisciplines() {
    const { data, error } = await supabase.from('discipliny').select('*').order('nazev');
    const select = document.getElementById('disciplineSelect');
    if (data) {
        data.forEach(d => {
            const option = document.createElement('option');
            option.value = JSON.stringify(d);
            option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
            select.appendChild(option);
        });
        select.addEventListener('change', showForm);
    } else {
        console.error("Chyba načítání disciplín:", error);
    }
}

function showForm() {
    const discipline = JSON.parse(document.getElementById('disciplineSelect').value);
    const isTrack = discipline.typ === 'beh';
    const form = document.createElement('form');
    form.innerHTML = `
        <h3>Zadání výsledků</h3>
        <input type="text" placeholder="Příjmení" id="surname" required>
        <input type="text" placeholder="Jméno" id="name" required>
        ${isTrack
            ? `<input type="number" step="0.01" placeholder="Čas (s)" id="time" required>`
            : `<input type="number" step="0.01" placeholder="Pokus 1 (m)" id="p1">
               <input type="number" step="0.01" placeholder="Pokus 2 (m)" id="p2">
               <input type="number" step="0.01" placeholder="Pokus 3 (m)" id="p3">`
        }
        <button type="submit">Uložit</button>
        <p id="saveStatus"></p>
    `;

    form.onsubmit = async function(e) {
        e.preventDefault();
        const prijmeni = document.getElementById('surname').value;
        const jmeno = document.getElementById('name').value;
        let vykon = null;
        let pokusy = [];

        if (isTrack) {
            vykon = parseFloat(document.getElementById('time').value);
        } else {
            pokusy = [parseFloat(document.getElementById('p1').value), parseFloat(document.getElementById('p2').value), parseFloat(document.getElementById('p3').value)];
            vykon = Math.max(...pokusy.filter(x => !isNaN(x)));
        }

        const { error } = await supabase.from('vysledky').insert([{
            id_disciplina: discipline.id,
            prijmeni,
            jmeno,
            vykon,
            pokus1: pokusy[0] || null,
            pokus2: pokusy[1] || null,
            pokus3: pokusy[2] || null
        }]);

        const status = document.getElementById('saveStatus');
        if (!error) {
            status.style.color = 'green';
            status.textContent = 'Výsledek uložen.';
            form.reset();
            showResults(discipline.id, isTrack);
        } else {
            status.style.color = 'red';
            status.textContent = 'Chyba při ukládání!';
            console.error(error);
        }
    };

    const container = document.getElementById('formContainer');
    container.innerHTML = '';
    container.appendChild(form);

    showResults(discipline.id, isTrack);
}

async function showResults(disciplinaId, isTrack) {
    const { data, error } = await supabase.from('vysledky').select('*').eq('id_disciplina', disciplinaId).order('vykon', { ascending: isTrack });
    const container = document.getElementById('resultsContainer');
    if (data && data.length > 0) {
        let html = '<h3>Výsledky</h3><table border="1" cellpadding="5"><tr><th>Jméno</th><th>Příjmení</th>';
        html += isTrack ? '<th>Čas (s)</th>' : '<th>Pokus 1</th><th>Pokus 2</th><th>Pokus 3</th><th>Nejlepší</th>';
        html += '</tr>';
        data.forEach(d => {
            html += `<tr><td>${d.jmeno}</td><td>${d.prijmeni}</td>`;
            if (isTrack) {
                html += `<td>${d.vykon ?? '-'}</td>`;
            } else {
                html += `<td>${d.pokus1 ?? '-'}</td><td>${d.pokus2 ?? '-'}</td><td>${d.pokus3 ?? '-'}</td><td>${d.vykon ?? '-'}</td>`;
            }
            html += '</tr>';
        });
        html += '</table>';
        container.innerHTML = html;
    } else {
        container.innerHTML = "<p>Žádné výsledky.</p>";
    }
}

loadDisciplines();
