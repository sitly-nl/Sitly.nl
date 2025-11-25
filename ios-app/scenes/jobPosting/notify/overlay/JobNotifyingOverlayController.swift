import UIKit

class JobNotifyingOverlayController: OverlayController {
    var showDetails: ( () -> Void )?

    private lazy var jobNotifyingView: JobNotifyingView = {
        let view = JobNotifyingView(
            type: .search,
            disclosureActions: { [weak self] in
                self?.showDetails?()
            }
        )
        view.update(jobPosting: jobPosting)
        return view
    }()

    var jobPosting: JobPosting {
        didSet {
            jobNotifyingView.update(jobPosting: jobPosting)
        }
    }

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(jobPosting: JobPosting) {
        self.jobPosting = jobPosting
        super.init(nibName: nil, bundle: nil)
    }

    override func showInitialView() {
        loadViewToContainer(jobNotifyingView)
    }
}
