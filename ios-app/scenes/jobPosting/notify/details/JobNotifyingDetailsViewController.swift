import UIKit

class JobNotifyingDetailsViewController: BaseViewController, JobNotifyingDetailsViewProtocol {
	var presenter: JobNotifyingDetailsPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var detailsLabel1: UILabel!
    @IBOutlet weak var detailsLabel2: UILabel!
    @IBOutlet weak var expandButton: UIButton!
    @IBOutlet weak var detailsLabel3: UILabel!
    @IBOutlet weak var viewBabysittersButton: UIButton!
    @IBOutlet weak var receiveDailyUpdatesButton: UIButton!
    @IBOutlet weak var stopSearchButton: UIButton!

    private var expanded = false {
        didSet {
            UIView.animate(withDuration: UIView.defaultAnimationDuration) {
                self.detailsLabel2.isHidden = !self.expanded
            }
            expandButton.setTitle((expanded ? "- " : "+ ") + "details & info".localized, for: .normal)
        }
    }

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "You posted a job:".localized
        detailsLabel1.text = presenter.jobPosting.searchForm.description
        detailsLabel2.attributedText = presenter.jobPosting.attributedDescription
        viewBabysittersButton.setTitle("View available babysitters".localized, for: .normal)
        receiveDailyUpdatesButton.setTitle("Receive daily babysitter updates".localized, for: .normal)
        stopSearchButton.setTitle("Stop this job search".localized, for: .normal)

        expanded = false

        update()
    }

    override func handleBackButtonPress() {
        super.handleBackButtonPress()
        presenter.autoStopPosting()
    }

    private func update() {
        detailsLabel3.isHidden = false
        receiveDailyUpdatesButton.isHidden = true

        switch presenter.jobPosting.state {
        case .initial:
            if presenter.jobPosting.availableBabysittersCount == 0 {
                detailsLabel3.isHidden = true
            } else {
                detailsLabel3.text = String(
                    format: "%d babysitters indicated they’re available for this job!".localized,
                    presenter.jobPosting.availableBabysittersCount
                )
            }
        case .finished:
            if presenter.jobPosting.availableBabysittersCount == 0 {
                if presenter.currentUser?.automatchMailInterval == .daily {
                    detailsLabel3.text = "jobPosting.details.stopped.noBabysitters.daily.description".localized
                } else {
                    detailsLabel3.text = "jobPosting.details.stopped.noBabysitters.weekly.description".localized
                    receiveDailyUpdatesButton.isHidden = false
                }
            } else {
                detailsLabel3.text = String(
                    format: "%d babysitters indicated they’re available for this job!".localized,
                    presenter.jobPosting.availableBabysittersCount
                )
                    + "\n"
                    + "Let them know if you're interested or not in one click.".localized
            }
        case .completedSuccessfully, .completedUnsuccessfully:
            break
        }

        viewBabysittersButton.isHidden = (presenter.jobPosting.availableBabysittersCount == 0)
        stopSearchButton.isHidden = (presenter.jobPosting.state != .initial)
    }

    @IBAction func onExpandPressed() {
        expanded = !expanded
    }

    @IBAction func onViewBabysittersPressed() {
        presenter.showBabysitters?()
    }

    @IBAction func onReceiveDailyUpdatesPressed() {
        presenter.enableDailyUpdates()
    }

    @IBAction func onStopSearchPressed() {
        presenter.stop()
    }
}
