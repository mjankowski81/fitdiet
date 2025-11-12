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
      // Ta funkcja jest wywoływana przez kalendarz.
      // 'date1' i 'date2' mogą być obiektami Litepickera LUB natywnymi datami.
      return lockDaysWithRange(date1, date2, pickedDates);
    },
    setup: (picker) => {
      document.getElementById("days-tmp").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        // *** ZAŁOŻENIE: 'date1' to OBIEKT LITEPICKERA ***
        const days = parseInt(document.getElementById("days-tmp").value);
        if (!date2 && date1 && days != 0) {
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          // 'selected' na pewno zwraca obiekty Litepickera
          // Zapisujemy je na potrzeby 'updateDays'
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
      // Usuwamy minDays/maxDays, aby nie blokowały logiki
      if (startRangeDate) {
        // 'startRangeDate' to OBIEKT Litepickera zapisany przez 'selected'
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

/*
$(".o-form_button-submit")
  .prop("disabled", true)
  .text("Wybierz wariant")
  .css("background-color", "#ff3b30");
  */

/////////////////////////////////////////////////////////////////////

function lockDaysWithRange(date1, date2, pickedDates) {
  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0);
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0);

  /**
   * Wewnętrzna funkcja sprawdzająca z nową logiką.
   * checkWeekends = true (Sprawdza weekendy I święta)
   * checkWeekends = false (Sprawdza TYLKO święta)
   */
  function isDayLocked(date, checkWeekends = true) {
    // Ta funkcja musi obsługiwać DWA typy danych:
    // 1. Obiekt Litepickera (z `.dateInstance`)
    // 2. Natywny obiekt Date (bez `.dateInstance`)
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

    // Reguła A: Zawsze sprawdzaj święta
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true;
    }

    // Reguła B: Sprawdzaj weekendy tylko, jeśli funkcja o to poprosi
    if (checkWeekends && [6, 0].includes(d)) {
      return true;
    }

    return false;
  }

  // --- Logika filtrująca ---

  if (!date2) {
    // 1. Sprawdzanie pojedynczego kliknięcia (gdy użytkownik klika kalendarz)
    // LUB wywołanie z 'calculateRangeInfo' (z natywną datą)
    // Musimy tu blokować I weekendy, I święta.
    return isDayLocked(date1, true); // checkWeekends = true
  }

  // 2. Sprawdzanie ZAKRESU (gdy 'setDateRange' pyta o pozwolenie)
  // 'date1' i 'date2' to obiekty Litepickera.
  // Zakres BĘDZIE zawierał weekendy, więc musimy je ignorować
  // i sprawdzać TYLKO święta.
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    // Sprawdzamy, czy w zakresie jest jakieś święto
    if (isDayLocked(tempDate, false)) {
      // checkWeekends = false
      return true; // Tak, w tym zakresie jest święto, zablokuj.
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
    // Zapisujemy 'date1' jako obiekt na potrzeby 'updateDays'
    startRangeDate = date1;
    endRangeDate = date2;

    window.picker.clearSelection();
    skipRange = true;

    // *** POPRAWKA (POWRÓT DO WERSJI 2) ***
    // Przekazujemy natywną datę z OBIEKTU 'date1' i natywną datę 'date2'
    window.picker.setDateRange(date1.dateInstance, date2, false);

    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

function calculateRangeInfo(date1, date2) {
  // 'date1' to jest OBIEKT LITEPICKERA
  if (skipRange || !date1) {
    return;
  }

  let displayInfo = "";
  const days = parseInt(document.getElementById("days-tmp").value);

  if (days === 0) {
    return;
  }

  // *** POPRAWKA (POWRÓT DO WERSJI 2) ***
  // Klonujemy natywną datę z wnętrza obiektu 'date1'
  let calculatedEndDate = new Date(date1.dateInstance.valueOf());
  let validDaysCounted = 0;

  while (validDaysCounted < days) {
    // Przekazujemy natywną datę do 'lockDaysWithRange'
    let isLocked = lockDaysWithRange(calculatedEndDate, null, []);

    if (!isLocked) {
      validDaysCounted++;
    }

    if (validDaysCounted < days) {
      calculatedEndDate.setDate(calculatedEndDate.getDate() + 1);
    }
  }

  let endLoopDate = calculatedEndDate;
  let daysCount = days;

  // Przekazujemy Obiekt 'date1' i natywną 'endLoopDate'
  calculateRangeSelect(date1, endLoopDate);

  // Ta część kodu uruchamia się PO 'calculateRangeSelect',
  // więc pole 'date-info' powinno być już zaktualizowane
  displayInfo = document.getElementById("date-info").value;
  
  if (!displayInfo) {
    document.getElementById("date").value = displayInfo;
  } else {
    displayInfo += ", days: " + daysCount;
    displayInfo += " (no weekends)";
    document.getElementById("date").value = displayInfo;
  }
}

////////////////////////////////////////////////////////////////////

function setDays(value) {
  document.getElementById("days-tmp").value = value;
}