import UIKit

protocol AvailabilityViewDelegate: AnyObject {
    func didChangeAvailability(_ availability: Availability)
    func didSwitchRegularAvailability(value: Bool)
    func didSwitchOccasionalAvailability(value: Bool)
    func didSwitchAfterScool(value: Bool)
}

extension AvailabilityViewDelegate {
    func didSwitchRegularAvailability(value: Bool) {}
    func didSwitchAfterScool(value: Bool) {}
    func didSwitchOccasionalAvailability(value: Bool) {}
}

enum AvailabilityViewType {
    case filter(searchForm: SearchForm)
    case jobPosting(searchForm: SearchForm)
    case editProfile(user: User)
    case signUp(user: User)
    case reminder(user: User, availability: Availability)

    var availability: Availability {
        switch self {
        case .filter(let searchForm), .jobPosting(let searchForm):
            return searchForm.availability
        case .editProfile(let user), .signUp(let user):
            return user.availability
        case .reminder(_, let availability):
            return availability
        }
    }

    var availableForAfterSchool: Bool {
        switch self {
        case .filter(let searchForm), .jobPosting(let searchForm):
            return searchForm.hasAfterSchool
        case .editProfile(let user), .signUp(let user), .reminder(let user, _):
            return user.afterSchoolAvailability ?? false
        }
    }

    var regularAvailability: Bool {
        switch self {
        case .filter(let searchForm), .jobPosting(let searchForm):
            return searchForm.regularCare
        case .editProfile(let user), .signUp(let user), .reminder(let user, _):
            return user.regularAvailability ?? false
        }
    }

    var occasionlaAvailability: Bool {
        switch self {
        case .filter(let searchForm), .jobPosting(let searchForm):
            return searchForm.occasionalCare
        case .editProfile(let user), .signUp(let user), .reminder(let user, _):
            return user.occasionalAvailability ?? false
        }
    }

    var userRole: Role {
        switch self {
        case .filter(let searchForm), .jobPosting(let searchForm):
            return searchForm.role
        case .editProfile(let user), .signUp(let user), .reminder(let user, _):
            return user.role ?? .parent
        }
    }

    var showTitle: Bool {
        switch self {
        case .reminder, .signUp, .jobPosting:
            return false
        default:
            return true
        }
    }

    var showRegularAvailability: Bool {
        switch self {
        case .editProfile:
            return userRole != .childminder
        case .filter(let searchForm):
            return searchForm.showRegularAndOccasionalCare
        default:
            return false
        }
    }

    var showOccasionalAvailability: Bool {
        switch self {
        case .filter(let searchForm):
            return searchForm.showRegularAndOccasionalCare
        case .editProfile, .reminder:
            return userRole != .childminder
        default:
            return false
        }
    }

    var showAfterSchool: Bool {
        switch self {
        case .editProfile, .reminder, .filter:
            return true
        case .signUp, .jobPosting:
            return false
        }
    }

    var showSeparator: Bool {
        if case .filter = self {
            return true
        }
        return false
    }
}

class AvailabilityView: UIView, DayAvailabilityCollectionViewCellDelegate, CheckboxDelegate {
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var daysCollectionViewContainer: UIView!
    @IBOutlet private weak var daysCollectionView: UICollectionView!
    @IBOutlet private weak var regularAvailabilityContainerView: UIView!
    @IBOutlet private weak var regularAvailabilityView: CheckboxTitleView!
    @IBOutlet private weak var occasionalAvailabilityContainerView: UIView!
    @IBOutlet private weak var occasionalAvailabilityView: CheckboxTitleView!
    @IBOutlet private weak var afterSchoolContainerView: UIView!
    @IBOutlet private weak var afterSchoolView: CheckboxTitleView!
    @IBOutlet private weak var bottomSpacer: UIView!
    @IBOutlet private weak var separatorView: UIView!

    private(set) var type: AvailabilityViewType!
    weak var delegate: AvailabilityViewDelegate?

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        loadViewFromNib()
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        loadViewFromNib()
    }

    override func awakeFromNib() {
        super.awakeFromNib()

        daysCollectionView.registerNib(ofType: DayAvailabilitySelectableCollectionViewCell.self)
        daysCollectionView.registerHeader(ofType: DayAvailabilityHeaderCollectionReusableView.self)

        regularAvailabilityView.delegate = self
        occasionalAvailabilityView.delegate = self
        afterSchoolView.delegate = self
    }

    func loadViewFromNib() {
        let nib = UINib(nibName: "AvailabilityView", bundle: Bundle.main)
        guard let xibView =  nib.instantiate(withOwner: self, options: nil).first as? UIView else { return }
        xibView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(xibView)
        NSLayoutConstraint.attachToSuperview(view: xibView)
    }

