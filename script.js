const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
    const { data, error } = await window.supabaseClient
        .from('discipliny')
        .select('*')
        .order('nazev');

    if (error) {
        console.error("Chyba načítání disciplín:", error);
        return;
    }

    data.forEach(d => {
        const option = document.createElement('option');
        option.value = JSON.stringify(d);
        option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
        select.appendChild(option);
    });

    select.addEventListener('change', showForm);
}

function showForm() {
    const discipline = JSON.parse(select.value);
    const isTrack = discipline.typ === 'beh';

    const form = document.createElement('form');
    form.innerHTML = `
        <h3>Zadání výsledků</h3>
        <input type="text" id="surname" placeholder="Příjmení">
        <input type="text" id="name" placeholder="Jméno">
        ${isTrack
            ? `<input type="number" id="time" placeholder="Výkon (čas v s)">`
            : `<input type="number" id="p1" placeholder="Pokus 1 (m)">
               <input type="number" id="p2" placeholder="Pokus 2 (m)">
               <input type="number" id="p3" placeholder="Pokus 3 (m)">`
        }
        <button type="submit">Uložit</button>
        <p id="saveStatus" style="color: green;"></p>
    `;

    form.onsubmit = async function (e) {
        e.preventDefault();
        const prijmeni = document.getElementById('surname').value;
        const jmeno = document.getElementById('name').value;

        let vykon = null;
        let pokusy = [null, null, null];

        if (isTrack) {
            vykon = parseFloat(document.getElementById('time').value);
        } else {
            pokusy = [
                parseFloat(document.getElementById('p1').value),
                parseFloat(document.getElementById('p2').value),
                parseFloat(document.getElementById('p3').value)
            ];
            vykon = Math.max(...pokusy.filter(x => !isNaN(x)));
        }

        const { error } = await window.supabaseClient.from('vysledky').insert([{
            id_disciplina: discipline.id,
            prijmeni,
            jmeno,
            vykon,
            pokus1: pokusy[0],
            pokus2: pokusy[1],
            pokus3: pokusy[2]
        }]);

        const status = document.getElementById('saveStatus');
        if (!error) {
            status.textContent = 'Výsledek uložen.';
            form.reset();
            showResults(discipline); // Zobrazí tabulku s výsledky
        } else {
            status.style.color = 'red';
            status.textContent = 'Chyba při ukládání!';
            console.error(error);
        }
    };

    formContainer.innerHTML = '';
    formContainer.appendChild(form);
    showResults(discipline);
}

async function showResults(discipline) {
    const isTrack = discipline.typ === 'beh';

    const { data, error } = await window.supabaseClient
        .from('vysledky')
        .select('prijmeni, jmeno, vykon, pokus1, pokus2, pokus3')
        .eq('id_disciplina', discipline.id)
        .order('vykon', { ascending: isTrack });

    if (error) {
        console.error("Chyba načítání výsledků:", error);
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th>Jméno</th><th>Příjmení</th><th>Výkon</th>
            ${!isTrack ? '<th>P1</th><th>P2</th><th>P3</th>' : ''}
            </tr>
        </thead>
        <tbody>
            ${data.map(v => `
                <tr>
                    <td>${v.jmeno}</td>
                    <td>${v.prijmeni}</td>
                    <td>${v.vykon}</td>
                    ${!isTrack ? `
                        <td>${v.pokus1 || ''}</td>
                        <td>${v.pokus2 || ''}</td>
                        <td>${v.pokus3 || ''}</td>
                    ` : ''}
                </tr>
            `).join('')}
        </tbody>
    `;

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(table);
}

loadDisciplines();
