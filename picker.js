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
      return lockDaysWithRange(date1, date2, pickedDates);
    },
    setup: (picker) => {
      document.getElementById("days").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        if (date1.getDay() == 0) {
          picker.clearSelection();
          return false;
        }
        const weekends = document.getElementById("weeknds").checked;
        const days = parseInt(document.getElementById("days").value);
        if (!date2 && date1 && days != 0) {
          calculateRangeInfo(date1, date2);
        }
      }),
        picker.on("selected", (date1, date2) => {
          calculateRangeInfo(date1, date2);
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
    // To jest kluczowe:
    // Ta linijka "mówi" kalendarzowi, aby przerysował się,
    // używając naszej nowej funkcji.
    window.picker.setOptions({
      lockDaysFilter: lockDaysWithRange,
    });

    // Przeliczamy zakres, jeśli jest już wybrany
    if (days > 0 && startRangeDate) {
      calculateRangeInfo(startRangeDate, startRangeDate.dateInstance.addDays(days - 1));
    } else if (startRangeDate && endRangeDate) {
      calculateRangeInfo(startRangeDate, endRangeDate);
    }
  }, 10);
}

////////////////////////////////////////////////////////////////////

function updateDays(e) {
  const days = parseInt(document.getElementById("days").value);

  setTimeout(function () {
    const val = parseInt(e.target.value);

    if (val > 0) {
      window.picker.setOptions({
        minDays: val,
        maxDays: val,
      });
      if (startRangeDate) {
        calculateRangeInfo(startRangeDate, startRangeDate.dateInstance.addDays(days - 1));
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
    updateWeekends(e);
  }, 100);
}

////////////////////////////////////////////////////////////////////

// Początkowa inicjalizacja - przycisk nieaktywny
document.querySelector(".o-form_button-submit").disabled = true;
document.querySelector(".o-form_button-submit").textContent = "Wybierz liczbę dni";

////////////////////////////////////////////////////////////////////

/**
 * Główna funkcja filtrująca dni w kalendarzu.
 * Ta funkcja jest teraz jedynym źródłem prawdy o blokadach.
 */
function lockDaysWithRange(date1, date2, pickedDates) {
  // --- 1. Reguła blokowania na 0 dni ---
  // (Zaczerpnięte z oryginalnej logiki `if (days === 0)`)
  const days = parseInt(document.getElementById("days").value);
  if (days === 0) {
    return true; // Zablokuj wszystko, jeśli suwak jest na 0
  }

  // --- 2. Definicje reguł ---

  // Zakres świąteczny (ZAWSZE blokowany)
  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0); // 24 Grudnia 2025
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0); // 4 Stycznia 2026

  // Stan checkboxa (decyduje o weekendach)
  const includeWeekends = document.getElementById("weeknds").checked;

  // --- 3. Wewnętrzna funkcja sprawdzająca pojedynczą datę ---
  // (To upraszcza sprawdzanie zakresu i pojedynczego dnia)

  function isDayLocked(date) {
    // Musimy użyć .dateInstance, aby mieć pewność, że to obiekt Daty JS
    const jsDate = date.dateInstance;
    const d = jsDate.getDay(); // 0 = Niedziela, 6 = Sobota

    // Normalizujemy datę do północy dla bezpiecznego porównania
    const currentDate = new Date(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate(), 0, 0, 0, 0);

    // Reguła A: Sprawdź zakres świąteczny (zawsze aktywna)
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true;
    }

    // Reguła B: Sprawdź weekendy (tylko jeśli checkbox jest ODZNACZONY)
    // (To jest Twoja oryginalna logika: `return [6, 0].includes(d)`)
    if (!includeWeekends && [6, 0].includes(d)) {
      return true;
    }

    // Jeśli żaden warunek nie jest spełniony, dzień jest odblokowany
    return false;
  }
  // --- Koniec funkcji wewnętrznej ---

  // --- 4. Sprawdzenie logiki dla kalendarza ---

  if (!date2) {
    // Użytkownik tylko najechał myszką na jeden dzień
    return isDayLocked(date1);
  }

  // Użytkownik wybrał zakres (od date1 do date2)
  // Musimy sprawdzić każdy dzień w tym zakresie
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    if (isDayLocked(tempDate)) {
      return true; // Znaleziono zablokowany dzień w zakresie
    }
    tempDate.add(1, "day");
  }

  // Jeśli pętla przeszła, cały zakres jest dostępny
  return false;
}

////////////////////////////////////////////////////////////////////

function calculateRangeSelect(date1, date2) {
  if (date1 && date2) {
    startRangeDate = date1;
    endRangeDate = date2;
    window.picker.clearSelection();
    skipRange = true;
    window.picker.setDateRange(date1, date2, false);
    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

function calculateRangeInfo(date1, date2) {
  if (skipRange) {
    return;
  }
  let displayInfo = "";
  let daysCount = 0;
  const weekends = document.getElementById("weeknds").checked;
  const days = parseInt(document.getElementById("days").value);
  const date1_day = date1.getDate();
  const date1_month = date1.getMonth();
  const date1_year = date1.getFullYear();
  const date1_dow = date1.getDay();

  if (!date2) {
    date2 = new Date(date1_year, date1_month, date1_day).addDays(days - 1);
  }

  const date2_day = date2.getDate();
  const date2_month = date2.getMonth();
  const date2_year = date2.getFullYear();
  const date2_dow = date2.getDay();

  const startLoopDate = new Date(date1_year, date1_month, date1_day);
  let endLoopDate = new Date(date2_year, date2_month, date2_day);

  for (var d = startLoopDate; d <= endLoopDate; d.setDate(d.getDate() + 1)) {
    let currentDate = new Date(d);
    const currentDate_day = currentDate.getDate();
    const currentDate_month = currentDate.getMonth();
    const currentDate_year = currentDate.getFullYear();
    const currentDate_dow = currentDate.getDay();

    if (!weekends && (currentDate_dow == 0 || currentDate_dow == 6)) {
      if (days > 0) {
        endLoopDate = endLoopDate.addDays(1);
      }
      continue;
    }
    daysCount++;

    // Sprawdzanie, czy zostały wybrane obie daty
    const emptyDays = parseInt(document.getElementById("days").value);

    if (date1 && date2 && emptyDays > 0) {
      $(".o-form_button-submit").prop("disabled", false).text("Dodaj do koszyka").css("background-color", "#9ecb23");
    } else if (date1 && !date2) {
      $(".o-form_button-submit").text("Wybierz dni dostawy").css("background-color", "#ff3b30");
    } else if (date1 && date2 && emptyDays === 0) {
      $(".o-form_button-submit").prop("disabled", true).text("Wybierz liczbę dni").css("background-color", "#ff3b30");
    } else {
      $(".o-form_button-submit").prop("disabled", true).text("Wybierz liczbę dni").css("background-color", "#ff3b30");
    }
  }

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
