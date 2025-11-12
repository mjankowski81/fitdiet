let startRangeDate = null,
  endRangeDate = null,
  skipRange = false,
  oldDays = 0,
  defaultDays = 1;

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

document.addEventListener("DOMContentLoaded", function () {
  window.picker = new Litepicker({
    element: document.getElementById("date-info"),
    plugins: ["mobilefriendly"],
    lang: "pl-PL",
    format: "DD.MM.YYYY",
    // set locked date: 24*60*60*1000*2
    minDate: new Date().getTime() + 259200000,
    startDate: null,
    endDate: null,
    minDays: defaultDays,
    maxDays: defaultDays,
    selectBackward: false,
    selectForward: true,
    inlineMode: true,
    allowRepick: true,
    autoRefresh: false,
    showTooltip: true,
    singleMode: false,
    disallowLockDaysInRange: false,
    autoApply: true,
    numberOfMonths: 2,
    numberOfColumns: 2,
    mobilefriendly: {
      breakpoint: 480,
      numberOfMonths: 1,
      numberOfColumns: 1,
      singleMode: true,
    },
    tooltipText: {
      one: "dzień",
      few: "dni",
      many: "dni",
      other: "dni",
    },
    lockDaysFilter: (date1, date2, pickedDates) => {
      if (defaultDays == 0) {
        return true;
      } else {
        return lockDaysWithRange(date1, date2, pickedDates);
      }
    },
    setup: (picker) => {
      document.getElementById("days-tmp").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        const days = parseInt(document.getElementById("days-tmp").value);
        if (!date2 && date1 && days != 0) {
          // Wywołujemy logikę tylko przy pierwszym kliknięciu
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          // Tylko zapamiętujemy daty, nie wywołujemy logiki ponownie
          startRangeDate = date1;
          endRangeDate = date2;
        });
    },
  });

  document.querySelector("#days-tmp").addEventListener("change", function (e) {
    updateDays(e);
  });

  document.querySelector("#reset").addEventListener("click", function (e) {
    resetCalendar(e);
  });
});

////////////////////////////////////////////////////////////////////

function resetCalendar(e) {
  setTimeout(function () {
    startRangeDate = null;
    endRangeDate = null;
    window.picker.clearSelection();
    document.getElementById("date").value = "";
    document.getElementById("days-tmp").value = defaultDays;
    //document.querySelectorAll('[name="juice"]')[0].checked = true;
    $('input[name="juice"]').prop("checked", false);
    $('input[name="juice"]').first().prop("checked", true).trigger("change");

    window.picker.setOptions({ minDays: defaultDays, maxDays: defaultDays });
    $(".o-form_radio-wrapper .o-form_radio-button").eq(0).click();
    $(".o-form_radio-button .w-form-formradioinput").removeClass(
      "w--redirected-checked"
    );

    $(".o-form_radio-button .w-form-formradioinput")
      .eq(0)
      .addClass("w--redirected-checked");
  }, 10);
}

////////////////////////////////////////////////////////////////////

function updateDays(e) {
  const days = parseInt(document.getElementById("days-tmp").value);

  setTimeout(function () {
    const val = parseInt(e.target.value);
    if (val > 0) {
      // **POPRAWKA**: Usunęliśmy ustawienie `minDays` i `maxDays`.
      // To one powodowały konflikt i blokowanie kalendarza.
      /*
      window.picker.setOptions({
        minDays: val,
        maxDays: val,
      });
      */

      if (startRangeDate) {
        // **POPRAWKA**: Przekazujemy `null`, aby `calculateRangeInfo`
        // obliczyła wszystko na nowo od `startRangeDate`.
        calculateRangeInfo(startRangeDate, null);
      }
      if (!startRangeDate) {
        window.picker.clearSelection();
      }
    } else {
      window.picker.setOptions({
        minDays: defaultDays,
        maxDays: defaultDays,
      });
    }
  }, 100);
}

////////////////////////////////////////////////////////////////////

// Początkowa inicjalizacja - przycisk nieaktywny
/*
$(".o-form_button-submit")
  .prop("disabled", true)
  .text("Wybierz wariant")
  .css("background-color", "#ff3b30");
  */

/////////////////////////////////////////////////////////////////////

