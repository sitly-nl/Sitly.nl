import UIKit

class JobPostingAvailabilityViewController: JobPostingBaseViewController, JobPostingAvailabilityViewProtocol {
	var presenter: JobPostingAvailabilityPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var dayCareButton: CheckboxTitleView!
    @IBOutlet weak var occasionalBabysitterButton: CheckboxTitleView!
    @IBOutlet weak var afterschoolCareButton: CheckboxTitleView!

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        addNextButton()

        titleLabel.text = "whatAreYouLookingFor".localized
        dayCareButton.delegate = self
        dayCareButton.titleLabel.text = "Childcare during the day".localized
        occasionalBabysitterButton.delegate = self
        occasionalBabysitterButton.titleLabel.text = "Occasional babysitter".localized
        afterschoolCareButton.delegate = self
        afterschoolCareButton.titleLabel.text = "Afterschool care".localized

        if  let user = presenter.currentUser,
            let date = user.availabilityUpdatedDate,
            Calendar.current.dateComponents([.month], from: date, to: Date()).month ?? 0 <= 1 {
                if user.occasionalAvailability ?? false {
                    occasionalBabysitterButton.configure(for: .selected)
                } else if user.availability.isAvailable() {
                    dayCareButton.configure(for: .selected)
                }
        }

        updateNextButtonState()
    }

    func updateNextButtonState() {
        setNextButtonEnabled(anyOptionSelected())
    }

    func anyOptionSelected() -> Bool {
        return dayCareButton.isSelected || occasionalBabysitterButton.isSelected || afterschoolCareButton.isSelected
    }

// MARK: - Actions
    override func onNextPressed() {
        if anyOptionSelected() {
            presenter.searchForm.hasAfterSchool = afterschoolCareButton.isSelected
            presenter.searchForm.needsDayCare = dayCareButton.isSelected
            presenter.searchForm.occasionalCare = occasionalBabysitterButton.isSelected
            presenter.showNext?(presenter.searchForm)
        }
    }
}

extension JobPostingAvailabilityViewController: CheckboxDelegate {
    func didToggleCheck(on: Bool, sender: UIView) {
        if sender == occasionalBabysitterButton {
            if on {
                dayCareButton.configure(for: .normal)
                afterschoolCareButton.configure(for: .normal)
            }
        } else {
            if on {
                occasionalBabysitterButton.configure(for: .normal)
            }
        }

        updateNextButtonState()
    }
}
