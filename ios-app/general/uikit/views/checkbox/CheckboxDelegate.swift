import UIKit

protocol CheckboxDelegate: AnyObject {
    func didToggleCheck(on: Bool, sender: UIView)
}
