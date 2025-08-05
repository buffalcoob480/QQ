
function generarIndicacionDosis(dosis, frecuencia, dias, presentacion) {
    const unidad = presentacion.includes("gota") ? "gotas" : "mL";
    const via = "vía oral";
    return `${dosis} ${unidad} ${via} cada ${frecuencia} horas por ${dias} días`;
}


document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DE LA APLICACIÓN ---
    const state = {
        medications: [],
        view: 'medications',
        activeFamily: 'Todos',
        activeTheme: null,
    };

    // --- SELECTORES DEL DOM ---
    const selectors = {
        medicationSection: document.getElementById('medication-section'),
        themesSection: document.getElementById('themes-section'),
        medicationList: document.getElementById('medication-list'),
        searchBar: document.getElementById('searchBar'),
        noResults: document.getElementById('no-results'),
        familyFilterContainer: document.getElementById('familyFilterContainer'),
        themesFilterContainer: document.getElementById('themesFilterContainer'),
        familiesDropdownBtn: document.getElementById('families-dropdown-btn'),
        familiesBtnText: document.getElementById('families-btn-text'),
        themesDropdownBtn: document.getElementById('themes-dropdown-btn'),
        familiesDropdownPanel: document.getElementById('families-dropdown-panel'),
        themesDropdownPanel: document.getElementById('themes-dropdown-panel'),
        modal: document.getElementById('medicationModal'),
        modalContent: document.getElementById('modal-content-wrapper'),
        cardTemplate: document.getElementById('medication-card-template'),
        medCount: document.getElementById('med-count'),
        loadingIndicator: document.getElementById('loading-indicator'),
    };

    // --- FUNCIÓN DE "DEBOUNCE" PARA OPTIMIZAR LA BÚSQUEDA ---
    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };
    const debouncedSearch = debounce(() => updateDisplay());

    // --- LÓGICA PRINCIPAL DE VISUALIZACIÓN ---
    function updateDisplay() {
        const searchTerm = normalizeText(selectors.searchBar.value);
        let results = [];

        if (searchTerm) {
            state.view = 'medications';
            results = state.medications.map(med => ({
                ...med,
                score: calculateRelevance(med, searchTerm)
            }))
            .filter(med => med.score > 0)
            .sort((a, b) => b.score - a.score);
        } else {
            if (state.view === 'medications') {
                results = state.activeFamily === 'Todos'
                    ? state.medications
                    : state.medications.filter(med => med.simpleFamily === state.activeFamily);
            }
        }
        
        if (state.view === 'medications') renderMedications(results);
        
        selectors.medicationSection.classList.toggle('hidden', state.view !== 'medications');
        selectors.themesSection.classList.toggle('hidden', state.view !== 'themes');
        
        if (state.view === 'themes') {
            document.querySelectorAll('.theme-content').forEach(tc => tc.classList.add('hidden'));
            if (state.activeTheme) document.getElementById(`theme-${state.activeTheme}`).classList.remove('hidden');
        }
        updateActiveButtons();
    }

    function calculateRelevance(med, term) {
        let score = 0;
        const normName = normalizeText(med.name);
        if (normName === term) score += 20;
        else if (normName.startsWith(term)) score += 10;
        else if (normName.includes(term)) score += 5;
        if (normalizeText(med.simpleFamily).includes(term)) score += 3;
        if (normalizeText(med.uses).includes(term)) score += 2;
        if (normalizeText(med.indications).includes(term)) score += 1;
        return score;
    }

    function updateActiveButtons() {
        document.querySelectorAll('#familyFilterContainer .filter-btn').forEach(btn => btn.classList.toggle('active', state.view === 'medications' && btn.dataset.family === state.activeFamily));
        document.querySelectorAll('#themesFilterContainer .theme-btn').forEach(btn => btn.classList.toggle('active', state.view === 'themes' && btn.dataset.theme === state.activeTheme));
        
        if (state.view === 'medications' && state.activeFamily !== 'Todos') {
            selectors.familiesBtnText.textContent = `Familia: ${state.activeFamily}`;
        } else {
            selectors.familiesBtnText.textContent = 'Familias de Medicamentos';
        }
    }

    function renderMedications(meds) {
        selectors.loadingIndicator.classList.add('hidden');
        selectors.medicationList.innerHTML = '';
        selectors.noResults.classList.toggle('hidden', meds.length === 0);
        meds.forEach(med => {
            const cardClone = selectors.cardTemplate.content.cloneNode(true);
            const cardElement = cardClone.querySelector('article');
            cardElement.dataset.originalIndex = med.originalIndex;
            cardElement.querySelector('.card-img').src = med.image;
            cardElement.querySelector('.card-name').textContent = med.name;
            cardElement.querySelector('.card-presentation').textContent = med.presentation;
            cardElement.querySelector('.card-family').textContent = med.family;
            cardElement.querySelector('.card-uses').textContent = med.uses;
            selectors.medicationList.appendChild(cardElement);
        });
    }

    function openModal(med) {
        let calculatorHtml = '';
        if (med.isCalculable) {
            calculatorHtml = `<div class="mt-6 pt-6 border-t border-slate-200"><h4 class="text-base font-semibold text-slate-800 mb-2">Calculadora de Dosis Pediátrica</h4><div class="flex items-center space-x-3"><input type="number" placeholder="Peso en kg" class="weight-input-modal border border-slate-300 rounded-md p-2 w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><button class="calculate-btn-modal bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Calcular</button></div><div class="result-div-modal mt-3 text-blue-800 font-semibold text-sm p-3 bg-blue-50 rounded-md min-h-[44px]"></div></div>`;
        }
        selectors.modalContent.innerHTML = `<div class="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10"><h3 id="modalTitle" class="text-xl font-bold text-slate-900">${med.name} - ${med.presentation}</h3><button id="closeModalBtn" aria-label="Cerrar modal" class="text-slate-400 hover:text-slate-800 text-3xl">&times;</button></div><div class="overflow-y-auto p-6"><p class="text-lg font-semibold text-blue-600 mb-4">${med.family}</p><div class="space-y-3 text-sm text-slate-700"><p><strong class="font-semibold text-slate-900">Usos:</strong> ${med.uses}</p><p><strong class="font-semibold text-slate-900">Indicaciones:</strong> ${med.indications}</p><p><strong class="font-semibold text-slate-900">Dosis Adulto:</strong> ${med.dose_adult}</p><p><strong class="font-semibold text-slate-900">Dosis Pediátrica:</strong> ${med.dose_pediatric}</p><p><strong class="font-semibold text-red-600">Contraindicaciones:</strong> ${med.contraindications}</p></div>${calculatorHtml}</div>`;
        selectors.modal.classList.remove('hidden');
        setTimeout(() => selectors.modalContent.classList.remove('scale-95', 'opacity-0'), 10);
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        if (med.isCalculable) document.querySelector('.calculate-btn-modal').addEventListener('click', () => calculateDose(med));
    }

    function closeModal() {
        selectors.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => selectors.modal.classList.add('hidden'), 300);
    }
    
    function calculateDose(med) {
        const weightInput = selectors.modalContent.querySelector('.weight-input-modal');
        const resultDiv = selectors.modalContent.querySelector('.result-div-modal');
        const weight = parseFloat(weightInput.value);
        if (!weight || weight <= 0) {
            resultDiv.innerHTML = '<span class="text-red-500">Ingrese un peso válido.</span>'; return;
        }
        let resultText = '';
        if (med.doseMin_mg_kg_dia) {
            const intervals = parseInt(String(med.doseIntervals).split('-').pop(), 10);
            const minMlPerTake = (weight * med.doseMin_mg_kg_dia / med.concentration) / intervals;
            const maxMlPerTake = (weight * med.doseMax_mg_kg_dia / med.concentration) / intervals;
            resultText = `Administrar <strong>${minMlPerTake.toFixed(2)} a ${maxMlPerTake.toFixed(2)} ml</strong> por toma (${med.doseIntervals} veces al día).`;
        } else if (med.doseMin_mg_kg_dosis) {
            const minMl = (weight * med.doseMin_mg_kg_dosis) / med.concentration;
            const maxMl = (weight * med.doseMax_mg_kg_dosis) / med.concentration;
            const frequencyText = med.doseFreq ? ` cada ${Math.round(24 / med.doseFreq)} horas.` : '.';
            resultText = `Dosis: <strong>${minMl.toFixed(2)} a ${maxMl.toFixed(2)} ml</strong>${frequencyText}`;
        }
        resultDiv.innerHTML = resultText;
    }

    async function initializeApp() {
        try {
            const response = await fetch('medicamentos.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const rawMedications = await response.json();
            state.medications = rawMedications.map((med, index) => ({...med, originalIndex: index, image: `https://placehold.co/400x200/e0f2fe/083344?text=${encodeURIComponent(`${med.name}\\n${med.presentation}`)}&font=inter`}));
            selectors.medCount.textContent = state.medications.length;
            initFilters();
            initEventListeners();
            updateDisplay();
        } catch (error) {
            console.error("Initialization failed:", error);
            selectors.loadingIndicator.textContent = "Error: No se pudo cargar la información.";
            selectors.loadingIndicator.classList.add('text-red-600');
        }
    }

    function initFilters() {
        const families = ['Todos', ...new Set(state.medications.map(med => med.simpleFamily).sort())];
        selectors.familyFilterContainer.innerHTML = families.map(f => `<button class="filter-btn" data-family="${f}">${f}</button>`).join('');
        
        const themes = [ 
            { id: 'gpc-insulina', name: 'Guía Clínica de Insulinoterapia' },
            { id: 'dm2-inicio', name: 'Manejo Inicial DM2' },
            { id: 'crisis-hipertensivas', name: 'Crisis Hipertensivas' },
            { id: 'nac', name: 'Neumonía (NAC)' },
            { id: 'asma', name: 'Crisis Asmática' }
        ];
        selectors.themesFilterContainer.innerHTML = themes.map(t => `<button class="theme-btn" data-theme="${t.id}">${t.name}</button>`).join('');
    }

    function initEventListeners() {
        selectors.searchBar.addEventListener('input', debouncedSearch);
        selectors.medicationList.addEventListener('click', e => {
            const card = e.target.closest('[data-original-index]');
            if (card) {
                const medication = state.medications.find(m => m.originalIndex === parseInt(card.dataset.originalIndex, 10));
                if (medication) openModal(medication);
            }
        });
        selectors.familiesDropdownBtn.addEventListener('click', e => { e.stopPropagation(); toggleDropdown('families'); });
        selectors.themesDropdownBtn.addEventListener('click', e => { e.stopPropagation(); toggleDropdown('themes'); });
        selectors.familyFilterContainer.addEventListener('click', e => {
            if (e.target.matches('.filter-btn')) {
                state.view = 'medications'; state.activeFamily = e.target.dataset.family; state.activeTheme = null;
                selectors.searchBar.value = ''; updateDisplay(); closeDropdowns();
            }
        });
        selectors.themesFilterContainer.addEventListener('click', e => {
            if (e.target.matches('.theme-btn')) {
                state.view = 'themes'; state.activeTheme = e.target.dataset.theme; state.activeFamily = 'Todos';
                updateDisplay(); closeDropdowns();
            }
        });
        document.addEventListener('click', () => closeDropdowns());
        selectors.modal.addEventListener('click', e => { if (e.target.id === 'medicationModal') closeModal(); });
    }
    
    function toggleDropdown(type) {
        const isFamilies = type === 'families';
        selectors.familiesDropdownPanel.classList.toggle('is-open', isFamilies ? undefined : false);
        selectors.familiesDropdownBtn.classList.toggle('active', isFamilies ? undefined : false);
        selectors.themesDropdownPanel.classList.toggle('is-open', !isFamilies ? undefined : false);
        selectors.themesDropdownBtn.classList.toggle('active', !isFamilies ? undefined : false);
    }
    
    function closeDropdowns() {
        // CORRECCIÓN: Se cambió 'is--open' a 'is-open'
        selectors.familiesDropdownPanel.classList.remove('is-open');
        selectors.themesDropdownPanel.classList.remove('is-open');
        selectors.familiesDropdownBtn.classList.remove('active');
        selectors.themesDropdownBtn.classList.remove('active');
    }
    
    function normalizeText(str) { 
        if (!str) return '';
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    initializeApp();
});



