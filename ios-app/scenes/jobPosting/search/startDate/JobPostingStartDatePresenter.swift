import Foundation

class JobPostingStartDatePresenter: JobPostingBasePresenter, JobPostingStartDatePresenterProtocol {
	weak var view: JobPostingStartDateViewProtocol?

    init(view: JobPostingStartDateViewProtocol, searchForm: JobPostingForm) {
        super.init(baseView: view, searchForm: searchForm)
        self.view = view
    }
}
