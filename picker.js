let startRangeDate = null,
  endRangeDate = null,
  skipRange = false,
  oldDays = 0,
  defaultDays = 0;

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
      // Używamy naszej ostatecznej, poprawnej funkcji filtrowania
      return lockDaysWithRange(date1, date2, pickedDates);
    },
    setup: (picker) => {
      document.getElementById("days").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        // *** POPRAWKA ***
        // 'date1' to OBIEKT LITEPICKERA
        if (date1.dateInstance.getDay() == 0) { // Sprawdzamy natywną datę wewnątrz obiektu
          picker.clearSelection();
          return false;
        }
        const days = parseInt(document.getElementById("days").value);
        if (!date2 && date1 && days != 0) {
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          // 'selected' zwraca obiekty Litepickera
          startRangeDate = date1; // Zapisujemy cały obiekt
          endRangeDate = date2 ? date2.dateInstance : null; // Zapisujemy natywną datę
        });
    },
  });

  ////////////////////////////////////////////////////////////////////

  document.querySelector("#weeknds").addEventListener("change", function (e) {
    updateWeekends(e);
  });

  document.querySelector("#days").addEventListener("change", function (e) {
    updateDays(e);
  });

  document.querySelector("#days").addEventListener("keyup", function (e) {
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
    document.getElementById("days").value = defaultDays;
    document.querySelector('input[name="price"]').value = 0;
    window.picker.setOptions({ minDays: defaultDays, maxDays: defaultDays });
    updateWeekends(e);
    $('input[name="days"]').trigger("input");
  }, 10);
}

////////////////////////////////////////////////////////////////////

function updateWeekends(e) {
  const days = parseInt(document.getElementById("days").value);

  setTimeout(function () {
    window.picker.setOptions({
      lockDaysFilter: lockDaysWithRange,
    });

    if (days > 0 && startRangeDate) {
      // 'startRangeDate' to OBIEKT Litepickera
      calculateRangeInfo(startRangeDate, null);
    }
  }, 10);
}

////////////////////////////////////////////////////////////////////