// Fragmento agregado dentro del cálculo de dosis pediátrica
function generarLeyendaDosis(medicamento, dosisCalculada, frecuenciaHoras) {
    let presentacion = medicamento.presentacion.toLowerCase();
    let unidad = presentacion.includes("gota") ? "gotas" : "mL";

    // Determinar duración automática según categoría o nombre del medicamento
    let diasTratamiento = 5; // valor por defecto
    let nombre = medicamento.nombre.toLowerCase();

    if (nombre.includes("amoxicilina") || nombre.includes("penicilina") || nombre.includes("azitromicina")) {
        diasTratamiento = 7;
    } else if (nombre.includes("ibuprofeno") || nombre.includes("naproxeno")) {
        diasTratamiento = 3;
    } else if (nombre.includes("paracetamol") || nombre.includes("acetaminofén")) {
        diasTratamiento = 2;
    }

    // Redondeo de dosis para presentación más clara
    let dosisRedondeada = Math.round(dosisCalculada * 10) / 10;

    return `${dosisRedondeada} ${unidad} vía oral cada ${frecuenciaHoras} horas por ${diasTratamiento} días`;
}

// Integración con la función existente (ejemplo general, requiere adaptación al flujo real)


function mostrarDosisFinal(dosis, frecuencia, dias, presentacion) {
    const leyenda = generarIndicacionDosis(dosis, frecuencia, dias, presentacion);
    const resultadoDiv = document.getElementById("resultado-dosis");
    if (resultadoDiv) {
        resultadoDiv.innerHTML = `
            <p class="mt-4 text-lg font-semibold text-green-700">${leyenda}</p>
            <button onclick="copiarIndicacion('${leyenda}')" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Copiar indicación
            </button>
        `;
    }
}

