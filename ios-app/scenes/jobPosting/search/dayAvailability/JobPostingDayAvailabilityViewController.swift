import UIKit

class JobPostingDayAvailabilityViewController: JobPostingBaseViewController, JobPostingDayAvailabilityViewProtocol {
	var presenter: JobPostingDayAvailabilityPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var availabilityView: AvailabilityView!

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "When do you need childcare during the day?".localized
        availabilityView.configure(delegate: self, type: .jobPosting(searchForm: presenter.searchForm))

        addNextButton()
    }

    override func onNextPressed() {
        if presenter.searchForm.availability.isAvailable() {
            presenter.showNext?(presenter.searchForm)
        }
    }
}

extension JobPostingDayAvailabilityViewController: AvailabilityViewDelegate {
    func didChangeAvailability(_ availability: Availability) {
        presenter.searchForm.availability = availability
        setNextButtonEnabled(presenter.searchForm.availability.isAvailable())
    }
}
