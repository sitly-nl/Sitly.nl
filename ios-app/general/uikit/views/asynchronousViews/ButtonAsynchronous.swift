import UIKit

class ButtonAsynchronous: UIButton, AsynchronousView {
	lazy var helper: AsynchronousViewHelper = AsynchronousViewHelper(parentView: self)

	func updateImage(_ image: UIImage?) {
		setImage(image, for: .normal)
	}
}
