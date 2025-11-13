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
      return lockDaysWithRange(date1, date2, pickedDates);
    },
    setup: (picker) => {
      document.getElementById("days").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        if (date1.getDay() == 0) {
          picker.clearSelection();
          return false;
        }
        const days = parseInt(document.getElementById("days").value);
        if (!date2 && date1 && days != 0) {
          // Wywołujemy główną funkcję logiki *tylko* przy pierwszym kliknięciu
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          // Gdy zakres jest ustawiony, musimy zaktualizować `startRangeDate`
          // aby kolejne zmiany (np. liczby dni) działały poprawnie
          startRangeDate = date1;
          endRangeDate = date2;

          // UWAGA: Usunęliśmy stąd wywołanie calculateRangeInfo,
          // aby uniknąć pętli wywołań (preselect -> setDateRange -> selected -> calculateRangeInfo)
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

    // Przeliczamy zakres, jeśli jest już wybrany
    if (days > 0 && startRangeDate) {
      // **POPRAWKA**: Zawsze wywołujemy z `null` jako date2,
      // aby funkcja `calculateRangeInfo` obliczyła wszystko na nowo.
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
      // **POPRAWKA**: Usunęliśmy ustawienie `minDays` i `maxDays`.
      // Będzie ono w konflikcie z logiką pomijania weekendów.
      // Nasza funkcja `calculateRangeInfo` ręcznie ustawi poprawny zakres.
      /*
      window.picker.setOptions({
        minDays: val,
        maxDays: val,
      });
      */

      if (startRangeDate) {
        // **POPRAWKA**: Zawsze wywołujemy z `null` jako date2,
        // aby funkcja `calculateRangeInfo` obliczyła wszystko na nowo.
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
    // Wywołanie updateWeekends(e) nie jest tu potrzebne,
    // ponieważ `calculateRangeInfo` już uwzględni weekendy.
    // updateWeekends(e);
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
    // Musimy tu blokować WSZYSTKO (weekendy I święta).
    return isDayLocked(date1, 'all'); // checkScope = 'all'
  }

  // 2. Sprawdzanie ZAKRESU (gdy 'setDateRange' pyta o pozwolenie)
  // Zakres BĘDZIE zawierał weekendy (jeśli są pomijane), więc musimy je ignorować
  // i sprawdzać TYLKO święta.
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    // Sprawdzamy, czy w zakresie jest jakieś święto
    if (isDayLocked(tempDate, 'holidays')) { // checkScope = 'holidays'
      return true; // Tak, w tym zakresie jest święto, zablokuj.
    }
    tempDate.add(1, "day");
  }

  return false; // Zakres jest czysty (nie ma świąt).
}

////////////////////////////////////////////////////////////////////

function calculateRangeSelect(date1, date2) {
  if (date1 && date2) {
    // Aktualizujemy globalne zmienne po udanym obliczeniu
    startRangeDate = date1;
    endRangeDate = date2;

    window.picker.clearSelection();
    skipRange = true;
    window.picker.setDateRange(date1, date2, false);
    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

/**
 * Główna funkcja obliczająca zakres (PRZEPISANA)
 */
function calculateRangeInfo(date1, date2) {
  // `date2` jest ignorowane, obliczamy je zawsze na nowo
  // na podstawie `date1` i liczby dni.

  if (skipRange || !date1) {
    return;
  }

  let displayInfo = "";
  const weekends = document.getElementById("weeknds").checked;
  const days = parseInt(document.getElementById("days").value);

  if (days === 0) {
    // Jeśli liczba dni to 0, zresetuj przycisk i nic nie rób
    $(".o-form_button-submit")
      .prop("disabled", true)
      .text("Wybierz liczbę dni")
      .css("background-color", "#ff3b30");
    return;
  }

  // --- NOWA LOGIKA OBLICZANIA DATY KOŃCOWEJ ---
  // Zaczynamy od daty początkowej i liczymy `days` dni roboczych
  let calculatedEndDate = new Date(date1.valueOf()); // Klonujemy datę startową
  let validDaysCounted = 0;

  // Pętla szuka `days` ważnych dni dostawy
  while (validDaysCounted < days) {
    let currentDow = calculatedEndDate.getDay();

    // Sprawdzamy, czy ten dzień jest dniem dostawy
    // 1. Jeśli "weekendy" są włączone, każdy dzień jest OK
    // 2. Jeśli "weekendy" są wyłączone, dzień NIE MOŻE być sobotą (6) ani niedzielą (0)
    let isDeliveryDay = weekends || (currentDow !== 0 && currentDow !== 6);

    // Sprawdzamy też, czy dzień nie jest zablokowany (np. święta)
    // Używamy `lockDaysWithRange` z jednym argumentem (działa jak `isDayLocked`)
    let isLocked = lockDaysWithRange(calculatedEndDate, null, []);

    if (isDeliveryDay && !isLocked) {
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

  // Sprawdzanie, czy zostały wybrane obie daty
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
    // Obsługuje !date1 (brak wybranej daty)
    $(".o-form_button-submit")
      .prop("disabled", true)
      .text("Wybierz dni dostawy")
      .css("background-color", "#ff3b30");
  }

  // Ustawiamy obliczony zakres w kalendarzu
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