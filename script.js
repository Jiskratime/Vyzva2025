
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = window.supabaseClient;

async function loadDisciplines() {
    const { data, error } = await supabase.from('discipliny').select('*').order('nazev');
    const select = document.getElementById('disciplineSelect');
    if (data) {
        data.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
            select.appendChild(option);
        });
    } else {
        console.error("Chyba načítání disciplín:", error);
    }
}

loadDisciplines();
