import Foundation

protocol TitleToggleButtonDelegate: AnyObject {
    func didToggle(on: Bool, sender: TitleToggleButton)
}