function updateDays(e) {
  const days = parseInt(document.getElementById("days").value);

  setTimeout(function () {
    const val = parseInt(e.target.value);

    if (val > 0) {
      // Usunęliśmy ustawienie `minDays` i `maxDays`
      if (startRangeDate) {
        // 'startRangeDate' to OBIEKT Litepickera
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
document.querySelector(".o-form_button-submit").disabled = true;
document.querySelector(".o-form_button-submit").textContent =
  "Wybierz liczbę dni";

////////////////////////////////////////////////////////////////////

/**
 * Główna funkcja filtrująca dni w kalendarzu.
 * (Wersja OSTATECZNA, z logiką rozróżniania sprawdzania)
 */
function lockDaysWithRange(date1, date2, pickedDates) {
  // --- 1. Reguła blokowania na 0 dni ---
  const days = parseInt(document.getElementById("days").value);
  if (days === 0) {
    return true;
  }

  // --- 2. Definicje reguł ---
  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0);
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0);
  const includeWeekends = document.getElementById("weeknds").checked;

  // --- 3. Wewnętrzna funkcja sprawdzająca pojedynczą datę ---
  /**
   * checkScope = 'all' (Sprawdza wszystko: weekendy I święta)
   * checkScope = 'holidays' (Sprawdza TYLKO święta)
   */
  function isDayLocked(date, checkScope = 'all') {
    const jsDate = date.dateInstance ? date.dateInstance : date;
    if (isNaN(jsDate.getTime())) {
      return true;
    }

    const d = jsDate.getDay();
    const currentDate = new Date(
      jsDate.getFullYear(),
      jsDate.getMonth(),
      jsDate.getDate(),
      0,
      0,
      0,
      0
    );

    // Reguła A: Zawsze sprawdzaj święta (MA PRIORYTET)
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true;
    }

    // Reguła B: Sprawdzaj weekendy (tylko jeśli nie są świętami)
    if (checkScope === 'all' && !includeWeekends && [6, 0].includes(d)) {
      return true;
    }

    return false;
  }
  // --- Koniec funkcji wewnętrznej ---

  // --- 4. Sprawdzenie logiki dla kalendarza ---

  if (!date2) {
    // 1. Sprawdzanie pojedynczego kliknięcia LUB wywołanie z 'calculateRangeInfo'
    return isDayLocked(date1, 'all'); // checkScope = 'all'
  }

  // 2. Sprawdzanie ZAKRESU (gdy 'setDateRange' pyta o pozwolenie)
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    // Sprawdzamy, czy w zakresie jest jakieś święto
    if (isDayLocked(tempDate, 'holidays')) { // checkScope = 'holidays'
      return true;
    }
    tempDate.add(1, "day");
  }

  return false; // Zakres jest czysty (nie ma świąt).
}

////////////////////////////////////////////////////////////////////

function calculateRangeSelect(date1, date2) {
  // 'date1' to OBIEKT LITEPICKERA (z 'preselect')
  // 'date2' to NATYWNA DATA (obliczona)
  if (date1 && date2) {
    startRangeDate = date1; // Zapisujemy obiekt
    endRangeDate = date2; // Zapisujemy natywną datę

    window.picker.clearSelection();
    skipRange = true;

    // *** POPRAWKA (naprawia 'aN.aN.NaN') ***
    // Używamy natywnej daty z OBIEKTU 'date1' i natywnej daty 'date2'
    window.picker.setDateRange(date1.dateInstance, date2, false);
    
    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

/**
 * Główna funkcja obliczająca zakres (PRZEPISANA)
 */
function calculateRangeInfo(date1, date2) {
  // `date1` to jest OBIEKT LITEPICKERA
  if (skipRange || !date1) {
    return;
  }

  let displayInfo = "";
  const weekends = document.getElementById("weeknds").checked;
  const days = parseInt(document.getElementById("days").value);

  if (days === 0) {
    $(".o-form_button-submit")
      .prop("disabled", true)
      .text("Wybierz liczbę dni")
      .css("background-color", "#ff3b30");
    return;
  }

  // --- NOWA LOGIKA OBLICZANIA DATY KOŃCOWEJ ---
  
  // *** POPRAWKA (naprawia 'aN.aN.NaN') ***
  // Klonujemy natywną datę z wnętrza OBIEKTU 'date1'
  let calculatedEndDate = new Date(date1.dateInstance.valueOf()); 
  let validDaysCounted = 0;

  // Pętla szuka `days` ważnych dni dostawy
  while (validDaysCounted < days) {
    // Sprawdzamy, czy ten dzień jest zablokowany (święta LUB weekendy)
    // Przekazujemy natywną datę 'calculatedEndDate' do filtra
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

  let endLoopDate = calculatedEndDate;
  let daysCount = days;

  const emptyDays = parseInt(document.getElementById("days").value);

  if (date1 && endLoopDate && emptyDays > 0) {
    $(".o-form_button-submit")
      .prop("disabled", false)
      .text("Dodaj do koszyka")
      .css("background-color", "#9ecb23");
  } else if (emptyDays === 0) {
    $(".o-form_button-submit")
      .prop("disabled", true)
      .text("Wybierz liczbę dni")
      .css("background-color", "#ff3b30");
  } else {
    $(".o-form_button-submit")
      .prop("disabled", true)
      .text("Wybierz dni dostawy")
      .css("background-color", "#ff3b30");
  }

  // Ustawiamy obliczony zakres w kalendarzu
  // Przekazujemy Obiekt 'date1' i natywną 'endLoopDate'
  calculateRangeSelect(date1, endLoopDate);

  displayInfo = document.getElementById("date-info").value;

  if (!displayInfo) {
    document.getElementById("date").value = displayInfo;
  } else {
    displayInfo += ", days: " + daysCount;
    if (weekends) {
      displayInfo += " (weekends)";
    } else {
      displayInfo += " (no weekends)";
    }
    document.getElementById("date").value = displayInfo;
  }
}