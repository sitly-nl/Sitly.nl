import UIKit

class DayAvailabilityHeaderCollectionReusableView: UICollectionReusableView {
    @IBOutlet weak var allDay: UILabel!
    @IBOutlet weak var morning: UILabel!
    @IBOutlet weak var afternoon: UILabel!
    @IBOutlet weak var evening: UILabel!

    override func awakeFromNib() {
        super.awakeFromNib()

        allDay.text = "allDay".localized
        morning.text = "morning".localized
        afternoon.text = "afternoon".localized
        evening.text = "evening".localized
    }
}
