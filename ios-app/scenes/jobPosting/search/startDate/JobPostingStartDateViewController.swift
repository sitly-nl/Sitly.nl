import UIKit

class JobPostingStartDateViewController: JobPostingBaseViewController, JobPostingStartDateViewProtocol {
	var presenter: JobPostingStartDatePresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var dateSelector: SelectorView!

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        addNextButton()

        titleLabel.text = "From when?".localized

        dateSelector.replaceTitleWithValue = true
        dateSelector.color = UIColor.neutral900
        dateSelector.type = .date

        let minDate = Calendar.current.date(byAdding: .hour, value: 24, to: Date()) ?? Date()
        let maxDate = Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()
        dateSelector.datePicker.minimumDate = minDate
        dateSelector.configure(
            date: Swift.max(minDate, presenter.searchForm.startDate), dateFormat: "dd / MM / yyyy", maximumDate: maxDate, showInitialValue: true
        )
    }

    override func onNextPressed() {
        presenter.searchForm.startDate = dateSelector.datePicker.date
        presenter.showNext?(presenter.searchForm)
    }
}
