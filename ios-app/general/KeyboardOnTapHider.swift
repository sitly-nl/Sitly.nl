import UIKit

class KeyboardOnTapHider: NSObject, UIGestureRecognizerDelegate {
	private weak var view: UIView?
	var preserveTapOnTableViewCell = false

	func enableForView(_ view: UIView) {
		self.view = view

		// Tap gesture recognizer
		let tapGestureRecognizer = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
		tapGestureRecognizer.delegate = self
		tapGestureRecognizer.cancelsTouchesInView = false
		view.addGestureRecognizer(tapGestureRecognizer)
	}

	// MARK: - Actions
    @objc func dismissKeyboard() {
		view?.endEditing(true)
	}

	// MARK: - UIGestureRecognizerDelegate
	func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
		if touch.view?.isKind(of: UIControl.self) ?? false {
			return false
		}
		if preserveTapOnTableViewCell {
			var view = touch.view
			while view != nil {
				if view?.isKind(of: UITableViewCell.self) ?? false {
					return false
				} else {
					view = view?.superview
				}
			}
		}
		return true
	}
}
