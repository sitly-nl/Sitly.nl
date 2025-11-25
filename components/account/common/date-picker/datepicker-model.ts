export abstract class DatepickerModel {
    availableDays: number[] = [];
    availableMonths: number[] = [];
    availableYears: number[] = [];

    constructor(
        public selectedDay: number,
        public selectedMonth: number,
        public selectedYear: number,
    ) {
        this.selectedDay = selectedDay || 0;
        this.selectedMonth = selectedMonth || 0;
        this.selectedYear = selectedYear || 0;
    }

    abstract getAvailableDays(): number[];
    abstract getAvailableMonths(): number[];
    abstract getAvailableYears(): number[];

    protected onInit() {
        this.availableDays = this.getAvailableDays();
        this.availableMonths = this.getAvailableMonths();
        this.availableYears = this.getAvailableYears();
    }

    updateDay(day: string) {
        this.selectedDay = parseInt(day);
    }

    updateMonth(month: string) {
        this.selectedMonth = parseInt(month);
        this.availableDays = this.getAvailableDays();
    }

    updateYear(year: string) {
        this.selectedYear = parseInt(year);
        this.availableDays = this.getAvailableDays();
        this.availableMonths = this.getAvailableMonths();
    }
}

export class MinMaxYearModel extends DatepickerModel {
    // eslint-disable-next-line max-params
    constructor(
        selectedDay: number,
        selectedMonth: number,
        selectedYear: number,
        private minYear: number,
        private maxYear: number,
        private yearOrder = 'desc',
        private restrictDateToYear = false,
    ) {
        super(selectedDay, selectedMonth, selectedYear);
        this.onInit();
    }

    getAvailableDays() {
        const availableDays: number[] = [];
        let numberOfDays = 31;
        let endDay = 1;

        const currentMonth = new Date().getMonth() + 1;

        if (this.selectedMonth && this.selectedYear) {
            numberOfDays = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
            if (this.selectedYear === this.maxYear && this.selectedMonth === currentMonth && this.restrictDateToYear) {
                endDay = new Date().getDate();
                if (endDay < numberOfDays) {
                    numberOfDays = endDay;
                }
            }
        } else if (this.selectedMonth) {
            const currentDate = new Date();
            numberOfDays = new Date(currentDate.getFullYear(), this.selectedMonth, 0).getDate();
        }

        for (let x = 1; x <= numberOfDays; x++) {
            availableDays.push(x);
        }

        return availableDays;
    }

    getAvailableMonths() {
        const availableMonths: number[] = [];
        let endMonth = 12;

        if (this.selectedYear && this.selectedYear === this.maxYear && this.restrictDateToYear) {
            endMonth = new Date().getMonth() + 1;
        }

        for (let x = 1; x <= endMonth; x++) {
            availableMonths.push(x);
        }

        return availableMonths;
    }

    getAvailableYears() {
        const availableYears: number[] = [];
        if (availableYears.length === 0) {
            if (this.yearOrder === 'desc') {
                for (let x = this.maxYear; x >= this.minYear; x--) {
                    availableYears.push(x);
                }
            } else {
                for (let x = this.minYear; x <= this.maxYear; x++) {
                    availableYears.push(x);
                }
            }
        }
        return availableYears;
    }
}

export class MinMaxDateModel extends DatepickerModel {
    // eslint-disable-next-line max-params
    constructor(
        selectedDay: number,
        selectedMonth: number,
        selectedYear: number,
        private minDate: Date,
        private maxDate: Date,
        private yearOrder = 'desc',
    ) {
        super(selectedDay, selectedMonth, selectedYear);
        this.onInit();
    }

    getDaysInMonth(monthNumber: number, yearNumber: number) {
        return new Date(yearNumber, monthNumber, 0).getDate();
    }

    getAvailableDays() {
        let numberOfDays = 31;
        let startDay = 1;

        if (this.selectedMonth && this.selectedYear) {
            numberOfDays = this.getDaysInMonth(this.selectedMonth, this.selectedYear);

            if (Number(this.selectedYear) === this.minDate.getFullYear() && Number(this.selectedMonth) === this.minDate.getMonth() + 1) {
                startDay = this.minDate.getDate();
            }
            if (Number(this.selectedYear) === this.maxDate.getFullYear() && Number(this.selectedMonth) === this.maxDate.getMonth() + 1) {
                numberOfDays = this.maxDate.getDate();
            }
        } else if (this.selectedMonth) {
            const currentDate = new Date();
            numberOfDays = this.getDaysInMonth(this.selectedMonth, currentDate.getFullYear());
        }

        return Array.from({ length: numberOfDays }, (_, i) => i + startDay);
    }

    getAvailableMonths() {
        let startMonth = 1;
        let endMonth = 12;

        if (this.selectedYear && Number(this.selectedYear) === this.minDate.getFullYear()) {
            startMonth = this.minDate.getMonth() + 1;
        }

        if (this.selectedYear && Number(this.selectedYear) === this.maxDate.getFullYear()) {
            endMonth = this.maxDate.getMonth() + 1;
        }

        return Array.from({ length: endMonth }, (_, i) => i + startMonth);
    }

    getAvailableYears() {
        const arrayLength = this.maxDate.getFullYear() - this.minDate.getFullYear() + 1;
        if (arrayLength <= 0) {
            return [];
        }

        if (this.yearOrder === 'desc') {
            return Array.from({ length: arrayLength }, (_, i) => this.maxDate.getFullYear() - i);
        } else {
            return Array.from({ length: arrayLength }, (_, i) => i + this.minDate.getFullYear());
        }
    }

    updateDay(day: string) {
        this.selectedDay = parseInt(day);
    }

    updateMonth(month: string) {
        this.selectedMonth = parseInt(month);
        this.availableDays = this.getAvailableDays();
        if (!this.availableDays.includes(this.selectedDay)) {
            this.selectedDay = 0;
        }
    }

    updateYear(year: string) {
        this.selectedYear = parseInt(year);
        this.availableDays = this.getAvailableDays();
        this.availableMonths = this.getAvailableMonths();
        if (!this.availableDays.includes(this.selectedDay)) {
            this.selectedDay = 0;
        }
        if (!this.availableMonths.includes(this.selectedMonth)) {
            this.selectedMonth = 0;
        }
    }
}
