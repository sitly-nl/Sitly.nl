import UIKit

class DayAvailabilitySelectableCollectionViewCell: UICollectionViewCell, CheckboxDelegate, TitleToggleButtonDelegate {
    @IBOutlet weak var dayTitle: TitleToggleButton!
    @IBOutlet weak var morningCheckmark: CheckboxView!
    @IBOutlet weak var afternoonCheckmark: CheckboxView!
    @IBOutlet weak var eveningCheckmark: CheckboxView!
    var day: Day = .monday
    var dayParts = [DayPart]()
    weak var delegate: DayAvailabilityCollectionViewCellDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        dayTitle.layer.borderWidth = 0
        dayTitle.delegate = self
        morningCheckmark.delegate = self
        afternoonCheckmark.delegate = self
        eveningCheckmark.delegate = self
    }

    func configure(day: Day, dayParts: [DayPart], delegate: DayAvailabilityCollectionViewCellDelegate) {
        self.delegate = delegate
        self.day = day
        self.dayParts = dayParts

        dayTitle.titleLabel.text = day.localized

        configure()
    }

    func configure() {
        morningCheckmark.configure(for: (dayParts.contains(.morning) ? .selected : .normal))
        afternoonCheckmark.configure(for: (dayParts.contains(.afternoon) ? .selected : .normal))
        eveningCheckmark.configure(for: (dayParts.contains(.evening) ? .selected : .normal))

        if dayParts.count == DayPart.allCases.count {
            dayTitle.configure(for: .selected)
            dayTitle.layer.borderColor = UIColor.neutral900.cgColor
            dayTitle.layer.borderWidth = 1
        } else {
            dayTitle.configure(for: .normal)
            dayTitle.layer.borderColor = UIColor.clear.cgColor
            dayTitle.layer.borderWidth = 0
        }
    }

    func toggleDayPart(on: Bool, part: DayPart) {
        if on {
            dayParts.append(part)
        } else {
            if let index = dayParts.firstIndex(of: part) {
                dayParts.remove(at: index)
            }
        }

        configure()
    }

    // MARK: - CheckboxDelegate
    func didToggleCheck(on: Bool, sender: UIView) {
        var dayPart: DayPart?
        if sender == morningCheckmark {
            dayPart = .morning
        } else if sender == afternoonCheckmark {
            dayPart = .afternoon
        } else if sender == eveningCheckmark {
            dayPart = .evening
        }
        if let dayPart {
            toggleDayPart(on: on, part: dayPart)
            delegate?.didToggle(dayPart: dayPart, on: on, day: day)
            if on {
                AnalyticsManager.logEvent(.filterClickAvailability, parameters: ["availability": day.rawValue + "_" + dayPart.rawValue])
            }
        }
    }

    // MARK: - TitleToggleButtonDelegate
    func didToggle(on: Bool, sender: TitleToggleButton) {
        if sender.isEqual(dayTitle) {
            delegate?.didToggle(day: day, on: on)
            dayParts = on ? DayPart.allCases : []
            configure()
            if on {
                AnalyticsManager.logEvent(.filterClickAvailability, parameters: ["availability": day.rawValue])
            }
        }
    }
}
