import UIKit

class AvailabilityReminderViewController: BaseViewController {
    enum Status: String {
        case initial, initUnavailable, changed, unavailable
    }

    enum SuccessReason {
        case updated
        case confirmedNoChanges

        var title: String {
            switch self {
            case .updated:
                return "reminder.availability.success.updated.title".localized
            case .confirmedNoChanges:
                return "reminder.availability.success.confirmed.title".localized
            }
        }
        var description: String {
            switch self {
            case .updated:
                return "reminder.availability.success.updated.description".localized
            case .confirmedNoChanges:
                return "reminder.availability.success.confirmed.description".localized
            }
        }
    }

    var presenter: AvailabilityReminderPresenterProtocol!

    @IBOutlet weak var topCloseButton: UIButton!
    @IBOutlet weak var availabilityContainerView: UIView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var availabilityScrollView: UIScrollView!
    @IBOutlet weak var availabilityView: AvailabilityView!
    @IBOutlet weak var saveButton: RoundedButton!
    @IBOutlet weak var descriptionLabel: UILabel!
    @IBOutlet weak var heightConstraint: NSLayoutConstraint!
    @IBOutlet weak var availabilityHeightConstraint: NSLayoutConstraint!

    @IBOutlet weak var undoTitleLabel: UILabel!
    @IBOutlet weak var undoDescriptionLabel: UILabel!
    @IBOutlet weak var undoView: UIView!
    @IBOutlet weak var undoButton: RoundedButton!
    @IBOutlet weak var closeButton: RoundedButton!

    @IBOutlet weak var successView: UIView!
    @IBOutlet weak var successTitleLabel: UILabel!
    @IBOutlet weak var successDescriptionLabel: UILabel!
    @IBOutlet weak var succesCloseButton: RoundedButton!

    override class var storyboard: UIStoryboard {
        return .reminders
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true

        titleLabel.text = "yourAvailability".localized + "\n" + "stillCorrectChangeIfNecessary".localized
        descriptionLabel.textColor = .defaultText

        undoView.alpha = 0
        undoTitleLabel.text = "thanksNotAvailable".localized
        undoDescriptionLabel.text = "reminder.availability.unavailable.cofirmation.description".localized
        undoButton.setTitle("undo".localized, for: .normal)
        undoButton.layer.borderWidth = 16
        undoButton.layer.borderColor = UIColor.buttonSecondary.cgColor
        closeButton.setTitle("close".localized, for: .normal)
        saveButton.layer.cornerRadius = 16

        successView.alpha = 0
        succesCloseButton.setTitle("close".localized, for: .normal)

        presenter.onViewDidLoad()
    }

    @IBAction func close(_ sender: Any) {
        presenter.close()
    }

    @IBAction func save(_ sender: Any) {
        presenter.save()
    }

    @IBAction func undo(_ sender: Any) {
        presenter.undo()
    }

    @IBAction func undoClose() {
        presenter.close()
    }
}

// MARK: - AvailabilityReminderView
extension AvailabilityReminderViewController: AvailabilityReminderView {
    func configureView(for state: Status, availability: Availability, user: User) {
        topCloseButton.isHidden = !user.isParent && (state == .initUnavailable || state == .unavailable)

        let userSuffix = "\(user.isParent ? "parent" : "babysitter")"
        switch state {
        case .initial:
            titleLabel.text = "yourAvailability".localized + "\n" + "stillCorrectChangeIfNecessary".localized
            saveButton.setTitle("stillCorrect".localized, for: .normal)
            saveButton.backgroundColor = .primary500
            if let role = user.role {
                descriptionLabel.text = String(format: "higherInSearch".localized, role.localized.lowercased())
            }

        case .initUnavailable:
            titleLabel.text = "reminder.availability.initUnavailable.title.\(userSuffix)".localized
            saveButton.setTitle(user.isParent ? "save".localized : "reminder.availability.initUnavailable.button".localized, for: .normal)
            saveButton.backgroundColor = .neutral900
            descriptionLabel.text = "reminder.availability.initUnavailable.footer.\(userSuffix)".localized
        case .changed:
            if user.isParent {
                titleLabel.text = "reminder.availability.initUnavailable.title.parent".localized
            } else {
                titleLabel.text = "reminder.availability.changed.title".localized
            }

            saveButton.setTitle(user.isParent ? "save".localized : "saveChanges".localized, for: .normal)
            saveButton.backgroundColor = .primary500

            let originalAvailability = Availability()
            originalAvailability.days = presenter.originalAvailabilityDays
            if let role = user.role {
                descriptionLabel.text = originalAvailability.isAvailable() ?
                    String(format: "higherInSearch".localized, role.localized.lowercased()) :
                    "reminder.availability.changed.initUnavailable.footer.\(userSuffix)".localized
            }
        case .unavailable:
            if user.isParent {
                titleLabel.text = "reminder.availability.initUnavailable.title.parent".localized
                saveButton.setTitle("save".localized, for: .normal)
            } else {
                titleLabel.text = "reminder.availability.unavailable.title".localized
                saveButton.setTitle("reminder.availability.unavailable.button".localized, for: .normal)
            }
            saveButton.backgroundColor = .neutral900
            descriptionLabel.text = "reminder.availability.unavailable.footer.\(userSuffix)".localized
        }

        if availabilityView.type == nil {
            availabilityView.configure(delegate: self, type: .reminder(user: presenter.user, availability: availability))
        }

        availabilityContainerView.layoutIfNeeded()
        let height = min(
            availabilityContainerView.frame.height + (availabilityScrollView.contentSize.height - availabilityScrollView.frame.height),
            UIScreen.main.bounds.height - 70
        )
        heightConstraint.constant = height
        availabilityHeightConstraint.constant = height
        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.view.layoutIfNeeded()
            self?.undoView.alpha = 0
            self?.availabilityContainerView.alpha = 1
        }
    }

    func showUndoView() {
        if presenter.user.isParent {
            heightConstraint.constant = undoView.frame.height
            UIView.animate(withDuration: UIView.defaultAnimationDuration) { [weak self] in
                self?.view.layoutIfNeeded()
                self?.undoView.alpha = 1
                self?.availabilityContainerView.alpha = 0
            }
        } else {
            presenter.showDisable?()
        }
    }

    func showSuccessView(reason: SuccessReason) {
        successTitleLabel.text = reason.title
        successDescriptionLabel.text = reason.description

        heightConstraint.constant = successView.frame.height
        UIView.animate(withDuration: UIView.defaultAnimationDuration) { [weak self] in
            self?.view.layoutIfNeeded()
            self?.successView.alpha = 1
            self?.availabilityContainerView.alpha = 0
        }
    }

    func dismiss() {
        dismiss(animated: true)
    }
}

// MARK: - FilterDelegate
extension AvailabilityReminderViewController: AvailabilityViewDelegate {
    func didChangeAvailability(_ availability: Availability) {
        presenter.update(availability: availability)
    }

    func didSwitchAfterScool(value: Bool) {
         presenter.updateUser(type: .afterSchoolAvailability(isParent: presenter.user.isParent, value: value))
    }

    func didSwitchOccasionalAvailability(value: Bool) {
        presenter.updateUser(type: .occasionalAvailability(isParent: presenter.user.isParent, value: value))
    }
}
