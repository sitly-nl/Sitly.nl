import Foundation

class JobPostingAfterSchoolAvailabilityPresenter: JobPostingBasePresenter, JobPostingAfterSchoolAvailabilityPresenterProtocol {
	weak var view: JobPostingAfterSchoolAvailabilityViewProtocol?

    init(view: JobPostingAfterSchoolAvailabilityViewProtocol, searchForm: JobPostingForm) {
        super.init(baseView: view, searchForm: searchForm)
        self.view = view
    }
}