function lockDaysWithRange(date1, date2, pickedDates) {
  // --- 1. Definicje reguł ---
  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0); // 24 Grudnia 2025
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0); // 4 Stycznia 2026

  // --- 2. Wewnętrzna funkcja sprawdzająca pojedynczą datę ---
  function isDayLocked(date) {
    // --- POPRAWKA BŁĘDU ---
    // Sprawdzamy, czy 'date' to obiekt Litepickera (ma .dateInstance) czy natywna Data
    // Jeśli ma .dateInstance, użyj go. Jeśli nie, 'date' jest już natywną datą.
    const jsDate = date.dateInstance ? date.dateInstance : date;
    // --- KONIEC POPRAWKI ---

    const d = jsDate.getDay(); // 0 = Niedziela, 6 = Sobota
    const currentDate = new Date(
      jsDate.getFullYear(),
      jsDate.getMonth(),
      jsDate.getDate(),
      0,
      0,
      0,
      0
    );

    // Reguła A: Sprawdź zakres świąteczny
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true;
    }

    // Reguła B: Zawsze blokuj weekendy
    if ([6, 0].includes(d)) {
      return true;
    }

    return false;
  }
  // --- Koniec funkcji wewnętrznej ---

  // --- 3. Sprawdzenie logiki dla kalendarza ---
  if (!date2) {
    // 'date1' jest tutaj NATIVE DATE - nasza nowa funkcja isDayLocked() to obsłuży
    return isDayLocked(date1);
  }

  // 'date1' i 'date2' są tutaj LITEPICKER OBJECTS
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    // 'tempDate' jest LITEPICKER OBJECT - nasza nowa funkcja isDayLocked() to obsłuży
    if (isDayLocked(tempDate)) {
      return true;
    }
    tempDate.add(1, "day");
  }

  return false;
}

////////////////////////////////////////////////////////////////////

function calculateRangeSelect(date1, date2) {
  // date1 to obiekt Litepickera (z 'preselect')
  // date2 to natywna data (nasz obliczony 'endLoopDate')

  if (date1 && date2) {
    // Zachowujemy 'date1' jako obiekt Litepickera na potrzeby 'updateDays'
    startRangeDate = date1;
    endRangeDate = date2;

    window.picker.clearSelection();
    skipRange = true;

    // --- POPRAWKA ---
    // Używamy natywnej daty z `date1.dateInstance` oraz naszej
    // obliczonej natywnej daty `date2`. To naprawia błąd 'aN.aN.NaN'.
    window.picker.setDateRange(date1.dateInstance, date2, false);

    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

/**
 * Główna funkcja obliczająca zakres (PRZEPISANA)
 */
function calculateRangeInfo(date1, date2) {
  // `date2` jest ignorowane, obliczamy je zawsze na nowo
  if (skipRange || !date1) {
    return;
  }

  let displayInfo = "";
  // Używamy ID 'days-tmp'
  const days = parseInt(document.getElementById("days-tmp").value);

  if (days === 0) {
    return;
  }

  // --- NOWA LOGIKA OBLICZANIA DATY KOŃCOWEJ ---
  // Zaczynamy od daty początkowej i liczymy `days` dni roboczych

  // --- POPRAWKA (TUTAJ BYŁ BŁĄD 'NaN') ---
  // Musimy sklonować `date1.dateInstance` (natywną datę),
  // a nie `date1` (obiekt litepickera)
  let calculatedEndDate = new Date(date1.dateInstance.valueOf()); // Klonujemy datę startową
  let validDaysCounted = 0;

  // Pętla szuka `days` ważnych dni dostawy
  while (validDaysCounted < days) {
    // Sprawdzamy, czy dzień nie jest zablokowany (święta LUB weekendy)
    // Funkcja `lockDaysWithRange` w tym pliku zawiera obie reguły.
    let isLocked = lockDaysWithRange(calculatedEndDate, null, []);

    if (!isLocked) {
      // Ten dzień jest OK, liczymy go
      validDaysCounted++;
    }

    // Jeśli jeszcze nie znaleźliśmy wszystkich dni, przechodzimy do następnego dnia
    if (validDaysCounted < days) {
      calculatedEndDate.setDate(calculatedEndDate.getDate() + 1);
    }
  }
  // --- KONIEC NOWEJ LOGIKI ---

  // `calculatedEndDate` to teraz poprawna data końcowa
  let endLoopDate = calculatedEndDate;
  let daysCount = days; // Wiemy, że liczba dni jest poprawna

  // Zakomentowana logika przycisku - zostawiam jak było
  /*
  if (isDietSelected && date1 && date2) {
      ...
  } else {
      ...
  }
  */

  // Ustawiamy obliczony zakres w kalendarza
  // Przekazujemy (Obiekt Litepicker, Natywna Data)
  calculateRangeSelect(date1, endLoopDate);

  displayInfo = document.getElementById("date-info").value;
  if (!displayInfo) {
    document.getElementById("date").value = displayInfo;
  } else {
    displayInfo += ", days: " + daysCount;
    // W tym pliku weekendy są zawsze pomijane
    displayInfo += " (no weekends)";
    document.getElementById("date").value = displayInfo;
  }
}

////////////////////////////////////////////////////////////////////

function setDays(value) {
  document.getElementById("days-tmp").value = value;
}