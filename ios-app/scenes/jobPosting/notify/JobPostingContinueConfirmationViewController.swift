import UIKit

class JobPostingContinueConfirmationViewController: PopUpContainerViewController, ServerServiceInjected, UpdatesServiceInjected {
    let jobPosting: JobPosting

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(jobPosting: JobPosting) {
        self.jobPosting = jobPosting
        super.init()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let popUpView = PopUpView(
            title: "popUp.jobPosting.continue.title".localized,
            description: String(
                format: "popUp.jobPosting.continue.description.format".localized,
                DateFormatter.ddMMM.string(from: jobPosting.searchForm.startDate)),
            buttons: [
                PopUpView.ButtonType.primary.button(
                    title: "popUp.jobPosting.description.button0".localized,
                    target: self,
                    selector: #selector(onStopSelected)),
                PopUpView.ButtonType.primary.button(
                    title: "popUp.jobPosting.description.button1".localized,
                    target: self,
                    selector: #selector(onKeepNotifyingSelected))
            ])
        loadViewToContainer(popUpView)
    }

// MARK: - Actions
    @objc func onStopSelected() {
        showActivityIndicator()
        serverManager.completeJobPosting(id: jobPosting.id) {
            self.hideActivityIndicator()
            switch $0 {
            case .success:
                self.updatesService.clearJobPosting()
                self.onClosePressed()
            case .failure:
                self.showAlertFor(errorType: .serverError)
            }
        }
    }

    @objc func onKeepNotifyingSelected() {
        showActivityIndicator()
        serverManager.continueJobPosting(id: jobPosting.id) {
            self.hideActivityIndicator()
            switch $0 {
            case .success:
                self.updatesService.fetchUpdates(completion: nil)
                self.onClosePressed()
            case .failure:
                self.showAlertFor(errorType: .serverError)
            }
        }
    }
}
