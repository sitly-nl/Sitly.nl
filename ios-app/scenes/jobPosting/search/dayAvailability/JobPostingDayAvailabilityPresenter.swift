import Foundation

class JobPostingDayAvailabilityPresenter: JobPostingBasePresenter, JobPostingDayAvailabilityPresenterProtocol {
	weak var view: JobPostingDayAvailabilityViewProtocol?

    init(view: JobPostingDayAvailabilityViewProtocol, searchForm: JobPostingForm) {
        super.init(baseView: view, searchForm: searchForm)
        self.view = view
    }
}
