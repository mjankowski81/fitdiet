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
        if (isInvalidStartDate(date1)) {
          picker.clearSelection();
          return false;
        }
        const days = parseInt(document.getElementById("days").value);
        if (!date2 && date1 && days != 0) {
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          if (isInvalidStartDate(date1)) {
            picker.clearSelection();
            return false;
          }
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
 * Główna funkcja filtrująca dni w kalendarzu dla testowej logiki sobót.
 * OFF: liczymy pn-pt. ON: liczymy pn-sob. Niedziele i święta są zawsze zablokowane.
 */
function lockDaysWithRange(date1, date2, pickedDates) {
  const days = parseInt(document.getElementById("days").value);
  if (days === 0) {
    return true;
  }

  if (!date2) {
    return !isCountedDeliveryDate(date1);
  }

  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    if (isHolidayDate(tempDate)) {
      return true;
    }
    tempDate.add(1, "day");
  }

  return false; // Zakres jest czysty (nie ma świąt).
}

////////////////////////////////////////////////////////////////////

function getJsDate(date) {
  return date && date.dateInstance ? date.dateInstance : date;
}

function getDateAtMidnight(date) {
  const jsDate = getJsDate(date);
  if (!jsDate || isNaN(jsDate.getTime())) {
    return null;
  }

  return new Date(
    jsDate.getFullYear(),
    jsDate.getMonth(),
    jsDate.getDate(),
    0,
    0,
    0,
    0
  );
}

function isHolidayDate(date) {
  const currentDate = getDateAtMidnight(date);
  if (!currentDate) {
    return true;
  }

  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0);
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0);

  return currentDate >= rangeStart && currentDate <= rangeEnd;
}

function includesSaturdays() {
  return document.getElementById("weeknds").checked;
}

function isInvalidStartDate(date) {
  const jsDate = getJsDate(date);
  if (!jsDate || isNaN(jsDate.getTime())) {
    return true;
  }

  const dayOfWeek = jsDate.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6 || isHolidayDate(jsDate);
}

function isCountedDeliveryDate(date) {
  const jsDate = getJsDate(date);
  if (!jsDate || isNaN(jsDate.getTime()) || isHolidayDate(jsDate)) {
    return false;
  }

  const dayOfWeek = jsDate.getDay();
  if (dayOfWeek === 0) {
    return false;
  }

  if (dayOfWeek === 6 && !includesSaturdays()) {
    return false;
  }

  return true;
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
  const saturdays = document.getElementById("weeknds").checked;
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
    if (isCountedDeliveryDate(calculatedEndDate)) {
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
    if (saturdays) {
      displayInfo += " (soboty)";
    } else {
      displayInfo += " (bez sobót)";
    }
    document.getElementById("date").value = displayInfo;
  }
}
