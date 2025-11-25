import Foundation

class JobPostingAvailabilityPresenter: BasePresenter, JobPostingAvailabilityPresenterProtocol {
	weak var view: JobPostingAvailabilityViewProtocol?
    lazy var searchForm = JobPostingForm(user: currentUser ?? User(), config: ConfigService().fetch() ?? Configuration())
    var showNext: ( (_ searchForm: JobPostingForm) -> Void )?

    init(view: JobPostingAvailabilityViewProtocol) {
        super.init(baseView: view)
        self.view = view
    }
}