function copiarIndicacion(texto) {
    navigator.clipboard.writeText(texto)
        .then(() => alert("✅ Indicación copiada al portapapeles"))
        .catch(() => alert("❌ Error al copiar la indicación"));
}
</p>`;
    }
}




function calcularHidratacion() {
    const peso = parseFloat(document.getElementById("peso-hidratacion").value);
    if (!peso || peso <= 0) return alert("Ingresa un peso válido.");
    const mantenimiento = peso < 10 ? peso * 100 :
                         peso <= 20 ? (10 * 100) + ((peso - 10) * 50) :
                         (10 * 100) + (10 * 50) + ((peso - 20) * 20);
    const deficit = peso * 50; // 50 mL/kg como ejemplo moderado
    const total = mantenimiento + deficit;
    const res = `Mantenimiento: ${mantenimiento.toFixed(0)} mL/día | Déficit: ${deficit.toFixed(0)} mL | Total: ${total.toFixed(0)} mL en 24h`;
    document.getElementById("resultado-hidratacion").innerText = res;
}

function calcularIbuprofeno() {
    const peso = parseFloat(document.getElementById("peso-ibuprofeno").value);
    if (!peso || peso <= 0) return alert("Ingresa un peso válido.");
    const dosis = peso * 10; // 10 mg/kg/dosis
    const gotas = dosis / 20; // suponiendo 100 mg/5 mL = 20 mg/mL => 1 gota = 1 mg (aprox)
    const texto = `Dosis: ${dosis.toFixed(1)} mg cada 8 h (~${gotas.toFixed(0)} gotas)`;
    document.getElementById("resultado-ibuprofeno").innerText = texto;
}