// MARK: - Actions
    func configure(delegate: AvailabilityViewDelegate, type: AvailabilityViewType) {
        self.delegate = delegate
        self.type = type

        titleLabel.isHidden = !type.showTitle
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.firstLineHeadIndent = 15
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.defaultText,
            .font: UIFont.openSans(size: 12),
            .paragraphStyle: paragraphStyle
        ]
        afterSchoolView.titleLabel.text = "availableAfterSchool".localized
        switch type {
        case .filter(let searchForm):
            let suffix: String
            switch searchForm.role {
            case .parent:
                suffix = "availability.filter.title.parent"
            case .babysitter:
                suffix = "whenNeedBabysitter"
            case .childminder:
                suffix = "whenNeedChildminder"
            }
            let title = "availability".localized + " " + suffix.localized
            let attributedString = NSMutableAttributedString(string: title, attributes: titleAttributes)
            if let range = title.range(of: suffix) {
                attributedString.addAttribute(.font, value: UIFont.openSansItalic(size: 11),
                                              range: title.nsRange(from: range))
            }
            titleLabel.attributedText = attributedString

            let roleSuffix = searchForm.authUserRole == .parent ? "parent" : "foster"
            regularAvailabilityView.titleLabel.text = ("availability.filter.regularCare." + roleSuffix).localized
            occasionalAvailabilityView.titleLabel.text = ("availability.filter.occasionlaCare." + roleSuffix).localized
            afterSchoolView.titleLabel.text = ("availability.filter.afterSchool." + roleSuffix).localized

        case .jobPosting:
            daysCollectionViewContainer.backgroundColor = UIColor(white: 232/256.0, alpha: 1)
            bottomSpacer.backgroundColor = UIColor(white: 232/256.0, alpha: 1)
        case .editProfile(let user):
            let text = user.role == .parent ? "editProfileParentAvailability" : "editProfileAvailable"
            titleLabel.attributedText = NSAttributedString(string: text.localized, attributes: titleAttributes)

            let roleSuffix = user.isParent ? "parent" : "foster"
            regularAvailabilityView.titleLabel.text = ("editProfile.availability.regular." + roleSuffix).localized
            occasionalAvailabilityView.titleLabel.text = ("editProfile.availability.occasional." + roleSuffix).localized
            afterSchoolView.titleLabel.text = ("editProfile.availability.afterSchool." + roleSuffix).localized
        case .signUp:
            daysCollectionViewContainer.backgroundColor = UIColor.defaultBackground
            bottomSpacer.backgroundColor = UIColor.defaultBackground
        case .reminder(let user, _):
            occasionalAvailabilityView.titleLabel.text = (user.isParent ? "needBabysitterOccasionally" : "availableOccasionally").localized
        }

        // regular availability
        regularAvailabilityContainerView.isHidden = !type.showRegularAvailability
        if type.showRegularAvailability {
            regularAvailabilityView.configure(for: type.regularAvailability ? .selected : .normal)
        }

        // occasional availability
        occasionalAvailabilityContainerView.isHidden = !type.showOccasionalAvailability
        if type.showOccasionalAvailability {
            occasionalAvailabilityView.configure(for: type.occasionlaAvailability ? .selected : .normal)
        }

        // after school
        afterSchoolContainerView.isHidden = !type.showAfterSchool
        afterSchoolView.configure(for: type.availableForAfterSchool ? .selected : .normal)

        separatorView.isHidden = !type.showSeparator

        daysCollectionView.reloadData()
    }

// MARK: - DayAvailabilityCollectionViewCellDelegate
    func didToggle(day: Day, on: Bool) {
        guard let availability = type?.availability else { return }
        if on {
            availability.enableAllDayParts(for: day)
        } else {
            availability.disableAllDayParts(for: day)
        }

        delegate?.didChangeAvailability(availability)
    }

    func didToggle(dayPart: DayPart, on: Bool, day: Day) {
        guard let availability = type?.availability else { return }
        if on {
            availability.enableDayPart(dayPart, for: day)
        } else {
            availability.disableDayPart(dayPart, for: day)
        }

        delegate?.didChangeAvailability(availability)
    }

// MARK: - CheckboxDelegate
    func didToggleCheck(on: Bool, sender: UIView) {
        if sender == regularAvailabilityView {
            delegate?.didSwitchRegularAvailability(value: on)
        } else if sender == occasionalAvailabilityView {
            delegate?.didSwitchOccasionalAvailability(value: on)
        } else if sender == afterSchoolView {
            delegate?.didSwitchAfterScool(value: on)
        }
    }
}

// MARK: - UICollectionViewDataSource
extension AvailabilityView: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return 7
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: DayAvailabilitySelectableCollectionViewCell.self, for: indexPath)
        let availabilityDay = type.availability[indexPath.item]

        cell.configure(day: availabilityDay.day, dayParts: availabilityDay.parts, delegate: self)

        return cell
    }

    func collectionView(
        _ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath
    ) -> UICollectionReusableView {
        return collectionView.dequeueReusableHeader(ofType: DayAvailabilityHeaderCollectionReusableView.self, for: indexPath)
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension AvailabilityView: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        return CGSize(width: collectionView.frame.width, height: 30)
    }

    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int
    ) -> CGSize {
        return CGSize(width: collectionView.frame.width, height: 40)
    }
}
