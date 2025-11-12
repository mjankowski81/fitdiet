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
      // Nasza funkcja 'lockDaysWithRange' musi to obsługiwać.
      if (defaultDays == 0) {
        return true;
      } else {
        return lockDaysWithRange(date1, date2, pickedDates);
      }
    },
    setup: (picker) => {
      document.getElementById("days-tmp").value = defaultDays;
      picker.on("preselect", (date1, date2) => {
        // *** WAŻNE ***
        // 'date1' z 'preselect' to jest NATYWNY OBIEKT DATE
        // (np. 19 Listopada 2025)
        // ***
        const days = parseInt(document.getElementById("days-tmp").value);
        if (!date2 && date1 && days != 0) {
          calculateRangeInfo(date1, null);
        }
      }),
        picker.on("selected", (date1, date2) => {
          // 'selected' zwraca obiekty Litepickera,
          // więc musimy zapisać natywne daty z ich wnętrza
          startRangeDate = date1 ? date1.dateInstance : null;
          endRangeDate = date2 ? date2.dateInstance : null;
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
        // 'startRangeDate' to natywna data,
        // 'calculateRangeInfo' jest na to gotowa
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

  function isDayLocked(date) {
    // Ta funkcja musi obsługiwać DWA typy danych:
    // 1. Obiekt Litepickera (z `.dateInstance`)
    // 2. Natywny obiekt Date (bez `.dateInstance`)
    const jsDate = date.dateInstance ? date.dateInstance : date;

    // Jeśli 'jsDate' jest Nieważną Datą (Invalid Date), zablokuj ją
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

    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      return true;
    }
    if ([6, 0].includes(d)) {
      return true;
    }
    return false;
  }

  // Logika dla 'lockDaysFilter'
  if (!date2) {
    // 'date1' może być natywną datą (z filtra) lub obiektem (z pętli)
    return isDayLocked(date1);
  }

  // 'date1' i 'date2' to obiekty Litepickera
  let tempDate = date1.clone();
  while (tempDate.toJSDate() <= date2.toJSDate()) {
    if (isDayLocked(tempDate)) {
      return true;
    }
    tempDate.add(1, "day");
  }

  return false;
}

////////////////////////////////////////////////////////////////////

function calculateRangeSelect(date1, date2) {
  // Otrzymujemy dwie NATYWNE daty
  if (date1 && date2) {
    // Zapisujemy je na potrzeby 'updateDays'
    startRangeDate = date1;
    endRangeDate = date2;

    window.picker.clearSelection();
    skipRange = true;

    // *** POPRAWKA ***
    // Przekazujemy dwie natywne daty. To zadziała.
    window.picker.setDateRange(date1, date2, false);

    skipRange = false;
  }
}

////////////////////////////////////////////////////////////////////

function calculateRangeInfo(date1, date2) {
  // 'date1' to jest NATYWNY OBIEKT DATE
  if (skipRange || !date1) {
    return;
  }

  let displayInfo = "";
  const days = parseInt(document.getElementById("days-tmp").value);

  if (days === 0) {
    return;
  }

  // --- POPRAWKA (TUTAJ BYŁ BŁĄD 'NaN') ---
  // Klonujemy natywną datę 'date1'
  let calculatedEndDate = new Date(date1.valueOf());
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

  // Przekazujemy natywną datę 'date1' i obliczoną 'endLoopDate'
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