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
          calculateRangeInfo(date1, date2);
        }
      }),
        picker.on("selected", (date1, date2) => {
          calculateRangeInfo(date1, date2);
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
    $(".o-form_radio-button .w-form-formradioinput").removeClass("w--redirected-checked");

    $(".o-form_radio-button .w-form-formradioinput").eq(0).addClass("w--redirected-checked");
  }, 10);
}

////////////////////////////////////////////////////////////////////

function updateDays(e) {
  const days = parseInt(document.getElementById("days-tmp").value);

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

/////////////////////////////////////////////////////////////////////

function lockDaysWithRange(date1, date2, pickedDates) {
  // --- 1. Definicje reguł ---

  // Zakres świąteczny (ZAWSZE blokowany)
  // Zakres: 24.12.2025 - 04.01.2026
  const rangeStart = new Date(2025, 11, 24, 0, 0, 0, 0); // 24 Grudnia 2025 (miesiąc 11)
  const rangeEnd = new Date(2026, 0, 4, 0, 0, 0, 0); // 4 Stycznia 2026 (miesiąc 0)

  // --- 2. Wewnętrzna funkcja sprawdzająca pojedynczą datę ---
  // (To upraszcza sprawdzanie obu przypadków)

  function isDayLocked(date) {
    // Używamy .dateInstance dla pewności, że to natywna data JS
    const jsDate = date.dateInstance;
    const d = jsDate.getDay(); // 0 = Niedziela, 6 = Sobota

    // Normalizujemy datę do północy dla bezpiecznego porównania
    const currentDate = new Date(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate(), 0, 0, 0, 0);

    // Reguła A: Sprawdź zakres świąteczny (zawsze aktywna)
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true; // Zablokuj
    }

    // Reguła B: Zawsze blokuj weekendy (zgodnie z oryginalną logiką tego pliku)
    if ([6, 0].includes(d)) {
      return true; // Zablokuj
    }

    // Jeśli żaden warunek nie jest spełniony, dzień jest odblokowany
    return false;
  }
  // --- Koniec funkcji wewnętrznej ---

  // --- 3. Sprawdzenie logiki dla kalendarza ---

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

  // let isDietSelected = $('input[name="juice"]:checked').length > 0;
  let displayInfo = "";
  let daysCount = 0;
  const days = parseInt(document.getElementById("days-tmp").value);

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

    if (currentDate_dow == 0 || currentDate_dow == 6) {
      if (days > 0) {
        endLoopDate = endLoopDate.addDays(1);
      }
      continue;
    }
    daysCount++;

    /*
    if (isDietSelected && date1 && date2) {
      $(".o-form_button-submit")
        .prop("disabled", false)
        .text("Dodaj do koszyka")
        .css("background-color", "#9ecb23");
    } else if (date1 && !date2) {
      $(".o-form_button-submit")
        .prop("disabled", true)
        .text("Wybierz dni dostawy")
        .css("background-color", "#ff3b30");
    } else if (!isDietSelected && date1 && date2) {
      $(".o-form_button-submit")
        .prop("disabled", true)
        .text("Wybierz wariant")
        .css("background-color", "#ff3b30");
    } else {
      $(".o-form_button-submit")
        .prop("disabled", true)
        .text("Wybierz wariant")
        .css("background-color", "#ff3b30");
    }
    */
  }

  ////////////////////////////////////////////////////////////////////

  calculateRangeSelect(date1, endLoopDate);

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
