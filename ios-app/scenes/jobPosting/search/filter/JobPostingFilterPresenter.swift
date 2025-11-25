import Foundation

class JobPostingFilterPresenter: BasePresenter, JobPostingFilterPresenterProtocol, ServerServiceInjected {
	weak var view: JobPostingFilterViewProtocol?
    var searchForm: JobPostingForm
    var editAvailability: ( () -> Void )?
    var successfullyNotified: ( (_ jobPosting: JobPosting) -> Void )?

    init(view: JobPostingFilterViewProtocol, searchForm: JobPostingForm) {
        self.searchForm = searchForm
        super.init(baseView: view)
        self.view = view
    }

    func notify() {
        view?.showBlockingActivityIndicator()
        serverManager.postJob(searchForm) { response in
            self.view?.hideActivityIndicator()
            switch response {
            case .success(let jobPosting):
                self.successfullyNotified?(jobPosting)
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
