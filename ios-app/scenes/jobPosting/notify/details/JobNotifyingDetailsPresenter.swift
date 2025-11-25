import Foundation

class JobNotifyingDetailsPresenter: BasePresenter, JobNotifyingDetailsPresenterProtocol, ServerServiceInjected, UpdatesServiceInjected {
	weak var view: JobNotifyingDetailsViewProtocol?
    var showBabysitters: (() -> Void)?
    var onJobPostingStopped: ((_ jobPosting: JobPosting) -> Void)?
    var onSwitchToDailyUpdates: (() -> Void)?
    let jobPosting: JobPosting
    private let userService: UserServiceable = UserService()

    init(view: JobNotifyingDetailsViewProtocol, jobPosting: JobPosting) {
        self.jobPosting = jobPosting
        super.init(baseView: view)
        self.view = view
    }

    func autoStopPosting() {
        if jobPosting.state == .finished {
            serverManager.completeJobPosting(id: jobPosting.id) { _ in }
            updatesService.clearJobPosting()
        }
    }

    func stop() {
        view?.showActivityIndicator()
        serverManager.completeJobPosting(id: jobPosting.id) {
            self.view?.hideActivityIndicator()
            switch $0 {
            case .success:
                self.updatesService.clearJobPosting()
                self.onJobPostingStopped?(self.jobPosting)
            case .failure(let error):
                self.handleError(error)
            }
        }
    }

    func enableDailyUpdates() {
        view?.showActivityIndicator()
        userService.updateMe(type: .emailUpdatesInterval(.daily)) {
            self.view?.hideActivityIndicator()
            switch $0 {
            case .success:
                self.autoStopPosting()
                self.onSwitchToDailyUpdates?()
            case .failure(let error):
                self.handleError(error)
            }
        }
    }
}
